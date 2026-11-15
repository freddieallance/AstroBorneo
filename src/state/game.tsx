import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { defaultDecision, initialState, runCycle, score, type Decision, type State } from '@/game/engine';
import {
  clearCorruptedSaves,
  clearGame,
  defaultSceneResumeState,
  generateAttemptId,
  loadSaveEnvelope,
  normalizeSceneResumeState,
  saveEnvelope,
  SCENARIO_ID,
  type SceneResumeState,
} from '@/game/persistence';
import {
  addMission,
  emptyQuiz,
  loadQuiz,
  quizCorrect,
  saveQuiz,
  setQuizCurrentIndex,
  submitQuizAnswerOnce,
  type QuizState,
} from '@/lib/records';
import { loadDetailsModePref, saveDetailsModePref } from '@/lib/speech';
import { EVENT_LABEL } from '@/content/mission';

interface GameCtx {
  game: State | null;
  draft: Decision;
  setDraft: (d: Decision) => void;
  attemptId: string;
  scenarioId: string;
  sceneUi: SceneResumeState;
  setSceneUi: (patch: Partial<SceneResumeState> | ((prev: SceneResumeState) => SceneResumeState)) => void;
  loadError: string | null;
  saveError: string | null;
  quiz: QuizState;
  quizSaveError: string | null;
  setQuizIndex: (idx: number) => void;
  submitQuizAnswer: (questionIndex: number, choiceIndex: number) => boolean;
  resetQuiz: () => void;
  startNew: () => void;
  commit: (expectedCycle: number) => { ok: true; state: State } | { ok: false; error: string };
  updateQuiz: (completed: boolean, correct: number) => void;
  abandon: () => void;
  resetCorruptedSave: () => void;
  retrySave: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function initLoad(): {
  game: State | null;
  draft?: Decision;
  attemptId: string;
  scenarioId: string;
  sceneUi: SceneResumeState;
  quiz: QuizState;
  error: string | null;
} {
  const quiz = loadQuiz();
  const prefDetails = loadDetailsModePref();
  try {
    const env = loadSaveEnvelope();
    if (!env) {
      return {
        game: null,
        attemptId: generateAttemptId(),
        scenarioId: SCENARIO_ID,
        sceneUi: defaultSceneResumeState(prefDetails),
        quiz,
        error: null,
      };
    }
    const game: State = {
      ...env.state,
      quizCompleted: quiz.completed,
      correctQuizAnswers: quizCorrect(quiz),
    };
    return {
      game,
      draft: env.draft,
      attemptId: env.attemptId,
      scenarioId: env.scenarioId,
      sceneUi: normalizeSceneResumeState(env.ui, prefDetails),
      quiz,
      error: null,
    };
  } catch (e) {
    return {
      game: null,
      attemptId: generateAttemptId(),
      scenarioId: SCENARIO_ID,
      sceneUi: defaultSceneResumeState(prefDetails),
      quiz,
      error: `Saved mission could not be loaded (${msg(e)}). You can reset the save or start a new mission.`,
    };
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [init] = useState(initLoad);
  const [game, setGame] = useState<State | null>(init.game);
  const [loadError, setLoadError] = useState<string | null>(init.error);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState>(init.quiz);
  const [quizSaveError, setQuizSaveError] = useState<string | null>(null);
  const [draft, setDraftState] = useState<Decision>(() => init.draft ?? defaultDecision(init.game?.cycle ?? 1));
  const [attemptId, setAttemptId] = useState<string>(init.attemptId);
  const [sceneUi, setSceneUiState] = useState<SceneResumeState>(init.sceneUi);

  const gameRef = useRef(game);
  gameRef.current = game;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;
  const sceneUiRef = useRef(sceneUi);
  sceneUiRef.current = sceneUi;

  const lock = useRef(false);
  const quizLock = useRef(false);

  const persist = useCallback(
    (
      s: State,
      d: Decision = draftRef.current,
      ui: SceneResumeState = sceneUiRef.current,
      id: string = attemptIdRef.current,
    ) => {
      try {
        saveEnvelope({
          scenarioId: init.scenarioId,
          attemptId: id,
          state: s,
          draft: d,
          ui,
        });
        setSaveError(null);
      } catch (e) {
        setSaveError(`Progress could not be saved on this device (${msg(e)}). Your mission continues, but it may not resume after closing the page.`);
      }
    },
    [init.scenarioId],
  );

  const persistQuiz = useCallback((nextQuiz: QuizState) => {
    try {
      saveQuiz(nextQuiz);
      setQuizSaveError(null);
    } catch {
      setQuizSaveError('Quiz progress could not be saved on this device. You can keep going.');
    }
  }, []);

  const setDraft = useCallback(
    (d: Decision) => {
      draftRef.current = d;
      setDraftState(d);
      if (gameRef.current) persist(gameRef.current, d, sceneUiRef.current);
    },
    [persist],
  );

  const setSceneUi = useCallback(
    (patch: Partial<SceneResumeState> | ((prev: SceneResumeState) => SceneResumeState)) => {
      const prev = sceneUiRef.current;
      const rawNext = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      const next = normalizeSceneResumeState(rawNext, prev.detailsMode);
      if (next.detailsMode !== prev.detailsMode) {
        saveDetailsModePref(next.detailsMode);
      }
      sceneUiRef.current = next;
      setSceneUiState(next);
      if (gameRef.current) persist(gameRef.current, draftRef.current, next);
    },
    [persist],
  );

  const updateQuiz = useCallback(
    (completed: boolean, correct: number) => {
      if (!gameRef.current) return;
      const bounded = Math.max(0, Math.min(5, Math.trunc(correct)));
      const next = { ...gameRef.current, quizCompleted: completed, correctQuizAnswers: bounded };
      gameRef.current = next;
      setGame(next);
      persist(next);
    },
    [persist],
  );

  const setQuizIndex = useCallback(
    (idx: number) => {
      const nextQuiz = setQuizCurrentIndex(quizRef.current, idx);
      if (nextQuiz === quizRef.current) return;
      quizRef.current = nextQuiz;
      setQuiz(nextQuiz);
      persistQuiz(nextQuiz);
    },
    [persistQuiz],
  );

  const submitQuizAnswer = useCallback(
    (questionIndex: number, choiceIndex: number): boolean => {
      if (quizLock.current) return false;
      quizLock.current = true;
      try {
        const { next, changed } = submitQuizAnswerOnce(quizRef.current, questionIndex, choiceIndex);
        if (!changed) return false;
        quizRef.current = next;
        setQuiz(next);
        persistQuiz(next);
        updateQuiz(next.completed, quizCorrect(next));
        return true;
      } finally {
        quizLock.current = false;
      }
    },
    [persistQuiz, updateQuiz],
  );

  const resetQuiz = useCallback(() => {
    const fresh = emptyQuiz();
    quizRef.current = fresh;
    setQuiz(fresh);
    persistQuiz(fresh);
    updateQuiz(false, 0);
  }, [persistQuiz, updateQuiz]);

  const startNew = useCallback(() => {
    const nextAttemptId = generateAttemptId();
    attemptIdRef.current = nextAttemptId;
    setAttemptId(nextAttemptId);
    setLoadError(null);
    const base = initialState();
    const s: State = {
      ...base,
      quizCompleted: quizRef.current.completed,
      correctQuizAnswers: quizCorrect(quizRef.current),
    };
    gameRef.current = s;
    setGame(s);
    const d = defaultDecision(s.cycle);
    draftRef.current = d;
    setDraftState(d);
    const resetUi = defaultSceneResumeState(sceneUiRef.current.detailsMode);
    sceneUiRef.current = resetUi;
    setSceneUiState(resetUi);
    persist(s, d, resetUi, nextAttemptId);
  }, [persist]);

  const commit = useCallback(
    (expectedCycle: number): { ok: true; state: State } | { ok: false; error: string } => {
      const current = gameRef.current;
      if (!current) return { ok: false, error: 'No active mission.' };
      if (current.status !== 'active') return { ok: false, error: 'This mission has already ended.' };
      if (lock.current) return { ok: false, error: 'This cycle is already running.' };
      lock.current = true;
      try {
        const next = runCycle(current, draftRef.current, expectedCycle);
        gameRef.current = next;
        setGame(next);
        const nextDraft = { ...draftRef.current, event: 'none' as const };
        draftRef.current = nextDraft;
        setDraftState(nextDraft);
        const clearedUi: SceneResumeState = {
          ...sceneUiRef.current,
          stagedEvent: null,
        };
        sceneUiRef.current = clearedUi;
        setSceneUiState(clearedUi);
        persist(next, nextDraft, clearedUi, attemptIdRef.current);
        if (next.status !== 'active') {
          try {
            addMission({
              id: attemptIdRef.current,
              attemptId: attemptIdRef.current,
              date: new Date().toISOString(),
              outcome: next.status === 'success' ? 'success' : 'failed',
              completedCycles: next.completedCycles,
              science: next.science,
              score: score(next, next.quizCompleted ? next.correctQuizAnswers : 0),
              decisions: next.history.map(
                (r) => `C${r.cycle}: ${r.decision.mode} mode, ${EVENT_LABEL[r.decision.event]}, Greenhouse ${r.decision.greenhouse ? 'ON' : 'OFF'}`,
              ),
            });
          } catch {
            /* history is optional */
          }
        }
        return { ok: true, state: next };
      } catch (e) {
        return { ok: false, error: msg(e) };
      } finally {
        lock.current = false;
      }
    },
    [persist],
  );

  const abandon = useCallback(() => {
    try {
      clearGame();
      setSaveError(null);
    } catch (e) {
      setSaveError(`Saved mission could not be cleared (${msg(e)}).`);
    }
    setLoadError(null);
    setGame(null);
    gameRef.current = null;
    const nextAttemptId = generateAttemptId();
    attemptIdRef.current = nextAttemptId;
    setAttemptId(nextAttemptId);
    const reset = defaultDecision(1);
    draftRef.current = reset;
    setDraftState(reset);
    const resetUi = defaultSceneResumeState(sceneUiRef.current.detailsMode);
    sceneUiRef.current = resetUi;
    setSceneUiState(resetUi);
  }, []);

  const resetCorruptedSave = useCallback(() => {
    try {
      clearCorruptedSaves();
      setSaveError(null);
    } catch (e) {
      setSaveError(`Saved mission could not be cleared (${msg(e)}).`);
    }
    setLoadError(null);
    setGame(null);
    gameRef.current = null;
    const nextAttemptId = generateAttemptId();
    attemptIdRef.current = nextAttemptId;
    setAttemptId(nextAttemptId);
    const reset = defaultDecision(1);
    draftRef.current = reset;
    setDraftState(reset);
    const resetUi = defaultSceneResumeState(sceneUiRef.current.detailsMode);
    sceneUiRef.current = resetUi;
    setSceneUiState(resetUi);
  }, []);

  const retrySave = useCallback(() => {
    if (gameRef.current) persist(gameRef.current);
  }, [persist]);

  return (
    <Ctx.Provider
      value={{
        game,
        draft,
        setDraft,
        attemptId,
        scenarioId: init.scenarioId,
        sceneUi,
        setSceneUi,
        loadError,
        saveError,
        quiz,
        quizSaveError,
        setQuizIndex,
        submitQuizAnswer,
        resetQuiz,
        startNew,
        commit,
        abandon,
        resetCorruptedSave,
        retrySave,
        updateQuiz,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useGame() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame must be used inside GameProvider');
  return c;
}

