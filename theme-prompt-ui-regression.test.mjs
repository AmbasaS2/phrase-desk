import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { DEFAULT_TRANSLATION_PROMPT } from './pd-language.js';
import {
  BUILTIN_TRANSLATION_PROMPT_ID, translationPromptPresets,
  activeTranslationPromptId, selectedTranslationPrompt,
  migrateTranslationPromptPresets, chooseTranslationPrompt, addTranslationPrompt,
  renameTranslationPrompt, saveTranslationPrompt, deleteTranslationPrompt,
  exportTranslationPromptJSON, parseTranslationPromptJSON, uniqueTranslationPromptName,
} from './pd-prompt-presets.js';

const functions = {
  BUILTIN_TRANSLATION_PROMPT_ID, translationPromptPresets, activeTranslationPromptId,
  selectedTranslationPrompt, chooseTranslationPrompt, addTranslationPrompt,
  renameTranslationPrompt, saveTranslationPrompt, deleteTranslationPrompt,
  exportTranslationPromptJSON, parseTranslationPromptJSON, uniqueTranslationPromptName,
};

test('standalone JSON round trip preserves Unicode/newlines and refuses unrelated settings', () => {
  const s = { translationPrompt: DEFAULT_TRANSLATION_PROMPT };
  migrateTranslationPromptPresets(s, DEFAULT_TRANSLATION_PROMPT);
  const body = '한출 \u2728\n<info_panel>읽어줘</info_panel>\n\n{{target_language}}';
  const entry = addTranslationPrompt(s, '한글 🐈', body, DEFAULT_TRANSLATION_PROMPT);
  const json = exportTranslationPromptJSON(s, entry.id, DEFAULT_TRANSLATION_PROMPT);
  assert.deepEqual(parseTranslationPromptJSON(json), { name:'한글 🐈', text:body });
  assert.equal(parseTranslationPromptJSON(exportTranslationPromptJSON(s, 'builtin', DEFAULT_TRANSLATION_PROMPT, 'Default prompt')).text, DEFAULT_TRANSLATION_PROMPT);
  for (const bad of [
    '{}', '{"format":"custom","version":1,"name":"A","text":"B"}',
    '{"format":"phrase-desk-translation-prompt","version":1,"name":"A","text":5}',
    '{"format":"phrase-desk-translation-prompt","version":1,"name":"A\\nB","text":"x"}',
    '{"format":"phrase-desk-translation-prompt","version":2,"name":"A","text":"B"}',
    JSON.stringify({format:'phrase-desk-translation-prompt',version:1,name:'A',text:'x'.repeat(200001)}),
  ]) assert.equal(parseTranslationPromptJSON(bad), null);
  assert.equal(uniqueTranslationPromptName(s, '한글 🐈'), '한글 🐈 (2)');
});

