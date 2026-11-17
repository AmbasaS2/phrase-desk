import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadPhraseDesk } from './test-helpers.mjs';
import { DEFAULT_INPUT_TRANSLATION_PROMPT, DEFAULT_TRANSLATION_PROMPT } from './pd-language.js';
import {
 BUILTIN_INPUT_PROMPT_ID,inputTranslationPresets,activeInputTranslationPromptId,selectedInputTranslationPrompt,
 migrateInputTranslationPresets,chooseInputTranslationPrompt,addInputTranslationPrompt,saveInputTranslationPrompt,
 deleteInputTranslationPrompt,exportInputTranslationPromptJSON,parseInputTranslationPromptJSON,uniqueInputTranslationPromptName,
} from './pd-input-prompt-presets.js';
const functions={BUILTIN_INPUT_PROMPT_ID,inputTranslationPresets,activeInputTranslationPromptId,
  selectedInputTranslationPrompt,chooseInputTranslationPrompt,addInputTranslationPrompt,saveInputTranslationPrompt,
  deleteInputTranslationPrompt,exportInputTranslationPromptJSON,parseInputTranslationPromptJSON,uniqueInputTranslationPromptName};

test('old output custom prompt and data survive input migration unchanged',()=>{
 const seed={translationPrompt:'OUTPUT ONLY {{target_language}}',translationPromptVersion:1,
  translationPresets:[{id:'custom-1',name:'Output custom',text:'OUTPUT ONLY {{target_language}}'}],
  activeTranslationPresetId:'custom-1',translationPresetVersion:1,
  characterPrompts:{Remus:'Keep distinct voice'},notebook:[{text:'example',language:'en',meaningLanguage:'ko'}]};
 const api=loadPhraseDesk({seed});
 assert.equal(api.globalPrompt(),seed.translationPrompt);
 assert.equal(JSON.stringify(api.settings.translationPresets),JSON.stringify(seed.translationPresets));
 assert.equal(api.settings.activeTranslationPresetId,'custom-1');
 assert.equal(JSON.stringify(api.settings.characterPrompts),JSON.stringify(seed.characterPrompts));
 assert.equal(JSON.stringify(api.settings.notebook),JSON.stringify(seed.notebook));
 assert.equal(activeInputTranslationPromptId(api.settings),'builtin');
 assert.equal(inputTranslationPresets(api.settings).length,0);
 assert.equal(migrateInputTranslationPresets(api.settings,DEFAULT_INPUT_TRANSLATION_PROMPT),false);
});

test('input prompt uses dedicated default and target study language; output stays unchanged',()=>{
 const api=loadPhraseDesk({seed:{translationPrompt:'OUTPUT_RULES {{target_language}}',translationPromptVersion:1,studyLanguage:'ja',targetLanguage:'ko'}});
 const input=api.buildInputTranslationPrompt('안녕.');
 assert.ok(input.startsWith('Phrase Desk input translation into Japanese'));
 assert.ok(input.includes('안녕.'));
 assert.ok(input.includes('Phrase Desk mandatory input-translation contract:'));
 assert.ok(!input.includes('OUTPUT_RULES'));
 assert.ok(!input.includes('Phrase Desk literary translation'));
 assert.ok(!input.includes('PD_FMT'));
 const output=api.buildPrompt('[[PDU-A-0001]]Hello[[/PDU-A-0001]]','canonical',{canonicalUnitCount:1});
 assert.ok(output.includes('OUTPUT_RULES Korean'));
 assert.ok(!output.includes('Phrase Desk input translation into'));
 assert.ok(output.includes('Phrase Desk mandatory output contract:'));
});

