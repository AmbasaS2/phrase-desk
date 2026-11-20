import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadPhraseDesk } from './test-helpers.mjs';
import {
  PD_LEARNING_FILE_PATH, PD_LEARNING_KEYS, createPhraseDeskLearningStore, pickLearningData,
} from './pd-learning-storage.js';

function server() {
  const files = new Map();
  let failUpload = false;
  let corruptRead = false;
  let uploads = 0;
  const response = (data, status = 200) => ({
    ok:status >= 200 && status < 300, status,
    json:async () => structuredClone(data),
  });
  const request = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    if (url === '/api/files/verify') {
      return response(Object.fromEntries(body.urls.map(key => [key, files.has(key)])));
    }
    if (url === '/api/files/upload') {
      if (failUpload) { failUpload = false; return response({},500); }
      const path = '/user/files/' + body.name;
      const data = JSON.parse(Buffer.from(body.data, 'base64').toString('utf8'));
      files.set(path, data);
      uploads++;
      return response({ path });
    }
    if (options.method === 'GET') {
      if (!files.has(url)) return response({},404);
      return response(corruptRead ? { format:'INVALID' } : files.get(url));
    }
    throw new Error('Unexpected API route: '+url);
  };
  const factory = () => createPhraseDeskLearningStore({
    request, headers:()=>({'Content-Type':'application/json'}),
    encode:async value => Buffer.from(JSON.stringify(value),'utf8').toString('base64'),
    now:()=>1763600000000, random:()=>0.5,
  });
  return {
    files, request, factory,
    failNextUpload(){ failUpload=true; },
    setCorruption(yes){corruptRead=yes;},
    get uploads(){return uploads},
  };
}
const json = obj => JSON.parse(JSON.stringify(obj));
const makeSeed = (count = 500) => ({
  profile:'my-profile', translationPrompt:'Keep my unchanged output prompt.',
  notebook:Array.from({length:count},(_,i)=>({
    id:'note-'+i, text:'wake with a start '+i, meaning:'깜짝 놀라 깨다 '+i, language:'en', meaningLanguage:'ko',
    context:'A '.repeat(45)+'sentence '+i, contextKo:'긴 한국어 문맥 '+i,
    tags:['잠','서사'], status:i%2?'learning':'new', vocabulary:'단어 설명 '+i,
  })),
  quizHistory:[{id:'q1', language:'en',meaningLanguage:'ko',dateKey:'2026-11-19',results:[{id:'note-1',ok:false,prompt:'a'}]}],
  practiceHistory:[{id:'p1',language:'en',meaningLanguage:'ko',target:'wake with a start',answer:'문장'}],
  hiddenWrongNotes:['q1_0'],recentPracticeNoteIds:['note-2'],
});

test('original large learning records move to a read-back verified server file and keep a separate original backup', async()=>{
  const s=server(), legacy=makeSeed(1800);
  const api=loadPhraseDesk({seed:legacy,learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),true);
  const root=api.sandbox.extension_settings['phrase-desk'];
  assert.equal(root.profile,legacy.profile);
  assert.equal(root.translationPrompt,legacy.translationPrompt);
  for(const field of PD_LEARNING_KEYS){
    assert.ok(!Object.hasOwn(root,field),'heavy '+field+' removed from saved settings');
  }
  assert.equal(root.learningStorage.format,'server-files-v1');
  assert.equal(root.learningStorage.path,PD_LEARNING_FILE_PATH);
  assert.ok(root.learningStorage.legacyBackup.startsWith('/user/files/phrase-desk-learning-legacy-'));
  assert.equal(s.files.get(root.learningStorage.legacyBackup).data.notebook.length,1800);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,1800);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).revision,1);
  assert.equal(api.settings.notebook.length,1800);
  assert.equal(api.settings.quizHistory.length,1);
  assert.ok(JSON.stringify(root).length < JSON.stringify(legacy).length/10,'settings should shrink sharply');
  const reopened=loadPhraseDesk({seed:json(root),learningStoreFactory:s.factory});
  assert.equal(await reopened.initializeLearningStorage(),true);
  assert.deepEqual(json(reopened.settings.notebook),legacy.notebook);
  assert.deepEqual(json(reopened.settings.quizHistory),legacy.quizHistory);
  assert.deepEqual(json(reopened.settings.practiceHistory),legacy.practiceHistory);
  assert.deepEqual(json(reopened.settings.hiddenWrongNotes),legacy.hiddenWrongNotes);
  assert.deepEqual(json(reopened.settings.recentPracticeNoteIds),legacy.recentPracticeNoteIds);
});

