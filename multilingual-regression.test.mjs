import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import * as lang from './pd-language.js';
import { pdTranslationKey } from './pd-i18n.js';
import { normalizePhraseDeskImportPayload } from './pd-safe-utils.js';
import { loadPhraseDesk, cannedCanonical } from './test-helpers.mjs';

test('language settings migrate once without changing user text or character prompts', () => {
  const settings = { globalPrompt:'Keep this exact preference.\n名前', characterPrompts:{Remus:'Keep his voice.'},
    notebook:[{id:'old',text:'right now',meaning:'지금 바로',custom:{value:1}}], quizHistory:[{id:'q'}],practiceHistory:[{id:'p'}] };
  const before = structuredClone(settings);
  assert.equal(lang.migrateLanguageSettings(settings,lang.DEFAULT_TRANSLATION_PROMPT),true);
  assert.equal(settings.legacyGlobalPrompt,before.globalPrompt);
  assert.ok(settings.translationPrompt.endsWith(before.globalPrompt));
  assert.deepEqual(settings.characterPrompts,before.characterPrompts);
  assert.equal(settings.notebook[0].text,before.notebook[0].text);
  assert.equal(settings.notebook[0].meaning,before.notebook[0].meaning);
  assert.equal(settings.notebook[0].language,'en');
  assert.equal(settings.notebook[0].meaningLanguage,'ko');
  const migrated=structuredClone(settings);
  assert.equal(lang.migrateLanguageSettings(settings,lang.DEFAULT_TRANSLATION_PROMPT),false);
  assert.deepEqual(settings,migrated);
  assert.doesNotMatch(lang.DEFAULT_TRANSLATION_PROMPT,/PDU|PD_FMT/);
});

test('locale and custom language resolution, without promising model language support', () => {
  assert.equal(lang.resolveLanguage('auto','fr-fr').key,'fr');
  assert.equal(lang.resolveLanguage('auto','ja-jp').key,'ja');
  assert.equal(lang.resolveLanguage('auto','zh-tw').code,'zh-TW');
  assert.equal(lang.resolveLanguage('custom','ko','Esperanto','eo').code,'eo');
  assert.equal(lang.resolveLanguage('custom','ko','Klingon','').key,'custom:klingon');
  assert.equal(lang.resolveLanguage('custom','ko','','').valid,false);
  assert.equal(lang.normalizeLanguageCode('<script>',''),'');
});

test('canonical source planning includes French, Japanese, Chinese, Cyrillic, Arabic and mixed scripts', () => {
  const api=loadPhraseDesk();
  for(const text of ['Bonjour, mon ami !','「こんにちは。元気ですか？」','你好，朋友。','Привет, друг!','مرحبا يا صديقي!','Hello. «Je t’aime.» 「待って！」']) {
    const plan=api.createCanonicalTranslationPlan(text);
    assert.ok(plan.items.length>0,text);
    const covered=plan.items.map(x=>x.sourceText).join('');
    for(const char of Array.from(text).filter(c=>/\p{L}/u.test(c))) assert.ok(covered.includes(char),text+' / '+char);
  }
});

test('translation parser and every bilingual view accept non-Korean targets and preserve original', () => {
  for(const [target,source,translated] of [
    ['ko','「こんにちは！」','안녕하세요!'],
    ['en','«Bonjour !»','Hello!'],
    ['fr','「こんにちは！」','Bonjour !'],
    ['ja','"Good morning!"','おはようございます！'],
    ['es','"Good morning!"','¡Buenos días!'],
  ]) {
    const api=loadPhraseDesk({seed:{targetLanguage:target}});
    const {record}=cannedCanonical(api,source,[translated]);
    assert.equal(record.complete,true,target);
    assert.equal(record.targetLanguage,target);
    assert.equal(api.canonicalRecordValid(record,source),true,target);
    assert.ok(api.renderCanonicalTranslation(record,`ko:lang:${target}`).includes(translated));
    for(const style of ['side_sentence','below_sentence','by_line','by_paragraph','separate']) {
      const view=api.renderCanonicalTranslation(record,`full:${style}:v8:lang:${target}`);
      assert.ok(view.includes(translated),target+'/'+style);
      assert.ok(view.includes(source.slice(1,-1)),target+'/'+style+'/source-body');
      assert.ok(view.includes(source[0]) && view.includes(source.at(-1)),target+'/'+style+'/quotes');
      if (style === 'separate') assert.ok(view.includes(source),target+'/separate/exact-source');
      assert.doesNotMatch(view,/PDU-|PD_FMT/);
    }
    const dialogue=api.renderCanonicalTranslation(record,`dialogue:lang:${target}`);
    assert.ok(dialogue.includes(translated));
    assert.ok(dialogue.includes(source.slice(1,-1)));
    assert.equal(record.source,source);
  }
});

