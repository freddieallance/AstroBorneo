import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDecision, initialState, runCycle, score } from './engine';
import {
  SCHEMA_VERSION,
  SCENARIO_ID,
  clearCorruptedSaves,
  clearGame,
  defaultSceneResumeState,
  loadDraft,
  loadGame,
  loadSaveEnvelope,
  normalizeSceneResumeState,
  saveEnvelope,
  saveGame,
} from './persistence';
import {
  addMission,
  clearMissions,
  loadMissions,
  loadQuiz,
  saveQuiz,
  setQuizCurrentIndex,
  submitQuizAnswerOnce,
  emptyQuiz,
} from '../lib/records';
import {
  loadDetailsModePref,
  loadReducedMotionPref,
  loadSoundPref,
} from '../lib/speech';
import {
  defaultSavedSpaceWeatherContext,
  loadSavedSpaceWeatherContext,
  saveSpaceWeatherContext,
} from '../services/space-weather-client';

function installMockStorage(options?: { throwOnSet?: Error; throwOnGet?: Error }) {
  const store = new Map<string, string>();
  const mock = {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(k: string) {
      if (options?.throwOnGet) throw options.throwOnGet;
      return store.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      if (options?.throwOnSet) throw options.throwOnSet;
      store.set(k, v);
    },
    removeItem(k: string) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = mock as unknown as Storage;
  return { store, mock };
}

test('SaveEnvelope stores stable attemptId, scenarioId, schemaVersion, stagedEvent, and scene UI state', () => {
  installMockStorage();
  let s = initialState();
  s = runCycle(s, defaultDecision(1), 1);
  s = runCycle(s, { ...defaultDecision(2), event: 'battery' }, 2);

  const attemptId = 'attempt-cycle3-test';
  saveEnvelope({
    scenarioId: SCENARIO_ID,
    attemptId,
    state: s,
    draft: { ...defaultDecision(3), mode: 'eco', event: 'none' },
    ui: {
      overlay: 'decision',
      selectedModule: null,
      introStep: null,
      reactionCycle: null,
      stagedEvent: 'repair',
      detailsMode: true,
    },
  });

  const env = loadSaveEnvelope();
  assert.ok(env);
  assert.equal(env.schemaVersion, SCHEMA_VERSION);
  assert.equal(env.scenarioId, SCENARIO_ID);
  assert.equal(env.attemptId, attemptId);
  assert.equal(env.state.cycle, 3);
  assert.equal(env.draft.mode, 'eco');
  assert.equal(env.draft.event, 'none');
  assert.equal(env.ui.overlay, 'decision');
  assert.equal(env.ui.stagedEvent, 'repair');
  assert.equal(env.ui.detailsMode, true);

  // Saving updated draft via saveGame preserves attemptId and scene UI
  saveGame(s, { ...defaultDecision(3), mode: 'boost', event: 'none' });
  const envAfter = loadSaveEnvelope();
  assert.ok(envAfter);
  assert.equal(envAfter.attemptId, attemptId);
  assert.equal(envAfter.ui.stagedEvent, 'repair');
  assert.equal(envAfter.draft.mode, 'boost');
});

test('Backward-compatible migration preserves valid Phase 1 saves from lunalab.activeMission.* without erasing them', () => {
  const { store } = installMockStorage();
  const s1 = runCycle(initialState(), defaultDecision(1), 1);

  // Legacy raw Phase 1 State stored under lunalab.activeMission.v1
  const legacyRawState = {
    cycle: 2,
    maxCycles: 5,
    completedCycles: 1,
    status: 'active',
    resources: s1.resources,
    science: s1.science,
    shieldingLevel: s1.shieldingLevel,
    shieldingKits: s1.shieldingKits,
    backupCharges: s1.backupCharges,
    history: s1.history.map((r) => ({
      cycle: r.cycle,
      decision: r.decision,
      before: r.before,
      after: r.after,
      scienceBefore: r.scienceBefore,
      scienceAfter: r.scienceAfter,
      lesson: r.lesson,
      explanations: r.explanations,
    })),
  };
  store.set('lunalab.activeMission.v1', JSON.stringify(legacyRawState));

  const env = loadSaveEnvelope();
  assert.ok(env);
  assert.equal(env.state.cycle, 2);
  assert.equal(env.state.completedCycles, 1);
  assert.equal(env.state.maxCycles, 5);
  assert.equal(env.state.quizCompleted, false);
  assert.equal(env.state.correctQuizAnswers, 0);
  assert.deepEqual(env.state.history[0].delta, s1.history[0].delta);
  // Original legacy key was not erased during migration
  assert.ok(store.has('lunalab.activeMission.v1'));
  // Canonical key now populated
  assert.ok(store.has('lunalab-mission-v1'));
  assert.deepEqual(loadGame()?.resources, s1.resources);
  assert.equal(loadDraft(env.state).mode, 'standard');
});

test('Migrates legacy lunalab.missionHistory.* and lunalab.preferences.v1 keys cleanly', () => {
  const { store } = installMockStorage();
  store.set(
    'lunalab.missionHistory.v1',
    JSON.stringify([
      {
        id: 'legacy-1',
        date: '2026-01-01T00:00:00.000Z',
        outcome: 'success',
        completedCycles: 5,
        science: 42,
        score: 78,
        decisions: ['C1: standard mode'],
      },
    ]),
  );
  store.set(
    'lunalab.preferences.v1',
    JSON.stringify({ readAloud: true, reducedMotion: true, detailsMode: true }),
  );

  const history = loadMissions();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, 'legacy-1');
  assert.equal(loadSoundPref(), true);
  assert.equal(loadReducedMotionPref(), true);
  assert.equal(loadDetailsModePref(), true);

  clearMissions();
  assert.equal(loadMissions().length, 0);
  assert.equal(store.has('lunalab.missionHistory.v1'), false);
});

