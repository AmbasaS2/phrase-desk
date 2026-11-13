# 🔤 Phrase Desk

**Phrase Desk is a SillyTavern extension for translating multilingual roleplay and saving expressions you want to study.**

You can use message translation on its own, or turn saved expressions into vocabulary notes, quizzes, and response practice in your chosen study language.

## 🌍 Languages (v1.6.0)

The interface follows SillyTavern’s UI language automatically. Korean, English, Japanese, French, and Spanish are included; other UI locales use English labels. This does not restrict which languages can be translated or studied: actual language coverage and quality depend on the selected model or Google Translation.

**Study Language** controls expression collection, writing practice, composer translation, and input correction. **Translation / Explanation Language** controls chat translations, meanings, and AI explanations; its default is **Follow SillyTavern Language**, with an independent override. Both selectors include **Custom Language**. Enter its name; Google Translation additionally requires a valid language code supported by Google.

Source languages are detected automatically, including mixed-language passages. Choosing English for study does not stop French or Japanese dialogue from being translated. Japanese and other unspaced-language study phrases use the browser’s word segmentation rather than English whitespace rules. English retains its existing CEFR-oriented examples; other languages use general learning stages without claiming equivalent exam levels.

Existing v1.5.x cards and histories are tagged English → Korean without changing their contents. New cards store their expression language and meaning/explanation language. You can inspect or correct these labels in Save/Edit; changing a label does not translate its text. The notebook has a language filter. Quizzes, AI practice, and enrichment use cards matching the selected study/explanation pair; other cards remain stored. Saved meanings and explanations are never silently rewritten after a setting change.

Translation caches are separate by source/swipe and target language. Changing languages does not automatically send a paid request. A matching saved translation can be restored; if none exists, the original is shown until you translate it. Changing the literary prompt also leaves existing cached translations intact; long-press `🌐` to request a fresh translation.

## ⚙️ Extension Settings

Set the translation method and related options under **Extensions → Phrase Desk**.

**Translation Connection**

| Setting | Description |
|---|---|
| **Translation Engine** | Choose `Connection Profile` or `Quick Google Translation`. |
| **Connection Profile** | Select the profile used for Connection Profile translation. This control is disabled when Quick Google Translation is selected. |

- Use **Connection Profile** when preserving character voice, proper nouns, roleplay context, and formatting is important.
- Use **Quick Google Translation** when you only need a fast reading of the text. It does not use a Connection Profile or model API, but it requires an internet connection and does not apply translation prompts.

**Chat Translation**

| Setting | Options |
|---|---|
| **Auto Translation** | Off / Both / Character Only / User Only |
| **Chat Translation** | Translation Only / Full Bilingual / Bilingual Dialogue Only |
| **Bilingual Translation Style** | Beside Each Sentence / Below Each Sentence / By Line / By Paragraph / Original in a Separate Block Below |

- **Translation Only** displays the entire message in the selected translation language.
- **Full Bilingual** displays the original source and the selected-language translation together.
- **Bilingual Dialogue Only** translates narration into the selected translation language while displaying quoted dialogue with its original source.
- Bilingual translation styles apply only to **Full Bilingual** mode.

**Bilingual Display**

| Setting | Description |
|---|---|
| **Blur Bilingual Meanings** | Blurs the translated meaning until you hover over it or tap it. |
| **Show Bilingual Translation as Notes** | Organizes translated meanings as numbered notes. Selecting a number in the main text opens the translation in a pop-up, and the notes area below can be collapsed or expanded. Blur also applies to notes when enabled. |

**Input and Translation Rules**

| Setting | Description |
|---|---|
| **Correct Input Before Sending** | Shows a suggested sentence and a short explanation before a message in the selected study language is sent. |
| **Global Prompt** | Edits the complete literary/style translation instructions used for all characters; required formatting contracts remain protected. |
| **Show the Input-box Aa Button** | The fourth checkbox shows or hides only the composer quick-menu button. Selection `Aa` and the wand-menu entry remain available. |
| **Current Character Prompt** | Adds rules needed only for the current character, such as names, gender, forms of address, voice, and proper nouns. |

The **Global Prompt** field contains the complete editable literary instructions, not an extra preference layer. `{{target_language}}` is filled from the selected output language (or study language for composer translation). PDU/PD_FMT protection and bilingual assembly remain internal. **Restore Default Prompt** asks for confirmation and resets only this field; character prompts, cards, and caches are unchanged. Existing additional preferences are appended once during migration and preserved separately. Google Translation does not use prompts.

Enabling automatic translation may create a translation request whenever a new message arrives. Connection Profile translation is affected by the selected model and preset.

