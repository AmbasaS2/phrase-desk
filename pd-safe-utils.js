// Phrase Desk safety helpers v1.1.16
// Volatile logs and cleanup state stay outside SillyTavern settings/chat saves.

const FORMAT_TOKEN_RE = /(?:⟦\s*PD_FMT_[0-9a-z]+\s*⟧|\[\[?\s*PD_FMT_[0-9a-z]+\s*\]?\]|【\s*PD_FMT_[0-9a-z]+\s*】|\{\{\s*PD_FMT_[0-9a-z]+\s*\}\}|<\s*PD_FMT_[0-9a-z]+\s*>|\bPD_FMT_[0-9a-z]+\b)/gi;
const TARGET_TEXT_RE = /[가-힣ぁ-んァ-ヶ一-龥]/;
const LATIN_TEXT_RE = /[A-Za-z]/;

function compactWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stableTextHash(value = '') {
  const text = String(value || '');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(36);
}

function plainRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unwrapBilingualSelection(value = '') {
  let text = compactWhitespace(value);
  let changed = false;
  for (let pass = 0; pass < 4 && text.length >= 2; pass++) {
    const emphasis = text.match(/^(\*{1,3}|_{1,3})([\s\S]+)\1$/);
    if (emphasis && compactWhitespace(emphasis[2])) {
      text = compactWhitespace(emphasis[2]);
      changed = true;
      continue;
    }
    const pairs = [['"', '"'], ["'", "'"], ['“', '”'], ['‘', '’']];
    const pair = pairs.find(([open, close]) => text.startsWith(open) && text.endsWith(close));
    if (!pair) break;
    const inner = compactWhitespace(text.slice(pair[0].length, -pair[1].length));
    if (!inner) break;
    text = inner;
    changed = true;
  }
  return { text, changed };
}

// Selection-only parser. It preserves the legacy optional-space bracket behavior while
// requiring a terminal Korean bracket pair and Latin text before it.
export function splitBilingualSelection(value = '') {
  const original = compactWhitespace(value);
  const unwrapped = unwrapBilingualSelection(original).text;
  const match = unwrapped.match(/^(.+?)\s*[\[（(]([^\]\)）\r\n]{1,220})[\]）)]$/);
  const english = compactWhitespace(match?.[1] || '');
  const korean = compactWhitespace(match?.[2] || '');
  if (!match || !LATIN_TEXT_RE.test(english) || !/[가-힣]/.test(korean)) {
    return { text: original, meaning: '' };
  }
  return { text: english, meaning: korean };
}

export function contextTranslationId(context = {}) {
  const identity = `${compactWhitespace(context?.source || '').toLowerCase()}::${compactWhitespace(context?.context || '').toLowerCase()}`;
  return `ctx_${stableTextHash(identity)}`;
}

export function pendingContextTranslations(contexts = []) {
  const valid = Array.isArray(contexts) ? contexts.filter(x => plainRecord(x) && compactWhitespace(x.context || '')) : [];
  const pending = valid
    .filter(x => !compactWhitespace(x.contextKo || x.context_ko || ''))
    .map(x => ({ id: contextTranslationId(x), context: String(x.context || ''), source: String(x.source || '') }));
  const primaryId = valid.length ? contextTranslationId(valid[0]) : '';
  return {
    primary: pending.find(x => x.id === primaryId) || null,
    additional: pending.filter(x => x.id !== primaryId),
  };
}

export function applyMappedContextTranslations(contexts = [], results = []) {
  if (!Array.isArray(contexts) || !Array.isArray(results)) return 0;
  const targets = new Map(contexts.filter(plainRecord).map(context => [contextTranslationId(context), context]));
  let applied = 0;
  for (const result of results) {
    if (!plainRecord(result)) continue;
    const target = targets.get(String(result.id || ''));
    const translated = compactWhitespace(result.context_ko || result.contextKo || '');
    if (!target || !translated || compactWhitespace(target.contextKo || target.context_ko || '')) continue;
    target.contextKo = translated;
    applied += 1;
  }
  return applied;
}

