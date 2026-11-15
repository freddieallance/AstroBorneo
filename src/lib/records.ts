// UI-side persistence (quiz progress and mission history). Separate from game save.
import type { State } from '@/game/engine';
import { QUIZ } from '@/content/quiz';

export interface QuizState {
  answers: (number | null)[];
  completed: boolean;
  currentIndex?: number;
}
export interface MissionRecord {
  id: string;
  attemptId?: string;
  date: string;
  outcome: 'success' | 'failed';
  completedCycles: number;
  science: number;
  score: number;
  decisions: string[];
}

const QUIZ_KEY = 'lunalab.quiz.v1';
const HISTORY_KEY = 'lunalab.missions.v1';
const LEGACY_HISTORY_PREFIX = 'lunalab.missionHistory.';
const LEGACY_HISTORY_CANDIDATES = ['lunalab.missionHistory.v1', 'lunalab.missionHistory.v2'];

export const firstOpenQuizIndex = (answers: (number | null)[]): number => {
  const open = answers.findIndex((a) => a === null);
  return open === -1 ? 0 : open;
};

export const emptyQuiz = (): QuizState => ({
  answers: QUIZ.map(() => null),
  completed: false,
  currentIndex: 0,
});

export function normalizeQuizState(raw: unknown): QuizState {
  if (!raw || typeof raw !== 'object') return emptyQuiz();
  const q = raw as Partial<QuizState>;
  if (
    !Array.isArray(q.answers)
    || q.answers.length !== QUIZ.length
    || !q.answers.every((a, i) => a === null || (Number.isInteger(a) && a >= 0 && a < QUIZ[i].choices.length))
  ) {
    return emptyQuiz();
  }
  const completed = q.answers.every((a) => a !== null);
  const firstOpen = firstOpenQuizIndex(q.answers);
  const maxReachable = completed ? QUIZ.length - 1 : firstOpen;
  const rawIdx = typeof q.currentIndex === 'number' && Number.isInteger(q.currentIndex) ? q.currentIndex : firstOpen;
  const currentIndex = Math.max(0, Math.min(maxReachable, rawIdx));
  return { answers: [...q.answers], completed, currentIndex };
}

export function loadQuiz(): QuizState {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return emptyQuiz();
    return normalizeQuizState(JSON.parse(raw));
  } catch {
    return emptyQuiz();
  }
}

/** Throws on storage failure so callers can report it honestly. */
export function saveQuiz(q: QuizState) {
  localStorage.setItem(QUIZ_KEY, JSON.stringify(q));
}

/**
 * Submits one answer per question ID. Never overwrites a previously submitted
 * slot and never double-awards points.
 */
export function submitQuizAnswerOnce(
  state: QuizState,
  questionIndex: number,
  choiceIndex: number,
): { next: QuizState; changed: boolean } {
  if (
    !Number.isInteger(questionIndex)
    || questionIndex < 0
    || questionIndex >= QUIZ.length
    || !Number.isInteger(choiceIndex)
    || choiceIndex < 0
    || choiceIndex >= QUIZ[questionIndex].choices.length
  ) {
    return { next: state, changed: false };
  }
  if (state.answers[questionIndex] !== null) {
    return { next: state, changed: false };
  }
  const answers = [...state.answers];
  answers[questionIndex] = choiceIndex;
  const completed = answers.every((a) => a !== null);
  return {
    next: {
      answers,
      completed,
      currentIndex: questionIndex,
    },
    changed: true,
  };
}

/**
 * Allows navigating back to answered questions or the current first-unanswered
 * question, preventing skipping ahead over unanswered slots.
 */
export function setQuizCurrentIndex(state: QuizState, nextIndex: number): QuizState {
  if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= QUIZ.length) return state;
  const maxReachable = state.completed ? QUIZ.length - 1 : firstOpenQuizIndex(state.answers);
  const clamped = Math.max(0, Math.min(maxReachable, nextIndex));
  return { ...state, currentIndex: clamped };
}

export const quizCorrect = (q: QuizState) =>
  q.answers.reduce<number>((n, a, i) => (a === QUIZ[i].answer ? n + 1 : n), 0);

export interface LearningReflection {
  missionFacts: string[];
  quizStrengths: string[];
  quizReviewTopics: string[];
  summaryLine: string;
}

/**
 * Generates an honest, verifiable reflection using ONLY actual recorded game
 * decisions and submitted quiz answers.
 */
