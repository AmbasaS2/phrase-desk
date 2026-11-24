# Phrase Desk changelog

## 1.6.9 — 2026-11-24 · Basic translation settings callout

- Group the existing connection, translation mode, engine, token limit and language controls into a matching Translation settings callout. Keep custom language fields and helper text inside, and advanced settings/cache controls outside.
- Start expanded for new/existing users without a saved preference. Save the user's explicit collapse/expand choice as a single boolean via the existing SillyTavern extension-settings path; restore it at startup. Advanced settings remain collapsed by default.
- Preserve existing fields, event handlers, prompt editors, translation logic and learning storage. Validation: 120 Node.js tests and five Chromium viewport fixtures passed, including disclosure restoration and existing prompt controls; also verified the extension-settings save/reload round trip in the settings harness. Installed-theme confirmation remains pending.
- Rollback baseline: `1c1646eedbfda67eb580cbe9aa87d30e34d9a55c`; the optional UI preference can be ignored by earlier versions.

## 1.6.8 — 2026-11-24 · Theme-aware advanced settings callout

- Wrap the existing advanced settings disclosure and its entire body in a compact, theme-aware card, inspired by the Lorebook Manager settings card. Add the sliders icon, full-width clickable heading, right-aligned chevron, subtle background, and open-state divider.
- Keep default collapse, all settings, preset controls, native editor popup, and stored data unchanged.
- Validation: 119 Node.js tests passed; Chromium fixtures passed at 320×568, 375×812, 507×700, 812×375 and 1280×900, including the callout geometry, controls, drafts and native popup. Installed-theme visual confirmation remains pending.
- Rollback baseline: `67af389233cb4449312beb82da176e122e7579c8`; no user-data migration required.

## 1.6.7 — 2026-11-24 · Consolidate advanced settings and prompt controls

- Replace the extra-options heading and separate prompt disclosure with one Advanced settings group, collapsed by default. Opening it displays all four options and all three prompt editors directly, with no nested disclosure. Basic settings and cache controls stay outside.
- Place expand before export in both preset toolbars, preserving the three aligned action columns below. Place character prompt expand at the right of its heading and restore the textarea's normal width and padding.
- Keep the native expanded-editor popup, preset saving, character autosave, translations and stored data unchanged.
- Validation: all 118 Node.js tests passed; Chromium fixtures using the host Popup implementation passed at 320×568, 375×812, 507×700, 812×375 and 1280×900, including group toggling, option and draft preservation, button alignment, and native popup behavior. Installed-theme visual confirmation remains pending.
- Rollback baseline: `579d2ca97cc1cbb3f67263d673142f068f0441c5`; no user-data migration required.

## 1.6.6 — 2026-11-24 · Compact prompt controls and native expanded editor

- Put the disclosure chevron immediately after the Translation Prompts title; align both preset-action rows to the same three equal-width and equal-height columns.
- Position each expand button inside its own textarea's top-right corner, reserving room for text and scrollbar without adding an extra row.
- Use SillyTavern's native Popup and theme-owned text field/close button, with a content-fitting height and bounded scrollable editor instead of a nearly full-screen custom modal. Preserve read-only defaults, manual preset saving, character autosave and stale-target protection.
- Validation: 118 Node.js tests passed; Chromium fixtures using the host Popup implementation and template at 320×568, 375×812, 507×700, 812×375 and 1280×900 verified alignment, inline placement, compact height, draft preservation and save behavior. Installed SillyTavern/iOS theme validation remains pending.
- Rollback baseline: `23ad95449170ee4be8c024e142c47c0b2182dfa1`; no user-data migration required.

## 1.6.5 — 2026-11-24 · Group translation prompts in one disclosure

