import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const helperSource = source.slice(
  source.indexOf('function repeatDifficultyProfile'),
  source.indexOf('async function openRepeatFinder'),
);
assert.ok(helperSource.startsWith('function repeatDifficultyProfile'));

const sandbox = {
  norm(value = '') { return String(value || '').replace(/\s+/g, ' ').trim(); },
  esc(value = '') {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  },
};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nglobalThis.collectionApi = { repeatDifficultyProfile, repeatDifficultyPrompt, repeatDifficultyHelpHtml, repeatCandidateKey, repeatCandidateTokenCount, uniqueValidRepeatCandidates, repeatOccurrenceCount };`, sandbox);

const {
  repeatDifficultyProfile,
  repeatDifficultyPrompt,
  repeatDifficultyHelpHtml,
  repeatCandidateKey,
  repeatCandidateTokenCount,
  uniqueValidRepeatCandidates,
  repeatOccurrenceCount,
} = sandbox.collectionApi;

const expected = {
  very_easy: ['A1–A2', 'right now'],
  easy: ['A2–B1', 'look after'],
  normal: ['B1–B2', 'end up -ing'],
  hard: ['B2–C1', 'take it for granted'],
  expert: ['C1+', 'to put it mildly'],
};
for (const [value, [band, example]] of Object.entries(expected)) {
  const profile = repeatDifficultyProfile(value);
  assert.equal(profile.band, band);
  assert.ok(profile.examples.includes(example));
  const prompt = repeatDifficultyPrompt(value);
  assert.ok(prompt.includes(band));
  assert.ok(prompt.includes(example));
  assert.ok(prompt.includes('not a verified CEFR assessment'));
  assert.ok(!/[가-힣]/.test(prompt));
}
assert.equal(repeatDifficultyProfile('unknown').band, 'B1–B2');

const help = repeatDifficultyHelpHtml('normal');
assert.ok(help.includes('수준입니다'));
assert.ok(help.includes('AI가 추정하는 학습 수준입니다.'));
assert.ok(help.includes('aria-live="polite"'));
assert.ok(help.includes('overflow-wrap:anywhere'));

assert.equal(repeatCandidateKey('  “Couldn’t help but.”  '), "couldn't help but");
assert.equal(repeatCandidateTokenCount('not so much X as Y'), 6);

const candidates = uniqueValidRepeatCandidates([
  { text: 'Right now' },
  { text: ' right   now. ' },
  { text: 'alone' },
  { text: 'one two three four five six seven eight' },
  { text: 'end up -ing' },
  { text: 'Couldn’t help but' },
  { text: "couldn't help but." },
  { text: '한국어 표현' },
]);
assert.deepEqual(Array.from(candidates, item => item.text), ['Right now', 'end up -ing', 'Couldn’t help but']);

const messages = [
  { text: 'Right now, we need to leave.' },
  { text: 'No, not right now.' },
  { text: 'Bright now would not be a match.' },
  { text: 'I will look after her.' },
];
assert.equal(repeatOccurrenceCount('right now', messages), 2);
assert.equal(repeatOccurrenceCount('look after', messages), 1);
assert.equal(repeatOccurrenceCount('', messages), 0);

assert.ok(source.includes('수집할 영어 수준'));
assert.ok(!source.includes('반복 표현 난이도'));
assert.ok(source.includes('"basis":"repeated or study_worthy"'));
assert.ok(source.includes('count < 2 || count > 7'));
assert.ok(source.includes('const { _occurrenceCount, _repeatBasis, ...note } = x;'));

console.log('Phrase Desk collection-level regression tests: all assertions passed');
