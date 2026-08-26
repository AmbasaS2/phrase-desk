import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const meaningHelpers = source.slice(
  source.indexOf('function meaningSenseKey'),
  source.indexOf('function addNote('),
);
const quizHelpers = source.slice(
  source.indexOf('function quizStageRules'),
  source.indexOf('function quizCorrectAnswer'),
);
assert.ok(quizHelpers.startsWith('function quizStageRules'));

const sandbox = {
  Math,
  Set,
  Map,
  norm(value = '') { return String(value || '').replace(/\s+/g, ' ').trim(); },
  shuffled(list) { return Array.isArray(list) ? [...list] : []; },
};
vm.createContext(sandbox);
vm.runInContext(`${meaningHelpers}\n${quizHelpers}\nglobalThis.quizApi = { quizStageRules, quizQuestionCount, quizPlanFor, contextWithBlank, localQuizQuestion, buildQuizQuestions, quizStageEligibilityMessage, exactReorderMatches };`, sandbox);
const {
  quizStageRules,
  quizQuestionCount,
  quizPlanFor,
  contextWithBlank,
  localQuizQuestion,
  buildQuizQuestions,
  quizStageEligibilityMessage,
  exactReorderMatches,
} = sandbox.quizApi;

assert.equal(quizQuestionCount(10, 3), 3);
assert.equal(quizQuestionCount(5, 20), 5);
assert.equal(quizQuestionCount(10, 0), 0);

const beginnerPlan = quizPlanFor(7, 'very_easy');
assert.equal(beginnerPlan.length, 7);
assert.ok(beginnerPlan.every(slot => slot.type === 'meaning' && slot.answerMode === 'choice' && slot.choiceCount === 2));

const easyPlan = quizPlanFor(8, 'easy');
assert.deepEqual([...new Set(easyPlan.map(slot => slot.type))].sort(), ['expression', 'meaning']);
assert.ok(easyPlan.every(slot => slot.answerMode === 'choice' && slot.choiceCount === 3));

const normalPlan = quizPlanFor(9, 'normal');
assert.deepEqual([...new Set(normalPlan.map(slot => slot.type))].sort(), ['context_blank', 'expression', 'meaning']);
assert.ok(normalPlan.every(slot => slot.answerMode === 'choice' && slot.choiceCount === 4));
assert.ok(!normalPlan.some(slot => slot.answerMode === 'reorder'));

const hardPlan = quizPlanFor(8, 'hard');
assert.deepEqual([...new Set(hardPlan.map(slot => slot.type))].sort(), ['context_blank', 'grammar']);
assert.ok(hardPlan.filter(slot => slot.answerMode === 'reorder').every(slot => slot.reorderMin === 3 && slot.reorderMax === 6 && slot.showMeaningHint === true));

const expertPlan = quizPlanFor(8, 'expert');
assert.deepEqual([...new Set(expertPlan.map(slot => slot.type))], ['grammar']);
assert.ok(expertPlan.every(slot => slot.answerMode === 'reorder' && slot.reorderMin === 4 && slot.reorderMax === 8 && slot.showMeaningHint === false));
assert.equal(quizStageRules('unknown').label, '기본');

const notes = [
  { id:'a', text:'only do so much', meaning:'할 수 있는 데에는 한계가 있다', context:'Only do so much, then only do so much.', explanation:'' },
  { id:'b', text:'wake with a start', meaning:'깜짝 놀라 깨다', context:'I wake with a start.', explanation:'' },
  { id:'c', text:'as best I could', meaning:'내가 할 수 있는 최선을 다해', context:'I helped as best I could.', explanation:'' },
  { id:'d', text:'cram for an exam', meaning:'시험을 위해 벼락치기하다', context:'They cram for an exam.', explanation:'' },
];

const richNotes = [
  { id:'r1', text:'wake with a sudden start', meaning:'갑자기 깜짝 놀라 깨다', context:'I wake with a sudden start every night.', explanation:'' },
  { id:'r2', text:'do the best that I can', meaning:'내가 할 수 있는 최선을 다하다', context:'I will do the best that I can.', explanation:'' },
  { id:'r3', text:'take it one day at a time', meaning:'하루씩 차근차근 해내다', context:'We take it one day at a time.', explanation:'' },
  { id:'r4', text:'make the most of this moment', meaning:'이 순간을 최대한 활용하다', context:'Let us make the most of this moment.', explanation:'' },
  { id:'r5', text:'keep your eyes on the road', meaning:'도로에서 눈을 떼지 않다', context:'Please keep your eyes on the road.', explanation:'' },
  { id:'r6', text:'leave no stone unturned today', meaning:'오늘 가능한 방법을 모두 찾다', context:'We will leave no stone unturned today.', explanation:'' },
  { id:'r7', text:'hold on for just one moment', meaning:'딱 잠깐만 기다리다', context:'Please hold on for just one moment.', explanation:'' },
  { id:'r8', text:'put all your cards on the table', meaning:'속내를 모두 솔직하게 밝히다', context:'It is time to put all your cards on the table.', explanation:'' },
];

