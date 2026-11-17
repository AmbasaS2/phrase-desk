// Phrase Desk local chunk planner. No external requests or changes to chat data.
const GOOGLE_ENCODED_LIMIT = 4000;
const GOOGLE_PROTECTED_SPAN = /\[\[\/?PDU(?:-[A-Z]+)?-\d{4}\]\]|⟦PD_FMT_[0-9a-z]+⟧|\{\{[^{}\r\n]{1,200}\}\}|<\/?[A-Za-z][^<>\r\n]{0,200}>/gu;

function encodedGoogleCut(text, limit) {
  let cut = 0;
  let used = 0;
  for (const point of text) {
    let size;
    try { size = encodeURIComponent(point).length; }
    catch { size = 3; }
    if (cut && used + size > limit) break;
    used += size;
    cut += point.length;
    if (used >= limit) break;
  }
  return cut || Math.min(1, text.length);
}

function safeGoogleCut(text, proposed) {
  GOOGLE_PROTECTED_SPAN.lastIndex = 0;
  let match;
  while ((match = GOOGLE_PROTECTED_SPAN.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (start < proposed && proposed < end) return start || end;
    if (start >= proposed) break;
  }
  return proposed;
}

function preferredGoogleCut(text, hard) {
  if (hard >= text.length) return hard;
  const floor = Math.floor(hard * 0.48);
  const head = text.slice(0, hard);
  for (const delimiter of ['\n\n', '\n', ' ']) {
    const at = head.lastIndexOf(delimiter);
    if (at >= floor) return at;
  }
  return hard;
}

// The Google URL encodes non-ASCII characters, so UTF-16 length is not a request-size limit.
// Keep PDU, formatting markers, macros and tags intact at request boundaries.
export function splitGoogleChunks(value = '', maxEncodedChars = GOOGLE_ENCODED_LIMIT) {
  const source = String(value || '');
  const limit = Math.max(600, Math.floor(Number(maxEncodedChars) || GOOGLE_ENCODED_LIMIT));
  const chunks = [];
  let cursor = 0;
  while (cursor < source.length) {
    const rest = source.slice(cursor);
    const hard = encodedGoogleCut(rest, limit);
    if (hard >= rest.length) {
      chunks.push({ text: rest, separator: '' });
      break;
    }
    const protectedHard = safeGoogleCut(rest, hard);
    let cut = safeGoogleCut(rest, preferredGoogleCut(rest, protectedHard));
    if (!cut) cut = protectedHard || hard;
    if (!cut) cut = 1;
    const separator = cut < rest.length && /\s/u.test(rest[cut])
      ? (rest.slice(cut).match(/^\s+/u)?.[0] || '')
      : '';
    chunks.push({ text: rest.slice(0, cut), separator });
    cursor += cut + separator.length;
  }
  return chunks.length ? chunks : [{ text:source, separator:'' }];
}

// Keep the existing full-message PDU IDs: each AI request owns complete pairs,
// and concatenating responses still allows the original parser to validate them.
export function splitCanonicalAIInput(plan = null, maxTokens = 8000) {
  const full = String(plan?.promptSource || '');
  const items = Array.isArray(plan?.items) ? plan.items : [];
  const single = [{ text:full, unitCount:items.length }];
  if (!plan?.supported || items.length < 2) return single;
  const budget = Math.min(32768, Math.max(256, Math.floor(Number(maxTokens) || 8000)));
  const charLimit = Math.max(1800, Math.floor(budget * 1.15));
  if (full.length <= charLimit) return single;
  const opens = [];
  let scan = 0;
  for (const item of items) {
    const open = full.indexOf(item.openMarker, scan);
    const close = open < 0 ? -1 : full.indexOf(item.closeMarker, open + item.openMarker.length);
    if (open < scan || close < 0) return single;
    opens.push(open);
    scan = close + item.closeMarker.length;
  }
  const chunks = [];
  let current = '';
  let unitCount = 0;
  for (let i = 0; i < items.length; i++) {
    const start = i ? opens[i] : 0;
    const end = i + 1 < items.length ? opens[i + 1] : full.length;
    const part = full.slice(start, end);
    if (unitCount && current.length + part.length > charLimit) {
      chunks.push({ text:current, unitCount });
      current = '';
      unitCount = 0;
    }
    current += part;
    unitCount++;
  }
  if (current) chunks.push({ text:current, unitCount });
  if (chunks.length < 2
      || chunks.map(chunk => chunk.text).join('') !== full
      || chunks.reduce((sum, chunk) => sum + chunk.unitCount, 0) !== items.length) return single;
  return chunks;
}
