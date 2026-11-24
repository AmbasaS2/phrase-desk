import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const start = source.indexOf('function closeExpandedPrompt(');
const body = source.slice(start, source.indexOf('function promptLibraryHelp(', start));

function fixture({readOnly=false, character=false}={}) {
  let key = 'first';
  const events = [], listeners = {};
  const editor = { id: character ? 'pd-char-prompt' : 'pd-global-prompt', value:'original',
    readOnly, isConnected:true, spellcheck:false, placeholder:'' };
  const expanded = {value:'', addEventListener(name, handler){listeners[name]=handler;}};
  const modal = {classList:{add(){}}, setAttribute(){}, querySelector(){return expanded;},
    addEventListener(){}, style:{setProperty(){}}};
  let popup, closed=0, removed=0;
  class Popup {
    constructor(content,type,input,options) {
      this.dlg=modal; this.options=options; popup=this;
    }
    show(){return Promise.resolve();}
    completeCancelled(){closed++;this.options.onClosing();this.options.onClose();return Promise.resolve();}
  }
  const document = {getElementById:()=>({value:key})};
  const window = {innerHeight:800, addEventListener(){}, removeEventListener(){removed++;}};
  const opener = {isConnected:true, focus(){}};
  const fn = new Function('editor','selectorId','opener','document','window','$','currentCharPromptKey',
    'pdT','esc','Popup','POPUP_TYPE','POPUP_RESULT','closeModals','toast','activeCharacterPromptKey',
    'let activeExpandedPrompt=null; '+body+
    ";openExpandedPrompt(editor, selectorId, 'Title', opener);");
  fn(editor,character?'':'preset',opener,document,window,()=>({trigger:event=>events.push(event)}),
    ()=>key,x=>x,x=>x,Popup,{TEXT:1},{NEGATIVE:0},()=>{},()=>{},'first');
  return {editor,expanded,events,options:popup.options,edit(value){expanded.value=value;listeners.input();},
    switchKey(){key='second';},close(){popup.options.onClosing();popup.options.onClose();},get closed(){return closed;},
    get removed(){return removed;}};
}

test('one advanced disclosure contains the existing options and all three prompt fields',()=>{
  assert.equal(source.split('setupAdvancedSettingsGroup();').length,2);
  const group = source.slice(source.indexOf('function setupAdvancedSettingsGroup()'), start);
  for (const id of ['pd-input-global-prompt','pd-global-prompt','pd-char-prompt']) assert.ok(group.includes(id));
  assert.match(group,/body\.append\(row\)/);
  assert.match(group,/body\.append\(options\)/);
  assert.match(group,/title\.textContent = pdT\('고급 설정'\)/);
  assert.match(group,/querySelector\('\.pd-preset-top-actions'\)\.prepend\(expand\)/);
  assert.match(group,/heading\.append\(label, expand\)/);
  assert.match(group,/body\.hidden = collapsed/);
  assert.match(group,/toggle\.setAttribute\('aria-expanded', String\(!collapsed\)\)/);
  assert.match(group,/collapsed \? 'fa-chevron-down' : 'fa-chevron-up'/);
  assert.match(group,/setCollapsed\(true\)/);
  assert.match(css,/\.pd-advanced-group-body\[hidden\][\s\S]*?display: none !important/);
  assert.doesNotMatch(source,/function setupPromptSection\(/);
});

test('advanced disclosure is a single theme-aware callout with a full-width header',()=>{
  assert.match(source,/settingsIcon\.className = 'fa-solid fa-sliders'/);
  const style = css.slice(css.indexOf('#phrase-desk-settings .pd-advanced-group {'),css.indexOf('/* Equal columns on the two preset-action rows'));
  assert.match(style,/border: 1px solid var\(--SmartThemeBorderColor/);
  assert.match(style,/color-mix\(in srgb, var\(--SmartThemeBodyColor/);
  assert.match(style,/\.pd-advanced-group-toggle \{[\s\S]*?width: 100% !important/);
  assert.match(style,/\.pd-advanced-group-body \{[\s\S]*?border-top: 1px solid var\(--SmartThemeBorderColor/);
});

test('native popup inherits theme and does not force a full-height dialog',()=>{
  const f=fixture();
  assert.equal(f.options.okButton,false);
  assert.equal(f.options.cancelButton,'닫기');
  assert.equal(f.options.large,undefined);
  assert.equal(f.options.allowVerticalScrolling,true);
  assert.match(source,/new Popup\(/);
  assert.match(css,/dialog\.popup\.pd-prompt-editor-popup \{[\s\S]*?height: fit-content !important/);
  f.close();
  assert.equal(f.removed,1);
});

test('expand precedes export while the original three paired action columns stay aligned',()=>{
  assert.match(css,/grid-template-columns: repeat\(4, var\(--pd-preset-button-size\)\)/);
  assert.match(css,/grid-template-columns: minmax\(0, 1fr\) repeat\(3, var\(--pd-preset-button-size\)\)/);
  assert.match(css,/\.pd-char-prompt-heading > \.pd-prompt-expand \{/);
  assert.doesNotMatch(css,/\.pd-prompt-editor-wrap/);
  assert.doesNotMatch(css,/padding-inline-end: 42px !important/);
  assert.doesNotMatch(source,/setupTranslationPromptGroup\(/);
});

test('expanded editor uses the original input event and preserves manual-save behavior',()=>{
  const f=fixture();
  assert.equal(f.expanded.value,'original');
  f.edit('new draft\n한글');
  assert.equal(f.editor.value,'new draft\n한글');
  f.close();
  assert.deepEqual(f.events,['input']);
});

test('built-in prompt remains read-only even on synthetic input',()=>{
  const f=fixture({readOnly:true});
  assert.equal(f.expanded.readOnly,true);
  f.edit('attempt');
  assert.equal(f.editor.value,'original');
  assert.equal(f.expanded.value,'original');
  assert.deepEqual(f.events,[]);
});

test('character editor flushes existing autosave path on close',()=>{
  const f=fixture({character:true});
  f.edit('character notes');
  f.close();
  assert.equal(f.editor.value,'character notes');
  assert.deepEqual(f.events,['input','change']);
});

test('stale preset or character changes cannot overwrite a new target',()=>{
  for (const character of [false,true]) {
    const f=fixture({character});
    f.switchKey();
    f.editor.value='new target';
    f.edit('stale text');
    assert.equal(f.editor.value,'new target');
    assert.equal(f.closed,1);
    assert.deepEqual(f.events,[]);
  }
});