The Current Character Prompt is saved by character name rather than by chat. Character cards with exactly the same name share that prompt, and renaming a character may leave the prompt field for the new name empty until you set it again.

## 🌐 Translation

**Message Translation**

| Location and Action | Function |
|---|---|
| Select `🌐` beside a message | Translates that message or returns it to the source text. |
| Press and hold `🌐` beside a message | Translates it again without using the saved translation. |

Translation results are saved with the chat. When you view the same message again, or return after swiping to another response, Phrase Desk restores the saved translation when one is available.

Translations are stored separately for the currently selected swipe. Moving between swipes restores only the translation saved for that swipe, and editing its source text clears that swipe's stale translation cache. A fresh translation always starts from the preserved source, never from the translation currently displayed.

For messages containing HTML or custom tags, Phrase Desk protects tags and attributes according to the source. If a model changes or omits some protection markers, Phrase Desk does not discard the entire response for that reason alone. It restores safely matched structure and translated units where possible; when exact alignment remains incomplete, it displays a sanitized selected-language fallback from the received response. Press and hold `🌐` only when you want a fresh translation.

**Translate the Last Message**

```stscript
/pd-translate-last
```

This translates the last message. If a translation for the current engine and mode is already saved, Phrase Desk translates it again from the preserved source.

**Translate All Messages on the Current Screen**

```stscript
/pd-translate-all
```

To translate again without using saved translations, enter:

```stscript
/pd-translate-all force=true
```

`force=true` is an option added to `/pd-translate-all`, not a separate command. Messages currently displayed on the screen are translated in order using the selected translation engine and chat translation mode.

**Input-box Translation**

| Location and Action | Function |
|---|---|
| Select `🌐` beside the input box | Translates input text into your selected study language. Select it again to switch between the source and translation. |
| Press and hold `🌐` beside the input box | Translates the current input again. |

**Scene Board Translation**

When a message is displayed in Scene Board format, Phrase Desk preserves its source while translating it. The selected translation engine and saved translation state still apply.

## ✍️ Input Correction Before Sending

When **Correct Input Before Sending** is enabled, you can review the following before a message in the selected study language is sent:

- Your original sentence
- A more natural suggested sentence
- A short explanation in your selected translation/explanation language

| Button | Function |
|---|---|
| **Save Expression** | Saves the suggestion to the Phrase Notebook, with the original sentence as context and the correction explanation as its note. |
| **Send Original** | Sends the sentence without changes. |
| **Send Suggestion** | Sends the corrected sentence. |
| **Cancel** | Closes the window without sending. |

Saving a correction to the Phrase Notebook does not create another API request. Short greetings, slash commands, or sentences predominantly outside the selected study-language script may be excluded from correction.

## 📚 Phrase Notebook

Open the Phrase Notebook from either of these locations:

- `Aa → Open Phrase Desk` beside the input box
- Wand menu → **Phrase Desk**

The `Aa` menu also provides direct access to **Save Expression · Find Repeated Expressions · Quiz · AI Answer Practice · Previous Study Sheets**.

**Phrase Desk Settings**

Open Phrase Desk and select `⚙` in the upper-right corner.

| Setting | Options and Purpose |
|---|---|
| **App Font Size (px)** | Choose a Phrase Desk font size from 11 to 18 px. |
| **Expression Collection Level** | Beginner (A1–A2) / Easy (A2–B1) / Basic (B1–B2) / Hard (B2–C1) / Expert (C1+). This guides the level of candidates found by Find Repeated Expressions. These CEFR examples apply to English only; other languages use general stages. All displayed collection levels are AI estimates, not verified assessments. |
| **Quiz Stage** | Beginner / Easy / Basic / Hard / Expert. The stage determines the quiz formats and number of choices. |
| **Number of Quiz Questions** | 5 / 10 / 15 / 20 / 30 |

**Saving Expressions**

Select source text in a chat and tap the floating `Aa` to choose **Save Expression** or **Explore Expression**. Saving opens the existing form without an AI call. Exploring makes one explicit Connection Profile request for a contextual meaning, nuance, and relevant grammar; you can then save the result (including its explanation) to the notebook without an additional request. The separate input-box Aa quick menu is unchanged. You can also add an expression directly or save one from input correction and repeated-expression results.

| Save Method | Saved Content |
|---|---|
| **Aa → Save Expression** | Selected expression plus the meaning, context, tags, and note you enter |
| **Add Vocabulary Directly** | Expression and related information entered manually |
| **Input Correction → Save Expression** | Suggested sentence, original sentence as context, and correction explanation |
| **Find Repeated Expressions → Save Selected** | Selected candidates and their analysis from recent messages |

