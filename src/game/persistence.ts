import { defaultDecision, resourceKeys, type Decision, type EventChoice, type State } from './engine';
import type { ModuleId } from '../content/mission';

const KEY = 'lunalab-mission-v1';
const LEGACY_ACTIVE_PREFIX = 'lunalab.activeMission.';
const LEGACY_ACTIVE_CANDIDATES = [
  'lunalab.activeMission.v2',
  'lunalab.activeMission.v1',
  'lunalab.activeMission.current',
];

export const SCHEMA_VERSION = 3;
export const SCENARIO_ID = 'operation-lunar-dawn-v1';

export type SceneOverlayKind =
  | 'none'
  | 'module'
  | 'decision'
  | 'reaction'
  | 'outcome'
  | 'quiz'
  | 'guide'
  | 'sources';

export interface SceneResumeState {
  overlay: SceneOverlayKind;
  selectedModule: ModuleId | null;
  introStep: number | null;
  reactionCycle: number | null;
  stagedEvent: EventChoice | null;
  detailsMode: boolean;
}

export interface SaveEnvelope {
  version: number;
  schemaVersion: number;
  scenarioId: string;
  attemptId: string;
  updatedAt: string;
  state: State;
  draft: Decision;
  ui: SceneResumeState;
}

const VALID_MODULES: readonly ModuleId[] = ['solar', 'greenhouse', 'habitat', 'recycler', 'shelter', 'comms'];
const VALID_EVENTS: readonly EventChoice[] = ['none', 'battery', 'save', 'repair', 'skip', 'shield', 'shelter', 'continue', 'off'];
const VALID_OVERLAYS: readonly SceneOverlayKind[] = ['none', 'module', 'decision', 'reaction', 'outcome', 'quiz', 'guide', 'sources'];

export function defaultSceneResumeState(detailsMode = false): SceneResumeState {
  return {
    overlay: 'none',
    selectedModule: null,
    introStep: null,
    reactionCycle: null,
    stagedEvent: null,
    detailsMode,
  };
}

export function normalizeSceneResumeState(raw: unknown, fallbackDetailsMode = false): SceneResumeState {
  const base = defaultSceneResumeState(fallbackDetailsMode);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SceneResumeState>;
  const overlay = typeof r.overlay === 'string' && VALID_OVERLAYS.includes(r.overlay as SceneOverlayKind)
    ? (r.overlay as SceneOverlayKind)
    : 'none';
  const selectedModule = typeof r.selectedModule === 'string' && VALID_MODULES.includes(r.selectedModule as ModuleId)
    ? (r.selectedModule as ModuleId)
    : null;
  const introStep = typeof r.introStep === 'number' && Number.isInteger(r.introStep) && r.introStep >= 0 && r.introStep <= 5
    ? r.introStep
    : null;
  const reactionCycle = typeof r.reactionCycle === 'number' && Number.isInteger(r.reactionCycle) && r.reactionCycle >= 1 && r.reactionCycle <= 5
    ? r.reactionCycle
    : null;
  const stagedEvent = typeof r.stagedEvent === 'string' && VALID_EVENTS.includes(r.stagedEvent as EventChoice) && r.stagedEvent !== 'none'
    ? (r.stagedEvent as EventChoice)
    : null;
  const detailsMode = typeof r.detailsMode === 'boolean' ? r.detailsMode : fallbackDetailsMode;
  return { overlay, selectedModule, introStep, reactionCycle, stagedEvent, detailsMode };
}

