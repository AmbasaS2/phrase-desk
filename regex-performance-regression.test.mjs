import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { cleanOrphanFormatTokens } from './pd-safe-utils.js';
import { loadPhraseDesk } from './test-helpers.mjs';

test('separator cleanup preserves visible text and multiline pipe behavior', () => {
  const cases = [
    ['first |  | second', 'first | second'],
    ['first\n|\n|second', 'first | second'],
    [' | Date: Monday | | Weather: cloudy |', 'Date: Monday | Weather: cloudy'],
    ['A | \n | B', 'A | B'],
    ['Plain paragraph\n\nSecond paragraph', 'Plain paragraph\n\nSecond paragraph'],
  ];
  for (const [source, expected] of cases) {
    assert.equal(cleanOrphanFormatTokens(source), expected, JSON.stringify(source));
  }
});

test('separator cleanup avoids quadratic whitespace scans', () => {
  const started = performance.now();
  assert.equal(cleanOrphanFormatTokens(' '.repeat(50_000)), '');
  assert.ok(performance.now() - started < 2_000, '50k whitespace input should not stall the UI');
});

test('info block recognition preserves ordinary headings without scanning across lines', () => {
  const api = loadPhraseDesk();
  assert.equal(api.looksLikeInfoBlock('Date: Monday\nWeather: cloudy'), true);
  assert.equal(api.looksLikeInfoBlock('- Location | Great Hall'), true);
  assert.equal(api.looksLikeInfoBlock('Just ordinary prose.'), false);

  const started = performance.now();
  assert.equal(api.looksLikeInfoBlock('\n'.repeat(50_000) + 'Just ordinary prose.'), false);
  assert.ok(performance.now() - started < 2_000, '50k newlines should not stall heading detection');
});