const blank = contextWithBlank(notes[0]);
assert.equal(blank, '[빈칸], then [빈칸].');
assert.ok(!blank.includes('_'));
assert.equal(contextWithBlank({ text:'at', context:'Look at that cat at home.' }), 'Look [빈칸] that cat [빈칸] home.');
assert.equal(contextWithBlank({ text:'C++', context:'C++ and C++.' }), '[빈칸] and [빈칸].');

const beginnerQuestion = localQuizQuestion(beginnerPlan[0], richNotes[0], richNotes);
assert.equal(beginnerQuestion.type, 'meaning');
assert.equal(beginnerQuestion.answerMode, 'choice');
assert.equal(beginnerQuestion.choices.length, 2);
assert.equal(beginnerQuestion.choices[beginnerQuestion.answerIndex], richNotes[0].meaning);

const easyExpressionQuestion = localQuizQuestion(easyPlan[1], richNotes[1], richNotes);
assert.equal(easyExpressionQuestion.type, 'expression');
assert.equal(easyExpressionQuestion.choices.length, 3);
assert.equal(easyExpressionQuestion.choices[easyExpressionQuestion.answerIndex], richNotes[1].text);

const normalContextQuestion = localQuizQuestion(normalPlan[2], richNotes[2], richNotes);
assert.equal(normalContextQuestion.type, 'context_blank');
assert.equal(normalContextQuestion.choices.length, 4);
assert.ok(normalContextQuestion.prompt.includes('[빈칸]'));

const hardReorderQuestion = localQuizQuestion(hardPlan[1], richNotes[0], richNotes);
assert.equal(hardReorderQuestion.answerMode, 'reorder');
assert.equal(hardReorderQuestion.tokens.length, 5);
assert.ok(hardReorderQuestion.prompt.includes(richNotes[0].meaning));

const expertReorderQuestion = localQuizQuestion(expertPlan[1], richNotes[1], richNotes);
assert.equal(expertReorderQuestion.answerMode, 'reorder');
assert.equal(expertReorderQuestion.tokens.length, 6);
assert.ok(!expertReorderQuestion.prompt.includes(richNotes[1].meaning));
assert.ok(expertReorderQuestion.prompt.includes('저장된 원문의 빈칸'));
assert.ok(expertReorderQuestion.prompt.includes('[빈칸]'));

const tooShortForHard = { id:'short', text:'look out', meaning:'조심하다', context:'Please look out.', explanation:'' };
assert.equal(localQuizQuestion(hardPlan[1], tooShortForHard, [...richNotes, tooShortForHard]), null);
const tooLongForExpert = { id:'long', text:'one two three four five six seven eight nine', meaning:'아홉 단어', context:'one two three four five six seven eight nine', explanation:'' };
assert.equal(localQuizQuestion(expertPlan[1], tooLongForExpert, [...richNotes, tooLongForExpert]), null);

const sameEnglishDifferentSense = { id:'bank-river', text:'bank', meaning:'강둑', context:'We sat on the bank.', explanation:'' };
const bankMoney = { id:'bank-money', text:'bank', meaning:'은행', context:'I visited the bank.', explanation:'' };
assert.equal(localQuizQuestion(beginnerPlan[0], sameEnglishDifferentSense, [...richNotes, sameEnglishDifferentSense, bankMoney]), null);

const sameMeaning = { id:'same-meaning', text:'do all I can', meaning:richNotes[1].meaning, context:'I will do all I can.', explanation:'' };
assert.equal(localQuizQuestion(easyPlan[1], richNotes[1], [...richNotes, sameMeaning]), null);

const missingContext = { id:'no-context', text:'keep moving forward', meaning:'계속 앞으로 나아가다', context:'', explanation:'' };
assert.equal(localQuizQuestion(normalPlan[2], missingContext, [...richNotes, missingContext]), null);
assert.equal(localQuizQuestion(expertPlan[1], { ...richNotes[0], context:'' }, richNotes), null);

