// Translate code-authored UI strings only. User notes, chat text, model results,
// character names and editable prompts are interpolated after lookup and untouched.
let locale = 'en';
let strings = Object.create(null);
let english = Object.create(null);
export function getUiLocale() { return locale; }
export function pdTranslationKey(source = '') {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `phraseDesk.${(hash >>> 0).toString(16)}`;
}
export function pdT(source = '') {
  const text = String(source ?? '');
  const key = pdTranslationKey(text);
  if (/^ko(?:-|$)/i.test(locale)) return strings[key] ?? text;
  return strings[key] ?? english[key] ?? text;
}
export function pdUi(parts, ...values) {
  const source = parts.reduce((out, part, i) => out + part + (i < values.length ? '${' + i + '}' : ''), '');
  return pdT(source).replace(/\$\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index] ?? '') : match);
}
export async function initPdI18n(native = {}) {
  try {
    locale = String(native.getCurrentLocale?.() || globalThis.localStorage?.getItem('language')
      || globalThis.navigator?.language || 'en').toLowerCase();
  } catch { locale = 'en'; }
  const read = async name => {
    try {
      const response = await fetch(new URL(`./i18n/${name}.json`, import.meta.url));
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (error) {
      console.warn(`[Phrase Desk] Cannot load ${name} UI translations; using fallback.`, error);
      return {};
    }
  };
  const base = locale.split('-')[0];
  const selected = ['ko','ja','fr','es'].includes(base) ? base : 'en';
  english = await read('en');
  strings = selected === 'en' ? english : await read(selected);
  try { native.addLocaleData?.(locale, { ...english, ...strings }); } catch {}
}
