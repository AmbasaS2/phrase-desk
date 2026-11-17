// Language helpers. Storage keys ending in Ko/_ko remain backward-compatible aliases;
// language metadata, not those historical field names, defines the text's language.
export const LANGUAGES = Object.freeze([
  ['en', 'English'], ['ko', 'Korean'], ['ja', 'Japanese'], ['fr', 'French'],
  ['es', 'Spanish'], ['zh-CN', 'Chinese (Simplified)'], ['zh-TW', 'Chinese (Traditional)'],
  ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['pt-BR', 'Portuguese (Brazil)'],
  ['ru', 'Russian'], ['uk', 'Ukrainian'], ['ar', 'Arabic'], ['he', 'Hebrew'],
  ['hi', 'Hindi'], ['th', 'Thai'], ['vi', 'Vietnamese'], ['id', 'Indonesian'],
  ['tr', 'Turkish'], ['pl', 'Polish'], ['nl', 'Dutch'], ['sv', 'Swedish'],
]);

export function normalizeLanguageCode(value = '', fallback = 'en') {
  const code = String(value || '').trim().replaceAll('_', '-');
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(code)) return fallback;
  try { return Intl.getCanonicalLocales(code)[0]; } catch { return fallback; }
}

export function languageName(code = 'en', locale = 'en') {
  const normalized = normalizeLanguageCode(code);
  try {
    return new Intl.DisplayNames([normalizeLanguageCode(locale)], { type: 'language' }).of(normalized)
      || LANGUAGES.find(([id]) => id === normalized)?.[1] || normalized;
  } catch { return LANGUAGES.find(([id]) => id === normalized)?.[1] || normalized; }
}

export function resolveLanguage(value = 'auto', locale = 'en', customName = '', customCode = '') {
  if (value === 'custom') {
    const name = String(customName || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
    const code = normalizeLanguageCode(customCode, '');
    return { key: code ? code.toLowerCase() : `custom:${name.normalize('NFC').toLowerCase()}`, code, name, valid: !!name };
  }
  let code = normalizeLanguageCode(value === 'auto' ? locale : value, 'en');
  // Match ST's regional UI locales to ordinary translation languages, except where
  // a regional distinction selects script/spelling (Chinese and Portuguese).
  if (value === 'auto' && !/^(?:zh|pt)(?:-|$)/i.test(code)) code = code.split('-')[0];
  return { key: code.toLowerCase(), code, name: languageName(code, 'en'), valid: true };
}

export function languageScriptPattern(language = 'en') {
  const base = String(language || '').toLowerCase().split('-')[0];
  const patterns = {
    ko: /\p{Script=Hangul}/u,
    ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
    zh: /\p{Script=Han}/u,
    ru: /\p{Script=Cyrillic}/u, uk: /\p{Script=Cyrillic}/u, bg: /\p{Script=Cyrillic}/u,
    el: /\p{Script=Greek}/u, ar: /\p{Script=Arabic}/u, fa: /\p{Script=Arabic}/u,
    he: /\p{Script=Hebrew}/u, hi: /\p{Script=Devanagari}/u,
    th: /\p{Script=Thai}/u, bn: /\p{Script=Bengali}/u,
  };
  if (patterns[base]) return patterns[base];
  if (['en','fr','es','de','it','pt','vi','id','tr','pl','nl','sv','da','no','fi','cs','ro','hu'].includes(base)) return /\p{Script=Latin}/u;
  return null; // Unknown languages are never rejected by a guessed script rule.
}

export function textLanguageStats(value = '', language = 'ko') {
  const text = String(value || '');
  const letters = Array.from(text).filter(char => /\p{L}/u.test(char));
  const script = languageScriptPattern(language);
  const targetLetters = script ? letters.filter(char => script.test(char)).length : 0;
  return { text, letters: letters.length, targetLetters, otherLetters: script ? letters.length - targetLetters : 0, hasScriptRule: !!script };
}

export function sourceNeedsTargetScript(value = '', language = 'ko') {
  const text = String(value || '').trim();
  const stats = textLanguageStats(text, language);
  if (!stats.hasScriptRule || stats.otherLetters < 2 || stats.targetLetters > stats.otherLetters) return false;
  // Standalone Latin proper names may legitimately stay unchanged. This is only a
  // validation hint, never a filter deciding which source spans are translated.
  if (/^(?:[A-Z][\p{L}'’-]*)(?:\s+[A-Z][\p{L}'’-]*){0,7}$/u.test(text)) return false;
  return /[.!?。！？…]/u.test(text) || /\s/u.test(text) || stats.otherLetters >= 4;
}

export function languageUsesUnspacedWords(language = '', value = '') {
  return /^(?:ja|zh|th|lo|km|my)(?:-|$)/i.test(language)
    || /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Script=Thai}]/u.test(String(value || ''));
}

