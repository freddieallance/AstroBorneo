import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ, QUIZ_VISUAL_META } from './quiz';
import {
  buildLearningReflection,
  emptyQuiz,
  loadQuiz,
  normalizeQuizState,
  quizCorrect,
  saveQuiz,
  setQuizCurrentIndex,
  submitQuizAnswerOnce,
} from '../lib/records';
import { defaultDecision, initialState, runCycle } from '../game/engine';
import { scoreSummary } from '../game/scoring';

test('preserves existing 5 quiz question IDs, answer keys, and visual metadata', () => {
  assert.deepEqual(
    QUIZ.map((q) => ({ id: q.id, answer: q.answer, choicesCount: q.choices.length })),
    [
      { id: 'air', answer: 1, choicesCount: 4 },
      { id: 'solar', answer: 1, choicesCount: 4 },
      { id: 'water', answer: 0, choicesCount: 4 },
      { id: 'radiation', answer: 1, choicesCount: 4 },
      { id: 'comms', answer: 0, choicesCount: 4 },
    ],
  );
  for (const q of QUIZ) {
    const meta = QUIZ_VISUAL_META[q.id];
    assert.ok(meta, `Visual metadata missing for ${q.id}`);
    assert.equal(meta.shortLabels.length, 4);
    assert.equal(meta.choiceAlts.length, 4);
    assert.match(meta.sourceUrl, /^https:\/\//);
  }
});

test('single-submission guard prevents overwriting answers or double-awarding points', () => {
  let state = emptyQuiz();
  const first = submitQuizAnswerOnce(state, 0, 1);
  assert.equal(first.changed, true);
  assert.equal(quizCorrect(first.next), 1);

  // Simulate double-click or re-submit attempt on Q1 with different or same choice
  const duplicate = submitQuizAnswerOnce(first.next, 0, 1);
  assert.equal(duplicate.changed, false);
  assert.equal(quizCorrect(duplicate.next), 1);

  const overwriteAttempt = submitQuizAnswerOnce(first.next, 0, 2);
  assert.equal(overwriteAttempt.changed, false);
  assert.equal(overwriteAttempt.next.answers[0], 1);
  assert.equal(quizCorrect(overwriteAttempt.next), 1);

  // Invalid question / choice indices are ignored safely
  assert.equal(submitQuizAnswerOnce(first.next, 9, 0).changed, false);
  assert.equal(submitQuizAnswerOnce(first.next, 1, 9).changed, false);
});

test('navigation guard prevents skipping unanswered questions while allowing review of answered slots', () => {
  let state = emptyQuiz();
  // Cannot skip straight to Q4 before Q1 is submitted
  assert.equal(setQuizCurrentIndex(state, 3).currentIndex, 0);

  state = submitQuizAnswerOnce(state, 0, 1).next;
  state = setQuizCurrentIndex(state, 1);
  assert.equal(state.currentIndex, 1);

  // Cannot skip to Q3 while Q2 is unanswered
  assert.equal(setQuizCurrentIndex(state, 2).currentIndex, 1);
  // Can go back to Q1
  assert.equal(setQuizCurrentIndex(state, 0).currentIndex, 0);
});

test('computes exact 0/5 and 5/5 quiz contributions to /100 final score', () => {
  let game = initialState();
  game = runCycle(game, { ...defaultDecision(1), event: 'none' });
  game = runCycle(game, { ...defaultDecision(2), event: 'save' });
  game = runCycle(game, { ...defaultDecision(3), event: 'skip' });
  game = runCycle(game, { ...defaultDecision(4), event: 'shield' });
  game = runCycle(game, { ...defaultDecision(5), event: 'continue' });

  const provisional = scoreSummary(game, false, 0);
  assert.equal(provisional.maximum, 90);

  // 0/5 wrong answers
  let allWrong = emptyQuiz();
  QUIZ.forEach((q, idx) => {
    allWrong = submitQuizAnswerOnce(allWrong, idx, (q.answer + 1) % 4).next;
  });
  assert.equal(allWrong.completed, true);
  assert.equal(quizCorrect(allWrong), 0);
  const zeroSummary = scoreSummary(game, allWrong.completed, quizCorrect(allWrong));
  assert.equal(zeroSummary.maximum, 100);
  assert.equal(zeroSummary.value, provisional.value);

  // 5/5 correct answers
  let allRight = emptyQuiz();
  QUIZ.forEach((q, idx) => {
    allRight = submitQuizAnswerOnce(allRight, idx, q.answer).next;
  });
  assert.equal(allRight.completed, true);
  assert.equal(quizCorrect(allRight), 5);
  const fullSummary = scoreSummary(game, allRight.completed, quizCorrect(allRight));
  assert.equal(fullSummary.maximum, 100);
  assert.equal(fullSummary.value, provisional.value + 10);
});

test('persists and restores mid-quiz reload state and legacy v1 objects without losing progress', () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  });

  let mid = emptyQuiz();
  mid = submitQuizAnswerOnce(mid, 0, 1).next;
  mid = submitQuizAnswerOnce(mid, 1, 1).next;
  mid = setQuizCurrentIndex(mid, 2);
  saveQuiz(mid);

  const restored = loadQuiz();
  assert.deepEqual(restored.answers, [1, 1, null, null, null]);
  assert.equal(restored.completed, false);
  assert.equal(restored.currentIndex, 2);

  // Legacy saved object without currentIndex resumes at first unanswered question
  const legacy = normalizeQuizState({ answers: [1, 0, null, null, null], completed: false });
  assert.equal(legacy.currentIndex, 2);
  assert.equal(legacy.completed, false);
});

test('reflection builder strictly uses actual mission decisions and quiz answers', () => {
  const emptyGame = initialState();
  const emptyReflection = buildLearningReflection(emptyGame, emptyQuiz());
  assert.equal(emptyReflection.missionFacts[0], 'No cycles have been committed yet in this session.');

  let game = initialState();
  game = runCycle(game, { ...defaultDecision(1), mode: 'eco', communications: true, event: 'none' });
  let quiz = emptyQuiz();
  quiz = submitQuizAnswerOnce(quiz, 0, 1).next;
  quiz = submitQuizAnswerOnce(quiz, 1, 0).next;
  quiz = submitQuizAnswerOnce(quiz, 2, 0).next;
  quiz = submitQuizAnswerOnce(quiz, 3, 1).next;
  quiz = submitQuizAnswerOnce(quiz, 4, 0).next;

  const reflection = buildLearningReflection(game, quiz);
  assert.ok(reflection.missionFacts.some((l) => /Eco Air in 1 cycle/.test(l)));
  assert.ok(reflection.missionFacts.some((l) => /Communications to Earth in 1 cycle/.test(l)));
  assert.deepEqual(reflection.quizReviewTopics, ['Power']);
  assert.match(reflection.summaryLine, /4\/5 correct/);
});
