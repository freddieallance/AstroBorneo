import {
  defaultDecision,
  initialState,
  runCycle,
  type Decision,
  type EventChoice,
  type Review,
  type State,
} from './engine';
import { getViewModel, type GameViewModel } from './view-model';

export const DEMO_SESSION_KEY = 'lunalab.judgeDemo.v1';

export type DemoStepId =
  | 'welcome'
  | 'facilities'
  | 'tradeoff'
  | 'event'
  | 'calculate'
  | 'quiz'
  | 'outcome';

export const DEMO_STEPS: { id: DemoStepId; shortLabel: string; cue: string }[] = [
  { id: 'welcome', shortLabel: '1. Role', cue: 'You are Commander' },
  { id: 'facilities', shortLabel: '2. Base', cue: '6 Moon Base Buildings' },
  { id: 'tradeoff', shortLabel: '3. Trade-Off', cue: 'Eco vs Boost Power & Air' },
  { id: 'event', shortLabel: '4. Event', cue: 'Cycle 2 Low Sun Alert' },
  { id: 'calculate', shortLabel: '5. Result', cue: 'Real Engine Output' },
  { id: 'quiz', shortLabel: '6. Quiz', cue: 'Science Check' },
  { id: 'outcome', shortLabel: '7. Sources', cue: 'End State & NASA Sources' },
];

export interface DemoSessionState {
  stepIndex: number;
  facilityIndex: number;
  autoTour: boolean;
  /** Live Cycle 2 state (derived via real engine from initialState -> Cycle 1). */
  midState: State;
  /** Live Cycle 2 pending draft (mode, systems, event). */
  draft: Decision;
  /** Result after running Cycle 2 ONCE via runCycle (null until Step 5 runs). */
  committedState: State | null;
  /** Single demo science question choice index (question 0: air trade-off). */
  quizAnswer: number | null;
  /** End state computed via real engine Cycles 3-5 from committedState/midState. */
  outcomeState: State | null;
}

/**
 * Builds the valid Cycle 2 starting state for the Judge Demo by executing
 * Cycle 1 through the canonical `runCycle` engine with standard defaults.
 */
export function createDemoStartState(): State {
  const s1 = initialState();
  return runCycle(s1, defaultDecision(1), 1);
}

export function createInitialDemoSession(): DemoSessionState {
  const midState = createDemoStartState();
  return {
    stepIndex: 0,
    facilityIndex: 0,
    autoTour: false,
    midState,
    draft: {
      ...defaultDecision(2),
      mode: 'standard',
      event: 'save',
    },
    committedState: null,
    quizAnswer: null,
    outcomeState: null,
  };
}

/**
 * Pure forecast adapter for Step 3 & Step 4 — delegates strictly to `getViewModel`.
 */
export function getDemoForecastVM(state: State, draft: Decision): GameViewModel {
  return getViewModel(state, draft, draft.event);
}

/**
 * Runs the Cycle 2 calculation ONCE using the canonical `runCycle` engine.
 * Idempotent: if `committedState` already exists, returns it unchanged.
 */
export function commitDemoCycleOnce(session: DemoSessionState): {
  next: DemoSessionState;
  review: Review | null;
  ranNow: boolean;
} {
  if (session.committedState) {
    const existing = session.committedState.history.find((h) => h.cycle === 2) ?? null;
    return { next: session, review: existing, ranNow: false };
  }
  const eventChoice: EventChoice =
    session.draft.event === 'battery' || session.draft.event === 'save'
      ? session.draft.event
      : 'battery';
  const decision: Decision = { ...session.draft, event: eventChoice };
  const afterC2 = runCycle(session.midState, decision, 2);
  const review = afterC2.history.find((h) => h.cycle === 2) ?? null;
  return {
    next: {
      ...session,
      draft: decision,
      committedState: afterC2,
    },
    review,
    ranNow: true,
  };
}

/**
 * Completes Cycles 3-5 through the real `runCycle` engine using documented,
 * valid demo engineering choices so Step 7 displays genuine simulation outputs
 * rather than fabricated numbers or a fake 'all green' score.
 */
export function buildDemoOutcomeState(
  baseState: State,
  quizCorrectCount: number,
): State {
  let s = baseState;
  const scripted: Record<number, Decision> = {
    3: { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'repair' },
    4: {
      mode: 'standard',
      greenhouse: true,
      recycler: true,
      communications: false,
      event: s.shieldingKits > 0 ? 'shield' : 'shelter',
    },
    5: { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'repair' },
  };
  while (s.status === 'active' && s.cycle <= 5) {
    const d = scripted[s.cycle] ?? {
      ...defaultDecision(s.cycle),
      event: s.cycle === 2 ? (s.backupCharges > 0 ? 'battery' : 'save') : 'none',
    };
    const nextEvent =
      s.cycle === 4 && d.event === 'shield' && s.shieldingKits < 1 ? 'shelter' : d.event;
    s = runCycle(s, { ...d, event: nextEvent }, s.cycle);
  }
  return {
    ...s,
    quizCompleted: true,
    correctQuizAnswers: Math.max(0, Math.min(5, Math.trunc(quizCorrectCount))),
  };
}

export function loadDemoSession(): DemoSessionState {
  try {
    if (typeof sessionStorage === 'undefined') return createInitialDemoSession();
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return createInitialDemoSession();
    const parsed = JSON.parse(raw) as Partial<DemoSessionState>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.stepIndex !== 'number' ||
      !Number.isInteger(parsed.stepIndex) ||
      parsed.stepIndex < 0 ||
      parsed.stepIndex >= DEMO_STEPS.length ||
      !parsed.midState ||
      !parsed.draft
    ) {
      return createInitialDemoSession();
    }
    return {
      stepIndex: parsed.stepIndex,
      facilityIndex:
        typeof parsed.facilityIndex === 'number' &&
        Number.isInteger(parsed.facilityIndex) &&
        parsed.facilityIndex >= 0 &&
        parsed.facilityIndex < 6
          ? parsed.facilityIndex
          : 0,
      autoTour: Boolean(parsed.autoTour),
      midState: parsed.midState,
      draft: parsed.draft,
      committedState: parsed.committedState ?? null,
      quizAnswer:
        typeof parsed.quizAnswer === 'number' &&
        Number.isInteger(parsed.quizAnswer) &&
        parsed.quizAnswer >= 0 &&
        parsed.quizAnswer < 4
          ? parsed.quizAnswer
          : null,
      outcomeState: parsed.outcomeState ?? null,
    };
  } catch {
    return createInitialDemoSession();
  }
}

export function saveDemoSession(session: DemoSessionState): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* demo state is disposable if storage is blocked */
  }
}

export function clearDemoSession(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
