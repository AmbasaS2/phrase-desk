// Persist named translation prompts in SillyTavern user settings.
// The built-in default is stored only in pd-language.js; custom prompts are user data.
export const BUILTIN_TRANSLATION_PROMPT_ID = 'builtin';

export function translationPromptPresets(settings = {}) {
  return Array.isArray(settings.translationPresets)
    ? settings.translationPresets.filter(item => item && typeof item.id === 'string'
      && item.id !== BUILTIN_TRANSLATION_PROMPT_ID && typeof item.name === 'string'
      && typeof item.text === 'string')
    : [];
}

export function activeTranslationPromptId(settings = {}) {
  const id = String(settings.activeTranslationPresetId || BUILTIN_TRANSLATION_PROMPT_ID);
  return id === BUILTIN_TRANSLATION_PROMPT_ID || translationPromptPresets(settings).some(item => item.id === id)
    ? id : BUILTIN_TRANSLATION_PROMPT_ID;
}

export function selectedTranslationPrompt(settings = {}, builtinPrompt = '') {
  const id = activeTranslationPromptId(settings);
  return id === BUILTIN_TRANSLATION_PROMPT_ID
    ? String(builtinPrompt)
    : translationPromptPresets(settings).find(item => item.id === id).text;
}

export function migrateTranslationPromptPresets(settings, builtinPrompt = '') {
  if (!settings || typeof settings !== 'object') return false;
  if (Number(settings.translationPresetVersion || 0) >= 1) return false;
  const presets = translationPromptPresets(settings).map(item => ({ ...item }));
  const previous = typeof settings.translationPrompt === 'string'
    ? settings.translationPrompt : String(builtinPrompt);
  let id = String(settings.activeTranslationPresetId || '');
  // A pre-library user's last saved full prompt must never be silently replaced.
  if (previous !== String(builtinPrompt) && !presets.some(item => item.text === previous)) {
    const used = new Set(presets.map(item => item.id));
    let number = 1;
    while (used.has(`custom-${number}`)) number++;
    id = `custom-${number}`;
    presets.push({ id, name: '기존 전체 프롬프트', text: previous });
  } else if (!presets.some(item => item.id === id)) {
    id = presets.find(item => item.text === previous)?.id || BUILTIN_TRANSLATION_PROMPT_ID;
  }
  settings.translationPresets = presets;
  settings.activeTranslationPresetId = id;
  settings.translationPresetVersion = 1;
  return true;
}

export function chooseTranslationPrompt(settings, id, builtinPrompt = '') {
  if (!settings || !id) return false;
  if (id !== BUILTIN_TRANSLATION_PROMPT_ID
    && !translationPromptPresets(settings).some(item => item.id === id)) return false;
  settings.activeTranslationPresetId = id;
  // Keep the previous setting as a rollback/compatibility snapshot, not as a draft.
  settings.translationPrompt = selectedTranslationPrompt(settings, builtinPrompt);
  return true;
}

function validPromptName(settings, name, exceptId = '') {
  const value = String(name || '').trim();
  return value && value.length <= 80 && !/[\r\n]/.test(value)
    && !translationPromptPresets(settings).some(item =>
      item.id !== exceptId && item.name.toLocaleLowerCase() === value.toLocaleLowerCase());
}

export function addTranslationPrompt(settings, name, text = '', builtinPrompt = '') {
  if (!settings || !validPromptName(settings, name)) return null;
  const entries = translationPromptPresets(settings);
  const ids = new Set(entries.map(item => item.id));
  let number = 1;
  while (ids.has(`custom-${number}`)) number++;
  const entry = { id: `custom-${number}`, name: String(name).trim(), text: String(text) };
  settings.translationPresets = [...entries, entry];
  chooseTranslationPrompt(settings, entry.id, builtinPrompt);
  return entry;
}

export function renameTranslationPrompt(settings, id, name) {
  if (!settings || id === BUILTIN_TRANSLATION_PROMPT_ID
    || !validPromptName(settings, name, id)) return false;
  const entries = translationPromptPresets(settings);
  if (!entries.some(item => item.id === id)) return false;
  settings.translationPresets = entries.map(item => item.id === id
    ? { ...item, name: String(name).trim() } : item);
  return true;
}

export function saveTranslationPrompt(settings, id, text, builtinPrompt = '') {
  if (!settings || id === BUILTIN_TRANSLATION_PROMPT_ID) return false;
  const entries = translationPromptPresets(settings);
  if (!entries.some(item => item.id === id)) return false;
  settings.translationPresets = entries.map(item => item.id === id
    ? { ...item, text: String(text) } : item);
  if (activeTranslationPromptId(settings) === id) {
    settings.translationPrompt = selectedTranslationPrompt(settings, builtinPrompt);
  }
  return true;
}

export function deleteTranslationPrompt(settings, id, builtinPrompt = '') {
  if (!settings || id === BUILTIN_TRANSLATION_PROMPT_ID) return false;
  const entries = translationPromptPresets(settings);
  if (!entries.some(item => item.id === id)) return false;
  settings.translationPresets = entries.filter(item => item.id !== id);
  if (activeTranslationPromptId(settings) === BUILTIN_TRANSLATION_PROMPT_ID
    || settings.activeTranslationPresetId === id) {
    chooseTranslationPrompt(settings, BUILTIN_TRANSLATION_PROMPT_ID, builtinPrompt);
  }
  return true;
}