- Replace the three independent disclosure rows with one collapsed-by-default Translation Prompts header (down/up chevron). All three original editors, preset controls, help and save indicators are inside the same group.
- Move each large-editor button from the heading into a compact right-aligned toolbar immediately above its own textarea; no editor controls remain visible when the group is collapsed.
- Keep the existing large-editor behavior, read-only defaults, manual preset saving, character autosave and stale-target guards. No prompt content or storage changes.
- Validation: all 116 Node.js regression tests passed; isolated Chromium UI checks at 320×568, 375×812, 507×700, 812×375 and 1280×900 verified group disclosure, right-aligned editor button placement, draft preservation and existing expanded-editor behavior. Installed SillyTavern/iOS theme validation remains pending.
- Rollback baseline: `4bf24675a73c044331b62d2eeb3ded33964f51dd`; no user-data migration required.

## 1.6.4 — 2026-11-24 · Collapsible translation prompts and expanded editor

- Input, output and character-specific prompt sections collapse independently using their title or chevron. Each header also provides a large editor button, including while collapsed. Existing fields, preset toolbars, help and save indicators are retained.
- Expanded editing uses the original field's input handlers. Built-in prompts remain read-only; input/output drafts retain explicit Save/Save As behavior, and character prompts retain autosave. A stale preset or character cannot be overwritten from an old expanded editor. No prompt content or saved-data schema changes.
- The large editor uses the visible viewport, responds to keyboard/viewport resizing, and keeps a close button and a scrollable text area. All five existing UI locale catalogs include the new labels.
- Validation: Node.js regression suite (including focused prompt-editor tests) and isolated Chromium UI fixture at 320×568, 375×812, 507×700, 812×375 and 1280×900. Actual installed SillyTavern/iOS Safari keyboard and theme are not yet verified.
- Rollback baseline: `412976c379a535d1cddb6f1c01de63f23027a6ea`. Reverting this UI change requires no user-data migration.

## 1.6.3 — 2026-11-20 · Native-size extension settings title

- Removed the Phrase Desk-specific drawer-title markup class and three layers of forced size, line-height, inheritance, and display rules. The settings header now uses the same native bold title element as other SillyTavern extension drawers.
- Preserved the existing chevron icon styling, expanded settings controls, translation features, language assets, learning storage, and all other styles.
- Added targeted header regression tests and updated the version assertion. All 108 Node.js regression tests passed; final text size in the installed SillyTavern theme awaits visual confirmation.
- Rollback baseline: b0dbb4f545942f01d2610f10188f39455cc38229; this version changes no saved data.

## 1.6.2 — 2026-11-20 · Server-file Phrase Notebook and study-history storage

- Storage-only migration: five potentially growing learning arrays (notebook, quizHistory, practiceHistory, hiddenWrongNotes, recentPracticeNoteIds) now persist in /user/files/phrase-desk-learning-v1.json via SillyTavern's built-in per-user /api/files endpoints. Normal settings, custom prompts, and per-message translation caches keep their original format/location. No CSS or other feature change.
- On first successful migration, save a separately verified phrase-desk-learning-legacy-*.json file BEFORE creating the new store; upload and read the new file back and verify all fields before removing the old arrays from settings.json. The old backup remains for recovery, including after normal learning reset.
- Startup loads the verified file before registering notebook actions; missing/corrupt/conflicting data blocks study edits instead of silently starting an empty notebook or overwriting the old settings copy. Saves check the current revision and warn instead of overwriting a version changed by another device. This is conflict detection, NOT automatic merging or transactional server locking.
- Notebook saves, quizzes, AI practice, hidden wrong answers, import, export, reset and calendar now use the separate store. In-flight edits coalesce pending snapshots without rewriting whole SillyTavern settings. Imports/reset commit and verify the file before replacing in-memory data; failed file writes never fall back to storing arrays in settings.json.
- Node.js regression checks include original features, large notebook migration, verification, interrupted/restarted migration, device conflict, import/reset, and server-write failure. Real installed SillyTavern and browser performance remain unverified.
- Rollback baseline: 859cb5ea6bb515e81e134217d4ff51c534b187fd. BEFORE reverting code, export learning records to JSON: the previous version does not read the new server file. Do not delete settings.json, the separate server file, or the verified legacy backup.