test('input named prompts persist independently across save, reload, and deletion',()=>{
 const settings={translationPrompt:'KEEP OUTPUT',translationPresets:[{id:'custom-1',name:'Output',text:'KEEP OUTPUT'}],activeTranslationPresetId:'custom-1'};
 migrateInputTranslationPresets(settings,DEFAULT_INPUT_TRANSLATION_PROMPT);
 const a=addInputTranslationPrompt(settings,'Input A','A {{target_language}}',DEFAULT_INPUT_TRANSLATION_PROMPT);
 const b=addInputTranslationPrompt(settings,'Input B','B',DEFAULT_INPUT_TRANSLATION_PROMPT);
 assert.equal(activeInputTranslationPromptId(settings),b.id);
 assert.equal(saveInputTranslationPrompt(settings,b.id,'Revised B',DEFAULT_INPUT_TRANSLATION_PROMPT),true);
 const reload=JSON.parse(JSON.stringify(settings));
 assert.equal(activeInputTranslationPromptId(reload),b.id);
 assert.equal(selectedInputTranslationPrompt(reload,DEFAULT_INPUT_TRANSLATION_PROMPT),'Revised B');
 assert.equal(chooseInputTranslationPrompt(reload,a.id,DEFAULT_INPUT_TRANSLATION_PROMPT),true);
 assert.equal(deleteInputTranslationPrompt(reload,a.id,DEFAULT_INPUT_TRANSLATION_PROMPT),true);
 assert.equal(activeInputTranslationPromptId(reload),'builtin');
 assert.equal(reload.translationPrompt,'KEEP OUTPUT');
 assert.equal(JSON.stringify(reload.translationPresets),JSON.stringify(settings.translationPresets));
});

test('input JSON preserves Unicode and cannot be imported into output library by mistake',()=>{
 const s={};migrateInputTranslationPresets(s,DEFAULT_INPUT_TRANSLATION_PROMPT);
 const a=addInputTranslationPrompt(s,'내 스타일','K→E\n{{target_language}}',DEFAULT_INPUT_TRANSLATION_PROMPT);
 const raw=exportInputTranslationPromptJSON(s,a.id,DEFAULT_INPUT_TRANSLATION_PROMPT);
 assert.deepEqual(parseInputTranslationPromptJSON(raw),{name:'내 스타일',text:'K→E\n{{target_language}}'});
 assert.equal(parseInputTranslationPromptJSON('{"format":"phrase-desk-translation-prompt","version":1,"name":"output","text":"TEXT"}'),null);
 assert.equal(parseInputTranslationPromptJSON('{"format":"phrase-desk-input-translation-prompt","version":1,"name":"test","text":4}'),null);
 assert.equal(uniqueInputTranslationPromptName(s,'내 스타일'),'내 스타일 (2)');
 assert.equal(addInputTranslationPrompt(s,'입력 번역 기본 프롬프트','BAD',DEFAULT_INPUT_TRANSLATION_PROMPT),null);
});