test('failed upload never deletes the old settings copy and blocks editing',async()=>{
  const s=server(), old=makeSeed(35);
  const api=loadPhraseDesk({seed:old,learningStoreFactory:s.factory});
  s.failNextUpload();
  assert.equal(await api.initializeLearningStorage(),false);
  const root=api.sandbox.extension_settings['phrase-desk'];
  assert.equal(root.notebook.length,35);
  assert.equal(root.quizHistory.length,1);
  assert.equal(root.learningStorage,undefined);
  const previous=api.settings.notebook.length;
  assert.equal(api.addNote({text:'an unsafe edit',meaning:'편집'}),null);
  assert.equal(api.settings.notebook.length,previous);
});

test('missing or invalid server file with a stored pointer does not silently start an empty notebook',async()=>{
  const s=server(), marker={format:'server-files-v1',path:PD_LEARNING_FILE_PATH};
  const api=loadPhraseDesk({seed:{...makeSeed(3),learningStorage:marker},learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),false);
  assert.equal(api.settings.notebook.length,3);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].notebook.length,3);
});

test('a pre-existing verified file is recovered after a crash before settings pointer migration',async()=>{
  const s=server(), old=makeSeed(5), file=s.factory();
  await file.write(pickLearningData(old),0);
  const api=loadPhraseDesk({seed:old,learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),true);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).revision,1,'no duplicate write for identical data');
  assert.equal(api.sandbox.extension_settings['phrase-desk'].notebook,undefined);
});

test('a divergent legacy copy is not overwritten by an unrelated file',async()=>{
  const s=server(), old=makeSeed(5), file=s.factory();
  await file.write(pickLearningData(makeSeed(6)),0);
  const api=loadPhraseDesk({seed:old,learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),false);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].notebook.length,5);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,6);
});

test('another device revision prevents stale device from overwriting its newer changes',async()=>{
  const s=server(), a=s.factory(), b=s.factory();
  const one=pickLearningData(makeSeed(2));
  const first=await a.write(one,0);
  const later=pickLearningData(makeSeed(3));
  await b.write(later,first.revision);
  await assert.rejects(()=>a.write(one,first.revision),/another device/);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,3);
});

test('failed import preserves prior file and memory; successful import and reset commit before changing UI',async()=>{
  const s=server(), initial=makeSeed(6);
  const api=loadPhraseDesk({seed:initial,learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),true);
  vm.runInContext('renderNotebook=()=>{}; updateSavedCount=()=>{}; closeModals=()=>{};',api.sandbox);
  const originalRevision=s.files.get(PD_LEARNING_FILE_PATH).revision;
  const incoming={notebook:[{id:'import1',text:'A phrase',meaning:'새로운 뜻',context:'Good context.'}]};
  s.failNextUpload();
  await assert.rejects(()=>api.applyImportedLearningData(incoming));
  assert.equal(api.settings.notebook.length,6);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).revision,originalRevision);
  await api.applyImportedLearningData(incoming);
  assert.equal(api.settings.notebook.length,1);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook[0].text,'A phrase');
  assert.equal(api.settings.quizHistory.length,1,'partial import preserves unrelated study history');
  await api.resetLearningData();
  assert.equal(api.settings.notebook.length,0);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,0);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.quizHistory.length,0);
});

test('wordbook updates never reintroduce heavy arrays into settings.json',async()=>{
  const s=server(),api=loadPhraseDesk({seed:makeSeed(10),learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),true);
  api.settings.notebook.push({id:'new',text:'go on',meaning:'계속하다'});
  const after=await api.queueLearningSnapshot();
  assert.equal(after.data.notebook.length,11);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).revision,2);
  api.settings.fontSize=17;
  assert.equal(api.saveSettings(true),true);
  const root=api.sandbox.extension_settings['phrase-desk'];
  assert.equal(root.fontSize,17);
  assert.ok(!Object.hasOwn(root,'notebook'));
  assert.ok(!Object.hasOwn(root,'quizHistory'));
});