Saving an expression directly or saving a correction result does not create another API request.

You can record the following for each saved expression:

| Basic Information | Additional Study Information |
|---|---|
| Expression · Meaning · Context · Context Translation | Explanation · Alternative Expressions · Grammar · Vocabulary |
| Tags · Note · Source Character | Favorite · New Expression · Learning · Hard · Known status |

Explanation, alternative expressions, grammar, and vocabulary may appear collapsed under **Learn More**.

**AI Vocabulary Editing**

Checks up to 20 saved expressions at a time and fills only empty fields.

- It fills missing meanings, tags, context translations, explanations, alternative expressions, grammar, and vocabulary.
- It does not overwrite existing content or notes written by the user.
- If there is no useful grammar, vocabulary, or alternative expression to add, it may enter `-`.
- If there are no empty fields to process, it sends no API request.

**Find Repeated Expressions**

Finds repeated expressions and other study-worthy phrases in the **10 most recent character messages** in the current chat.

This does not analyze a sentence you have selected. Phrase Desk presents up to 10 candidates, and you choose which ones to save. A phrase confirmed in at least two separate messages is labeled **Repeated** with its count; a phrase that appeared once but still fits the selected learning level is labeled **Study Recommendation**. Adjust the target level under Phrase Desk settings.

## 📝 Study Sheet Mode

Use saved expressions for the **Quiz** and **AI Answer Practice**.

**Quiz**

| Stage | Question Format |
|---|---|
| **Beginner** | Choose an expression’s saved meaning from 2 options. |
| **Easy** | Solve expression and meaning questions in both directions with 3 options. |
| **Basic** | Solve 4-option questions covering meanings, expression recall, and blanks in saved contexts. |
| **Hard** | Solve 4-option blanks in saved contexts and reorder 3–6-word expressions. Saved meanings are shown for reordering questions. |
| **Expert** | Reorder 4–8-word expressions to fill blanks in saved contexts. Meaning hints are not shown. |

The regular quiz is generated and graded locally from your saved expressions and does not use an API. The selected question count cannot exceed the number of eligible saved expressions. Some stages also require enough distinct meanings and expressions, saved contexts, or expressions of the required length; if the full set cannot be made, Phrase Desk explains which condition is missing instead of starting an incomplete quiz.

Expressions marked `Hard`, expressions not asked before, frequently missed expressions, and expressions not reviewed for a long time receive higher priority. Recently asked or `Known` expressions receive lower priority. You can retake only the expressions in the wrong-answer notebook, and the result screen can suggest changing repeatedly correct expressions to `Known` or frequently missed expressions to `Hard`.

**AI Answer Practice**

1. Phrase Desk chooses one target expression from your saved expressions.
2. The character asks a question in your selected study language.
3. Answer in one or two sentences using the target expression.
4. AI checks whether you used the target expression and whether your grammar and phrasing are natural.
5. If the expression is missing or the sentence is awkward, you can answer the same question again.
6. When available, the character's sample follow-up reply is also shown.

**Previous Study Sheets and Learning Calendar**

Open `Aa → Previous Study Sheets` to review:

- Quiz history
- Wrong-answer notebook
- AI answer-practice history
- Learning calendar

You can retake only the expressions in the wrong-answer notebook. Individual wrong answers and study records can be deleted separately.

## 🔌 API Usage

| Feature | API Usage |
|---|---|
| **Connection Profile Translation** | Uses the selected profile when translating a message or input. |
| **Quick Google Translation** | Does not use a Connection Profile or model API for message and input-box translation. |
| **Input Correction Before Sending** | Uses the selected Connection Profile to correct a sentence in your selected study language. |
| **Save Expression · Add Vocabulary Directly** | Does not use an API. |
| **Save Correction Result** | Creates no additional request when saving. |
| **AI Vocabulary Editing** | Uses the selected Connection Profile to fill empty fields. |
| **Find Repeated Expressions** | Uses the selected Connection Profile once to create candidates. |
| **Quiz** | Does not use an API. Questions and grading are handled locally. |
| **AI Answer Practice** | Uses the selected Connection Profile to generate a question and check each answer. |

## 💾 Data Storage

- Message translation caches are saved with each chat message and, when applicable, with each swipe. They are not deleted automatically after a set period; they change only when the chat or message is deleted, its source is edited, or a new translation overwrites them.
- The global translation prompt, character-specific translation prompts, Phrase Notebook, and study records are saved in SillyTavern user settings. They remain available across devices and characters when you use the same server and user.
- Phrase Desk does not create a separate backup or translation cache in `localStorage` or `IndexedDB`.
- Debug logs exist only in the current page's memory and disappear when the page is refreshed.

