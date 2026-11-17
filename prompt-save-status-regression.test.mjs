import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadPhraseDesk } from './test-helpers.mjs';
import { saveTranslationPrompt } from './pd-prompt-presets.js';
import { DEFAULT_TRANSLATION_PROMPT } from './pd-language.js';

test('global prompt is not auto-saved; explicit Save persists the selected custom text', () => {
  const api = loadPhraseDesk({ seed: { translationPrompt: 'ORIGINAL', translationPromptVersion: 1, characterPromptStoreVersion: 2 } });
  const promptId = api.settings.activeTranslationPresetId;
  assert.notEqual(promptId, 'builtin');
  const editor = { value: 'Unsaved custom instruction' };
  const globalBadge = { textContent: '', dataset: {} };
  const saveButton = { disabled: false };
  const dom = {
    '#pd-global-prompt': editor,
    '#pd-global-prompt-status': globalBadge,
    '#pd-preset-save': saveButton,
  };
  api.sandbox.document.querySelector = selector => dom[selector] || null;
  api.refreshPromptSaveStatuses();
  assert.equal(globalBadge.textContent, '저장되지 않은 변경');
  assert.equal(saveButton.disabled, false);
  assert.equal(api.globalPrompt(), 'ORIGINAL');
  assert.equal(api.settings.translationPresets[0].text, 'ORIGINAL');

  assert.equal(saveTranslationPrompt(api.settings, promptId, editor.value, DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(api.saveSettings(true), true);
  assert.equal(api.globalPrompt(), editor.value);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].translationPresets[0].text, editor.value);
  assert.equal(globalBadge.textContent, '저장됨 ✓');
  assert.equal(saveButton.disabled, true);
});

test('only character prompt auto-save failure affects the automatic badge', () => {
  const api = loadPhraseDesk();
  const global = { textContent: '', dataset: {} };
  const character = { textContent: '', dataset: {} };
  api.sandbox.document.querySelector = selector => ({
    '#pd-global-prompt-status': global,
    '#pd-char-prompt-status': character,
  })[selector] || null;
  api.setPromptStatus('global', 'unsaved');
  api.setPromptStatus('char', 'saving');
  api.markPendingPromptStatusesFailed();
  assert.equal(global.dataset.state, 'unsaved');
  assert.equal(character.dataset.state, 'error');
});

test('theme-style prompt manager keeps explicit Save and character auto-save', () => {
  const js = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  assert.match(js, /function setupTranslationPromptLibrary\(/);
  assert.match(js, /pd-preset-select/);
  assert.match(js, /pd-preset-save/);
  assert.match(js, /saveTranslationPrompt\(settings/);
  assert.match(js, /setPromptStatus\('char','saving'\)/);
  assert.doesNotMatch(js, /\$\('#pd-global-prompt'\)\.on\('input', function\(\)\{ settings\.translationPrompt/);
  assert.match(css, /#phrase-desk-settings \.pd-translation-preset-row \.pd-preset-selection/);
  assert.match(css, /@media \(max-width: 600px\)/);
});
