import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const ui = js.slice(js.indexOf('function setupTranslationPromptLibrary()'), js.indexOf('function setupSettingsPanel()'));
const modalSource = js.slice(js.indexOf('function placeModalInViewport('), js.indexOf('function showModal(', js.indexOf('function placeModalInViewport(')));
function renderPlacement(compact, width, height = 800) {
  const rules = new Map();
  const backdropRules = new Map();
  const modal = {
    classList:{contains:name=>name==='pd-preset-compact-modal' ? compact : false},
    style:{setProperty:(key,value)=>rules.set(key,value)},
  };
  const backdrop = {style:{setProperty:(key,value)=>backdropRules.set(key,value)}};
  const $ = ()=>({children:()=>[modal]});
  const fn = new Function('$','visibleViewportBox',modalSource+'return placeModalInViewport;')(
    $,()=>({left:0,top:0,width,height}));
  fn(backdrop);
  return {rules,backdropRules};
}
function ruleFor(selector) {
  const start = css.lastIndexOf(selector+' {');
  assert.ok(start>=0,'Missing selector: '+selector);
  return css.slice(start, css.indexOf('}',start)+1);
}

test('only prompt save-as/confirm dialogs opt into compact modal',()=>{
  assert.equal((ui.match(/compactPrompt: true/g)||[]).length,2);
  assert.ok(js.includes("const compactClass = options?.compactPrompt === true ? ' pd-preset-compact-modal' : '';"));
  assert.ok(js.includes('pd-modal\${explainClass}\${compactClass}'));
  assert.ok(!ui.includes('window.prompt('));
});

test('viewport width is compact at desktop/phone, but other Phrase Desk modals keep 720px',()=>{
  assert.equal(renderPlacement(true,507).rules.get('width'),'400px');
  assert.equal(renderPlacement(true,390).rules.get('width'),'370px');
  assert.equal(renderPlacement(true,320).rules.get('width'),'300px');
  assert.equal(renderPlacement(false,1000).rules.get('width'),'720px');
  assert.equal(renderPlacement(false,507).rules.get('width'),'481px');
});

test('prompt dialog has iRiver-scale title, 26px input, 24px buttons and reduced padding',()=>{
  const parent='body > .pd-modal-backdrop.pd-viewport-modal > .pd-modal.pd-preset-compact-modal';
  const base=ruleFor(parent);
  assert.match(base,/padding: 14px 16px !important/);
  assert.match(base,/background: var\(--SmartThemeBlurTintColor,/);
  assert.match(base,/box-shadow: none !important/);
  const title=ruleFor(parent+' h3.pd-preset-dialog-title');
  assert.match(title,/font-size: 13px !important/);
  assert.match(title,/margin: 0 0 10px !important/);
  const input=ruleFor(parent+' #pd-preset-name');
  assert.match(input,/height: 26px !important/);
  assert.match(input,/min-height: 26px !important/);
  assert.match(input,/font-size: 12px !important/);
  const buttons=ruleFor(parent+' .pd-preset-dialog-actions .menu_button');
  assert.match(buttons,/height: 24px !important/);
  assert.match(buttons,/min-width: 0 !important/);
  assert.match(buttons,/font-size: 12px !important/);
});

test('all compact rules are scoped and translation version matches manifest',()=>{
  const start=css.indexOf('/* Compact name/confirmation dialogs in the translation prompt manager only.');
  const boundary=css.indexOf('/* Input prompt library mirrors the established output prompt controls',start);
  const compactCss=css.slice(start,boundary>=0?boundary:undefined);
  assert.ok(compactCss);
  const selectors = compactCss.split('\n').filter(line=>line.trim().endsWith(' {'));
  assert.ok(selectors.length>=5);
  for(const line of selectors)assert.match(line,/\.pd-preset-compact-modal/);
  const manifest=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'1.6.3');
  assert.match(js,/const PD_VERSION = "1\.6\.3"/);
});