export function generateAttemptId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return `attempt-${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    /* fallback below */
  }
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function validateAndMigrateState(rawState: unknown, version: number): State {
  if (!rawState || typeof rawState !== 'object') {
    throw new Error('The saved mission could not be read. Start a new mission to continue.');
  }
  const s = structuredClone(rawState) as State;
  if (version === 1) {
    s.maxCycles = 5;
    s.quizCompleted = Boolean(s.quizCompleted);
    s.correctQuizAnswers = Number.isInteger(s.correctQuizAnswers) ? s.correctQuizAnswers : 0;
    if (Array.isArray(s.history)) {
      s.history = s.history.map((r) => ({
        ...r,
        delta: Object.fromEntries(resourceKeys.map((k) => [k, r.after[k] - r.before[k]])) as State['resources'],
      }));
    }
    if (s.status === 'failed' && Number.isInteger(s.completedCycles)) s.cycle = s.completedCycles;
  }
  const valid =
    Boolean(s.resources) &&
    resourceKeys.every((k) => Number.isFinite(s.resources[k]) && s.resources[k] >= 0 && s.resources[k] <= 100) &&
    Number.isInteger(s.cycle) &&
    s.cycle >= 1 &&
    s.cycle <= 5 &&
    Number.isInteger(s.completedCycles) &&
    s.completedCycles >= 0 &&
    s.completedCycles <= 5 &&
    Array.isArray(s.history) &&
    s.history.length === s.completedCycles &&
    ['active', 'success', 'failed'].includes(s.status) &&
    s.maxCycles === 5 &&
    typeof s.quizCompleted === 'boolean' &&
    Number.isInteger(s.correctQuizAnswers) &&
    s.correctQuizAnswers >= 0 &&
    s.correctQuizAnswers <= 5 &&
    Number.isFinite(s.science) &&
    s.science >= 0 &&
    (['shieldingLevel', 'shieldingKits', 'backupCharges'] as const).every(
      (k) => Number.isInteger(s[k]) && s[k] >= 0,
    );
  if (!valid) {
    throw new Error('The saved mission could not be read. Start a new mission to continue.');
  }
  return s;
}

function validateDraft(rawDraft: unknown, cycle: number): Decision {
  if (!rawDraft) return defaultDecision(cycle);
  if (typeof rawDraft !== 'object') throw new Error('Saved system settings are invalid.');
  const d = rawDraft as Partial<Decision>;
  if (
    !d.mode ||
    !['eco', 'standard', 'boost'].includes(d.mode) ||
    !['greenhouse', 'recycler', 'communications'].every((k) => typeof d[k as keyof Decision] === 'boolean') ||
    !d.event ||
    !VALID_EVENTS.includes(d.event)
  ) {
    throw new Error('Saved system settings are invalid.');
  }
  return {
    mode: d.mode,
    greenhouse: Boolean(d.greenhouse),
    recycler: Boolean(d.recycler),
    communications: Boolean(d.communications),
    event: d.event,
  };
}

function findLegacyActiveKeys(): string[] {
  const keys = new Set<string>(LEGACY_ACTIVE_CANDIDATES);
  try {
    const len = typeof localStorage.length === 'number' ? localStorage.length : 0;
    for (let i = 0; i < len; i++) {
      const k = localStorage.key?.(i);
      if (k && k.startsWith(LEGACY_ACTIVE_PREFIX)) keys.add(k);
    }
  } catch {
    /* ignore key enumeration failure */
  }
  return [...keys];
}

function parseEnvelopePayload(raw: string): SaveEnvelope {
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (!value || typeof value !== 'object') {
    throw new Error('This saved mission is not compatible. Start a new mission.');
  }
  // Support wrapped v1/v2/v3 envelopes as well as raw Phase 1 State objects when migrating legacy keys
  const isRawLegacyState = !('version' in value) && !('schemaVersion' in value) && 'resources' in value && 'cycle' in value;
  const ver = isRawLegacyState
    ? 1
    : typeof value.version === 'number'
      ? value.version
      : typeof value.schemaVersion === 'number'
        ? value.schemaVersion
        : 0;
  if (![1, 2, 3].includes(ver) || (!isRawLegacyState && !value.state)) {
    throw new Error('This saved mission is not compatible. Start a new mission.');
  }
  const state = validateAndMigrateState(isRawLegacyState ? value : value.state, ver);
  const draft = validateDraft(value.draft, state.cycle);
  const attemptId =
    typeof value.attemptId === 'string' && value.attemptId.trim().length > 0
      ? value.attemptId.trim()
      : generateAttemptId();
  const scenarioId =
    typeof value.scenarioId === 'string' && value.scenarioId.trim().length > 0
      ? value.scenarioId.trim()
      : SCENARIO_ID;
  const updatedAt =
    typeof value.updatedAt === 'string' && value.updatedAt.trim().length > 0
      ? value.updatedAt
      : new Date().toISOString();
  const ui = normalizeSceneResumeState(value.ui);
  return {
    version: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    scenarioId,
    attemptId,
    updatedAt,
    state,
    draft,
    ui,
  };
}

export function loadSaveEnvelope(): SaveEnvelope | null {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    return parseEnvelopePayload(raw);
  }
  for (const legacyKey of findLegacyActiveKeys()) {
    let legacyRaw: string | null = null;
    try {
      legacyRaw = localStorage.getItem(legacyKey);
    } catch {
      continue;
    }
    if (!legacyRaw) continue;
    const migrated = parseEnvelopePayload(legacyRaw);
    try {
      localStorage.setItem(KEY, JSON.stringify(migrated));
    } catch {
      /* read-only or quota full — still return migrated in memory without erasing legacy save */
    }
    return migrated;
  }
  return null;
}

export function loadGame(): State | null {
  const env = loadSaveEnvelope();
  return env ? env.state : null;
}

export function loadDraft(state: State): Decision {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const value = JSON.parse(raw) as { draft?: unknown } | null;
    return validateDraft(value?.draft, state.cycle);
  }
  const env = loadSaveEnvelope();
  return env ? env.draft : defaultDecision(state.cycle);
}

export function saveEnvelope(envelope: Omit<SaveEnvelope, 'version' | 'schemaVersion' | 'updatedAt'> & { updatedAt?: string }): void {
  const payload: SaveEnvelope = {
    version: SCHEMA_VERSION,
    schemaVersion: SCHEMA_VERSION,
    scenarioId: envelope.scenarioId || SCENARIO_ID,
    attemptId: envelope.attemptId || generateAttemptId(),
    updatedAt: envelope.updatedAt ?? new Date().toISOString(),
    state: envelope.state,
    draft: envelope.draft,
    ui: normalizeSceneResumeState(envelope.ui),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function saveGame(state: State, draft = defaultDecision(state.cycle)): void {
  let existingAttemptId: string | undefined;
  let existingUi: SceneResumeState | undefined;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;
      if (typeof parsed.attemptId === 'string' && parsed.attemptId.trim()) {
        existingAttemptId = parsed.attemptId;
      }
      if (parsed.ui) {
        existingUi = normalizeSceneResumeState(parsed.ui);
      }
    }
  } catch {
    /* ignore unreadable existing envelope when saving fresh state */
  }
  saveEnvelope({
    scenarioId: SCENARIO_ID,
    attemptId: existingAttemptId ?? generateAttemptId(),
    state,
    draft,
    ui: existingUi ?? defaultSceneResumeState(),
  });
}

export function clearGame(): void {
  localStorage.removeItem(KEY);
}

export function clearCorruptedSaves(): void {
  localStorage.removeItem(KEY);
  for (const legacyKey of findLegacyActiveKeys()) {
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      /* ignore individual removal errors */
    }
  }
}