test('partial or malformed alignment preserves paid model text without a retry', () => {
  const api=loadPhraseDesk({seed:{targetLanguage:'fr'}});
  const source='"Hello!" She waved.';
  const plan=api.createCanonicalTranslationPlan(source);
  const raw='« Bonjour ! » Elle fit un signe de la main.';
  const record=api.parseCanonicalTranslationResult(raw,plan,'profile');
  const view=api.renderCanonicalTranslation(record,'full:side_sentence:v8:lang:fr');
  assert.ok(view.includes('Bonjour'));
  assert.ok(view.includes('Elle fit'));
  assert.doesNotMatch(view,/PDU-/);
});

test('language-separated caches preserve old Korean and never reuse it for another target', () => {
  const api=loadPhraseDesk();const source='"Hello, friend!"';
  const korean=cannedCanonical(api,source,['안녕, 친구!']).record;
  delete korean.targetLanguage;delete korean.targetCode; // legacy record
  const state={original:source,originalHash:api.hash(source),canonical:korean,translations:{}};
  api.settings.targetLanguage='fr';
  assert.equal(api.pickCachedMessageTranslation(state,'full:side_sentence:v8:lang:fr').text,'');
  const french=cannedCanonical(api,source,['Bonjour, mon ami !']).record;
  api.rememberCanonicalLanguage(state,french);
  assert.equal(state.canonicals.ko.plainKorean,korean.plainKorean);
  assert.equal(state.canonical.plainKorean,french.plainKorean);
  assert.equal(Object.hasOwn(state.canonicals,'fr'),false,'active cache must not be duplicated');
  assert.ok(api.pickCachedMessageTranslation(state,'full:side_sentence:v8:lang:ko').text.includes('안녕'));
  assert.ok(api.pickCachedMessageTranslation(state,'full:side_sentence:v8:lang:fr').text.includes('Bonjour'));
  const cloned=api.clonePhraseStore({variants:{one:state}});
  cloned.variants.one.canonicals.ko.units[0].ko='changed';
  assert.notEqual(state.canonicals.ko.units[0].ko,'changed');
  assert.equal(api.pickCachedMessageTranslation({translations:{ko:'옛 번역'}},'ko:lang:ko').text,'옛 번역');
  assert.equal(api.pickCachedMessageTranslation({translations:{ko:'옛 번역'}},'ko:lang:fr').text,'');
});

test('custom prompt replaces literary default but never removes structural contract', () => {
  const api=loadPhraseDesk({seed:{targetLanguage:'fr',translationPromptVersion:1,translationPrompt:'Use a terse voice in {{target_language}}.'}});
  const plan=api.createCanonicalTranslationPlan('Bonjour.');
  const prompt=api.buildPrompt(plan.promptSource,'canonical',{canonicalUnitCount:plan.items.length});
  assert.ok(prompt.startsWith('Use a terse voice in French.'));
  assert.ok(prompt.includes('PDU'));
  assert.ok(prompt.includes('PD_FMT'));
  assert.ok(prompt.includes('The output language is French.'));
  assert.equal((prompt.match(/Phrase Desk mandatory output contract:/g)||[]).length,1);
  assert.ok(!prompt.includes('Natural language and voice'));
  api.settings.studyLanguage='ja';
  const input=api.buildInputTranslationPrompt('안녕.');
  assert.ok(input.includes('Use a terse voice in Japanese.'));
  assert.ok(input.includes('one translation only'));
  assert.ok(input.includes('안녕.'));
});