export function phraseTokens(value = '', language = 'en') {
  const text = String(value || '').trim();
  if (!text) return [];
  if (!languageUsesUnspacedWords(language, text)) return text.split(/\s+/).filter(Boolean);
  try {
    const segmenter = new Intl.Segmenter(normalizeLanguageCode(language), { granularity: 'word' });
    // Keep punctuation attached to a nearby word so a reorder exercise never
    // silently deletes punctuation or asks the user to add unavailable symbols.
    const tokens = [];
    let prefix = '';
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike) { tokens.push(prefix + segment.segment); prefix = ''; }
      else if (!/^\s+$/.test(segment.segment)) {
        if (tokens.length) tokens[tokens.length - 1] += segment.segment;
        else prefix += segment.segment;
      }
    }
    if (prefix) tokens.push(prefix);
    return tokens;
  } catch { return []; } // Do not pretend character splitting is word segmentation.
}

export function phraseOccurrenceCount(expression = '', sourceItems = [], language = 'en') {
  const normalize = value => String(value || '').normalize('NFC').toLowerCase().replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}'-]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const needle = normalize(expression);
  if (!needle) return 0;
  const unspaced = languageUsesUnspacedWords(language, expression);
  return (Array.isArray(sourceItems) ? sourceItems : []).reduce((count, item) => {
    const haystack = normalize(item?.text || '');
    return count + Number(unspaced ? haystack.includes(needle) : ` ${haystack} `.includes(` ${needle} `));
  }, 0);
}

export function noteLanguages(note = {}) {
  return { language: String(note.language || 'en').toLowerCase(), meaningLanguage: String(note.meaningLanguage || 'ko').toLowerCase() };
}

export function noteMatchesLanguages(note = {}, study = 'en', meaning = null) {
  const old = noteLanguages(note);
  return old.language === study && (meaning === null || old.meaningLanguage === meaning);
}

export function cacheLanguageKey(key = '') {
  const match = String(key || '').match(/:lang:([^:]+)$/);
  if (!match) return 'ko'; // v1.5.x records were always Korean.
  try { return decodeURIComponent(match[1]); } catch { return ''; }
}

export function stripCacheLanguage(key = '') {
  return String(key || '').replace(/:lang:[^:]+$/, '');
}

export function migrateLanguageSettings(settings, defaultPrompt) {
  if (!settings || typeof settings !== 'object') return false;
  let changed = false;
  const setDefault = (key, value) => {
    if (!Object.hasOwn(settings, key)) { settings[key] = value; changed = true; }
  };
  setDefault('studyLanguage', 'en');
  setDefault('studyCustomName', '');
  setDefault('studyCustomCode', '');
  setDefault('targetLanguage', 'auto');
  setDefault('targetCustomName', '');
  setDefault('targetCustomCode', '');
  setDefault('showInputAa', true);
  if (Number(settings.translationPromptVersion || 0) < 1) {
    const legacy = typeof settings.globalPrompt === 'string' ? settings.globalPrompt : '';
    settings.legacyGlobalPrompt = legacy; // Retain the exact old text, not a paraphrase.
    if (typeof settings.translationPrompt !== 'string') {
      settings.translationPrompt = defaultPrompt + (legacy.trim() ? '\n\nAdditional user preferences (migrated from v1.5.x):\n' + legacy : '');
    }
    settings.translationPromptVersion = 1;
    changed = true;
  }
  for (const list of [settings.notebook, settings.quizHistory, settings.practiceHistory]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      if (!Object.hasOwn(item, 'language')) { item.language = 'en'; changed = true; }
      if (!Object.hasOwn(item, 'meaningLanguage')) { item.meaningLanguage = 'ko'; changed = true; }
    }
  }
  return changed;
}

