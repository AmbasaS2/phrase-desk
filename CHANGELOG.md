# Phrase Desk changelog

## 2026-11-13 follow-up — On-demand expression explanation

- Selected text's floating `Aa` now offers **Save Expression** and **Explore Expression**. The input-box Aa quick menu is unchanged.
- Explore uses one explicit Connection Profile AI request for contextual meaning, nuance, grammar, examples, and alternatives. Saving its result uses the existing notebook without another request. A non-JSON answer is displayed instead of discarded or retried automatically.
- Korean, English, Japanese, French, and Spanish UI labels were added. Translation alignment, cache, message contents, study-data migration, and character assets are unchanged.
- Verification: 19 Node regressions passed; browser coverage passed in desktop/mobile sizes, including selection Aa menu, no API request for Save, one request for Explore, saving explanation fields, and untouched chat data.
- Pre-feature rollback baseline: `1a42c2e2c5a2c1f4c320acfc76daaa102d127f03` (main). Do not delete notebooks or chats to roll back.

## 1.6.0 — 2026-11-13

### Changes

- Translate human-readable source spans in any script, including mixed-language passages. Fix Latin/Hangul-only source filters that excluded Japanese, Chinese, Cyrillic, Arabic, and other scripts. Recognize French guillemets in dialogue.
- Add independent study and translation/explanation languages, including custom language names. The output language defaults to the SillyTavern locale. Google Translation requires a supported language code for custom languages.
- Apply study language to expression collection, enrichment, local quizzes, AI answer practice, composer translation, and input correction. Preserve English collection levels; use general levels and Unicode-aware segmentation for other languages.
- Add the fourth settings checkbox, **Show the input-box Aa button**. Selection Aa, the translation button, and the wand-menu entry remain available.
- Expose the full literary/style prompt with a confirmed **Restore default prompt** action. Preserve old user preferences and character prompts. PDU/PD_FMT alignment and output contracts stay internal.
- Localize static interface strings into Korean, English, Japanese, French, and Spanish; other interface locales fall back to English. User text, character names, and editable prompts are not UI-translated.

### Data and compatibility

Existing notes and study histories retain their exact content and receive legacy English/Korean language metadata once. New notes store their language pair. Study pools and history limits are separated by language pair. Import/export preserves language metadata and unknown note fields.

Translation caches are separated by target language and original/swipe. Switching target languages restores only a matching cache, or shows the original without sending a paid request. Source edits invalidate only that swipe. Prompt edits leave existing cached results intact; long-press the translation button to request a fresh translation. Alignment failure continues to show the usable received translation rather than discard a paid result or silently retry.

### Verification

- Node.js 22.22.1: 16 automated tests passed, including the existing collection-level, deterministic-quiz, and spacing regressions plus new multilingual/prompt/cache/data/locale tests.
- Headless Chrome with a mocked SillyTavern context and deterministic provider responses: 13 browser scenarios passed. Included desktop 1280px/mobile 375px in ko/en/ja/fr/es and German-to-English UI fallback, prompt reset/cancel, Aa reinjection, settings persistence calls, custom languages, note-language controls, and modal layout.
- The browser translation scenario verified mixed French/Japanese source handling, Korean/French cached views, no extra requests on language restoration, safe blur, swipe isolation, and source-edit invalidation.
- JavaScript syntax, matching manifest/runtime versions, locale key/placeholder/HTML parity, UTF-8, and Git whitespace checks passed.

This is **not** a live test of the user's installed SillyTavern version, real phone/browser, real model translation quality, or Google network service. The installed SillyTavern version was not available. Model language coverage and quality depend on the chosen provider. Unspaced-word exercises require browser Intl.Segmenter support. Ambiguous source brackets remain readable rather than being misidentified as translated footnotes.

### Changed files and rollback

Runtime: `index.js`, `pd-language.js`, `pd-i18n.js`, `pd-safe-utils.js`, `style.css`, `manifest.json`, and `i18n/*.json`. Documentation and regression tests accompany the change; unrelated extensions, character assets, and host installation files were not changed.

Pre-update baseline: **v1.5.5**, commit `9b236123ccd570a1c296f1c2902d82e713bac1e3` (main). Roll back the extension code to that commit if startup, original/swipe preservation, or translation display regresses. Do not delete user settings or chat files to roll back. Export learning data first: v1.5.5 does not understand the new language filtering, so keep the v1.6 backup when reverting code.