function setupUi(seed = {}) {
  const script = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const start = script.indexOf('function setupTranslationPromptLibrary()');
  const end = script.indexOf('function setupSettingsPanel()', start);
  assert.ok(start >= 0 && end > start);
  const ui = script.slice(start, end);
  assert.doesNotMatch(ui, /\bprompt\(/, 'No browser-native prompt dialogs');

  const settings = { translationPrompt: DEFAULT_TRANSLATION_PROMPT, translationPromptVersion:1, ...seed };
  migrateTranslationPromptPresets(settings, DEFAULT_TRANSLATION_PROMPT);
  const saved = [];
  const toasts = [];
  let modal;
  let exportedFile;
  const nodes = new Map();
  class Element {
    constructor(key) { this.key=key; this.length=1; this.value=''; this.events={}; this.options=[]; this.files=[]; this.disabled=false; this.readOnly=false; }
    closest() { return get('row'); }
    addClass() { return this; }
    html(text) { this.htmlText=text; return this; }
    empty() { this.options=[]; return this; }
    append(item) { this.options.push(item); return this; }
    val(value) { if (arguments.length===0) return this.value; this.value=value; return this; }
    prop(key, value) { this[key]=value; return this; }
    on(names, handler) { for (const event of names.split(' ')) this.events[event]=handler; return this; }
    async fire(name) { return this.events[name]?.call(this); }
    trigger(name) { return this.fire(name); }
    find(name) { return get(name); }
  }
  const get = key => { const name=String(key).replace(/^#/,''); if(!nodes.has(name)) nodes.set(name,new Element(name)); return nodes.get(name); };
  const $ = (selector, attrs={}) => selector==='<option>' ? attrs : get(selector);
  const document = {
    body: { appendChild(){} },
    createElement(tag) {
      assert.equal(tag,'a');
      return { click(){ exportedFile={ url:this.href,filename:this.download }; }, remove(){} };
    },
  };
  let blobUrl;
  const URLShim = {
    createObjectURL(blob) { blobUrl=blob; return 'blob:mock'; },
    revokeObjectURL() {},
  };
  const showModal = value => { modal = get('modal'); modal.html(value); return modal; };
  const func = new Function('$','settings','DEFAULT_TRANSLATION_PROMPT','esc','pdT','showModal',
    'closeModals','toast','saveSettings','refreshPromptSaveStatuses','Blob','URL','document','setTimeout',
    ...Object.keys(functions), ui + '\nreturn setupTranslationPromptLibrary');
  const fn = func($,settings,DEFAULT_TRANSLATION_PROMPT,x=>x,x=>x,showModal,()=>{},(text,kind)=>toasts.push([text,kind]),
    () => { saved.push(structuredClone(settings)); return true; },
    () => { const select=get('pd-preset-select'); const editor=get('pd-global-prompt'); const id=select.val(); const target=id==='builtin'?DEFAULT_TRANSLATION_PROMPT:translationPromptPresets(settings).find(e=>e.id===id)?.text; get('pd-preset-save').disabled = id===activeTranslationPromptId(settings) && editor.val()===target; },
    Blob,URLShim,document,()=>{},...Object.values(functions));
  fn();
  return {settings,get,saved,toasts,confirm:async()=>get('pd-preset-decision-yes').fire('click'),
    name:async name=>{get('pd-preset-name').val(name);await get('pd-preset-name-confirm').fire('click');},
    exported:()=>({exportedFile,blob:blobUrl}), modal:()=>modal};
}

test('drop-down only changes viewing state until disk save; Save As preserves original', async () => {
  const { settings, get, saved, name } = setupUi();
  assert.equal(activeTranslationPromptId(settings),'builtin');
  await get('pd-preset-save-as').fire('click');
  await name('첫 번째 스타일');
  assert.equal(activeTranslationPromptId(settings),'custom-1');
  assert.equal(selectedTranslationPrompt(settings,DEFAULT_TRANSLATION_PROMPT),DEFAULT_TRANSLATION_PROMPT);
  get('pd-global-prompt').val('저장 안 함').fire('input');
  assert.equal(selectedTranslationPrompt(settings,DEFAULT_TRANSLATION_PROMPT),DEFAULT_TRANSLATION_PROMPT);
  await get('pd-preset-save').fire('click');
  assert.equal(selectedTranslationPrompt(settings,DEFAULT_TRANSLATION_PROMPT),'저장 안 함');
  await get('pd-preset-select').val('builtin').fire('change');
  assert.equal(activeTranslationPromptId(settings),'custom-1','Changing selection alone must not persist');
  assert.equal(get('pd-global-prompt').readOnly,true);
  assert.equal(get('pd-preset-save').disabled,false);
  await get('pd-preset-save').fire('click');
  assert.equal(activeTranslationPromptId(settings),'builtin');
  assert.equal(saved.at(-1).activeTranslationPresetId,'builtin');
  assert.equal(get('pd-preset-save').disabled,true);
});

test('modal Save As takes unsaved editor content without overwriting the original', async () => {
  const { settings,get,name,confirm } = setupUi();
  await get('pd-preset-save-as').fire('click');
  await name('Original');
  get('pd-global-prompt').val('A').fire('input');
  await get('pd-preset-save').fire('click');
  get('pd-global-prompt').val('B (unsaved)').fire('input');
  await get('pd-preset-save-as').fire('click');
  await name('New copied name');
  assert.equal(translationPromptPresets(settings).length,2);
  assert.equal(translationPromptPresets(settings)[0].text,'A');
  assert.equal(translationPromptPresets(settings)[1].text,'B (unsaved)');
  assert.equal(activeTranslationPromptId(settings),'custom-2');
  await get('pd-preset-delete').fire('click');
  await confirm();
  assert.equal(activeTranslationPromptId(settings),'builtin');
  assert.equal(translationPromptPresets(settings).length,1);
});

test('JSON export and import keep source exact, import name conflicts get suffix', async () => {
  const env=setupUi();
  await env.get('pd-preset-export').fire('click');
  const product=env.exported();
  assert.equal(product.exportedFile.filename.endsWith('.json'),true);
  assert.equal(parseTranslationPromptJSON(await product.blob.text()).text,DEFAULT_TRANSLATION_PROMPT);
  await env.get('pd-preset-save-as').fire('click');
  await env.name('Default prompt (2)');
  const fileText=JSON.stringify({format:'phrase-desk-translation-prompt',version:1,name:'Default prompt (2)',text:'Imported\ntext'});
  env.get('pd-preset-import-file').files=[{size:fileText.length,text:async()=>fileText}];
  await env.get('pd-preset-import-file').fire('change');
  assert.equal(translationPromptPresets(env.settings).length,2);
  assert.equal(translationPromptPresets(env.settings)[1].name,'Default prompt (3)');
  assert.equal(selectedTranslationPrompt(env.settings,DEFAULT_TRANSLATION_PROMPT),'Imported\ntext');
  const savedCount=env.saved.length;
  env.get('pd-preset-import-file').files=[{size:1,text:async()=>'{'}];
  await env.get('pd-preset-import-file').fire('change');
  assert.equal(env.saved.length,savedCount);
});

test('unsaved text switching opens in-page confirmation without altering committed choice', async () => {
  const env=setupUi();
  await env.get('pd-preset-save-as').fire('click'); await env.name('Style A');
  env.get('pd-global-prompt').val('unsaved edit').fire('input');
  await env.get('pd-preset-select').val('builtin').fire('change');
  assert.equal(env.get('pd-preset-select').val(),'custom-1','Selection reverts during confirmation');
  assert.equal(activeTranslationPromptId(env.settings),'custom-1');
  assert.match(env.modal().htmlText,/작성 중인 내용을/);
  await env.confirm();
  assert.equal(env.get('pd-preset-select').val(),'builtin');
  assert.equal(activeTranslationPromptId(env.settings),'custom-1','Need explicit disk Save to activate');
});

test('prompt toolbar icon sizing follows native SillyTavern theme buttons', () => {
  const js=fs.readFileSync(new URL('./index.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('./style.css',import.meta.url),'utf8');
  const index=js.indexOf('function setupTranslationPromptLibrary()');
  const ui=js.slice(index,js.indexOf('function setupSettingsPanel()',index));
  assert.match(ui,/class="menu_button margin0 pd-preset-icon-btn/);
  assert.match(ui,/header \? ' menu_button_icon' : ''/);
  for(const name of ['pd-preset-export','pd-preset-import','pd-preset-delete']) {
    assert.match(ui,new RegExp("iconButton\\('"+name+"'.*true\\)"));
  }
  for(const name of ['pd-preset-save','pd-preset-save-as']) {
    assert.match(ui,new RegExp("iconButton\\('"+name+"'"));
  }
  const start=css.indexOf('#phrase-desk-settings .pd-translation-preset-row .pd-preset-icon-btn {');
  const section=css.slice(start,css.indexOf('}',start)+1);
  assert.match(section,/width: min-content !important/);
  assert.match(section,/padding: 3px 5px !important/);
  assert.match(section,/font-size: inherit !important/);
  assert.match(section,/font-family: inherit !important/);
  assert.doesNotMatch(section,/34px|32px|flex:\s*0\s+0\s+34px/);
});

test('prompt manager matches native theme density instead of oversized text and spacing', () => {
  const js = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  const ui = js.slice(js.indexOf('function setupTranslationPromptLibrary()'), js.indexOf('function setupSettingsPanel()'));
  assert.ok(ui.includes('id="pd-preset-select" class="margin0"'));
  assert.ok(ui.includes('id="pd-global-prompt" class="text_pole" rows="5"'));
  assert.ok(!ui.includes('pd-preset-buttons') && !ui.includes('rows="8"'));
  const blockStart = css.indexOf('#phrase-desk-settings .pd-translation-preset-row #pd-global-prompt {');
  const block = css.slice(blockStart, css.indexOf('}', blockStart));
  assert.ok(block.includes('font-size: 12px !important'));
  assert.ok(block.includes('min-height: 96px !important'));
  assert.ok(css.includes('#phrase-desk-settings .pd-translation-preset-row #pd-preset-select {\n  font-size: 12px !important'));
  assert.ok(css.includes('#pd-global-prompt-status[data-state="builtin"] {\n  display: none !important'));
  assert.ok(!css.includes('min-height: 140px;'));
});
