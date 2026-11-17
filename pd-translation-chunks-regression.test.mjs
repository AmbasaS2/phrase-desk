import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splitGoogleChunks, splitCanonicalAIInput } from './pd-translation-chunks.js';

const googleJoin = chunks => chunks.map(part => part.text + part.separator).join('');
const marker = id => '[[PDU-AB-' + String(id).padStart(4, '0') + ']]';
const close = id => '[[/PDU-AB-' + String(id).padStart(4, '0') + ']]';

test('short Google texts keep one request and exactly the same text', () => {
  const pieces = splitGoogleChunks('Hello, world!');
  assert.deepEqual(pieces, [{ text:'Hello, world!', separator:'' }]);
});

test('Google chunks respect encoded URL size with Korean, emoji and Japanese', () => {
  const source = ('한국어 🪄 日本語 😀 and English. \n').repeat(350);
  const pieces = splitGoogleChunks(source);
  assert.ok(pieces.length > 1);
  assert.equal(googleJoin(pieces), source);
  assert.ok(pieces.every(part => encodeURIComponent(part.text).length <= 4000));
});

test('Google chunks never cut PDU markers, format markers, macros or HTML tags', () => {
  const protectedTokens = [
    '<infoblock>', '</infoblock>', marker(1), close(1),
    '⟦PD_FMT_0⟧', '{{user}}', '<div class="name">', '</div>',
  ];
  const source = 'a '.repeat(1750) + protectedTokens.join(' ') + ' 한국어 '.repeat(1000);
  const pieces = splitGoogleChunks(source);
  assert.equal(googleJoin(pieces), source);
  for (const token of protectedTokens) {
    assert.equal(pieces.filter(part => part.text.includes(token)).length, 1, token);
  }
});

test('Google preserves all original separator whitespace locally', () => {
  const source = 'Sentence one.\n\n' + 'More sentences. '.repeat(370) + '\n\n' + '尾部';
  assert.equal(googleJoin(splitGoogleChunks(source)), source);
});

test('short AI passages remain exactly one call even if there are many PDU units', () => {
  const text = [marker(1), 'Hello', close(1), ' ', marker(2), 'World', close(2)].join('');
  const plan = { supported:true, items:[
    { openMarker:marker(1), closeMarker:close(1) },
    { openMarker:marker(2), closeMarker:close(2) },
  ], promptSource:text };
  assert.deepEqual(splitCanonicalAIInput(plan, 8000), [{ text, unitCount:2 }]);
});

test('long AI input splits only between full PDU pairs and reconstructs exactly', () => {
  const items = Array.from({ length:175 }, (_,i) => ({
    openMarker:marker(i + 1), closeMarker:close(i + 1),
  }));
  const source = '<info>\n' + items.map((item,i) =>
    item.openMarker + 'A complete source sentence. '.repeat(7) + item.closeMarker +
    (i % 3 === 0 ? '\n\n' : ' ')).join('');
  const plan = { supported:true, items, promptSource:source };
  const chunks = splitCanonicalAIInput(plan, 8000);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.map(c => c.text).join(''), source);
  assert.equal(chunks.reduce((n,c) => n + c.unitCount, 0), items.length);
  for (const item of items) {
    const owners = chunks.filter(c => c.text.includes(item.openMarker) && c.text.includes(item.closeMarker));
    assert.equal(owners.length, 1, item.openMarker);
  }
});

test('higher token budget keeps the same source in fewer AI calls', () => {
  const items = Array.from({ length:80 }, (_,i) => ({openMarker:marker(i+1),closeMarker:close(i+1)}));
  const promptSource = items.map(item => item.openMarker + 'More words here. '.repeat(15) + item.closeMarker).join('\n');
  const plan = {supported:true,items,promptSource};
  assert.ok(splitCanonicalAIInput(plan, 8000).length >= splitCanonicalAIInput(plan, 16000).length);
});

test('unsupported source plans and single-unit messages use the original request', () => {
  const plan = {supported:false,promptSource:'Unrecognized markup',items:[]};
  assert.deepEqual(splitCanonicalAIInput(plan),[{text:plan.promptSource,unitCount:0}]);
  const oversized = {supported:true,promptSource:marker(1)+'Long'.repeat(12000)+close(1),items:[{openMarker:marker(1),closeMarker:close(1)}]};
  assert.equal(splitCanonicalAIInput(oversized).length,1);
});

test('integration remains opt-in by length, uses existing parser and never retries paid AI', () => {
  const src = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ splitGoogleChunks, splitCanonicalAIInput \} from '.\/pd-translation-chunks.js'/);
  assert.match(src, /for \(const part of splitGoogleChunks\(source\)\)/);
  assert.match(src, /const aiChunks = splitCanonicalAIInput\(canonicalPlan, settings.chatMaxTokens\)/);
  assert.match(src, /if \(aiChunks.length === 1\)/);
  assert.match(src, /canonicalRecord = parseCanonicalTranslationResult\(rawResult, canonicalPlan, translationEngineKey\(\)\)/);
  assert.match(src, /received\.push\(chunk\.text\)/);
  assert.doesNotMatch(src, /function splitGoogleChunks\(text = ''/);
  assert.match(src, /const PD_VERSION = "1\.6\.0"/);
});