test('Japanese phrases, French diacritics and exact repeated-message counts', () => {
  assert.ok(lang.phraseTokens('どうもありがとうございます','ja').length>1);
  assert.equal(lang.phraseOccurrenceCount('ça va',[{text:'Comment ça va ?'},{text:'Oui, ça va.'},{text:'ca va'}],'fr'),2);
  assert.equal(lang.phraseOccurrenceCount('ありがとう',[{text:'本当にありがとう。'},{text:'ありがとう！'},{text:'おはよう'}],'ja'),2);
  const api=loadPhraseDesk({seed:{studyLanguage:'ja'}});
  assert.ok(api.uniqueValidRepeatCandidates([{text:'どうもありがとう'}]).length===1);
  assert.equal(api.repeatDifficultyProfile('normal').band,'');
  assert.ok(!api.repeatDifficultyPrompt('normal').includes('B1'));
  assert.equal(api.contextWithBlank({text:'ありがとう',context:'本当にありがとう。',language:'ja'}),'本当に[빈칸]。');
  assert.equal(api.exactReorderMatches('どうも ありがとう','どうもありがとう'),true);
  assert.equal(api.exactReorderMatches('word s','words'),false);
});

test('study pools and duplicate merging do not mix languages or overwrite saved meanings', () => {
  const api=loadPhraseDesk({seed:{studyLanguage:'fr',targetLanguage:'en'}});
  api.addNote({text:'chat',meaning:'cat'});
  api.addNote({text:'chat',meaning:'대화',language:'en',meaningLanguage:'ko'});
  assert.equal(api.settings.notebook.length,2);
  assert.equal(api.practicePool().length,1);
  assert.equal(api.practicePool()[0].meaning,'cat');
  api.settings.studyLanguage='en';api.settings.targetLanguage='ko';
  assert.equal(api.practicePool()[0].meaning,'대화');
});

test('import preserves metadata and separate history limits', () => {
  const payload={notebook:[{id:'j',text:'こんにちは',meaning:'hello',language:'ja',meaningLanguage:'en',custom:7}],
    quizHistory:[...Array.from({length:20},(_,i)=>({id:'en'+i,language:'en',meaningLanguage:'ko'})),...Array.from({length:20},(_,i)=>({id:'ja'+i,language:'ja',meaningLanguage:'en'}))]};
  const result=normalizePhraseDeskImportPayload(payload).data;
  assert.equal(result.notebook[0].language,'ja');
  assert.equal(result.notebook[0].meaningLanguage,'en');
  assert.equal(result.notebook[0].custom,7);
  assert.equal(result.quizHistory.length,40);
});

test('five locale catalogs share all keys, placeholders, and HTML structures', () => {
  const catalogs=Object.fromEntries(['ko','en','ja','fr','es'].map(code=>[code,JSON.parse(fs.readFileSync(new URL(`./i18n/${code}.json`,import.meta.url),'utf8'))]));
  const keys=Object.keys(catalogs.ko).sort();assert.ok(keys.length>=240);
  const tokens=value=>(value.match(/\$\{\d+\}/g)||[]).sort();
  const tags=value=>(value.replace(/(title|placeholder|aria-label)="[^"]*"/g,'$1="UI"').match(/<[^>]*>/g)||[]);
  for(const [code,data] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(data).sort(),keys,code);
    for(const key of keys) {
      assert.equal(pdTranslationKey(catalogs.ko[key]),key);
      assert.deepEqual(tokens(data[key]),tokens(catalogs.ko[key]),code+key);
      assert.deepEqual(tags(data[key]),tags(catalogs.ko[key]),code+key);
    }
  }
});

test('original source brackets are never confidently identified as translated footnotes', () => {
  const api=loadPhraseDesk({seed:{targetLanguage:'en'}});
  const record=cannedCanonical(api,'[Hello!] Bonjour.',['Hello!']).record;
  assert.equal(api.bilingualTranslationCandidates(record).has('Hello!'),false);
  assert.equal(api.bilingualBracketAllowed('Hello!',api.bilingualTranslationCandidates(record),'en'),false);
});

test('translation cache lookup never selects an old-language legacy display', () => {
  const api=loadPhraseDesk({seed:{targetLanguage:'fr'}});
  const source='Bonjour.';
  const state={original:source,originalHash:api.hash(source),showing:true,activeMode:'ko',translations:{ko:'안녕하세요.'}};
  assert.equal(api.pickCachedMessageTranslation(state,api.translationCacheKey('ko')).text,'');
  assert.equal(api.translationKeyMatchesEngine('ko','ko:lang:fr'),false);
});
