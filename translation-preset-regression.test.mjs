import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  BUILTIN_TRANSLATION_PROMPT_ID,
  activeTranslationPromptId,
  selectedTranslationPrompt,
  translationPromptPresets,
  migrateTranslationPromptPresets,
  chooseTranslationPrompt,
  addTranslationPrompt,
  renameTranslationPrompt,
  saveTranslationPrompt,
  deleteTranslationPrompt,
} from './pd-prompt-presets.js';
import { DEFAULT_TRANSLATION_PROMPT } from './pd-language.js';
import { loadPhraseDesk } from './test-helpers.mjs';

test('fresh installation has only one immutable built-in prompt and no bundled flavors', () => {
  const settings = { translationPrompt: DEFAULT_TRANSLATION_PROMPT, notebook: [{ text: 'unchanged' }] };
  assert.equal(migrateTranslationPromptPresets(settings, DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(settings.activeTranslationPresetId, BUILTIN_TRANSLATION_PROMPT_ID);
  assert.deepEqual(settings.translationPresets, []);
  assert.equal(selectedTranslationPrompt(settings, DEFAULT_TRANSLATION_PROMPT), DEFAULT_TRANSLATION_PROMPT);
  assert.equal(saveTranslationPrompt(settings, BUILTIN_TRANSLATION_PROMPT_ID, 'override'), false);
  assert.equal(deleteTranslationPrompt(settings, BUILTIN_TRANSLATION_PROMPT_ID), false);
  assert.deepEqual(settings.notebook, [{ text: 'unchanged' }]);
});

test('migration preserves the complete previous user prompt and selects it once', () => {
  const old = '  Literary prompt\n{{target_language}}\nDo not erase me!  ';
  const settings = { translationPrompt: old, translationPromptVersion: 1, characterPrompts: { Remus: 'Keep his jokes' }, notebook: [{ text: 'x' }], chatMode: 'dialogue' };
  assert.equal(migrateTranslationPromptPresets(settings, DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(activeTranslationPromptId(settings), 'custom-1');
  assert.equal(translationPromptPresets(settings)[0].name, '기존 전체 프롬프트');
  assert.equal(selectedTranslationPrompt(settings, DEFAULT_TRANSLATION_PROMPT), old);
  const migrated = JSON.stringify(settings);
  assert.equal(migrateTranslationPromptPresets(settings, DEFAULT_TRANSLATION_PROMPT), false);
  assert.equal(JSON.stringify(settings), migrated);
  assert.equal(settings.characterPrompts.Remus, 'Keep his jokes');
  assert.equal(settings.chatMode, 'dialogue');
});

test('selection persists, unsaved text has no effect, explicit Save retains exact bytes', () => {
  const settings = { translationPrompt: DEFAULT_TRANSLATION_PROMPT };
  migrateTranslationPromptPresets(settings, DEFAULT_TRANSLATION_PROMPT);
  const one = addTranslationPrompt(settings, 'Fiction A', 'A {{target_language}}', DEFAULT_TRANSLATION_PROMPT);
  const two = addTranslationPrompt(settings, 'Fiction B', 'B {{target_language}}', DEFAULT_TRANSLATION_PROMPT);
  assert.ok(one && two);
  assert.equal(activeTranslationPromptId(settings), two.id);
  assert.equal(selectedTranslationPrompt(settings, DEFAULT_TRANSLATION_PROMPT), two.text);
  const unsaved = 'NOT YET SAVED';
  assert.notEqual(selectedTranslationPrompt(settings, DEFAULT_TRANSLATION_PROMPT), unsaved);
  assert.equal(saveTranslationPrompt(settings, two.id, unsaved + '\n\n', DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(selectedTranslationPrompt(settings, DEFAULT_TRANSLATION_PROMPT), unsaved + '\n\n');
  const reload = JSON.parse(JSON.stringify(settings));
  assert.equal(migrateTranslationPromptPresets(reload, DEFAULT_TRANSLATION_PROMPT), false);
  assert.equal(activeTranslationPromptId(reload), two.id);
  assert.equal(selectedTranslationPrompt(reload, DEFAULT_TRANSLATION_PROMPT), unsaved + '\n\n');
  assert.equal(chooseTranslationPrompt(reload, one.id, DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(selectedTranslationPrompt(reload, DEFAULT_TRANSLATION_PROMPT), one.text);
  assert.equal(chooseTranslationPrompt(reload, 'unknown-id', DEFAULT_TRANSLATION_PROMPT), false);
});

test('renaming and deleting change only the targeted custom prompt; fallback is safe', () => {
  const settings = { translationPrompt: DEFAULT_TRANSLATION_PROMPT };
  migrateTranslationPromptPresets(settings, DEFAULT_TRANSLATION_PROMPT);
  const a = addTranslationPrompt(settings, 'Style 1', 'A', DEFAULT_TRANSLATION_PROMPT);
  const b = addTranslationPrompt(settings, 'Style 2', 'B', DEFAULT_TRANSLATION_PROMPT);
  assert.equal(renameTranslationPrompt(settings, a.id, 'Style 2'), false);
  assert.equal(renameTranslationPrompt(settings, b.id, 'New style'), true);
  assert.equal(renameTranslationPrompt(settings, b.id, 'line\nbreak'), false);
  assert.equal(deleteTranslationPrompt(settings, a.id, DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(settings.activeTranslationPresetId, b.id);
  assert.equal(settings.translationPresets.length, 1);
  assert.equal(deleteTranslationPrompt(settings, b.id, DEFAULT_TRANSLATION_PROMPT), true);
  assert.equal(settings.activeTranslationPresetId, BUILTIN_TRANSLATION_PROMPT_ID);
  assert.equal(settings.translationPrompt, DEFAULT_TRANSLATION_PROMPT);
});

test('legacy snapshots retain rollback-compatible translationPrompt, with no extra prompt injection', () => {
  const seed = { translationPrompt: 'Direct concise {{target_language}}.', translationPromptVersion: 1 };
  const api = loadPhraseDesk({ seed });
  assert.equal(api.settings.translationPresets.length, 1);
  assert.equal(api.globalPrompt(), seed.translationPrompt);
  const source = api.createCanonicalTranslationPlan('He muttered, "We should leave."');
  const rendered = api.buildPrompt(source.promptSource, 'canonical', { canonicalUnitCount: source.items.length });
  assert.ok(rendered.startsWith('Direct concise Korean.'));
  assert.equal((rendered.match(/Phrase Desk mandatory output contract:/g) || []).length, 1);
  assert.ok(rendered.includes('PDU'));
  assert.ok(rendered.includes('PD_FMT'));
  assert.doesNotMatch(rendered, /Phrase Desk literary translation into Korean/);
  assert.equal(api.saveSettings(true), true);
  const persisted = api.sandbox.extension_settings['phrase-desk'];
  assert.equal(persisted.translationPrompt, seed.translationPrompt);
  assert.equal(persisted.activeTranslationPresetId, 'custom-1');
});

test('switching only affects new AI requests; cache structures remain independent', () => {
  const api = loadPhraseDesk();
  const settings = api.settings;
  const existing = { extra: { display_text: 'Saved display', phraseDesk: { variants: { x: { original: 'A' } } } } };
  const baseline = JSON.stringify(existing);
  const custom = addTranslationPrompt(settings, 'Test', 'CUSTOM {{target_language}}', DEFAULT_TRANSLATION_PROMPT);
  assert.ok(custom);
  assert.match(api.buildPrompt('[[PDU-A-0001]]Hi[[/PDU-A-0001]]', 'canonical', { canonicalUnitCount: 1 }), /CUSTOM Korean/);
  chooseTranslationPrompt(settings, BUILTIN_TRANSLATION_PROMPT_ID, DEFAULT_TRANSLATION_PROMPT);
  assert.match(api.buildPrompt('[[PDU-A-0001]]Hi[[/PDU-A-0001]]', 'canonical', { canonicalUnitCount: 1 }), /Phrase Desk literary translation into Korean/);
  assert.equal(JSON.stringify(existing), baseline);
});

test('interface contains explicit save controls, and built-in variations are not packaged', () => {
  const js = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  assert.match(js, /function setupTranslationPromptLibrary\(/);
  for (const id of ['pd-preset-select','pd-preset-save','pd-preset-save-as','pd-preset-export','pd-preset-import','pd-preset-delete']) {
    assert.ok(js.includes(id), id);
  }
  assert.match(js, /\.prop\('readOnly', viewedId === BUILTIN_TRANSLATION_PROMPT_ID\)/);
  assert.match(js, /showDecision\('저장되지 않은 변경'/);
  assert.match(js, /#pd-preset-save/);
  assert.match(css, /\.pd-translation-preset-row/);
  assert.doesNotMatch(js.slice(js.indexOf('function setupTranslationPromptLibrary()'),js.indexOf('function setupSettingsPanel()')), /\bprompt\(/);
  assert.match(js, /showNameModal\(/);
  assert.match(js, /exportTranslationPromptJSON/);
  assert.doesNotMatch(js, /'미친 한출의 맛'|'김홍진의 맛'|'딥식'|'갈뵈체'/);
});