test('no existing vocabulary does not create an empty server file on every startup',async()=>{
  const s=server();
  const api=loadPhraseDesk({seed:{profile:'unchanged'},learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),true);
  assert.equal(s.uploads,0);
  assert.equal(s.files.size,0);
  assert.equal(api.settings.notebook.length,0);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].profile,'unchanged');
  api.settings.notebook.push({id:'first',text:'come on',meaning:'어서'});
  await api.queueLearningSnapshot();
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,1);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].learningStorage.format,'server-files-v1');
});

test('a failed ST settings commit keeps the legacy copy, while verified server data remains recoverable',async()=>{
  const s=server(), legacy=makeSeed(12);
  const api=loadPhraseDesk({seed:legacy,learningStoreFactory:s.factory});
  api.context.saveSettings=async()=>{throw new Error('ST settings commit rejected')};
  assert.equal(await api.initializeLearningStorage(),false);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].notebook.length,12);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,12);
  assert.ok([...s.files.keys()].some(k=>k.includes('phrase-desk-learning-legacy-')));
  const reload=loadPhraseDesk({
    seed:json(api.sandbox.extension_settings['phrase-desk']),learningStoreFactory:s.factory,
  });
  assert.equal(await reload.initializeLearningStorage(),true);
  assert.equal(reload.settings.notebook.length,12);
  assert.equal(reload.sandbox.extension_settings['phrase-desk'].notebook,undefined);
});

test('a stale legacy copy is not discarded even when a new storage marker is present',async()=>{
  const s=server();
  await s.factory().write(pickLearningData(makeSeed(4)),0);
  const stale=makeSeed(5);
  stale.learningStorage={format:'server-files-v1',path:PD_LEARNING_FILE_PATH};
  const api=loadPhraseDesk({seed:stale,learningStoreFactory:s.factory});
  assert.equal(await api.initializeLearningStorage(),false);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].notebook.length,5);
  assert.equal(s.files.get(PD_LEARNING_FILE_PATH).data.notebook.length,4);
});

test('failed read-back verification never deletes legacy settings',async()=>{
  const s=server(), legacy=makeSeed(24), factory=()=>({
    read:async()=>null,
    backupLegacy:async()=>'/user/files/phrase-desk-learning-legacy-safe.json',
    write:async()=>{throw new Error('Read-back verification failed');},
  });
  const api=loadPhraseDesk({seed:legacy,learningStoreFactory:factory});
  assert.equal(await api.initializeLearningStorage(),false);
  assert.equal(api.sandbox.extension_settings['phrase-desk'].notebook.length,24);
  assert.equal(api.settings.notebook.length,24);
});

test('rapid study updates coalesce pending full-file snapshots rather than uploading every change',async()=>{
  const s=server();
  const seed=makeSeed(2);
  const initial=await s.factory().write(pickLearningData(seed),0);
  let releaseFirst;
  const snapshots=[];
  let revision=initial.revision;
  const firstPromise=new Promise(resolve=>{releaseFirst=resolve});
  const factory=()=>({
    read:async()=>({revision,data:pickLearningData(seed)}),
    write:async(data,expected)=>{
      snapshots.push({count:data.notebook.length,revision:expected});
      if(snapshots.length===1)await firstPromise;
      if(expected!==revision)throw new Error('conflict');
      revision++;
      return {revision,data};
    },
  });
  const api=loadPhraseDesk({seed:{learningStorage:{format:'server-files-v1',path:PD_LEARNING_FILE_PATH}},learningStoreFactory:factory});
  assert.equal(await api.initializeLearningStorage(),true);
  api.settings.notebook.push({id:'one',text:'one',meaning:'하나'});
  const one=api.queueLearningSnapshot();
  api.settings.notebook.push({id:'two',text:'two',meaning:'둘'});
  const two=api.queueLearningSnapshot();
  api.settings.notebook.push({id:'three',text:'three',meaning:'셋'});
  const three=api.queueLearningSnapshot();
  assert.equal(snapshots.length,1,'only first upload starts while others coalesce');
  releaseFirst();
  await Promise.all([one,two,three]);
  assert.equal(snapshots.length,2,'last two full snapshots share one write');
  assert.deepEqual(snapshots.map(x=>x.count),[3,5]);
  assert.equal(revision,3);
});