const oneWord = { id:'one', text:'serendipity', meaning:'뜻밖의 행운', context:'Serendipity.', explanation:'' };
assert.equal(localQuizQuestion(hardPlan[1], oneWord, [...richNotes, oneWord]), null);

const normalBuild = buildQuizQuestions(richNotes, richNotes, 6, 'normal');
assert.equal(normalBuild.complete, true);
assert.equal(normalBuild.questions.length, 6);
assert.ok(normalBuild.questions.every(q => q.answerMode === 'choice' && q.choices.length === 4));
assert.deepEqual(normalBuild.questions.map(q => q.type), quizPlanFor(6, 'normal').map(slot => slot.type));

const hardBuild = buildQuizQuestions(richNotes, richNotes, 6, 'hard');
assert.equal(hardBuild.complete, true);
assert.equal(hardBuild.questions.length, 6);
assert.deepEqual(hardBuild.questions.map(q => q.type), quizPlanFor(6, 'hard').map(slot => slot.type));

const expertBuild = buildQuizQuestions(richNotes, richNotes, 6, 'expert');
assert.equal(expertBuild.complete, true);
assert.equal(expertBuild.questions.length, 6);
assert.deepEqual(expertBuild.questions.map(q => q.type), quizPlanFor(6, 'expert').map(slot => slot.type));
assert.ok(expertBuild.questions.every(q => q.type === 'grammar' && q.answerMode === 'reorder' && q.prompt.includes('[빈칸]')));

const contextless = richNotes.slice(0, 4).map(note => ({ ...note, context:'' }));
const scarceHard = buildQuizQuestions(contextless, richNotes, 4, 'hard');
assert.equal(scarceHard.complete, false);
assert.equal(scarceHard.questions.length, 2);
assert.ok(scarceHard.message.includes('어려움 단계 4문제'));
assert.ok(scarceHard.message.includes('현재 조건으로 2/4문제'));
assert.ok(scarceHard.message.includes('부족한 유형: 문맥'));

const explicitMessage = quizStageEligibilityMessage('expert', 5, 3, ['grammar']);
assert.ok(explicitMessage.includes('고수 단계 5문제'));
assert.ok(explicitMessage.includes('4~8단어'));
assert.ok(explicitMessage.includes('표현 순서'));

assert.equal(exactReorderMatches('well, well', 'well, well'), true);
assert.equal(exactReorderMatches('well well,', 'well, well'), false);

const openQuizSource = source.slice(source.indexOf('function openQuiz'), source.indexOf('function renderQuiz'));
assert.ok(!openQuizSource.includes('callAI('));
assert.ok(!openQuizSource.includes('beginAiTask('));
assert.ok(openQuizSource.includes('buildQuizQuestions('));
assert.ok(openQuizSource.includes('if (!built.complete)'));
assert.ok(openQuizSource.includes('quizQuestionCount(configuredCount, sourcePool.length)'));
assert.ok(!openQuizSource.includes('sourcePool.length < count'));

const renderQuizSource = source.slice(source.indexOf('function renderQuiz'), source.indexOf('function wrongNoteKey'));
assert.ok(renderQuizSource.includes("grammar:'표현 순서'"));
assert.ok(!renderQuizSource.includes('뉘앙스·격식'));
assert.ok(!renderQuizSource.includes('유사 표현 구별'));
assert.ok(renderQuizSource.includes('readonly'));
assert.ok(renderQuizSource.includes('stageLabel'));

const historySource = source.slice(source.indexOf('function openQuizHistory'));
assert.ok(historySource.includes('h.stage'));
assert.ok(source.includes('쪽지 시험 단계<select'));
assert.ok(!source.includes('쪽지 시험 난이도<select'));
assert.ok(source.includes('id="pd-quiz-stage-help"'));
assert.ok(source.includes('updateQuizStageHelp()'));
assert.ok(source.includes('영어 표현의 한국어 뜻을 2개 중 고릅니다.'));
assert.ok(source.includes('영어 표현과 한국어 뜻을 양방향 3지선다로 풉니다.'));
assert.ok(source.includes('뜻·표현·저장 문맥 빈칸을 4지선다로 풉니다.'));
assert.ok(source.includes('3~6단어 표현 순서 문제입니다.'));
assert.ok(source.includes('4~8단어 표현 순서 문제만 나옵니다.'));
assert.ok(source.includes('display:block;margin-top:6px;line-height:1.45;white-space:normal;overflow-wrap:anywhere'));

console.log('Phrase Desk deterministic quiz-stage regression tests: all assertions passed');