## 💾 Backup and Management

| Feature | Description |
|---|---|
| **Export Notes** | Saves the Phrase Notebook and study records as a JSON file. |
| **Import Notes** | Restores a previously exported file. |
| **Delete Translation Cache for This Chat** | Deletes only translations saved in the current chat. |
| **Reset Phrase Desk** | Deletes the Phrase Notebook, quiz history, wrong-answer notebook, response-practice history, and learning-calendar records. Translation settings and translation caches are preserved. |
| **Debug Logs** | Shows recent boot events, translation engine, processing time, text length, and failures from the current page. Logs are not saved in browser storage and disappear when the page is refreshed. |

After changing the translation engine or prompts, press and hold `🌐` beside a specific message to translate it again with the new settings.

It is a good idea to export important Phrase Notebook and study records as a backup when needed.

---

# 🔤 Phrase Desk

**Phrase Desk는 여러 언어의 RP를 번역해 읽고, 마음에 드는 표현을 저장해 공부할 수 있는 SillyTavern 확장입니다.**

메시지 번역만 사용할 수도 있고, 저장한 표현으로 어휘 정리 · 쪽지 시험 · 선택한 언어의 답변 연습까지 이어갈 수도 있습니다.

## 🌍 언어 설정 (v1.6.0)

화면 언어는 SillyTavern 설정을 자동으로 따릅니다. 한국어·영어·일본어·프랑스어·스페인어 번역이 포함되어 있으며, 그 외 화면 언어에서는 영어로 표시합니다. 화면 번역이 없는 언어도 번역·학습 언어로 지정할 수 있습니다. 실제 지원 범위와 품질은 선택한 모델 또는 구글 번역에 따라 달라집니다.

**학습 언어**는 표현 수집, 답변 연습, 입력창 번역, 보내기 전 교정에 사용합니다. **번역 언어**는 채팅 번역, 표현 뜻, AI 해설에 사용하며 기본값은 **실리태번 화면 언어와 동일**입니다. 두 설정은 서로 독립적이고 **직접 지정**도 가능합니다. 직접 지정할 때는 언어 이름을 입력하며, 구글 번역을 쓰려면 구글이 지원하는 언어 코드도 필요합니다.

채팅의 원문 언어는 자동으로 판별합니다. 영어를 공부하도록 설정해도 프랑스어·일본어 대사를 번역합니다. 일본어처럼 띄어쓰기가 없는 언어의 표현은 브라우저의 단어 분할 기능으로 처리합니다. 영어의 기존 CEFR 예시는 유지하고, 다른 언어에는 특정 시험 등급과 같다고 주장하지 않는 일반 학습 단계를 사용합니다.

기존 v1.5.x 노트와 기록은 내용 변경 없이 영어 → 한국어로 표시합니다. 새 노트에는 표현 언어와 뜻·해설 언어를 각각 저장하며, 저장·수정 창에서 확인하거나 고칠 수 있습니다. 언어 표시만 바꿔도 내용이 자동 번역되지는 않습니다. 노트에는 언어 필터가 있으며, 시험·AI 답변 연습·어휘 교정에는 현재 선택한 학습/해설 언어쌍의 노트만 사용합니다. 다른 노트는 삭제되지 않고, 설정을 바꿨다고 기존 뜻과 해설을 몰래 다시 쓰지 않습니다.

번역 캐시는 원문·스와이프뿐 아니라 번역 언어도 구분합니다. 언어를 변경해도 자동으로 유료 요청을 보내지 않습니다. 해당 언어의 캐시가 있으면 복원하고, 없으면 직접 번역하기 전까지 원문을 표시합니다. 프롬프트 변경도 기존 번역을 지우지 않으며, 새 지침으로 다시 번역하려면 `🌐`을 길게 누릅니다.

## ⚙️ 확장 설정

**Extensions → Phrase Desk**에서 번역 방식과 관련 설정을 조절합니다.

**번역 연결**

| 설정 | 설명 |
|---|---|
| **번역 엔진** | `연결 프로필` 또는 `구글 간편 번역`을 선택합니다. |
| **연결 프로필** | 연결 프로필 번역에 사용할 프로필을 고릅니다. 구글 간편 번역을 선택하면 비활성화됩니다. |

- **연결 프로필**은 캐릭터 말투, 고유명사, RP 문맥과 형식 보존이 중요할 때 사용합니다.
- **구글 간편 번역**은 빠르게 뜻만 확인할 때 사용합니다. 연결 프로필과 모델 API는 사용하지 않지만 인터넷 연결이 필요하며, 번역 프롬프트도 적용되지 않습니다.

