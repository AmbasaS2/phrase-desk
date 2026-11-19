import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.js'), 'utf8');
const start = source.indexOf('function messageInfoAnchor(payload) {');
const end = source.indexOf('function messageIndexForPayload(payload) {', start);
assert.ok(start >= 0 && end > start, 'Globe hydration section missing');
const snippet = source.slice(start, end);

function fixture(count = 30, styleCost = 0) {
  const rafQueue = [];
  const observers = [];
  const timers = [];
  const messages = [];
  const context = { chat: [] };
  const stats = { buttons: 0, heavyResolverCalls: 0, styleReads: 0, bodyReads: 0, ops: [] };
  let clock = 0;

  const chatElement = {
    nodeType: 1,
    isConnected: true,
    matches: () => false,
    contains: node => node === chatElement || messages.includes(node),
    querySelectorAll: selector => selector === '.mes' ? messages : [],
  };
  const document = { getElementById: id => id === 'chat' ? chatElement : null };

  function makeMetadata(message, ready = true) {
    const meta = {
      nodeType: 1,
      children: [],
      matches: selector => selector.includes('.mesAvatarWrapper'),
      querySelector: selector => selector === '.pd-message-translate-btn' ? message.button : null,
      closest: selector => selector === '.mes' ? message
        : selector.includes('.mesAvatarWrapper') ? meta : null,
    };
    const label = {
      nodeType: 1,
      hidden: false,
      style: { display: '' },
      textContent: ready ? '15 tokens' : '',
      matches: selector => selector === '.tokenCounterDisplay',
      closest: selector => selector === '.mes' ? message
        : selector.includes('.mesAvatarWrapper') || selector.includes('.tokenCounterDisplay') ? label : null,
      append: btn => { message.button = btn; stats.buttons++; stats.ops.push('write'); },
    };
    meta.children.push(label);
    return { meta, label };
  }

  const add = (msg = { mes: 'Message source', is_user: false }, metadataReady = true) => {
    const index = context.chat.length;
    const message = {
      nodeType: 1,
      isConnected: true,
      index,
      button: null,
      metadata: null,
      matches: selector => selector === '.mes',
      getAttribute: name => name === 'mesid' ? String(index) : null,
      querySelector(selector) {
        if (selector === '.mesAvatarWrapper') return message.metadata?.meta || null;
        if (selector === '.pd-message-translate-btn') return message.button;
        if (selector === '.mes_text' || selector === '.mes_content') {
          stats.bodyReads++;
          throw new Error('Body must not be read when adding a globe');
        }
        return null;
      },
      closest: selector => selector === '.mes' ? message : null,
    };
    message.metadata = makeMetadata(message, metadataReady);
    messages.push(message);
    context.chat.push(msg);
    return message;
  };
  for (let i = 0; i < count; i++) add();

  function $(value) {
    if (typeof value === 'string') {
      const button = { attrs: {}, classes: new Set(),
        attr(key, val) { this.attrs[key] = val; return this; },
        toggleClass(key, enabled) { if (enabled) this.classes.add(key); else this.classes.delete(key); return this; },
        addClass(key) { this.classes.add(key); return this; },
      };
      return button;
    }
    if (value?.append) return { append: button => value.append(button) };
    return { length: 0 };
  }

  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }

  const sandbox = {
    ctx: context, document, $,
    pdT: value => value,
    payloadIsUserMessage: payload => !!payload?.msg?.is_user,
    pdShouldIncludeHiddenChatRecord: () => true,
    messagePayloadFromTarget: () => { stats.heavyResolverCalls++; return null; },
    liveContext: () => context,
    getComputedStyle: () => { stats.styleReads++; stats.ops.push('style-read'); clock += styleCost; return { display: 'block' }; },
    pdGlobalState: {},
    MutationObserver,
    requestAnimationFrame: callback => { rafQueue.push(callback); return rafQueue.length; },
    performance: { now: () => clock },
    setTimeout: callback => { timers.push(callback); return timers.length; },
    clearTimeout: () => {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(snippet + '\nglobalThis.api = {setupMessageButtonObserver, queueMessageButtonHydration, ensureMessageTranslateButton, pdButtonHasSavedTranslation};', sandbox);

  const step = () => {
    const callback = rafQueue.shift();
    if (callback) callback();
  };
  const flush = () => {
    let steps = 0;
    while (rafQueue.length) {
      assert.ok(++steps < 100, 'Unbounded hydration');
      step();
    }
  };
  const textMutation = message => {
    observers[0].callback([{ type: 'characterData', target: { nodeType: 3, parentElement: message.metadata.label }, addedNodes: [], removedNodes: [] }]);
  };
  const metadataAdded = message => {
    observers[0].callback([{ type: 'childList', target: message, addedNodes: [message.metadata.meta], removedNodes: [] }]);
  };
  return { api: sandbox.api, document, chatElement, context, messages, add, textMutation, metadataAdded, rafQueue, observers, timers, stats, step, flush, get clock() {return clock} };
}

test('30 ready globes mount on the first scheduled frame without polling', () => {
  const t = fixture(30);
  t.api.setupMessageButtonObserver();
  assert.equal(t.stats.buttons, 0);
  t.flush();
  assert.equal(t.stats.buttons, 30);
  assert.equal(t.stats.heavyResolverCalls, 0);
  assert.equal(t.stats.bodyReads, 0);
  assert.equal(t.timers.length, 0);
});

test('one hydration frame reads all anchor styles before writing buttons', () => {
  const t = fixture(30);
  t.api.setupMessageButtonObserver();
  t.step();
  assert.equal(t.stats.buttons, 30);
  const firstWrite = t.stats.ops.indexOf('write');
  assert.equal(firstWrite, 30);
  assert.ok(t.stats.ops.slice(0, firstWrite).every(op => op === 'style-read'));
  assert.ok(t.stats.ops.slice(firstWrite).every(op => op === 'write'));
});

test('many ready messages finish in bounded frames without multi-second timer starvation', () => {
  const t = fixture(221);
  t.api.setupMessageButtonObserver();
  t.step();
  assert.equal(t.stats.buttons, 96);
  t.flush();
  assert.equal(t.stats.buttons, 221);
  assert.equal(t.timers.length, 0);
});

test('time budget still bounds expensive browser layout work', () => {
  const t = fixture(40, 0.8);
  t.api.setupMessageButtonObserver();
  t.step();
  assert.ok(t.stats.buttons < 40);
  assert.ok(t.stats.buttons > 0);
  t.flush();
  assert.equal(t.stats.buttons, 40);
});

test('late metadata text mounts globe only when the metadata event arrives', () => {
  const t = fixture(1);
  const message = t.messages[0];
  message.metadata.label.textContent = '';
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.equal(t.stats.buttons, 0);
  assert.equal(t.timers.length, 0, 'Not-ready messages must not start polling timers');
  message.metadata.label.textContent = '15 tokens';
  t.textMutation(message);
  t.flush();
  assert.equal(t.stats.buttons, 1);
});

test('fresh metadata text node wakes globe without polling', () => {
  const t = fixture(1);
  const message = t.messages[0];
  message.metadata.label.textContent = '';
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.equal(t.stats.buttons, 0);
  message.metadata.label.textContent = '15 tokens';
  t.observers[0].callback([{
    type: 'childList', target: message.metadata.label,
    addedNodes: [{ nodeType: 3, parentElement: message.metadata.label }],
    removedNodes: [],
  }]);
  t.flush();
  assert.equal(t.stats.buttons, 1);
  assert.equal(t.timers.length, 0);
});

test('late metadata wrapper mounts globe from its insertion event', () => {
  const t = fixture(1);
  const message = t.messages[0];
  const metadata = message.metadata;
  message.metadata = null;
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.equal(t.stats.buttons, 0);
  message.metadata = metadata;
  t.metadataAdded(message);
  t.flush();
  assert.equal(t.stats.buttons, 1);
});

test('loading previous messages after initial mount receives a new globe', () => {
  const t = fixture(30);
  t.api.setupMessageButtonObserver();
  t.flush();
  const older = t.add();
  t.observers[0].callback([{ type: 'childList', target: t.chatElement, addedNodes: [older], removedNodes: [] }]);
  t.flush();
  assert.equal(t.stats.buttons, 31);
  assert.ok(older.button);
});

test('duplicate queue events and own button insertion never duplicate globes', () => {
  const t = fixture(1);
  t.api.setupMessageButtonObserver();
  t.flush();
  const message = t.messages[0];
  t.api.queueMessageButtonHydration(message);
  t.api.queueMessageButtonHydration(message);
  t.flush();
  assert.equal(t.stats.buttons, 1);
  const ownButton = {
    nodeType: 1,
    matches: selector => selector === '.pd-message-translate-btn',
    closest: () => null,
  };
  t.observers[0].callback([{ type: 'childList', target: message.metadata.label, addedNodes: [ownButton], removedNodes: [] }]);
  assert.equal(t.rafQueue.length, 0);
});

test('swipe generation is guarded and finished swipe attaches after metadata changes', () => {
  const t = fixture(1);
  const message = t.messages[0];
  t.context.chat[0] = { swipe_id: 1, swipes: ['first'], mes: 'pending' };
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.equal(t.stats.buttons, 0);
  t.context.chat[0].swipes.push('second');
  t.textMutation(message);
  t.flush();
  assert.equal(t.stats.buttons, 1);
});

test('saved translation button state restores without decoding canonical records', () => {
  const t = fixture(1);
  const msg = t.context.chat[0];
  msg.extra = { display_text: 'translated',
    phraseDesk: { activeKey: 'key', variants: { key: { showing: true, activeMode: 'full', translations: { full: 'translated' } } } } };
  const before = JSON.stringify(msg);
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.ok(t.messages[0].button.classes.has('translated'));
  assert.equal(JSON.stringify(msg), before);
});

test('foreign display_text does not create a translated Phrase Desk badge', () => {
  const t = fixture(1);
  t.context.chat[0].extra = { display_text: 'foreign extension translation' };
  t.api.setupMessageButtonObserver();
  t.flush();
  assert.ok(!t.messages[0].button.classes.has('translated'));
});

test('chat switch clears pending old-chat work', () => {
  const t = fixture(25);
  t.api.setupMessageButtonObserver();
  t.context.chat = t.context.chat.slice();
  t.api.queueMessageButtonHydration(t.chatElement);
  t.flush();
  assert.equal(t.stats.buttons, 25);
});

test('message metadata replacement adds one restored button', () => {
  const t = fixture(1);
  t.api.setupMessageButtonObserver();
  t.flush();
  const message = t.messages[0];
  message.button = null;
  t.metadataAdded(message);
  t.flush();
  assert.equal(t.stats.buttons, 2);
});

test('hydration code performs no chat save or full-canonical re-render', () => {
  const from = snippet.indexOf('function ensureMessageTranslateButton(mes) {');
  const end = snippet.indexOf('function messageIndexForPayload(payload)', from);
  const code = snippet.slice(from, end < 0 ? undefined : end);
  assert.doesNotMatch(code, /persistChatCache\(|saveChat\(|setMessageText\(|applyPersistedMessageTranslation\(payload, btn\)/);
  assert.doesNotMatch(code, /pdSchedulePendingMetadataRetry|PD_MESSAGE_BUTTON_RETRY_DELAY_MS/);
  assert.match(code, /characterData: true/);
  assert.match(code, /PD_MESSAGE_BUTTON_FRAME_LIMIT = 96/);
});