export function replacePrimaryContextPreservingRest(contexts = [], replacement = null) {
  const existing = Array.isArray(contexts) ? contexts : [];
  const remaining = existing.slice(1);
  return plainRecord(replacement) ? [replacement, ...remaining] : remaining;
}

function normalizeStringArray(value) {
  if (value === undefined || value === null) return [];
  const input = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
  if (!Array.isArray(value) && typeof value !== 'string') throw new Error('invalid string array');
  if (input.some(x => typeof x !== 'string' && typeof x !== 'number')) throw new Error('invalid string array item');
  return Array.from(new Set(input
    .map(x => String(x).trim())
    .filter(Boolean)));
}

function normalizeImportedContext(value) {
  if (!plainRecord(value)) return null;
  if (Object.hasOwn(value, 'context') && typeof value.context !== 'string') return null;
  if (Object.hasOwn(value, 'contextKo') && typeof value.contextKo !== 'string') return null;
  if (Object.hasOwn(value, 'context_ko') && typeof value.context_ko !== 'string') return null;
  if (Object.hasOwn(value, 'source') && typeof value.source !== 'string') return null;
  const context = typeof value.context === 'string' ? value.context : '';
  const contextKo = typeof value.contextKo === 'string'
    ? value.contextKo
    : (typeof value.context_ko === 'string' ? value.context_ko : '');
  if (!compactWhitespace(context) && !compactWhitespace(contextKo)) return null;
  return {
    ...value,
    context,
    contextKo,
    source: typeof value.source === 'string' ? value.source : '',
  };
}

function normalizeImportedNote(value, makeId) {
  if (!plainRecord(value)) return null;
  if (Object.hasOwn(value, 'id') && !['string', 'number'].includes(typeof value.id)) return null;
  if (Object.hasOwn(value, 'text') && typeof value.text !== 'string') return null;
  if (Object.hasOwn(value, 'expression') && typeof value.expression !== 'string') return null;
  if (Object.hasOwn(value, 'meaning') && typeof value.meaning !== 'string') return null;
  if (Object.hasOwn(value, 'meaningKo') && typeof value.meaningKo !== 'string') return null;
  if (Object.hasOwn(value, 'contexts') && !Array.isArray(value.contexts)) return null;
  const rawText = typeof value.text === 'string' && compactWhitespace(value.text) ? value.text : value.expression;
  const text = String(rawText ?? '').trim();
  if (!compactWhitespace(text)) return null;
  const rawMeaning = typeof value.meaning === 'string' && compactWhitespace(value.meaning) ? value.meaning : value.meaningKo;
  const meaning = String(rawMeaning ?? '').trim();
  const contexts = Array.isArray(value.contexts) ? value.contexts.map(normalizeImportedContext) : [];
  if (contexts.some(x => !x)) return null;
  const status = ['new', 'learning', 'hard', 'known'].includes(value.status) ? value.status : 'new';
  return {
    ...value,
    id: String(value.id ?? '').trim() || makeId('note'),
    text,
    expression: text,
    meaning,
    meaningKo: meaning,
    tags: normalizeStringArray(value.tags),
    sources: normalizeStringArray(value.sources),
    contexts: contexts.slice(0, 12),
    source: typeof value.source === 'string' ? value.source : '',
    status,
    favorite: !!value.favorite,
  };
}

function normalizeImportedHistory(value, makeId, prefix) {
  if (!plainRecord(value)) return null;
  if (Object.hasOwn(value, 'id') && !['string', 'number'].includes(typeof value.id)) return null;
  if (Object.hasOwn(value, 'results') && !Array.isArray(value.results)) return null;
  const out = { ...value, id: String(value.id ?? '').trim() || makeId(prefix) };
  if (Object.hasOwn(value, 'results')) {
    if (value.results.some(x => !plainRecord(x))) return null;
    out.results = value.results.map(x => ({ ...x }));
  }
  return out;
}