**채팅 번역**

| 설정 | 선택 항목 |
|---|---|
| **자동 번역** | 꺼짐 / 둘 다 / 캐릭터만 / 유저만 |
| **채팅 번역** | 번역문만 / 전체 원문·번역 병기 / 대사만 원문·번역 병기 |
| **병기 번역 스타일** | 문장마다 옆으로 / 문장마다 아래로 / 줄마다 / 문단마다 / 원문 하단 분리 |

- **번역문만**은 메시지 전체를 선택한 번역 언어로 표시합니다.
- **전체 원문·번역 병기**는 원문과 선택한 언어의 번역문을 함께 표시합니다.
- **대사만 원문·번역 병기**는 서술은 선택한 언어로, 따옴표 안 대사는 원문과 번역문으로 함께 표시합니다.
- 병기 번역 스타일은 **전체 원문·번역 병기**에서만 적용됩니다.

**병기 표시**

| 설정 | 설명 |
|---|---|
| **병기 번역 뜻 블러 처리** | 번역된 뜻을 흐리게 가리고, 마우스를 올리거나 탭했을 때 확인합니다. |
| **병기 번역을 주석으로 보기** | 한국어 번역을 번호 주석으로 정리합니다. 본문 번호를 누르면 번역이 팝업으로 열리고, 아래 주석 영역은 접고 펼칠 수 있습니다. 블러를 켜면 주석에도 적용됩니다. |

**입력과 번역 규칙**

| 설정 | 설명 |
|---|---|
| **보내기 전 입력 교정** | 학습 언어로 작성한 메시지를 보내기 전에 추천문과 교정 이유를 보여줍니다. |
| **전체 프롬프트** | 모든 캐릭터에게 적용할 번역 문체·말투·품질 지침 전체를 편집합니다. 내부 형식 규칙은 보호됩니다. |
| **입력창 Aa 버튼 표시** | 네 번째 체크 항목입니다. 입력창의 빠른 메뉴 버튼만 숨기거나 표시합니다. 드래그 선택 Aa와 요술봉 메뉴는 유지됩니다. |
| **현재 캐릭터 전용 프롬프트** | 이름, 성별, 호칭, 말투, 고유명사처럼 현재 캐릭터에게만 필요한 규칙을 적습니다. |

**전체 프롬프트**에는 추가 지시만이 아니라 실제 기본 번역 문체·말투·품질 지침 전체가 들어 있습니다. `{{target_language}}`는 선택한 번역 언어(입력창 번역에서는 학습 언어)로 바뀝니다. PDU/PD_FMT 보호와 병기 조립 규칙은 내부에서 따로 적용합니다. **기본 프롬프트로 복원**을 누르고 확인하면 이 칸만 기본값으로 돌아가며, 캐릭터 프롬프트·노트·캐시는 유지됩니다. 기존 추가 지시는 첫 업데이트 때 한 번 덧붙여 보존합니다. 구글 간편 번역에는 프롬프트가 적용되지 않습니다.

자동 번역을 켜면 새 메시지가 도착할 때마다 번역 요청이 생길 수 있습니다. 연결 프로필 번역 결과는 선택한 모델과 프리셋의 영향을 받습니다.

현재 캐릭터 전용 프롬프트는 채팅방이 아니라 캐릭터 이름을 기준으로 저장됩니다. 이름이 완전히 같은 캐릭터 카드는 같은 프롬프트를 공유하며, 캐릭터 이름을 바꾸면 새 이름의 프롬프트 칸은 다시 설정하기 전까지 비어 보일 수 있습니다.

## 🌐 번역

**메시지 번역**

| 위치와 조작 | 기능 |
|---|---|
| 메시지 옆 `🌐` 클릭 | 해당 메시지를 번역하거나 원문으로 되돌립니다. |
| 메시지 옆 `🌐` 길게 누르기 | 저장된 번역을 사용하지 않고 다시 번역합니다. |

번역 결과는 채팅방에 저장됩니다. 같은 메시지를 다시 보거나, 스와이프로 다른 응답을 본 뒤 돌아와도 저장된 번역이 있으면 다시 표시됩니다.

번역은 현재 선택한 스와이프마다 따로 저장됩니다. 스와이프를 오갈 때는 해당 스와이프에 저장된 번역만 복원되며, 원문을 수정하면 수정한 스와이프의 오래된 번역 캐시가 지워집니다. 새 번역과 재번역은 화면에 보이는 번역문이 아니라 보존된 원문에서 시작합니다.