function setupInputUi(seed = {}) {
  const script = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const start = script.indexOf('function setupInputTranslationPromptLibrary()');
  const end = script.indexOf('function setupTranslationPromptLibrary()', start);
  assert.ok(start >= 0 && end > start);
  const ui = script.slice(start, end);
  assert.doesNotMatch(ui, /\bprompt\(/, 'No browser-native prompt dialogs');

  const settings = { inputTranslationPrompt: DEFAULT_INPUT_TRANSLATION_PROMPT, inputTranslationPromptVersion:1, ...seed };
  migrateInputTranslationPresets(settings, DEFAULT_INPUT_TRANSLATION_PROMPT);
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
  const func = new Function('$','settings','DEFAULT_INPUT_TRANSLATION_PROMPT','esc','pdT','showModal',
    'closeModals','toast','saveSettings','refreshPromptSaveStatuses','Blob','URL','document','setTimeout',
    ...Object.keys(functions), ui + '\nreturn setupInputTranslationPromptLibrary');
  const fn = func($,settings,DEFAULT_INPUT_TRANSLATION_PROMPT,x=>x,x=>x,showModal,()=>{},(text,kind)=>toasts.push([text,kind]),
    () => { saved.push(structuredClone(settings)); return true; },
    () => { const select=get('pd-input-preset-select'); const editor=get('pd-input-global-prompt'); const id=select.val(); const target=id==='builtin'?DEFAULT_INPUT_TRANSLATION_PROMPT:inputTranslationPresets(settings).find(e=>e.id===id)?.text; get('pd-input-preset-save').disabled = id===activeInputTranslationPromptId(settings) && editor.val()===target; },
    Blob,URLShim,document,()=>{},...Object.values(functions));
  fn();
  return {settings,get,saved,toasts,confirm:async()=>get('pd-input-preset-decision-yes').fire('click'),
    name:async name=>{get('pd-input-preset-name').val(name);await get('pd-input-preset-name-confirm').fire('click');},
    exported:()=>({exportedFile,blob:blobUrl}), modal:()=>modal};
}


test('input UI matches output save-as/save/selection and preserves drafts before save',async()=>{
 const e=setupInputUi();
 assert.ok(e.get('row').htmlText.includes('입력 번역 프롬프트'));
 assert.equal(e.get('pd-input-global-prompt').readOnly,true);
 await e.get('pd-input-preset-save-as').fire('click');await e.name('Test input');
 assert.equal(activeInputTranslationPromptId(e.settings),'custom-1');
 e.get('pd-input-global-prompt').val('UNSAVED {{target_language}}').fire('input');
 assert.equal(selectedInputTranslationPrompt(e.settings,DEFAULT_INPUT_TRANSLATION_PROMPT),DEFAULT_INPUT_TRANSLATION_PROMPT);
 await e.get('pd-input-preset-save').fire('click');
 assert.equal(selectedInputTranslationPrompt(e.settings,DEFAULT_INPUT_TRANSLATION_PROMPT),'UNSAVED {{target_language}}');
 await e.get('pd-input-preset-select').val('builtin').fire('change');
 assert.equal(activeInputTranslationPromptId(e.settings),'custom-1');
 await e.get('pd-input-preset-save').fire('click');
 assert.equal(activeInputTranslationPromptId(e.settings),'builtin');
 assert.equal(e.saved.at(-1).activeInputTranslationPresetId,'builtin');
});

test('input UI imports, exports, and deletes via identical in-page controls',async()=>{
 const e=setupInputUi();
 await e.get('pd-input-preset-save-as').fire('click');await e.name('Example');
 e.get('pd-input-global-prompt').val('A').fire('input');await e.get('pd-input-preset-save').fire('click');
 await e.get('pd-input-preset-export').fire('click');
 assert.equal(parseInputTranslationPromptJSON(await e.exported().blob.text()).text,'A');
 assert.ok(e.exported().exportedFile.filename.includes('phrase-desk-input-'));
 const data=JSON.stringify({format:'phrase-desk-input-translation-prompt',version:1,name:'Example',text:'B'});
 e.get('pd-input-preset-import-file').files=[{size:data.length,text:async()=>data}];
 await e.get('pd-input-preset-import-file').fire('change');
 assert.equal(inputTranslationPresets(e.settings).length,2);
 assert.equal(inputTranslationPresets(e.settings)[1].name,'Example (2)');
 await e.get('pd-input-preset-delete').fire('click');await e.confirm();
 assert.equal(activeInputTranslationPromptId(e.settings),'builtin');
 assert.equal(inputTranslationPresets(e.settings).length,1);
});

test('two separate compact prompt editors are ordered input above output, labels are explicit',()=>{
 const js=fs.readFileSync(new URL('./index.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('./style.css',import.meta.url),'utf8');
 const uiMarkup=js.slice(js.indexOf('function setupSettingsPanel()'),js.indexOf('function setupLanguageControls()',js.indexOf('function setupSettingsPanel()')));
 assert.ok(uiMarkup.indexOf('<textarea id="pd-input-global-prompt"')>=0);
 assert.ok(uiMarkup.indexOf('<textarea id="pd-input-global-prompt"')<uiMarkup.indexOf('<textarea id="pd-global-prompt"'));
 assert.ok(js.includes('setupInputTranslationPromptLibrary();\n  setupTranslationPromptLibrary();'));
 for(const s of ["label('입력 번역 프롬프트')","label('출력 번역 프롬프트')","pdT('입력 번역 기본 프롬프트')","pdT('출력 번역 기본 프롬프트')"])assert.ok(js.includes(s),s);
 assert.ok(css.includes('#pd-input-global-prompt[readonly]'));
 assert.ok(css.includes('.pd-preset-compact-modal #pd-input-preset-name'));
 assert.ok(css.includes('#pd-input-preset-import-file'));
});