export function buildLearningReflection(game: State | null, quiz: QuizState): LearningReflection {
  const missionFacts: string[] = [];
  if (game && game.history.length > 0) {
    const ecoCount = game.history.filter((r) => r.decision.mode === 'eco').length;
    const boostCount = game.history.filter((r) => r.decision.mode === 'boost').length;
    const commsCount = game.history.filter((r) => r.decision.communications).length;
    if (ecoCount > 0) missionFacts.push(`You chose Eco Air in ${ecoCount} cycle${ecoCount > 1 ? 's' : ''} to save Power.`);
    if (boostCount > 0) missionFacts.push(`You used Boost Air in ${boostCount} cycle${boostCount > 1 ? 's' : ''} to build Air reserves.`);
    const c2 = game.history.find((r) => r.cycle === 2);
    if (c2) {
      missionFacts.push(
        c2.decision.event === 'battery'
          ? 'During Cycle 2 Low Sun, you used your backup battery (+20 Power).'
          : 'During Cycle 2 Low Sun, you saved your backup battery for later.',
      );
    }
    const c3 = game.history.find((r) => r.cycle === 3);
    if (c3) {
      missionFacts.push(
        c3.decision.event === 'repair'
          ? 'During Cycle 3, you repaired the Water Recycler.'
          : 'During Cycle 3, you kept running without repairing the Water Recycler.',
      );
    }
    const c4 = game.history.find((r) => r.cycle === 4);
    if (c4) {
      missionFacts.push(
        c4.decision.event === 'shield'
          ? 'During the Cycle 4 solar burst, you installed thicker regolith shielding.'
          : c4.decision.event === 'shelter'
            ? 'During the Cycle 4 solar burst, you ordered the crew into the Shelter.'
            : 'During the Cycle 4 solar burst, you continued regular operations.',
      );
    }
    const c5 = game.history.find((r) => r.cycle === 5);
    if (c5) {
      missionFacts.push(
        c5.decision.event === 'repair'
          ? 'During Cycle 5, you repaired the Greenhouse grow lights.'
          : c5.decision.event === 'off'
            ? 'During Cycle 5, you switched the Greenhouse OFF to conserve Power and Water.'
            : 'During Cycle 5, you finished without repairing the Greenhouse.',
      );
    }
    if (commsCount > 0) {
      missionFacts.push(`You ran Communications to Earth in ${commsCount} cycle${commsCount > 1 ? 's' : ''}, earning ${game.science} Science total.`);
    }
  } else {
    missionFacts.push('No cycles have been committed yet in this session.');
  }

  const quizStrengths = QUIZ.filter((q, i) => quiz.answers[i] === q.answer).map((q) => q.topic);
  const quizReviewTopics = QUIZ.filter((q, i) => quiz.answers[i] !== null && quiz.answers[i] !== q.answer).map((q) => q.topic);
  const answeredCount = quiz.answers.filter((a) => a !== null).length;

  let summaryLine = 'Complete all 5 picture questions to record your final learning score.';
  if (quiz.completed) {
    if (quizReviewTopics.length === 0) {
      summaryLine = '5/5 correct: you matched every life-support, power, water, radiation, and comms cause-and-effect.';
    } else {
      summaryLine = `${quizStrengths.length}/5 correct. Revisit ${quizReviewTopics.join(', ')} on the Moon Base to see how those modules work.`;
    }
  } else if (answeredCount > 0) {
    summaryLine = `${answeredCount} of 5 questions submitted. Unanswered questions stay open without penalty.`;
  }

  return { missionFacts, quizStrengths, quizReviewTopics, summaryLine };
}

function findLegacyHistoryKeys(): string[] {
  const keys = new Set<string>(LEGACY_HISTORY_CANDIDATES);
  try {
    const len = typeof localStorage.length === 'number' ? localStorage.length : 0;
    for (let i = 0; i < len; i++) {
      const k = localStorage.key?.(i);
      if (k && k.startsWith(LEGACY_HISTORY_PREFIX)) keys.add(k);
    }
  } catch {
    /* ignore key enumeration failure */
  }
  return [...keys];
}

function normalizeMissionRecords(raw: unknown): MissionRecord[] {
  if (!Array.isArray(raw)) return [];
  const valid: MissionRecord[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Partial<MissionRecord>;
    if (
      typeof r.id !== 'string' ||
      !r.id.trim() ||
      (r.outcome !== 'success' && r.outcome !== 'failed') ||
      !Number.isInteger(r.completedCycles) ||
      !Number.isFinite(r.science) ||
      !Number.isFinite(r.score) ||
      !Array.isArray(r.decisions)
    ) {
      continue;
    }
    const dedupeKey = typeof r.attemptId === 'string' && r.attemptId.trim() ? `a:${r.attemptId.trim()}` : `id:${r.id.trim()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    valid.push({
      id: r.id,
      attemptId: typeof r.attemptId === 'string' && r.attemptId.trim() ? r.attemptId.trim() : undefined,
      date: typeof r.date === 'string' ? r.date : new Date().toISOString(),
      outcome: r.outcome,
      completedCycles: r.completedCycles as number,
      science: r.science as number,
      score: r.score as number,
      decisions: r.decisions.filter((d): d is string => typeof d === 'string'),
    });
  }
  return valid;
}

export function loadMissions(): MissionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return normalizeMissionRecords(JSON.parse(raw));
    }
    for (const legacyKey of findLegacyHistoryKeys()) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const parsed = normalizeMissionRecords(JSON.parse(legacyRaw));
      if (parsed.length > 0) {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed.slice(0, 30)));
        } catch {
          /* ignore write failure when migrating legacy history */
        }
        return parsed.slice(0, 30);
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function addMission(r: MissionRecord) {
  const existing = loadMissions();
  const filtered = existing.filter((item) => {
    if (r.attemptId && item.attemptId) return item.attemptId !== r.attemptId;
    if (r.attemptId && item.id === r.attemptId) return false;
    return item.id !== r.id;
  });
  const list = [r, ...filtered].slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function clearMissions() {
  localStorage.removeItem(HISTORY_KEY);
  for (const legacyKey of findLegacyHistoryKeys()) {
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      /* ignore */
    }
  }
}