HTML이나 사용자 정의 태그가 있는 메시지는 태그와 속성을 원문 기준으로 보호합니다. 모델이 보호 표시를 일부 바꾸거나 빠뜨려도 그것만으로 전체 결과를 버리지 않습니다. 안전하게 맞출 수 있는 구조와 번역 단위를 가능한 만큼 복원하고, 정확한 정렬이 끝까지 되지 않으면 받은 응답을 정리한 선택 언어 번역본을 하나의 폴백으로 표시합니다. 번역 결과가 마음에 들지 않을 때만 메시지 옆 `🌐`을 길게 눌러 직접 재번역하면 됩니다.

**마지막 메시지 번역**

```stscript
/pd-translate-last
```

마지막 메시지를 번역합니다. 현재 엔진과 모드의 번역이 이미 저장되어 있으면 보존된 원문에서 새로 재번역합니다.

**현재 화면 전체 번역**

```stscript
/pd-translate-all
```

저장된 번역을 사용하지 않고 다시 번역하려면 다음처럼 입력합니다.

```stscript
/pd-translate-all force=true
```

`force=true`는 별도 명령어가 아니라 `/pd-translate-all`에 붙이는 옵션입니다. 현재 화면에 표시된 메시지를 순서대로 번역하며, 선택한 번역 엔진과 채팅 번역 방식을 따릅니다.

**입력창 번역**

| 위치와 조작 | 기능 |
|---|---|
| 입력창 옆 `🌐` 클릭 | 입력창의 문장을 선택한 학습 언어로 번역합니다. 다시 누르면 원문과 번역문을 오갑니다. |
| 입력창 옆 `🌐` 길게 누르기 | 현재 입력문을 다시 번역합니다. |

**씬보드 번역**

일부 메시지가 씬보드 형식으로 표시된 경우에도 원문을 보존한 채 번역합니다. 선택한 번역 엔진과 저장된 번역 상태를 그대로 따릅니다.

## ✍️ 보내기 전 입력 교정

설정에서 **보내기 전 입력 교정**을 켜면 학습 언어로 작성한 메시지를 전송하기 전에 다음 내용을 확인할 수 있습니다.

- 사용자가 작성한 원문
- 더 자연스럽게 다듬은 추천문
- 무엇을 고쳤는지에 대한 선택한 번역 언어의 짧은 설명

| 버튼 | 기능 |
|---|---|
| **표현 저장** | 추천문을 표현 노트에 저장합니다. 원문은 문맥으로, 교정 이유는 설명으로 남습니다. |
| **원문 그대로 보내기** | 수정하지 않은 문장을 보냅니다. |
| **추천문으로 보내기** | 교정된 문장을 보냅니다. |
| **취소** | 전송하지 않고 창을 닫습니다. |

교정 결과를 표현 노트에 저장할 때는 새 API 요청을 보내지 않습니다. 짧은 인사, 슬래시 명령어, 선택한 학습 언어의 문자와 다른 문자가 많이 섞인 문장 등은 교정 대상에서 제외될 수 있습니다.

## 📚 표현 노트

표현 노트는 다음 위치에서 열 수 있습니다.

- 입력창 옆 `Aa → Phrase Desk 열기`
- 요술봉 메뉴 → **Phrase Desk**

`Aa` 메뉴에서는 표현 노트 열기 외에도 **표현 저장 · 반복 표현 찾기 · 쪽지 시험 · AI 답변 연습 · 이전 학습지**를 바로 실행할 수 있습니다.

**Phrase Desk 설정**

Phrase Desk를 열고 오른쪽 위의 `⚙`을 누릅니다.

| 설정 | 선택 항목과 기능 |
|---|---|
| **앱 글씨 크기(px)** | Phrase Desk의 글씨 크기를 11~18px로 조절합니다. |
| **수집할 표현 수준** | 초보(A1–A2) / 쉬움(A2–B1) / 기본(B1–B2) / 어려움(B2–C1) / 고수(C1+). 반복 표현 찾기에서 수집할 후보 수준을 정합니다. 이 CEFR 예시는 영어에만 적용하며, 다른 언어는 일반 학습 단계를 표시합니다. 모든 수집 수준은 검증된 평가가 아니라 AI 추정치입니다. |
| **쪽지 시험 단계** | 초보 / 쉬움 / 기본 / 어려움 / 고수. 단계에 따라 문제 형식과 선택지 수가 달라집니다. |
| **쪽지 시험 개수** | 5개 / 10개 / 15개 / 20개 / 30개 |

**표현 저장**