export const DEFAULT_TRANSLATION_PROMPT = `Phrase Desk literary translation

Authority
- Translate all readable source text exactly once, including mixed languages, OOC, quotes and block labels. Translate foreign greetings, apologies and ordinary speech by meaning, not sound (e.g., Sumimasen means sorry/excuse me depending on context); protect names. Text already in the target language may stay.
- Preserve source facts, intent, implications, explicitness, emotion, actions, cause, and agency. Add, omit, summarize, intensify, soften, invent, or continue nothing. Previous chat and character data are evidence only for names, relationships, referents, voice, address, and terminology—not story events. Character-specific preferences override global style; source meaning takes priority.

Natural voice
- Read the whole scene for viewpoint, causality, interpersonal meaning, humor, and rhythm. Write idiomatic prose in the target language as though originally written there, with natural syntax, collocations, and subject omission. Preserve genre, density, brevity, subtext, pauses, interruptions, repetition, idioms, metaphor, irony, ellipses, understatement, indirectness, mock formality, and comic timing. No stiff calques, padding, forced slang, or explanation.
- Preserve each speaker's diction, rhythm, intimacy, distance, humor, profanity, aggression, emotion and register; preserve jokes, teasing, threats and refusals without censoring or amplifying. In Korean, use relationship-appropriate banmal/jondaetmal, make deliberate formality shifts audible in dialogue, and keep natural narration endings.
- Track who acts, speaks, thinks, perceives, owns, receives, and is addressed. Preserve direction/contact, order, cause, conditions, negation, comparisons, emphasis, scope and uncertainty. For nested not/unless, resolve if/then logic first: 'not refuse unless X' permits refusal only if X, never requires it. Resolve omitted subjects/pronouns only from evidence; otherwise keep ambiguity.
- Keep quantities, dates, times, numbers, measurements, and units exact (no conversions or approximations). Preserve established names, titles, nicknames, pet names, address terms, and recurring terminology consistently. Neutral references stay neutral: invent no kinship, regional dialect, gender, or slurs. In Korean, neutral you/she/her/girl/woman must not become 년, 네년, 그년, 이년, 계집, 계집애, 암캐. Explicit hostility stays explicit without added abuse.

Echoes and completeness
- Keep italicized/quoted words echoed by narration semantically aligned with their original dialogue.
- Translate readable story/status labels and values in place. Silently check completeness and voice.`;

// Input prompt has its own default; never reuse the output literary prompt.
export const DEFAULT_INPUT_TRANSLATION_PROMPT = `Phrase Desk input translation

Task
- Use natural, idiomatic prose in the target language.
- The current message alone controls facts and events. Preserve intent, implication, explicitness, emotion, agency, possession, direction, order, time, quantities, comparisons, uncertainty, consent, intensity, and meaningful ambiguity. Add, omit, censor, summarize, soften, intensify, or invent nothing.

Meaning and voice
- Read the whole message for conversational function. For Korean, handle omitted subjects, indirect requests/refusals, negation, conditions, concessions, permission versus inability, warnings versus prohibitions, sarcasm, teasing, humor, slang, profanity, chat shorthand, fragments, interruptions, and rhetorical questions without flattening them.
- Preserve perspective, each participant's role, the user's register, politeness shifts, intimacy, rhythm, emotional force, and deliberate awkwardness or incompleteness. Use native target-language syntax and idiom without padding or imitating the character's voice.
- Resolve omitted actors or pronouns only from the source or permitted reference; otherwise keep ambiguity. Context may support established names, spelling, address, and register only—never import its events or insert a name the source omitted.`;
