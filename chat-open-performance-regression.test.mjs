import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

// Source-level regression guard. This does not replace a real large-chat timing
// test in SillyTavern; it prevents accidentally reintroducing the full-chat
// mutation/save path on CHAT_CHANGED or boot.
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.js'), 'utf8');

function between(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Cannot locate code region: ${start}`);
  return source.slice(a, b);
}

test('chat open only hydrates mounted controls; no full-chat translation resync', () => {
  const hooks = between('function setupMessageRenderHooks()', 'function setupExtensionsMenuButton()');
  assert.match(hooks, /bind\('CHAT_CHANGED', ''\)/);
  assert.match(hooks, /queueMessageButtonHydration\(/);
  assert.match(hooks, /pdCancelDelayedChatWork\(\)/);
  assert.doesNotMatch(hooks, /reapplyVisiblePhraseDeskTranslations\(true\)/);
  assert.doesNotMatch(hooks, /synchronizeStoredCanonicalViews\(/);
  assert.doesNotMatch(hooks, /persistChatCache\(/);
});

test('boot does not mutate and save the complete persisted chat', () => {
  const boot = between('async function boot(){', 'function scheduleBoot(){');
  assert.doesNotMatch(boot, /reapplyVisiblePhraseDeskTranslations\(true\)/);
  assert.doesNotMatch(boot, /synchronizeStoredCanonicalViews\(/);
  assert.doesNotMatch(boot, /persistChatCache\(/);
  assert.match(boot, /scheduleMessageButtonHydration\(\)/);
});

test('user-triggered display mode/target changes can still resync on demand', () => {
  assert.match(source, /if \(displayModeChanged\) reapplyVisiblePhraseDeskTranslations\(true\)/);
  assert.match(source, /if \(oldTarget !== targetLanguage\(\)\.key\)/);
  assert.match(source, /function synchronizeStoredCanonicalViews\(/);
});
