import fs from 'node:fs';
import vm from 'node:vm';
import * as language from './pd-language.js';
import * as safe from './pd-safe-utils.js';

export const identityUi = (parts, ...values) => parts.reduce((out, part, i) => out + part + (i < values.length ? values[i] : ''), '');
export function loadPhraseDesk({ locale = 'ko-KR', seed = {} } = {}) {
  const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
  const context = { chat:[], characters:[], name1:'User', name2:'Character', characterId:0,
    extensionSettings:{connectionManager:{profiles:[{id:'test',name:'Test'}]}}, saveSettings(){}, saveSettingsDebounced(){}, saveChatDebounced(){} };
  const empty = new Proxy({ length:0, val(){return '';}, data(){}, toArray(){return [];}, get(){return [];} }, {
    get(target, key) { return key in target ? target[key] : () => empty; },
  });
  const document = {
    addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:{style:{setProperty(){}},classList:{toggle(){}}},
    createElement(){return { innerHTML:'', get textContent(){return this.innerHTML.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&');} };},
  };
  const sandbox = {
    ...language, ...safe, Math, Date, Set, Map, Intl, Uint8Array, URL, AbortController,
    console, document, navigator:{language:locale}, window:{SillyTavern:{getContext:()=>context}},
    extension_settings:{'phrase-desk':structuredClone(seed)}, getContext:()=>context,
    getUiLocale:()=>locale, pdT:value=>value, pdUi:identityUi, initPdI18n:async()=>{}, stI18n:{},
    getRequestHeaders:()=>({}), jQuery(){}, $:()=>empty, setTimeout:()=>0, clearTimeout(){},
    requestAnimationFrame(){}, confirm:()=>true,
  };
  vm.createContext(sandbox);
  const code = source.replace(/^import[\s\S]*?;\s*\n/gm, '');
  const names = [...source.matchAll(/^(?:async )?function (\w+)\(/gm)].map(match=>match[1]);
  vm.runInContext(code + '\nglobalThis.__api = { settings, ' + names.join(',') + ' };', sandbox);
  return { ...sandbox.__api, context, sandbox };
}
export function cannedCanonical(api, source, translations) {
  const plan = api.createCanonicalTranslationPlan(source);
  let output = plan.promptSource;
  plan.items.forEach((item,index) => {
    const replacement = translations[index] ?? translations[0];
    output = output.replace(item.openMarker + item.promptText + item.closeMarker,
      item.openMarker + replacement + item.closeMarker);
  });
  return { plan, output, record:api.parseCanonicalTranslationResult(output,plan,'profile') };
}
