import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

test('settings title uses the same native b element as other drawers', () => {
  const label = '<b>' + '
  assert.ok(index.includes(label), 'Phrase Desk settings header must contain native b label');
  assert.doesNotMatch(index, /<b class="inline-drawer-title">/);
  assert.ok(index.includes('<span class="pd-extension-icon extensionsMenuExtensionButton" aria-hidden="true">🔤</span>'), 'extension menu must keep its icon');
});

test('settings title no longer has Phrase Desk-specific CSS typography overrides', () => {
  assert.doesNotMatch(css, /#phrase-desk-settings[^\n{]*\.inline-drawer-title/);
  assert.doesNotMatch(css, /#phrase-desk-settings\s*>\s*\.inline-drawer-toggle\s*\{/);
  assert.match(css, /#phrase-desk-settings > \.inline-drawer-toggle \.inline-drawer-icon/);
});

test('native chevron and settings content are left untouched', () => {
  assert.match(index, /<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"><\/div>/);
  assert.match(index, /<div class="inline-drawer-content pd-settings-content"/);
});
 + "{esc(DISPLAY_NAME.replace(/^🔤\\s*/, ''))}</b>";
  assert.ok(index.includes(label), 'Phrase Desk settings header must contain native b label');
  assert.doesNotMatch(index, /<b class="inline-drawer-title">/);
});

test('settings title no longer has Phrase Desk-specific CSS typography overrides', () => {
  assert.doesNotMatch(css, /#phrase-desk-settings[^\n{]*\.inline-drawer-title/);
  assert.doesNotMatch(css, /#phrase-desk-settings\s*>\s*\.inline-drawer-toggle\s*\{/);
  assert.match(css, /#phrase-desk-settings > \.inline-drawer-toggle \.inline-drawer-icon/);
});

test('native chevron and settings content are left untouched', () => {
  assert.match(index, /<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"><\/div>/);
  assert.match(index, /<div class="inline-drawer-content pd-settings-content"/);
});
