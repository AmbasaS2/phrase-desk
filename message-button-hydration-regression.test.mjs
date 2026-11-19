import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.js'), 'utf8');
const start = source.indexOf('// Hydration only needs the mounted message ID');
const end = source.indexOf('function messageIndexForPayload(payload)', start);
assert.ok(start >= 0 && end > start, 'Could not find the isolated button hydration implementation');
const hydrationSource = source.slice(start, end);

function fixture(count = 30) {
  const rafQueue = [];
  const observers = [];
  const metrics = { slowResolverCalls: 0, added: 0 };
  let nextRafId = 1;
  const messages = [];
  const chat = [];

  const root = {
    nodeType: 1,
    isConnected: true,
    matches: () => false,
    contains: node => node === root || messages.includes(node),
    querySelectorAll: selector => selector === '.mes' ? messages : [],
  };
  const document = {
    getElementById: id => id === 'chat' ? root : null,
  };
  const context = { chat };
  const addMessage = (msg = { is_user: false, mes: 'hello world' }) => {
    const index = messages.length;
    const element = {
      nodeType: 1,
      isConnected: true,
      index,
      button: null,
      matches: selector => selector === '.mes',
      getAttribute: name => name === 'mesid' ? String(index) : null,
      querySelector: selector => selector === '.pd-message-translate-btn' ? element.button : null,
      querySelectorAll: () => [],
      closest: selector => selector === '.mes' ? element : null,
    };
    messages.push(element);
    context.chat.push(msg);
    return element;
  };
  for (let i = 0; i < count; i++) addMessage();

  function $(html) {
    return {
      html,
      classes: new Set(),
      attrs: {},
      attr(key, value) { this.attrs[key] = value; return this; },
      addClass(value) { this.classes.add(value); return this; },
    };
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }

  const sandbox = {
    document,
    ctx: context,
    $,
    pdT: s => s,
    liveContext: () => context,
    messagePayloadFromTarget: () => { metrics.slowResolverCalls++; return null; },
    pdShouldIncludeHiddenChatRecord: () => true,
    placeMessageTranslateButton: (btn, payload) => {
      payload.mes.button = btn;
      metrics.added++;
      return true;
    },
    pdGlobalState: {},
    MutationObserver,
    requestAnimationFrame: callback => { rafQueue.push(callback); return nextRafId++; },
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(hydrationSource + '\n globalThis.api = { setupMessageButtonObserver, queueMessageButtonHydration, pdButtonHasSavedTranslation };', sandbox);

  const step = () => {
    const callback = rafQueue.shift();
    if (callback) callback();
  };
  const flush = () => {
    let frames = 0;
    while (rafQueue.length) {
      assert.ok(++frames <= 100, 'Hydration did not finish');
      step();
    }
  };
  return { api: sandbox.api, root, context, messages, addMessage, step, flush, rafQueue, observers, metrics };
}

test('initially defers injection and handles large message lists in bounded batches', () => {
  const t = fixture(43);
  t.api.setupMessageButtonObserver();
  assert.equal(t.metrics.added, 0, 'chat open must not synchronously inject all buttons');
  t.step();
  assert.equal(t.metrics.added, 16, 'one frame is limited to sixteen messages');
  t.flush();
  assert.equal(t.metrics.added, 43);
  assert.equal(t.metrics.slowResolverCalls, 0, 'normal numeric mesid must bypass heavy resolver');
});

test('load previous messages receives a button without rebuilding the whole chat', () => {
  const t = fixture(30);
  t.api.setupMessageButtonObserver();
  t.flush();
  const olderMessage = t.addMessage();
  t.observers[0].callback([{ target: t.root, addedNodes: [olderMessage], removedNodes: [] }]);
  assert.equal(olderMessage.button, null);
  t.flush();
  assert.ok(olderMessage.button);
  assert.equal(t.metrics.added, 31);
});

test('repeated observer notifications do not create duplicate buttons', () => {
  const t = fixture(5);
  t.api.setupMessageButtonObserver();
  t.flush();
  t.api.queueMessageButtonHydration(t.messages[0]);
  t.api.queueMessageButtonHydration(t.messages[0]);
  t.flush();
  assert.equal(t.metrics.added, 5);
});

test('replaced metadata row restores a missing button on an existing message', () => {
  const t = fixture(1);
  t.api.setupMessageButtonObserver();
  t.flush();
  const message = t.messages[0];
  message.button = null;
  const metadata = {
    nodeType: 1,
    closest: selector => selector === '.mes' ? message
      : selector.includes('.mesIDDisplay') ? metadata : null,
  };
  t.observers[0].callback([{ target: metadata, addedNodes: [], removedNodes: [] }]);
  t.flush();
  assert.ok(message.button);
  assert.equal(t.metrics.added, 2);
});

test('inactive Phrase Desk cache does not claim another extension display', () => {
  const t = fixture(1);
  t.context.chat[0].extra = {
    display_text: 'foreign text',
    phraseDesk: { activeKey: 'abc', variants: { abc: { showing: false, translations: { full: 'old text' } } } },
  };
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.ok(!t.messages[0].button.classes.has('translated'));
});

test('saved translation badge is recovered without canonical rendering or chat mutation', () => {
  const t = fixture(1);
  const root = { activeKey: 'abc', variants: { abc: { showing: true, activeMode: 'ko', translations: { ko: '번역문' } } } };
  t.context.chat[0].extra = { display_text: '번역문', phraseDesk: root };
  const before = JSON.stringify(t.context.chat[0]);
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.ok(t.messages[0].button.classes.has('translated'));
  assert.equal(JSON.stringify(t.context.chat[0]), before, 'read-only chat open may not mutate cache');
});

test('foreign display_text alone never creates a Phrase Desk translated badge', () => {
  const t = fixture(1);
  t.context.chat[0].extra = { display_text: 'another extension' };
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.ok(!t.messages[0].button.classes.has('translated'));
});

test('unresolved incoming swipe is not given a premature button; completed swipe is', () => {
  const t = fixture(1);
  t.context.chat[0] = { mes: 'pending', swipe_id: 1, swipes: ['first'] };
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.equal(t.messages[0].button, null);
  t.context.chat[0].swipes.push('second');
  t.api.queueMessageButtonHydration(t.messages[0]);
  t.flush();
  assert.ok(t.messages[0].button);
});

test('chat reference changes invalidate pending old-chat hydration work', () => {
  const t = fixture(20);
  t.api.setupMessageButtonObserver();
  const old = t.context.chat;
  t.context.chat = old.slice();
  t.api.queueMessageButtonHydration(t.root);
  t.flush();
  assert.equal(t.metrics.added, 20);
  assert.equal(t.metrics.slowResolverCalls, 0);
});

test('no full chat sync or chat write is introduced by hydration', () => {
  assert.doesNotMatch(hydrationSource, /synchronizeStoredCanonicalViews\(/);
  assert.doesNotMatch(hydrationSource, /persistChatCache\(/);
  assert.doesNotMatch(hydrationSource, /saveChat(Debounced)?\(/);
  assert.match(hydrationSource, /pdButtonHydrationScopes/);
  assert.match(hydrationSource, /PD_MESSAGE_BUTTON_FRAME_BUDGET_MS = 8/);
});
