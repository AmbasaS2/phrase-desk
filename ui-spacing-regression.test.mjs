import assert from 'node:assert/strict';
import fs from 'node:fs';

const indexSource = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');

for (const id of ['pd-practice-submit', 'pd-save-note', 'pd-update-note']) {
  const wrappedButton = new RegExp(
    `<div class="pd-submit-actions"><button id="${id}"[^>]*>`,
  );
  assert.match(indexSource, wrappedButton, `${id} must use the shared submit action wrapper`);
}

assert.doesNotMatch(
  indexSource,
  /<\/textarea>\s*<button[^>]*class="[^"]*pd-primary/,
  'modal textarea and primary submit button must not remain directly adjacent',
);

assert.match(
  cssSource,
  /\.pd-submit-actions\s*\{[^}]*margin-top:\s*10px\s*!important;/s,
  'submit action wrapper must provide a visible top gap',
);

assert.match(
  cssSource,
  /\.pd-repeat-list\s*\{[^}]*margin:\s*8px\s+0\s+12px\s*!important;/s,
  'repeat-expression save button must retain list-to-button spacing',
);

assert.match(
  cssSource,
  /\.pd-modal\s+label\.pd-repeat-row\s*\{[^}]*display:\s*flex\s*!important;[^}]*margin:\s*0\s*!important;/s,
  'repeat-expression rows must override the generic modal label layout',
);

assert.match(
  cssSource,
  /\.pd-feedback\s*\{[^}]*margin:\s*10px\s+0\s+14px\s*!important;/s,
  'quiz next button must retain feedback-to-button spacing',
);

console.log('Phrase Desk UI spacing regression checks passed.');
