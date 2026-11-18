import assert from 'node:assert/strict';
import test from 'node:test';
import { cannedCanonical, loadPhraseDesk } from './test-helpers.mjs';

const api = loadPhraseDesk({seed:{targetLanguage:'ko',chatMode:'ko'}});
const source = 'Mira set down a cup. The shutters rattled. She opened the [inspection log](https://example.org/log).\n\n'
  + '<div class="report">Count: 4</div>\n\nRun `hall_probe` with {{operator}} before dusk.\n\n“When you are ready.”';
const korean = ['미라가 컵을 놓았다.','덧문이 덜컹거렸다.','그녀가 열었다','점검 기록','수량: 4','실행해','함께','해가 지기 전에.','준비되면.'];
const styles = ['ko','dialogue','full:side_sentence','full:below_sentence','full:by_line','full:by_paragraph','full:separate'];
const parse = (raw,plan,engine='profile') => api.parseCanonicalTranslationResult(raw,plan,engine);

function assertVisibleFallback(raw, plan, expected) {
  const record = parse(raw,plan);
  assert.equal(record.complete,false);
  assert.equal(record.partial,false);
  assert.ok(api.canonicalRecordValid(record,plan.source,'profile'));
  for (const style of styles) {
    const shown = api.renderCanonicalTranslation(record,style);
    assert.equal(shown,expected,style);
    assert.doesNotMatch(shown,/\[\[\/?PDU-|PD_FMT_/);
  }
}

test('nine valid PDUs plus an outside verb preserve the whole translation', () => {
  const {plan,output,record} = cannedCanonical(api,source,korean);
  assert.equal(plan.items.length,9);
  assert.equal(record.complete,true);
  const link = '](https://example.org/log).';
  const spill = output.replace('그녀가 열었다','그녀가').replace(link,'](https://example.org/log)을 펼쳤다.');
  const before = api.renderCanonicalTranslation(record,'ko');
  assertVisibleFallback(spill,plan,before.replace('그녀가 열었다','그녀가').replace(link,'](https://example.org/log)을 펼쳤다.'));
});

test('outside prose on either side of a link is kept in model order', () => {
  const {plan,output,record} = cannedCanonical(api,source,korean);
  const item=plan.items[3];
  const text = '[점검 기록](https://example.org/log).';
  const before = api.renderCanonicalTranslation(record,'ko');
  const raw = '['+item.openMarker+'점검 기록'+item.closeMarker+'](https://example.org/log).';
  for (const [given,shown] of [
    ['마침내 '+raw+' 그것을 덮었다.', '마침내 '+text+' 그것을 덮었다.'],
    // Even a particle immediately following a proven URL boundary belongs to prose.
    [raw.slice(0,-1)+'만.',text.slice(0,-1)+'만.'],
  ]) assertVisibleFallback(output.replace(raw,given),plan,before.replace(text,shown));
});

test('the ordinary nine-unit path accepts source markup, standalone URLs and harmless whitespace', () => {
  const {plan,output,record} = cannedCanonical(api,source,korean);
  const whitespaceChange = output.replace('`hall_probe`',' `hall_probe` ')
    .replace('{{operator}}',' {{operator}} ').replace('<div class="report">',' <div class="report">');
  for(const raw of [output,whitespaceChange,'Translation:\n'+output]){
    const aligned=parse(raw,plan);
    assert.equal(aligned.complete,true);
    assert.ok(api.canonicalRecordValid(aligned,source,'profile'));
    for (const style of styles) assert.equal(api.renderCanonicalTranslation(aligned,style),api.renderCanonicalTranslation(record,style));
  }
  const bare = cannedCanonical(api,'Fetch at https://example.org/data before noon. {{operator}} checks it.',['가져와','정오 전에.','점검해.']);
  assert.equal(parse(bare.output.replace('https://example.org/data',' https://example.org/data '),bare.plan).complete,true);
});

test('a recoverable marker defect does not bypass the outside-prose check', () => {
  const {plan,output,record}=cannedCanonical(api,source,korean);
  const damaged=output.replace(plan.items[0].openMarker,'[[PDU-0001]]');
  assert.equal(parse(damaged,plan).complete,true);
  assertVisibleFallback(damaged+' 이제 떠나도 된다.',plan,api.renderCanonicalTranslation(record,'ko')+' 이제 떠나도 된다.');
});

test('protected inline code moved and copied next to its slot stays exact when other text spills', () => {
  for (const code of ['`dock_lock`','`gate_lock`']){
    const {plan,output}=cannedCanonical(api,`Keep ${code} active. Open the [log](https://example.org/log).`,['켜 둬','유지해.','열어','기록']);
    const intro=plan.items[0];
    const raw=output.replace('켜 둬'+intro.closeMarker,code+'을'+intro.closeMarker)
      .replace('](https://example.org/log).','](https://example.org/log)을 살펴봤다.');
    const result=parse(raw,plan);
    assert.equal(result.complete,false);
    const shown=api.renderCanonicalTranslation(result,'ko');
    assert.equal(shown.split(code).length,2);
    assert.match(shown,/\]\(https:\/\/example\.org\/log\)을 살펴봤다\./);
    assert.doesNotMatch(shown,/docklock|gatelock|\[\[\/?PDU-/);
  }
});

test('existing Korean and other source languages do not alter gap handling for a Japanese target', () => {
  const ja=loadPhraseDesk({locale:'ja-JP',seed:{targetLanguage:'ja',chatMode:'ko'}});
  const mixed='“괜찮아.” Vergiss den [Hinweis](https://example.org/tip) nicht, {{案内}}.\n\nElisa esperó afuera.';
  const {plan,output,record}=cannedCanonical(ja,mixed,['大丈夫。','忘れないで','注意書き','ね、','エリサは外で待った。']);
  assert.equal(record.complete,true);
  assert.equal(record.targetCode,'ja');
  const preserved=ja.parseCanonicalTranslationResult(output.replace('{{案内}}',' {{案内}} '),plan,'google');
  assert.equal(preserved.complete,true);
  const fallback=ja.parseCanonicalTranslationResult(output.replace('](https://example.org/tip)','](https://example.org/tip)を読み上げた。'),plan,'google');
  assert.equal(fallback.complete,false);
  assert.ok(ja.canonicalRecordValid(fallback,mixed,'google'));
  for(const mode of styles)assert.match(ja.renderCanonicalTranslation(fallback,mode),/\]\(https:\/\/example\.org\/tip\)を読み上げた。/);
  const ko=cannedCanonical(api,'“괜찮아.” No cierres la puerta. {{설정}}',['괜찮아.','문을 닫지 마.']);
  assert.equal(parse(ko.output.replace('{{설정}}',' {{설정}} '),ko.plan).complete,true);
});
