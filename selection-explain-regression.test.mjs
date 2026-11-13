import assert from 'node:assert/strict';
import test from 'node:test';
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
