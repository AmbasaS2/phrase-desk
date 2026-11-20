/*
 * Phrase Desk learning-only server storage.
 * Uses SillyTavern's built-in per-user /api/files routes. Never stores learning
 * data in browser-local storage or changes message translation cache layout.
 */
export const PD_LEARNING_KEYS = Object.freeze([
  'notebook', 'quizHistory', 'practiceHistory', 'hiddenWrongNotes', 'recentPracticeNoteIds',
]);
export const PD_LEARNING_FORMAT = 'phrase-desk-learning-v1';
export const PD_LEARNING_STORAGE_FORMAT = 'server-files-v1';
export const PD_LEARNING_FILE_PATH = '/user/files/phrase-desk-learning-v1.json';
const PD_LEGACY_BACKUP_FORMAT = 'phrase-desk-learning-legacy-backup-v1';

function plainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function pickLearningData(value = {}) {
  return Object.fromEntries(PD_LEARNING_KEYS.map(key => [
    key, Array.isArray(value?.[key]) ? structuredClone(value[key]) : [],
  ]));
}

export function hasLearningData(value = {}) {
  return PD_LEARNING_KEYS.some(key => Array.isArray(value?.[key]) && value[key].length);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateData(data) {
  if (!plainObject(data) || PD_LEARNING_KEYS.some(key => !Array.isArray(data[key]))) {
    throw new Error('Phrase Desk learning data is missing one or more arrays');
  }
  return pickLearningData(data);
}

function validateFile(payload) {
  if (payload === null) return null;
  if (!plainObject(payload) || payload.format !== PD_LEARNING_FORMAT ||
      !Number.isSafeInteger(payload.revision) || payload.revision < 1) {
    throw new Error('Phrase Desk learning file has an invalid format or revision');
  }
  return { format:PD_LEARNING_FORMAT, revision:payload.revision, data:validateData(payload.data) };
}

async function defaultEncode(value) {
  const json = JSON.stringify(value);
  if (typeof json !== 'string') throw new Error('Could not serialize Phrase Desk learning data');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Phrase Desk file encoding failed'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const comma = dataUrl.indexOf(',');
      if (comma < 0) reject(new Error('Phrase Desk encoded file is malformed'));
      else resolve(dataUrl.slice(comma + 1));
    };
    reader.readAsDataURL(new Blob([json], { type:'application/json' }));
  });
}

export function createPhraseDeskLearningStore({
  request = (...args) => fetch(...args),
  headers = () => ({}),
  encode = defaultEncode,
  now = () => Date.now(),
  random = () => Math.random(),
} = {}) {
  const requestJson = async (url, body) => {
    const response = await request(url, {
      method:'POST', headers:headers(), body:JSON.stringify(body), cache:'no-store',
    });
    if (!response.ok) throw new Error('Phrase Desk server-file request failed ('+response.status+', '+url+')');
    return response.json();
  };

  const exists = async path => {
    const result = await requestJson('/api/files/verify', { urls:[path] });
    return result?.[path] === true;
  };

  const readRaw = async path => {
    if (!await exists(path)) return null;
    const response = await request(path, { method:'GET', headers:headers(), cache:'no-store' });
    if (!response.ok) throw new Error('Phrase Desk learning file read failed ('+response.status+')');
    try { return await response.json(); }
    catch { throw new Error('Phrase Desk learning file contains invalid JSON'); }
  };

  const writeVerified = async (path, value) => {
    const filename = path.split('/').at(-1);
    if (!/^phrase-desk-(?:learning-v1|learning-legacy-[A-Za-z0-9_-]+)\.json$/.test(filename)) {
      throw new Error('Phrase Desk learning file path rejected');
    }
    const result = await requestJson('/api/files/upload', { name:filename, data:await encode(value) });
    if (result?.path !== path) throw new Error('Phrase Desk learning data was saved to the wrong path');
    const reloaded = await readRaw(path);
    if (!sameJson(reloaded, value)) {
      throw new Error('Phrase Desk learning file did not match the saved data on read-back');
    }
    return path;
  };

  return {
    async read() {
      return validateFile(await readRaw(PD_LEARNING_FILE_PATH));
    },
    async write(data, expectedRevision) {
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new Error('Invalid Phrase Desk revision');
      }
      const current = validateFile(await readRaw(PD_LEARNING_FILE_PATH));
      if ((current?.revision || 0) !== expectedRevision) {
        throw new Error('The wordbook was changed on another device; newer data was not overwritten');
      }
      const payload = {
        format:PD_LEARNING_FORMAT,
        revision:expectedRevision+1,
        data:validateData(data),
      };
      await writeVerified(PD_LEARNING_FILE_PATH, payload);
      return payload;
    },
    async backupLegacy(data) {
      const suffix = String(now())+'-'+Math.floor(random()*0xFFFFFFFF).toString(36);
      const path = '/user/files/phrase-desk-learning-legacy-'+suffix+'.json';
      await writeVerified(path, {
        format:PD_LEGACY_BACKUP_FORMAT,
        createdAt:new Date(now()).toISOString(),
        data:validateData(data),
      });
      return path;
    },
  };
}
