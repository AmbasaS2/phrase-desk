// Input-translation prompt library is intentionally independent of output translation presets.
export const BUILTIN_INPUT_PROMPT_ID = 'builtin';

export function inputTranslationPresets(settings = {}) {
  return Array.isArray(settings.inputTranslationPresets)
    ? settings.inputTranslationPresets.filter(item => item && typeof item.id === 'string'
      && item.id !== BUILTIN_INPUT_PROMPT_ID && typeof item.name === 'string'
      && typeof item.text === 'string')
    : [];
}

export function activeInputTranslationPromptId(settings = {}) {
  const id = String(settings.activeInputTranslationPresetId || BUILTIN_INPUT_PROMPT_ID);
  return id === BUILTIN_INPUT_PROMPT_ID || inputTranslationPresets(settings).some(item => item.id === id)
    ? id : BUILTIN_INPUT_PROMPT_ID;
}

export function selectedInputTranslationPrompt(settings = {}, builtinPrompt = '') {
  const id = activeInputTranslationPromptId(settings);
  return id === BUILTIN_INPUT_PROMPT_ID ? String(builtinPrompt)
    : inputTranslationPresets(settings).find(item => item.id === id).text;
}

export function migrateInputTranslationPresets(settings, builtinPrompt = '') {
  if (!settings || typeof settings !== 'object') return false;
  if (Number(settings.inputTranslationPresetVersion || 0) >= 1) return false;
  // A previous output prompt is never imported into the input-translation library.
  const entries = inputTranslationPresets(settings).map(item => ({ ...item }));
  const previous = typeof settings.inputTranslationPrompt === 'string'
    ? settings.inputTranslationPrompt : String(builtinPrompt);
  let id = String(settings.activeInputTranslationPresetId || '');
  if (previous !== String(builtinPrompt) && !entries.some(item => item.text === previous)) {
    const used = new Set(entries.map(item => item.id));
    let n = 1;
    while (used.has(`custom-${n}`)) n++;
    id = `custom-${n}`;
    entries.push({ id, name: '기존 입력 번역 프롬프트', text: previous });
  } else if (!entries.some(item => item.id === id)) {
    id = entries.find(item => item.text === previous)?.id || BUILTIN_INPUT_PROMPT_ID;
  }
  settings.inputTranslationPresets = entries;
  settings.activeInputTranslationPresetId = id;
  settings.inputTranslationPrompt = id === BUILTIN_INPUT_PROMPT_ID
    ? String(builtinPrompt) : entries.find(item => item.id === id).text;
  settings.inputTranslationPresetVersion = 1;
  return true;
}

export function chooseInputTranslationPrompt(settings, id, builtinPrompt = '') {
  if (!settings || !id || (id !== BUILTIN_INPUT_PROMPT_ID
    && !inputTranslationPresets(settings).some(item => item.id === id))) return false;
  settings.activeInputTranslationPresetId = id;
  settings.inputTranslationPrompt = selectedInputTranslationPrompt(settings, builtinPrompt);
  return true;
}

function validInputPromptName(settings, name) {
  const value = String(name || '').trim();
  return !!(value && value.length <= 80 && !/[\r\n]/.test(value)
    && !['입력 번역 기본 프롬프트','출력 번역 기본 프롬프트','기본 프롬프트','Default prompt'].includes(value)
    && !inputTranslationPresets(settings).some(item => item.name.toLocaleLowerCase() === value.toLocaleLowerCase()));
}

export function addInputTranslationPrompt(settings, name, text = '', builtinPrompt = '') {
  if (!settings || !validInputPromptName(settings, name)) return null;
  const entries = inputTranslationPresets(settings);
  const ids = new Set(entries.map(item => item.id));
  let n = 1;
  while (ids.has(`custom-${n}`)) n++;
  const entry = { id:`custom-${n}`, name:String(name).trim(), text:String(text) };
  settings.inputTranslationPresets = [...entries, entry];
  chooseInputTranslationPrompt(settings, entry.id, builtinPrompt);
  return entry;
}

export function saveInputTranslationPrompt(settings, id, text, builtinPrompt = '') {
  if (!settings || id === BUILTIN_INPUT_PROMPT_ID) return false;
  const entries = inputTranslationPresets(settings);
  if (!entries.some(item => item.id === id)) return false;
  settings.inputTranslationPresets = entries.map(item => item.id === id
    ? { ...item, text:String(text) } : item);
  if (activeInputTranslationPromptId(settings) === id) {
    settings.inputTranslationPrompt = selectedInputTranslationPrompt(settings, builtinPrompt);
  }
  return true;
}

export function deleteInputTranslationPrompt(settings, id, builtinPrompt = '') {
  if (!settings || id === BUILTIN_INPUT_PROMPT_ID) return false;
  const entries = inputTranslationPresets(settings);
  if (!entries.some(item => item.id === id)) return false;
  settings.inputTranslationPresets = entries.filter(item => item.id !== id);
  if (settings.activeInputTranslationPresetId === id) {
    chooseInputTranslationPrompt(settings, BUILTIN_INPUT_PROMPT_ID, builtinPrompt);
  }
  return true;
}

export function exportInputTranslationPromptJSON(settings, id, builtinPrompt = '', builtinLabel = 'Input translation default') {
  const entry = id === BUILTIN_INPUT_PROMPT_ID ? { name:builtinLabel, text:String(builtinPrompt) }
    : inputTranslationPresets(settings).find(item => item.id === id);
  if (!entry) return null;
  return JSON.stringify({ format:'phrase-desk-input-translation-prompt', version:1,
    name:entry.name, text:entry.text }, null, 2);
}

export function parseInputTranslationPromptJSON(raw) {
  if (typeof raw !== 'string' || raw.length > 400000) return null;
  let entry;
  try { entry = JSON.parse(raw); } catch { return null; }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)
    || entry.format !== 'phrase-desk-input-translation-prompt' || entry.version !== 1
    || typeof entry.name !== 'string' || typeof entry.text !== 'string'
    || !entry.name.trim() || entry.name.trim().length > 80 || /[\r\n]/.test(entry.name)
    || entry.text.length > 200000) return null;
  return { name:entry.name.trim(), text:entry.text };
}

export function uniqueInputTranslationPromptName(settings, name, fallback = 'Imported input prompt') {
  const base = String(name || '').trim().replace(/[\r\n]/g, ' ').slice(0,80) || fallback;
  const reserved = new Set(['input translation default','output translation default','default prompt',
    '기본 프롬프트','입력 번역 기본 프롬프트','출력 번역 기본 프롬프트',
    ...inputTranslationPresets(settings).map(item => item.name.toLocaleLowerCase())]);
  if (!reserved.has(base.toLocaleLowerCase())) return base;
  const numbered = base.match(/^(.*) \((\d+)\)$/);
  const stem = numbered ? numbered[1] : base;
  const start = numbered ? Math.max(2, Number(numbered[2])+1) : 2;
  for (let n=start;n<10000;n++) {
    const suffix = ` (${n})`;
    const candidate = stem.slice(0,80-suffix.length)+suffix;
    if (!reserved.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return null;
}
