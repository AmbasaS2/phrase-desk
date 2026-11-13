import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {loadPhraseDesk} from './test-helpers.mjs';

test('prompt status follows existing synchronous save without a new save handler', () => {
  const api=loadPhraseDesk({seed:{translationPrompt:'ORIGINAL',translationPromptVersion:1,characterPromptStoreVersion:2}});
  const globalField={value:'Custom instruction'};
  const globalBadge={textContent:'',dataset:{}};
  const charBadge={textContent:'',dataset:{}};
  const dom={
    '#pd-global-prompt':globalField,
    '#pd-global-prompt-status':globalBadge,
    '#pd-char-prompt-status':charBadge,
  };
  api.sandbox.document.querySelector=(selector)=>dom[selector]||null;
  api.setPromptStatus('global','saving');
  assert.equal(globalBadge.textContent,'저장 중…');
  assert.equal(globalBadge.dataset.state,'saving');
  api.settings.translationPrompt='Custom instruction';
  api.saveSettings(true);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].translationPrompt,'Custom instruction');
  assert.equal(globalBadge.textContent,'자동 저장됨 ✓');
  assert.equal(globalBadge.dataset.state,'saved');
});

test('prompt failure badge cannot overwrite an unrelated successfully saved prompt',()=>{
  const api=loadPhraseDesk();
  const a={textContent:'',dataset:{}},b={textContent:'',dataset:{}};
  const dom={'#pd-global-prompt-status':a,'#pd-char-prompt-status':b};
  api.sandbox.document.querySelector=(selector)=>dom[selector]||null;
  api.setPromptStatus('global','saving');
  api.setPromptStatus('char','saved');
  api.markPendingPromptStatusesFailed();
  assert.equal(a.textContent,'저장 실패');
  assert.equal(a.dataset.state,'error');
  assert.equal(b.textContent,'자동 저장됨 ✓');
  assert.equal(b.dataset.state,'saved');
});

test('prompt UI badges are limited to the extension settings panel',()=>{
  const js=fs.readFileSync(new URL('./index.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(js,/id:'pd-global-prompt-status'/);
  assert.match(js,/id:'pd-char-prompt-status'/);
  assert.match(js,/setPromptStatus\('global','saving'\)/);
  assert.match(js,/setPromptStatus\('char','saving'\)/);
  assert.match(css,/#phrase-desk-settings \.pd-prompt-save-status/);
  assert.match(css,/#phrase-desk-settings \.pd-prompt-actions/);
});