채팅에서 원문 표현을 드래그한 뒤 나타나는 `Aa`를 누르면 **표현 저장 / 표현 알아보기** 중 선택할 수 있습니다. 표현 저장은 기존 저장창을 열며 AI를 호출하지 않습니다. 표현 알아보기는 선택한 표현과 주변 문맥을 연결 프로필 AI에 한 번 보내 뜻·뉘앙스·문법을 설명받고, 결과창에서 해설과 함께 노트에 저장할 수 있습니다. 저장할 때 별도 AI 호출은 없으며, 입력창 옆 Aa 빠른 메뉴는 그대로입니다. 직접 추가하거나 인풋 교정·반복 표현 찾기 결과에서도 저장할 수 있습니다.

| 저장 방법 | 저장되는 내용 |
|---|---|
| **Aa → 표현 저장** | 선택한 표현과 직접 입력한 뜻, 문맥, 태그, 메모 |
| **어휘 직접 추가** | 사용자가 직접 작성한 표현과 관련 정보 |
| **인풋 교정 → 표현 저장** | 추천문, 원문 문맥, 교정 설명 |
| **반복 표현 찾기 → 선택 저장** | 최근 메시지에서 찾은 후보 중 선택한 표현과 분석 결과 |

직접 저장하거나 교정 결과를 저장하는 과정에서는 추가 API 요청이 없습니다.

저장한 표현에는 다음 내용을 기록할 수 있습니다.

| 기본 정보 | 추가 학습 정보 |
|---|---|
| 표현 · 뜻 · 문맥 · 문맥 번역 | 설명 · 다른 표현 · 문법 · 단어 |
| 태그 · 메모 · 출처 캐릭터 | 즐겨찾기 · 새 표현 · 외우는 중 · 어려움 · 외움 상태 |

설명, 다른 표현, 문법, 단어는 **더 알아보기** 안에 접혀 표시될 수 있습니다.

**AI 어휘 교정**

한 번에 최대 20개의 저장한 표현을 확인해 비어 있는 항목만 정리합니다.

- 뜻, 태그, 문맥 번역, 설명, 다른 표현, 문법, 단어를 빈칸 위주로 채웁니다.
- 이미 작성된 내용과 사용자가 적은 메모는 덮어쓰지 않습니다.
- 따로 설명할 문법, 단어, 다른 표현이 없으면 `-`로 표시할 수 있습니다.
- 정리할 빈칸이 없으면 API 요청을 보내지 않습니다.

**반복 표현 찾기**

현재 채팅의 **최근 캐릭터 메시지 10개**에서 반복된 표현과 그 밖의 학습할 만한 표현을 찾습니다.

드래그한 문장을 분석하는 기능은 아닙니다. 최대 10개의 후보가 표시되면 필요한 표현만 선택해 표현 노트에 저장합니다. 서로 다른 메시지에서 같은 표현이 2회 이상 확인되면 횟수와 함께 **반복**으로 표시하고, 한 번만 나왔지만 선택한 학습 수준에 맞는 표현은 **학습 추천**으로 표시합니다. 수집할 수준은 Phrase Desk 설정에서 조절합니다.

## 📝 학습지 모드

표현 노트에 저장한 표현으로 **쪽지 시험**과 **AI 답변 연습**을 할 수 있습니다.

**쪽지 시험**

| 단계 | 문제 형식 |
|---|---|
| **초보** | 표현의 저장된 뜻을 2개 중 고릅니다. |
| **쉬움** | 표현과 뜻을 양방향 3지선다로 풉니다. |
| **기본** | 뜻 이해, 표현 회상, 저장 문맥 빈칸을 4지선다로 풉니다. |
| **어려움** | 저장 문맥 빈칸 4지선다와 3~6단어 표현 순서 문제를 풉니다. 순서 문제에는 저장된 뜻이 표시됩니다. |
| **고수** | 저장 문맥의 빈칸에 들어갈 4~8단어 표현 순서를 맞춥니다. 뜻 힌트는 표시되지 않습니다. |

쪽지 시험은 저장된 표현으로 기기 안에서 문제를 만들고 채점하며 API를 사용하지 않습니다. 설정한 문제 수는 출제 가능한 저장 표현 수를 넘을 수 없습니다. 단계에 따라 서로 다른 뜻과 표현, 저장 문맥, 정해진 길이의 표현도 충분히 필요하며, 전체 문제를 만들 수 없으면 불완전한 시험을 시작하는 대신 어떤 조건이 부족한지 알려줍니다.