// Parse and stage imported learning data before callers replace live settings. Unknown
// fields on valid records are retained; any malformed supported record rejects the import.
export function normalizePhraseDeskImportPayload(payload, makeId = (prefix = 'item') => `${prefix}_${Date.now()}`) {
  if (!plainRecord(payload)) throw new Error('invalid import root');
  const data = {};
  let recognized = 0;
  const requireArray = (key) => {
    if (!Object.hasOwn(payload, key)) return null;
    recognized += 1;
    if (!Array.isArray(payload[key])) throw new Error(`invalid ${key}`);
    return payload[key];
  };

  const notebook = requireArray('notebook');
  if (notebook) {
    data.notebook = notebook.map(x => normalizeImportedNote(x, makeId));
    if (data.notebook.some(x => !x)) throw new Error('invalid notebook item');
  }
  const quizHistory = requireArray('quizHistory');
  if (quizHistory) {
    data.quizHistory = quizHistory.map(x => normalizeImportedHistory(x, makeId, 'quiz'));
    if (data.quizHistory.some(x => !x)) throw new Error('invalid quizHistory item');
    data.quizHistory = data.quizHistory.slice(0, 20);
  }
  const practiceHistory = requireArray('practiceHistory');
  if (practiceHistory) {
    data.practiceHistory = practiceHistory.map(x => normalizeImportedHistory(x, makeId, 'practice'));
    if (data.practiceHistory.some(x => !x)) throw new Error('invalid practiceHistory item');
    data.practiceHistory = data.practiceHistory.slice(0, 60);
  }
  const hiddenWrongNotes = requireArray('hiddenWrongNotes');
  if (hiddenWrongNotes) data.hiddenWrongNotes = normalizeStringArray(hiddenWrongNotes);
  const recentPracticeNoteIds = requireArray('recentPracticeNoteIds');
  if (recentPracticeNoteIds) data.recentPracticeNoteIds = normalizeStringArray(recentPracticeNoteIds);
  if (!recognized) throw new Error('no supported import fields');
  return { data };
}

export function applySettingsPatchAtomically(target, patch, commit, rollback) {
  if (!plainRecord(target) || !plainRecord(patch)) throw new Error('invalid settings patch');
  const keys = Object.keys(patch);
  const previous = Object.fromEntries(keys.map(key => [key, target[key]]));
  try {
    keys.forEach(key => { target[key] = patch[key]; });
    commit?.();
  } catch (error) {
    keys.forEach(key => { target[key] = previous[key]; });
    try { rollback?.(); } catch {}
    throw error;
  }
  return keys;
}

export async function applySettingsPatchAtomicallyAsync(target, patch, commit, rollback) {
  if (!plainRecord(target) || !plainRecord(patch)) throw new Error('invalid settings patch');
  const keys = Object.keys(patch);
  const previous = Object.fromEntries(keys.map(key => [key, target[key]]));
  try {
    keys.forEach(key => { target[key] = patch[key]; });
    await commit?.();
  } catch (error) {
    keys.forEach(key => { target[key] = previous[key]; });
    try { await rollback?.(); } catch {}
    throw error;
  }
  return keys;
}

export function phraseDeskCacheMatchesSource(extra = {}, canonicalSource = '', hashText = stableTextHash) {
  if (!plainRecord(extra) || !compactWhitespace(canonicalSource) || typeof hashText !== 'function') return false;
  const hashSource = value => String(hashText(String(value || '').replace(/\r\n/g, '\n')) || '');
  const sourceHash = hashSource(canonicalSource);
  if (!sourceHash) return false;
  const root = plainRecord(extra.phraseDesk) ? extra.phraseDesk : {};
  const active = plainRecord(root.variants?.[root.activeKey]) ? root.variants[root.activeKey] : null;
  const hashes = new Set();
  const add = (storedHash, source) => {
    if (storedHash) hashes.add(String(storedHash));
    if (typeof source === 'string' && source.trim()) hashes.add(hashSource(source));
  };
  add(active?.originalHash, active?.original);
  add(root.originalHash, root.original);
  add('', extra.original_mes);
  add('', extra.phraseDeskOriginal);
  return hashes.has(sourceHash);
}







export function safeExtensionSettingsSnapshot(settings = {}) {
  const out = Object.assign({}, settings || {});
  delete out.debugLogs;
  delete out.chatTranslationCache;
  delete out.__debugLogs;
  return out;
}