test('addMission deduplicates by stable attemptId so completion never logs duplicate records', () => {
  installMockStorage();
  let s = initialState();
  s = runCycle(s, defaultDecision(1), 1);
  s = runCycle(s, { ...defaultDecision(2), event: 'battery' }, 2);
  s = runCycle(s, { ...defaultDecision(3), event: 'repair' }, 3);
  s = runCycle(s, { ...defaultDecision(4), event: 'shield' }, 4);
  s = runCycle(s, { ...defaultDecision(5), event: 'repair' }, 5);

  const baseRecord = {
    id: 'attempt-unique-1',
    attemptId: 'attempt-unique-1',
    date: new Date().toISOString(),
    outcome: s.status === 'success' ? ('success' as const) : ('failed' as const),
    completedCycles: s.completedCycles,
    science: s.science,
    score: score(s, 0),
    decisions: s.history.map((h) => `C${h.cycle}: ${h.decision.event}`),
  };

  addMission(baseRecord);
  addMission({ ...baseRecord, score: baseRecord.score + 5 });

  const all = loadMissions();
  assert.equal(all.length, 1);
  assert.equal(all[0].attemptId, 'attempt-unique-1');
  assert.equal(all[0].score, baseRecord.score + 5);
});

test('Corrupted/malformed saves throw explicit errors and clearCorruptedSaves resets cleanly', () => {
  const { store } = installMockStorage();
  store.set('lunalab-mission-v1', '{not valid json');
  assert.throws(() => loadSaveEnvelope());

  clearCorruptedSaves();
  assert.equal(loadSaveEnvelope(), null);

  // Out-of-range resource rejected
  const s = initialState();
  store.set(
    'lunalab-mission-v1',
    JSON.stringify({
      version: 2,
      state: { ...s, resources: { ...s.resources, power: 150 } },
      draft: defaultDecision(1),
    }),
  );
  assert.throws(() => loadSaveEnvelope());
  clearGame();
  assert.equal(loadSaveEnvelope(), null);
});

test('Quiz resume preserves currentIndex (e.g. Q3) and submitted answers across reload', () => {
  installMockStorage();
  let q = emptyQuiz();
  q = submitQuizAnswerOnce(q, 0, 1).next;
  q = submitQuizAnswerOnce(q, 1, 2).next;
  q = setQuizCurrentIndex(q, 2);
  saveQuiz(q);

  const restored = loadQuiz();
  assert.equal(restored.answers[0], 1);
  assert.equal(restored.answers[1], 2);
  assert.equal(restored.answers[2], null);
  assert.equal(restored.currentIndex, 2);
  assert.equal(restored.completed, false);
});

test('SceneResumeState normalization rejects invalid overlay/module/event values cleanly', () => {
  const normalized = normalizeSceneResumeState({
    overlay: 'invalid-overlay',
    selectedModule: 'nonexistent',
    introStep: 99,
    reactionCycle: 0,
    stagedEvent: 'none',
    detailsMode: 'yes',
  });
  assert.deepEqual(normalized, defaultSceneResumeState(false));
});

test('SpaceWeather persistence restores simulated mode cleanly and marks cached LIVE_DATA stale offline', () => {
  installMockStorage();
  saveSpaceWeatherContext({
    eventType: 'FLR',
    startDate: '2024-05-10',
    endDate: '2024-05-10',
    requestMode: 'auto',
    lastMode: 'LIVE_DATA',
    lastStatus: 'CONNECTED',
    cached: false,
    stale: false,
    record: {
      provider: 'NASA_CCMC',
      id: '2024-05-10T06:54:00-FLR-001',
      eventType: 'FLR',
      observationTimeUTC: '2024-05-10T06:54:00Z',
      originalTime: '2024-05-10T06:54Z',
      sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/30857/-1',
      sourceName: 'NASA DONKI',
      fetchedAtUTC: '2026-01-01T00:00:00Z',
      summary: 'X3.9 flare.',
    },
  });

  const restoredLive = loadSavedSpaceWeatherContext();
  assert.equal(restoredLive.lastMode, 'ARCHIVED_DATA');
  assert.equal(restoredLive.lastStatus, 'CACHED_OFFLINE');
  assert.equal(restoredLive.cached, true);
  assert.equal(restoredLive.stale, true);
  assert.equal(restoredLive.record?.id, '2024-05-10T06:54:00-FLR-001');

  saveSpaceWeatherContext({
    ...defaultSavedSpaceWeatherContext(),
    requestMode: 'simulated',
    lastMode: 'SIMULATED_SCENARIO',
    lastStatus: 'OFFLINE',
  });
  const restoredSim = loadSavedSpaceWeatherContext();
  assert.equal(restoredSim.requestMode, 'simulated');
  assert.equal(restoredSim.lastMode, 'SIMULATED_SCENARIO');
  assert.equal(restoredSim.record, null);
});

test('Blocked or full localStorage degrades gracefully on reads and raises explicit errors on mission writes', () => {
  const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
  installMockStorage({ throwOnSet: err });
  assert.doesNotThrow(() => loadQuiz());
  assert.doesNotThrow(() => loadMissions());
  assert.doesNotThrow(() => loadSoundPref());
  assert.doesNotThrow(() => loadReducedMotionPref());
  assert.doesNotThrow(() => loadDetailsModePref());
  assert.doesNotThrow(() => loadSavedSpaceWeatherContext());
  assert.doesNotThrow(() => saveSpaceWeatherContext(defaultSavedSpaceWeatherContext()));
  assert.throws(() => saveGame(initialState()));
  assert.throws(() => saveQuiz(emptyQuiz()));
});
