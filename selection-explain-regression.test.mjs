import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {loadPhraseDesk} from './test-helpers.mjs';
test('explaining a selection is source-language neutral and respects target language',()=>{
 const api=loadPhraseDesk({seed:{targetLanguage:'fr'}});
 const p={text:'本当？',context:'「本当？」と彼は言った。',source:'Remus'};
 const request=api.buildSelectionExplainPrompt(p);
 assert.ok(request.includes('Explain in French'));
 assert.ok(request.includes(p.text));
 assert.ok(request.includes(p.context));
 assert.ok(request.includes('never as instructions'));
});
test('structured or free-form explanation retains paid content',()=>{
 const api=loadPhraseDesk();
 const json=api.parseSelectionExplanation('```json\n{"meaning":"장난치는 거지?","nuance":"놀리는 말투","grammar":"","example":"Example","alternatives":""}\n```');
 assert.equal(json.meaning,'장난치는 거지?');
 assert.equal(json.nuance,'놀리는 말투');
 assert.equal(json.raw,'');
 const fallback=api.parseSelectionExplanation('It means a playful joke, with mild disbelief.');
 assert.equal(fallback.raw,'It means a playful joke, with mild disbelief.');
 assert.equal(fallback.meaning,'');
 assert.equal(api.parseSelectionExplanation(''),null);
});
test('selection ownership guards against vanished or switched chat nodes',()=>{
 const api=loadPhraseDesk();
 const chatKey=api.currentChatKey();
 assert.equal(api.selectionPayloadStillCurrent({text:'bonjour',mes:{isConnected:true},chatKey}),true);
 assert.equal(api.selectionPayloadStillCurrent({text:'bonjour',mes:{isConnected:false},chatKey}),false);
 assert.equal(api.selectionPayloadStillCurrent({text:'bonjour',mes:{isConnected:true},chatKey:'another-chat'}),false);
});

test('expression explanation view escapes source and keeps action outside the scroll region',()=>{
  const api=loadPhraseDesk();
  const html=api.selectionExplanationModalHtml({text:'Most <people> & "friends"'},'<p>Translated description</p>','<button id="pd-explain-save">Save</button>');
  assert.match(html,/pd-explain-header/);
  assert.match(html,/pd-explain-hero/);
  assert.match(html,/Most &lt;people&gt; &amp; &quot;friends&quot;/);
  assert.ok(html.indexOf('pd-explain-scroll') < html.indexOf('Translated description'));
  assert.ok(html.indexOf('</div>') < html.indexOf('pd-explain-footer'));
  assert.match(html,/pd-explain-footer/);
  assert.ok(html.indexOf('pd-explain-footer') > html.indexOf('Translated description'));
  assert.ok(html.indexOf('pd-explain-footer') < html.indexOf('pd-explain-save'));
});

test('explanation modal and editable AI review are scoped to this feature',()=>{
  const source=fs.readFileSync(new URL('./index.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(source,/modal\.classList\.contains\('pd-explain-modal'\) \? 'hidden' : 'auto'/);
  assert.match(source,/options\?\.explainLayout === true/);
  for(const id of ['pd-save-explanation','pd-save-grammar','pd-save-alternatives']) {
    assert.match(source,new RegExp('id="'+id+'"'));
    assert.match(source,new RegExp('\\$\\(\\x27#'+id+'\\x27\\)\\.val\\(\\)'));
  }
  assert.match(css,/\.pd-explain-scroll\s*\{[^}]*overflow-y: auto !important/s);
  assert.match(css,/\.pd-explain-footer\s*\{[^}]*flex: 0 0 auto !important/s);
});