export function createMemoryDebugLogger(seed = []) {
  let logs = [];

  const scrub = (obj = {}) => {
    const compact = Object.assign({}, obj || {});
    for (const key of ['prompt', 'raw', 'cleaned', 'source', 'original', 'translated', 'text']) {
      if (typeof compact[key] === 'string') {
        compact[`${key}Length`] = compact[key].length;
        delete compact[key];
      }
    }
    if (typeof compact.error === 'string') compact.error = compact.error.slice(0, 500);
    return compact;
  };

  if (Array.isArray(seed) && seed.length) logs = seed.slice(-12).map(scrub);

  return {
    push(obj = {}) {
      logs.push({ time: new Date().toLocaleString(), ...scrub(obj) });
      logs = logs.slice(-12);
      return logs;
    },
    clear() { logs = []; },
    text() {
      return logs.slice(-12).map((x, i) => `[${i + 1}] ${JSON.stringify(scrub(x), null, 2)}`).join('\n\n') || '아직 디버그 로그가 없습니다.';
    },
    list() { return logs.slice().map(scrub); },
  };
}

export function cleanContextForPrompt(value = '') {
  return String(value || '')
    .replace(FORMAT_TOKEN_RE, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .slice(0, 2400)
    .trim();
}

export function normalizeFenceLanguage(value = '') {
  return String(value || '');
}

export function cleanOrphanFormatTokens(value = '') {
  return String(value ?? '');
}

function sourceContainsLine(source = '', line = '') {
  const probe = String(line || '').trim();
  return !!probe && String(source || '').includes(probe);
}

// Some model responses arrive inside one added outer code fence. Accept that safe
// shape, but never unwrap a fence that already existed in the source itself.
function unwrapAddedOuterFence(value = '', originalText = '') {
  let out = String(value || '').replace(/\r\n/g, '\n').trim();
  const source = String(originalText || '').trim();
  if (/^```[^\n`]*\n[\s\S]*\n?```$/.test(source)) return out;
  const match = out.match(/^```[^\n`]*\n([\s\S]*?)\n?```$/);
  if (!match || String(match[1] || '').includes('```')) return out;
  return String(match[1] || '').trim();
}

function removeAddedOutputLabel(value = '', originalText = '') {
  const out = String(value || '').trim();
  const lines = out.split('\n');
  if (!lines.length || sourceContainsLine(originalText, lines[0])) return out;
  if (/^\s*(?:translation|translated text|result|output|answer|korean(?: translation)?|번역(?:문| 결과)?|결과|출력)\s*[:：-]?\s*$/i.test(lines[0])) {
    return lines.slice(1).join('\n').trimStart();
  }
  return out.replace(/^\s*(?:translation|translated text|result|output|answer|korean(?: translation)?|번역(?:문| 결과)?|결과|출력)\s*[:：-]\s*/i, '');
}

function removeShortPreamble(value = '', originalText = '') {
  const out = String(value || '').trim();
  const lines = out.split('\n');
  if (lines.length < 2 || sourceContainsLine(originalText, lines[0])) return out;
  const first = lines[0].trim();
  if (first.length > 180) return out;
  if (/^(?:here(?:'s| is) (?:the )?(?:korean )?translation|below is (?:the )?translation|i(?:'ll| will) translate(?: it| this)?|translated version|다음은 번역(?:문|입니다)?|아래는 번역(?:문|입니다)?)[.!:：-]*$/i.test(first)) {
    return lines.slice(1).join('\n').trimStart();
  }
  return out;
}

function looksLikeTaskFailure(value = '', originalText = '') {
  const first = String(value || '').trim().split('\n').slice(0, 2).join(' ').slice(0, 420);
  if (!first || sourceContainsLine(originalText, first)) return false;
  const unable = /\b(?:cannot|can't|unable|won't|will not)\b|(?:할 수 없|도와드릴 수 없|제공할 수 없|수행할 수 없)/i.test(first);
  const task = /\b(?:translate|translation|request|task|content|assist|provide)\b|(?:번역|요청|작업|내용|도움|제공)/i.test(first);
  return unable && task;
}

function trimClearPromptLeak(value = '', originalText = '') {
  const out = String(value || '');
  const source = String(originalText || '');
  if (!source || source.length < 160 || out.length <= source.length * 4.5) return out;
  const leakSignals = (out.match(/^\s*(?:system|developer|assistant|instructions?|rules?|output contract|source text)\s*[:：]/gim) || []).length;
  return leakSignals >= 4 ? '' : out;
}

function readSquareBlock(text = '', start = 0) {
  if (text[start] !== '[') return null;
  let depth = 1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']' && --depth === 0) return { end: i + 1, body: text.slice(start + 1, i) };
  }
  return null;
}

