import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.PHRASE_DESK_TEST_CHROME;
const jquery = process.env.PHRASE_DESK_TEST_JQUERY;
const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const start = source.indexOf('function messageInfoAnchor(payload) {');
const end = source.indexOf('function messageIndexForPayload(payload) {', start);
assert.ok(start >= 0 && end > start);
const snippet = source.slice(start, end);

test('real DOM observer excludes streaming body, handles late/replaced metadata and resets on chat changes',
    { skip: !chrome || !jquery ? 'Set PHRASE_DESK_TEST_CHROME and PHRASE_DESK_TEST_JQUERY' : false }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-observer-browser-'));
    try {
        const fixture = String.raw`
const ctx = { chat: [{ mes: 'first message', is_user: false }] };
const liveContext = () => ctx;
const pdT = value => value;
const payloadIsUserMessage = payload => payload.msg.is_user === true;
const pdShouldIncludeHiddenChatRecord = () => true;
const messagePayloadFromTarget = () => { throw Error('unexpected slow lookup'); };
const pdGlobalState = {};
const frames = [];
window.requestIdleCallback = undefined;
window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
let delivered = 0;
const NativeObserver = window.MutationObserver;
window.MutationObserver = class extends NativeObserver {
    constructor(callback) {
        super((records, observer) => { delivered += records.length; callback(records, observer); });
    }
};
const assert = (ok, message) => { if (!ok) throw Error(message); };
const settle = async () => {
    for (let i = 0; i < 8; i++) {
        await Promise.resolve();
        for (const callback of frames.splice(0)) callback();
    }
};
`;
        const scenario = String.raw`
(async () => {
    try {
        const root = document.getElementById('chat');
        const mes = root.querySelector('.mes');
        const body = mes.querySelector('.mes_text');
        let meta = mes.querySelector('.mesAvatarWrapper');
        setupMessageButtonObserver();
        await settle();
        assert(meta.querySelectorAll('.pd-message-translate-btn').length === 0, 'empty metadata has no button');
        const baseline = delivered;
        for (let i = 0; i < 100; i++) {
            body.firstChild.data = 'stream ' + i;
            body.innerHTML = '<span>streamed HTML</span>';
            body.append('streamed text');
            body.textContent = 'streamed text';
        }
        await settle();
        assert(delivered === baseline, 'streaming body reached the observer');
        meta.querySelector('.tokenCounterDisplay').textContent = '10 tokens';
        await settle();
        assert(meta.querySelectorAll('.pd-message-translate-btn').length === 1, 'late token label did not hydrate');
        const replacement = meta.cloneNode(false);
        replacement.innerHTML = '<div class="tokenCounterDisplay">20 tokens</div>';
        meta.replaceWith(replacement);
        await settle();
        assert(replacement.querySelectorAll('.pd-message-translate-btn').length === 1, 'replacement metadata did not hydrate');
        const second = mes.cloneNode(true);
        second.setAttribute('mesid', '1');
        second.querySelector('.pd-message-translate-btn').remove();
        ctx.chat.push({ mes: 'second message', is_user: false });
        root.append(second);
        await settle();
        assert(second.querySelectorAll('.pd-message-translate-btn').length === 1, 'new message did not hydrate');
        root.replaceChildren();
        ctx.chat = [];
        setupMessageButtonObserver({ reset: true });
        await settle();
        const resetBaseline = delivered;
        replacement.querySelector('.tokenCounterDisplay').textContent = 'detached';
        await settle();
        assert(delivered === resetBaseline, 'detached old metadata still watched after chat reset');
        document.getElementById('result').textContent = 'PASS';
    } catch (error) {
        document.getElementById('result').textContent = 'FAIL: ' + error.message;
    }
})();
`;
        const html = '<!doctype html><meta charset="utf-8"><div id="chat"><div class="mes" mesid="0">' +
            '<div class="mesAvatarWrapper"><div class="tokenCounterDisplay"></div></div>' +
            '<div class="mes_block"><div class="mes_text">initial text</div></div></div></div><pre id="result">PENDING</pre>' +
            '<script>' + fs.readFileSync(jquery, 'utf8') + '</script><script>' + fixture + snippet + scenario + '</script>';
        const file = path.join(dir, 'index.html');
        fs.writeFileSync(file, html);
        const result = spawnSync(chrome, ['--headless', '--no-sandbox', '--disable-dev-shm-usage',
            '--disable-gpu', '--no-first-run', '--disable-background-networking', '--virtual-time-budget=2000',
            '--user-data-dir=' + path.join(dir, 'profile'), '--dump-dom', 'file://' + file],
            { encoding: 'utf8', timeout: 45000, maxBuffer: 10 * 1024 * 1024 });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /<pre id="result">PASS<\/pre>/, result.stdout.match(/<pre id="result">.*?<\/pre>/)?.[0]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
