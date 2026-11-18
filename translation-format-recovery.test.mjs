import assert from 'node:assert/strict';
import test from 'node:test';
import { cannedCanonical, loadPhraseDesk } from './test-helpers.mjs';

const api = loadPhraseDesk({seed:{targetLanguage:'ko',chatMode:'ko'}});
const styles = ['ko', 'dialogue', 'full:side_sentence', 'full:below_sentence',
  'full:by_line', 'full:by_paragraph', 'full:separate'];
const parse = (raw,plan) => api.parseCanonicalTranslationResult(raw,plan,'profile');

test('displaced inline code preserves underscores, word order and the rest of the translation', () => {
  for (const code of ['`gate_lock`', '`net__reset_mode`', '``net_`mode``']) {
    const {plan,output,record} = cannedCanonical(api,`Keep ${code} sealed. Tell Mira.`,['유지해','봉인된 상태로.','미라에게 알려.']);
    const first = plan.items[0];
    const normal = `유지해 ${code} 봉인된 상태로. 미라에게 알려.`;
    assert.equal(record.complete,true);
    assert.equal(api.renderCanonicalTranslation(record,'ko'),normal);
    const moved = output.replace(`유지해${first.closeMarker} ${code}`,`${code}를${first.closeMarker}`);
    const expected = `${code}를 봉인된 상태로. 미라에게 알려.`;
    const fixed = parse(moved,plan);
    assert.equal(fixed.partial,true);
    assert.equal(fixed.missingUnits,1);
    assert.ok(api.canonicalRecordValid(fixed,plan.source,'profile'));
    for (const style of styles) assert.equal(api.renderCanonicalTranslation(fixed,style),expected);
    assert.match(api.renderCanonicalTranslation(record,'full:separate'),/---/);
  }
});

test('an exact extra copy next to its original code-only slot is deduplicated without changing Korean words', () => {
  const code = '`dock_lock`';
  const {plan,output} = cannedCanonical(api,`Keep ${code} armed. Notify Mira.`,['유지해','준비 상태로.','미라에게 알려.']);
  const first = plan.items[0];
  const duplicate = output.replace(`유지해${first.closeMarker}`,`${code}을${first.closeMarker}`);
  const fixed = parse(duplicate,plan);
  const rendered = api.renderCanonicalTranslation(fixed,'ko');
  assert.equal(rendered.split(code).length,2);
  assert.match(rendered,/^`dock_lock`을\s+준비 상태로\. 미라에게 알려\.$/);
  assert.ok(api.canonicalRecordValid(fixed,plan.source,'profile'));
});

test('intentional repeated source code and ambiguous extra copies are preserved', () => {
  const code = '`edge_lock`';
  const {plan,output} = cannedCanonical(api,`Keep ${code} sealed. Check ${code} later.`,['유지해','봉인 상태로.','확인해','나중에.']);
  const first = plan.items[0];
  const moved = output.replace(`유지해${first.closeMarker} ${code}`, `${code}을${first.closeMarker}`);
  assert.equal(api.renderCanonicalTranslation(parse(moved,plan),'ko').split(code).length,3);
  const spaced = output.replace(`유지해${first.closeMarker}`,`${code}을${first.closeMarker}`);
  assert.equal(api.renderCanonicalTranslation(parse(spaced,plan),'ko').split(code).length,4);
});

test('nested link markers keep the visible translation order and stay partially aligned', () => {
  const source = 'Read the [route card](https://example.org/route). Then knock.';
  const plan = api.createCanonicalTranslationPlan(source);
  const [verb, label, last] = plan.items;
  const raw = `${verb.openMarker}[${label.openMarker}경로 카드${label.closeMarker}](https://example.org/route)를 읽어.${verb.closeMarker} ${last.openMarker}그다음 노크해.${last.closeMarker}`;
  const fixed = parse(raw,plan);
  assert.equal(fixed.partial,true);
  assert.deepEqual(Array.from(fixed.units,unit=>unit.id),[last.id]);
  const view = '[경로 카드](https://example.org/route)를 읽어. 그다음 노크해.';
  for (const style of styles) assert.equal(api.renderCanonicalTranslation(fixed,style),view);
});

test('a punctuation-only response for a word remains missing and the complete payload is shown', () => {
  const source = 'Try `gate_lock` again. Tell Mira.';
  const {plan,output} = cannedCanonical(api,source,['실행해','.','미라에게 알려.']);
  const result = parse(output,plan);
  assert.equal(result.partial,true);
  assert.equal(result.missingUnits,1);
  assert.equal(api.renderCanonicalTranslation(result,'ko'),'실행해 `gate_lock` . 미라에게 알려.');
  const markerless = '먼저 `gate_lock`을 실행해. 미라에게 알려.';
  const fallback = parse(markerless,plan);
  assert.equal(fallback.complete,false);
  assert.equal(fallback.partial,false);
  assert.equal(api.renderCanonicalTranslation(fallback,'full:separate'),markerless);
});
