import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const start = source.indexOf('function openExpandedPrompt(');
const body = source.slice(start, source.indexOf('function promptLibraryHelp(', start));

function fixture({readOnly=false, character=false}={}) {
  let key = 'first';
  const events = [], listeners = {};
  const editor = { id: character ? 'pd-char-prompt' : 'pd-global-prompt', value:'original',
    readOnly, isConnected:true, spellcheck:false, placeholder:'' };
  const expanded = {value:'', addEventListener(name, handler){listeners[name]=handler;}};
  const close = {focus(){}};
  const modal = {dataset:{}, setAttribute(){}, querySelector(sel){return sel==='textarea'?expanded:close;}, addEventListener(){}};
  const backdrop = {0:{}, find(){return [modal];}};
  const document = {getElementById:()=>({value:key})};
  const window = {addEventListener(){}, removeEventListener(){}};
  const opener = {isConnected:true, focus(){}};
  let cleanup, closed=0;
  const fn = new Function('editor','selectorId','opener','document','window','$','currentCharPromptKey',
    'pdT','esc','showModal','closeModals','toast','placeModalInViewport','activeCharacterPromptKey',
    'setCleanup', 'let modalViewportCleanup; '+body+
    ";openExpandedPrompt(editor, selectorId, 'Title', opener);setCleanup(modalViewportCleanup);");
  fn(editor,character?'':'preset',opener,document,window,()=>({trigger:event=>events.push(event)}),
    ()=>key,x=>x,x=>x,()=>backdrop,()=>{closed++;cleanup?.()},()=>{},()=>{},
    'first',value=>cleanup=value);
  return {editor,expanded,events,edit(value){expanded.value=value;listeners.input();},
    switchKey(){key='second';},close(){cleanup();},get closed(){return closed;}};
}

test('one disclosure contains all three existing prompt fields and editor-local expand controls',()=>{
  assert.equal(source.split('setupTranslationPromptGroup();').length,2);
  const group = source.slice(source.indexOf('function setupTranslationPromptGroup()'), start);
  for (const id of ['pd-input-global-prompt','pd-global-prompt','pd-char-prompt']) assert.ok(group.includes(id));
  assert.match(group,/body\.append\(row\)/);
  assert.match(group,/editor\.before\(tools\)/);
  assert.match(group,/body\.hidden = collapsed/);
  assert.match(group,/toggle\.setAttribute\('aria-expanded', String\(!collapsed\)\)/);
  assert.match(group,/collapsed \? 'fa-chevron-down' : 'fa-chevron-up'/);
  assert.match(group,/setCollapsed\(true\)/);
  assert.match(css,/\.pd-prompt-group-body\[hidden\][\s\S]*?display: none !important/);
  assert.doesNotMatch(source,/function setupPromptSection\(/);
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