## 2026-11-18 UI follow-up — separate input/output prompt libraries (v1.6.1 unchanged)

- Added **Input Translation Prompt** directly above the existing **Output Translation Prompt**, with matching compact SillyTavern theme-style buttons (Save, Save as New, separate JSON Export/Import, Delete, same name/confirmation dialogs). Dropdown defaults are explicitly named **입력 번역 기본 프롬프트** / **출력 번역 기본 프롬프트** in Korean and translated for en/ja/fr/es.
- Introduced one read-only, independently authored input default. The input translation builder now uses only the selected input prompt and the existing input technical contract. It **no longer prepends the output literary prompt**. User-message content, prior assistant reply and current-character terminology/register references are still handled as before; input translation remains directed to the study language.
- Input library persists `inputTranslationPresets`, `activeInputTranslationPresetId`, `inputTranslationPrompt`, and `inputTranslationPresetVersion` in the existing SillyTavern user settings. Old output prompt data and its selected preset remain untouched. The input JSON format is `phrase-desk-input-translation-prompt`, separated from the existing output JSON schema. Saved input/output selections restore independently on refresh/restart.
- Output default literary text, PDU/PD_FMT contracts, character-prompt auto-save, translation caches, learning features, other settings and the separate lean-prompt experiment remain unchanged.
- Validation: 61/61 isolated Node.js 22 regression tests passed after implementing the independent input path; tests cover preset migration, input/output isolation, manual Save, Save as New, JSON roundtrips, reload, and output prompt stability. Live SillyTavern/browser/mobile visual validation remains pending.
- Runtime version and `manifest.json` stay **1.6.1** by user instruction. Rollback baseline: `a766cb496833f5888dc38cc8cea1f00075367de0`. Preserve existing user settings and custom prompts on rollback.


## 2026-11-17 UI follow-up — compact prompt name dialogs (v1.6.1 unchanged)

- Fixed the overlarge **Save as New** name window and prompt confirmation windows. The generic Phrase Desk modal previously imposed a 720px viewport width, 18px heading, 34px minimum input height, and oversized padding on these short dialogs.
- Added a prompt-dialog-only class/viewport width cap of 400px, reduced title to 13px, input height to 26px, buttons to 24px, and padding to 14px 16px. Colors and border use the active SillyTavern theme; shadow removed. Other Phrase Desk modals remain unchanged.
- Isolated Node.js 22 regression suite: **53/53 passed**. Chromium simulation with the user's provided iRiver Fog Gray Highlighter theme CSS at 320/390/507/1024px showed compact layout without horizontal overflow; simulated CSS is not a live SillyTavern verification.
- Runtime and manifest both remain **1.6.1**. Roll back to `b7b6775782825408cfcb6e2975092f38a0452f52` if the prompt dialog becomes inaccessible. Never remove user prompts/settings/chats during rollback.


## 2026-11-17 UI follow-up — compact theme-style prompt controls (v1.6.1 unchanged)

- Fixed the oversized five-button prompt toolbar: removed forced 34×32px icon sizing and used SillyTavern's header/action button classes with theme-like minimum-content sizing.
- Matched the prompt selector to SillyTavern's theme selector (`margin0` instead of `text_pole`). Reduced only this prompt manager's textarea from eight to five initial rows, its minimum height from 140px to 96px, and its font size to 12px; tightened the surrounding gaps. The textarea remains vertically resizable.
- Hid redundant built-in-prompt status text while preserving unsaved/error state feedback. Existing character-specific prompt editor and all other extension settings remain untouched.
- Verified Node.js 22 regression suite 49/49, syntax checks and unchanged `index.js`/`manifest.json` versions (1.6.1). No live user-theme/mobile render was possible; visual confirmation is still needed.
- Roll back to `aac6277f84e2fef92619d923c1e0bc75b8f0ae51` if prompt controls become cramped or unreadable. Keep user prompt settings and chat data.


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
