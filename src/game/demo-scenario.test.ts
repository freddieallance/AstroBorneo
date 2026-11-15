import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDecision, initialState, runCycle, score } from './engine';
import {
  buildDemoOutcomeState,
  clearDemoSession,
  commitDemoCycleOnce,
  createDemoStartState,
  createInitialDemoSession,
  DEMO_SESSION_KEY,
  DEMO_STEPS,
  getDemoForecastVM,
  loadDemoSession,
  saveDemoSession,
} from './demo-scenario';

function installMockWebStorage() {
  const localMap = new Map<string, string>();
  const sessionMap = new Map<string, string>();
  const makeStore = (map: Map<string, string>) => ({
    get length() {
      return map.size;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(k: string) {
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
  });
  (globalThis as unknown as { localStorage: Storage }).localStorage = makeStore(localMap) as unknown as Storage;
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = makeStore(sessionMap) as unknown as Storage;
  return { localMap, sessionMap };
}

test('Judge Demo starts at valid Cycle 2 engine state produced from initialState + Cycle 1', () => {
  const expectedC2 = runCycle(initialState(), defaultDecision(1), 1);
  const demoStart = createDemoStartState();
  assert.deepEqual(demoStart, expectedC2);
  assert.equal(demoStart.cycle, 2);
  assert.equal(demoStart.completedCycles, 1);
  assert.equal(DEMO_STEPS.length, 7);
});

test('Trade-off Eco vs Boost uses real engine forecast: Boost reduces Power delta more while increasing Air delta more', () => {
  const session = createInitialDemoSession();
  const ecoVm = getDemoForecastVM(session.midState, { ...session.draft, mode: 'eco' });
  const boostVm = getDemoForecastVM(session.midState, { ...session.draft, mode: 'boost' });

  assert.ok(ecoVm.forecast.valid && ecoVm.forecast.delta);
  assert.ok(boostVm.forecast.valid && boostVm.forecast.delta);
  assert.ok(boostVm.forecast.powerCost > ecoVm.forecast.powerCost);
  assert.ok(boostVm.forecast.delta.power < ecoVm.forecast.delta.power);
  assert.ok(boostVm.forecast.delta.air > ecoVm.forecast.delta.air);
});

test('commitDemoCycleOnce executes Cycle 2 calculation once and prevents duplicate runs', () => {
  const base = createInitialDemoSession();
  const session = { ...base, draft: { ...base.draft, event: 'battery' as const } };
  const first = commitDemoCycleOnce(session);
  assert.equal(first.ranNow, true);
  assert.ok(first.review);
  assert.equal(first.next.committedState?.cycle, 3);
  assert.equal(first.next.committedState?.completedCycles, 2);
  assert.equal(first.next.committedState?.backupCharges, 0);

  // Calling again returns existing committed state without mutating or running Cycle 3
  const second = commitDemoCycleOnce(first.next);
  assert.equal(second.ranNow, false);
  assert.deepEqual(second.next.committedState, first.next.committedState);
});

test('buildDemoOutcomeState computes valid C1-C5 engine end state without fabricated numbers', () => {
  const session = createInitialDemoSession();
  const afterC2 = commitDemoCycleOnce({
    ...session,
    draft: { ...session.draft, mode: 'eco', event: 'save' },
  }).next.committedState!;
  const endState = buildDemoOutcomeState(afterC2, 1);
  assert.equal(endState.completedCycles, 5);
  assert.equal(endState.history.length, 5);
  assert.equal(endState.status, 'success');
  assert.ok(score(endState, 1) > 0 && score(endState, 1) <= 100);
});

test('Demo sessionStorage persistence survives refresh and never touches player localStorage', () => {
  const { localMap, sessionMap } = installMockWebStorage();
  localMap.set('lunalab-mission-v1', '{"sentinel":"player-save"}');
  localMap.set('lunalab.missions.v1', '[{"id":"player-history"}]');
  localMap.set('lunalab.quiz.v1', '{"answers":[0,null,null,null,null],"completed":false}');

  const s = createInitialDemoSession();
  const updated = { ...s, stepIndex: 2, draft: { ...s.draft, mode: 'boost' as const } };
  saveDemoSession(updated);
  assert.ok(sessionMap.has(DEMO_SESSION_KEY));

  const restored = loadDemoSession();
  assert.equal(restored.stepIndex, 2);
  assert.equal(restored.draft.mode, 'boost');

  clearDemoSession();
  assert.equal(sessionMap.has(DEMO_SESSION_KEY), false);

  // Player localStorage completely untouched
  assert.equal(localMap.get('lunalab-mission-v1'), '{"sentinel":"player-save"}');
  assert.equal(localMap.get('lunalab.missions.v1'), '[{"id":"player-history"}]');
  assert.equal(localMap.get('lunalab.quiz.v1'), '{"answers":[0,null,null,null,null],"completed":false}');
});