function stripTranslationWrapper(value = '') {
  let text = String(value || '').trim();
  const wrappers = [['"', '"'], ['“', '”'], ['「', '」'], ['『', '』']];
  for (const [left, right] of wrappers) {
    if (text.startsWith(left) && text.endsWith(right) && text.length > 2) {
      text = text.slice(left.length, -right.length).trim();
      break;
    }
  }
  return text;
}

function quoteLanguageProfile(value = '') {
  const text = String(value || '');
  return {
    target: (text.match(/[가-힣ぁ-んァ-ヶ一-龥]/g) || []).length,
    latin: (text.match(/[A-Za-z]/g) || []).length,
  };
}

function cleanQuoteLanguagePiece(value = '') {
  return stripTranslationWrapper(String(value || ''))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;!?…])/g, '$1')
    .trim();
}

function mergeQuoteTranslation(content = '', outsideTranslation = '') {
  const blocks = [];
  let outside = '';
  let cursor = 0;
  const text = String(content || '');
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '[') continue;
    const block = readSquareBlock(text, i);
    if (!block) continue;
    outside += text.slice(cursor, i) + ' ';
    blocks.push(cleanQuoteLanguagePiece(block.body));
    cursor = block.end;
    i = block.end - 1;
  }
  outside += text.slice(cursor);
  outside = cleanQuoteLanguagePiece(outside);

  const outsideProfile = quoteLanguageProfile(outside);
  const targetBlocks = blocks.filter(x => {
    const p = quoteLanguageProfile(x);
    return p.target > 0 && p.target >= p.latin;
  });
  const latinBlocks = blocks.filter(x => {
    const p = quoteLanguageProfile(x);
    return p.latin > 0 && p.latin > p.target;
  });
  const detached = cleanQuoteLanguagePiece(outsideTranslation);
  if (detached && quoteLanguageProfile(detached).target > 0) targetBlocks.push(detached);

  let source = '';
  let translated = '';
  if (outsideProfile.latin > 0 && outsideProfile.latin >= outsideProfile.target) {
    source = outside;
    translated = targetBlocks.join(' ');
  } else if (outsideProfile.target > 0 && latinBlocks.length) {
    source = latinBlocks.join(' ');
    translated = [outside, ...targetBlocks].filter(Boolean).join(' ');
  } else {
    const allLatin = [outsideProfile.latin > outsideProfile.target ? outside : '', ...latinBlocks].filter(Boolean);
    const allTarget = [outsideProfile.target >= outsideProfile.latin ? outside : '', ...targetBlocks].filter(Boolean);
    source = allLatin.join(' ');
    translated = allTarget.join(' ');
  }

  source = cleanQuoteLanguagePiece(source);
  translated = cleanQuoteLanguagePiece(translated);
  if (!translated || !LATIN_TEXT_RE.test(source) || !TARGET_TEXT_RE.test(translated)) return null;
  return `${source} [${translated}]`;
}

function findClosingQuote(text = '', start = 0, close = '"') {
  for (let i = start; i < text.length; i++) {
    if (text[i] !== close) continue;
    let slashCount = 0;
    for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) slashCount++;
    if (slashCount % 2 === 0) return i;
  }
  return -1;
}

// Linear scan: no DOM work, no repeated whole-string masking, and no parser run unless
// both a dialogue quote and a Korean/Japanese/Chinese bracket are present.
export function normalizeBilingualQuotes(value = '') {
  return String(value ?? '');
}

export function cleanTranslationArtifacts(value = '', originalText = '', options = {}) {
  return String(value ?? '');
}