`어려움` 상태, 아직 출제되지 않은 표현, 자주 틀린 표현, 오래 복습하지 않은 표현을 우선 출제합니다. 방금 출제되었거나 `외움` 상태인 표현은 우선순위가 낮아집니다. 오답노트의 표현만 다시 풀 수 있고, 결과 화면에서는 반복해서 맞힌 표현을 `외움`, 자주 틀린 표현을 `어려움`으로 바꾸도록 제안할 수 있습니다.

**AI 답변 연습**

1. Phrase Desk가 저장한 표현 중 목표 표현을 하나 고릅니다.
2. 캐릭터가 선택한 학습 언어로 질문을 던집니다.
3. 목표 표현을 넣어 한두 문장으로 답합니다.
4. AI가 목표 표현 사용 여부와 문법 · 자연스러움을 확인합니다.
5. 표현이 빠졌거나 문장이 어색하면 같은 질문에 다시 답할 수 있습니다.
6. 필요한 경우 캐릭터의 후속 답변 예시도 함께 보여줍니다.

**이전 학습지와 학습 달력**

`Aa → 이전 학습지`에서 다음 기록을 확인합니다.

- 쪽지 시험 기록
- 오답노트
- 답변 연습 기록
- 학습 달력

오답노트에서는 틀린 표현만 다시 출제할 수 있습니다. 오답과 학습 기록은 필요한 항목만 개별 삭제할 수 있습니다.

## 🔌 API 사용 안내

| 기능 | API 사용 |
|---|---|
| **연결 프로필 번역** | 메시지나 입력문을 번역할 때 선택한 연결 프로필을 사용합니다. |
| **구글 간편 번역** | 메시지와 입력창 번역에 연결 프로필과 모델 API를 사용하지 않습니다. |
| **보내기 전 입력 교정** | 학습 언어로 작성한 문장을 교정할 때 선택한 연결 프로필을 사용합니다. |
| **표현 저장 · 어휘 직접 추가** | 사용하지 않습니다. |
| **교정 결과 저장** | 저장할 때 추가 요청을 보내지 않습니다. |
| **AI 어휘 교정** | 빈 항목을 정리할 때 선택한 연결 프로필을 사용합니다. |
| **반복 표현 찾기** | 후보를 만들 때 선택한 연결 프로필로 한 번 요청합니다. |
| **쪽지 시험** | 사용하지 않습니다. 문제 생성과 채점은 기기 안에서 처리합니다. |
| **AI 답변 연습** | 질문 생성과 각 답변 확인에 선택한 연결 프로필을 사용합니다. |

## 💾 저장 구조

- 메시지 번역 캐시는 각 채팅 메시지와, 스와이프가 있는 경우 각 스와이프에 함께 저장됩니다. 기간이 지나도 자동 삭제되지 않으며, 해당 채팅이나 메시지를 삭제하거나 원문을 수정하거나 재번역으로 덮어쓸 때만 바뀝니다.
- 전체 번역 프롬프트, 캐릭터별 번역 프롬프트, 표현 노트와 학습 기록은 SillyTavern 사용자 설정에 저장되어 같은 서버·사용자라면 기기와 캐릭터를 바꿔도 이어집니다.
- Phrase Desk는 `localStorage`나 `IndexedDB`에 별도 백업·번역 캐시를 만들지 않습니다.
- 디버그 로그는 현재 페이지 메모리에만 있으며 새로고침하면 사라집니다.

## 💾 백업과 관리

| 기능 | 설명 |
|---|---|
| **노트 내보내기** | 표현 노트와 학습 기록을 JSON 파일로 저장합니다. |
| **노트 가져오기** | 이전에 내보낸 파일을 다시 불러옵니다. |
| **이 채팅방 번역 캐시 삭제** | 현재 채팅방에 저장된 번역만 삭제합니다. |
| **Phrase Desk 초기화** | 표현 노트, 시험 기록, 오답노트, 답변 연습 기록과 학습 달력을 삭제합니다. 번역 설정과 번역 캐시는 유지됩니다. |
| **디버그 로그** | 현재 페이지에서 발생한 최근 부팅, 번역 엔진, 처리 시간, 텍스트 길이와 실패 여부를 확인합니다. 브라우저 저장소에는 남지 않으며 새로고침하면 사라집니다. |

번역 엔진이나 프롬프트를 바꾼 뒤 특정 메시지를 새 설정으로 다시 번역하려면 해당 메시지의 `🌐` 버튼을 길게 누릅니다.

중요한 표현 노트와 학습 기록은 필요할 때 내보내기로 백업해두는 것이 좋습니다.

---

## Copyright & License

Copyright © 2026 AmbasaS2  
Licensed under the GNU Affero General Public License v3.0.  
https://github.com/AmbasaS2

The full license text is provided in the `LICENSE` file.
