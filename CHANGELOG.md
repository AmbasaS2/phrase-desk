# Phrase Desk changelog

## 2026-11-17 UI follow-up — native-sized theme icons (v1.6.1 unchanged)

- Corrected five oversized prompt-toolbar buttons: Phrase Desk had forcibly set each icon to 34×32px instead of following SillyTavern's UI theme controls.
- Match the native theme button classes (icon variant for header actions, ordinary variant for Save/Save As), let font size inherit, and use theme-like minimum-content sizing/padding. Only `index.js`, `style.css`, and the associated regression test were changed.
- Node.js 22 test suite: 48/48 passed. A synthetic Chromium reference using native `.menu_button` rules measured equal ~25×26px boxes; actual user theme/browser still needs a visual check.
- Roll back this follow-up to commit `aac6277f84e2fef92619d923c1e0bc75b8f0ae51` if buttons clip or become inaccessible. Keep user prompt settings and chats untouched.


## 2026-11-17 UI follow-up — theme-style prompt manager (v1.6.1 unchanged)

- Replaced the 1.6.1 six-button preset manager with compact SillyTavern-style controls: header Export JSON / Import JSON / Delete, selector row Save (disk) / Save as New, and the full prompt editor below. Removed the old explanatory warning text and obsolete native browser prompt dialogs.
- **Save** now commits both the selected prompt and edited text. Selecting a different prompt or typing alone does not affect the active translation prompt or last saved selection. Save as New creates a named copy from the displayed text, including unsaved edits, through an in-page modal. Deletion and discarding unsaved changes use in-page confirmation dialogs.
- JSON export/import operates on one named prompt with the versioned `phrase-desk-translation-prompt` format; import validates the file, preserves existing prompts, and gives duplicates a unique numbered name.
- Existing saved prompts, character-specific auto-save, translation caches, PDU/PD_FMT contracts, study data and built-in literary default remain untouched. No third-party translation flavor prompt is bundled, and the separate lean-prompt experiment is not included.
- Tests: Node.js 22 regression suite **47/47 passed** including direct UI simulation, JSON roundtrips, selection persistence and failure guards. An isolated Chromium toolbar layout probe at 320/375/390/430/1280px showed no overlap or horizontal overflow. This does not validate the user's live SillyTavern, installed theme, browser, or API provider.
- Rollback to the pre-UI-follow-up 1.6.1 code baseline `f52e71fcec88e73647ceb64229489b1f1b1ceb10` if needed; preserve user settings, stored custom prompts and chat data.


## 1.6.1 — 2026-11-17 · Named translation prompt library

- Package exactly one built-in literary translation prompt. It is read-only in settings; users may duplicate it, create named custom prompts, rename, delete, and explicitly Save edited text. No bundled third-party flavor prompts are included.
- The selected custom/default prompt is recorded immediately in SillyTavern user settings and restored after refresh or restart. Unsaved edits never enter the AI prompt; switching presets with a draft requires confirmation.
- Existing saved full translation prompts are migrated without rewriting their contents into a selected custom entry named **기존 전체 프롬프트**. The previous `translationPrompt` setting is preserved for compatibility and rollback.
- Current-character auto-save, PDU/PD_FMT alignment, bilingual layouts, per-swipe caches, Google translation, saved notes and learning data remain unchanged. Switching prompts does not clear caches or trigger API calls.
- Added a small responsive editor and localized controls in ko/en/ja/fr/es; updated English and Korean instructions.
- Validation: Node.js 22.22.1 regression suite **42/42 pass** on a temporary isolated checkout; separate simulated selection/unsaved/save/delete interactions passed. This does not claim real SillyTavern/phone/browser validation or a live model comparison.
- Baseline: `733506e4ab28f394976e7a1b913f57cbca0325d9` (main before this feature). Roll back only extension code if the new prompt manager misbehaves; keep SillyTavern user settings and chat data so saved custom prompts remain available after reinstalling the new release.


## 2026-11-13 UI follow-up — prompt auto-save indicators

- Added small localized **Saving… / Auto-saved ✓** indicators beneath both the global translation prompt and current-character prompt editors. Existing 700 ms debounced and blur/explicit save behavior is unchanged; no extra save button, observers, or timers.
- The global reset remains aligned at the bottom right. Indicators update after settings-saving routines run and show an error if a synchronous save fails. Labels are localized in Korean, English, Japanese, French, and Spanish.
- Verified 24 Node tests and 13 mocked-browser scenarios including Korean/English status transitions, per-character prompt isolation, reset layout and phone-sized viewports. This does not verify disk persistence on the user's installed SillyTavern version.
- Previous baseline: `17b8e44412b20aea3ffb178c294cd9f697934413`. If the prompt status UI or settings auto-save regresses, revert this update without deleting user prompts, notes, or chats.

## 2026-11-13 UI follow-up — expression explanation and save review

- Reorganized **Explore Expression** into a clear expression header and individual meaning, nuance, grammar, example, and alternative cards. Long text scrolls independently of the always-visible bottom Save Expression action.
- When opened from an AI explanation, the existing note-save form now shows editable AI explanation, grammar, and alternatives, while keeping its existing meaning, context, tags, and memo fields. Only the user's final edits are saved; no extra AI calls.
- Styling is scoped to the explanation modal and conditional AI review section. Other modals, composer Aa, translation, PDU, per-swipe cache, user data, and character prompts are untouched.
- Localized the new save-review labels in Korean, English, Japanese, French, and Spanish. Verified 21 Node regression tests, 13 headless-browser scenarios across desktop/mobile locales, long-content scrolling with a fixed footer, and AI-to-save edits without extra requests. Previous baseline: `e8bdf7f46aacc71909a38a8de559a528f8d857ef`. Roll back to this commit if the explanation layout or review input behaves unexpectedly; preserve notes/chats.

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
