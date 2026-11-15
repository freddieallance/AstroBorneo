import assert from 'node:assert/strict';
import { calculateCycle, defaultDecision, initialState, preview, runCycle, type Decision, type State } from './engine';
import { clearGame, loadDraft, loadGame, saveGame } from './persistence';
import { scoreSummary } from './scoring';
import { getViewModel } from './view-model';

const rows: { test: string; expected: string; actual: string; status: string }[] = [];
const plan = (cycle: number, event: Decision['event'], mode: Decision['mode'] = 'standard'): Decision => ({ ...defaultDecision(cycle), event, mode });
function check(label: string, s: State, expected: number[]) {
  const actual = [s.resources.power, s.resources.air, s.resources.water, s.resources.food, s.resources.safety];
  assert.deepEqual(actual, expected);
  rows.push({ test: label, expected: expected.join('/'), actual: actual.join('/'), status: 'PASS' });
}
let s = initialState();
assert.equal(defaultDecision(1).communications, false);
const before = JSON.stringify(s);
const d1 = plan(1, 'none');
assert.deepEqual(calculateCycle(s, d1, d1.event), preview(s, d1));
const forecast = preview(s, d1);
s = runCycle(s, d1);
assert.deepEqual(s, forecast.next);
assert.equal(JSON.stringify(initialState()), before);
check('1 Initial', s, [66, 54, 57, 40, 90]);
s = runCycle(s, plan(2, 'save', 'eco'));
check('2 Eco', s, [53, 50, 56, 44, 90]);
s = runCycle(s, plan(3, 'skip'));
check('3 Recycler fault', s, [49, 52, 47, 48, 90]);
const after3 = structuredClone(s);
s = runCycle(s, plan(4, 'shield'));
check('4 Shielding', s, [33, 54, 46, 52, 85]);
assert.equal(s.shieldingLevel, 2); assert.equal(s.shieldingKits, 0);
s = runCycle(s, plan(5, 'continue', 'eco'));
check('5 Greenhouse fault', s, [32, 50, 45, 44, 85]);
assert.equal(s.status, 'success'); assert.equal(s.completedCycles, 5);
assert.throws(() => runCycle(s, plan(5, 'skip')));
const low = { ...after3, resources: { ...after3.resources, power: 1 } };
const saved = JSON.stringify(low);
const blocked = preview(low, plan(4, 'shelter'));
assert.equal(blocked.powerDeficit, 15); assert.equal(blocked.valid, false);
assert.equal(blocked.next, low);
assert.throws(() => runCycle(low, plan(4, 'shelter')), /15 more/);
assert.equal(JSON.stringify(low), saved);
rows.push({ test: '6 Insufficient Power', expected: 'blocked; deficit 15; unchanged', actual: 'blocked; deficit 15; unchanged', status: 'PASS' });
const shelter = runCycle(after3, plan(4, 'shelter'));
check('7 Shelter', shelter, [33, 54, 46, 52, 88]);
assert.equal(shelter.science, 0); assert.equal(shelter.shieldingLevel, 1); assert.equal(shelter.shieldingKits, 1);
const comms = runCycle(initialState(), { ...d1, communications: true });
check('8 Communications', comms, [62, 54, 57, 40, 90]);
assert.equal(comms.science, 5);
// Boundaries and invariants.
const equal = { ...after3, resources: { ...after3.resources, power: 16 } };
const zero = preview(equal, plan(4, 'shelter'));
assert.equal(zero.valid, true); assert.equal(zero.next.resources.power, 0);
assert.equal(zero.next.status, 'failed'); assert.equal(zero.next.cycle, 4);
assert.ok(zero.warnings.length);
assert.equal(preview(after3, defaultDecision(4)).valid, false);
assert.equal(preview(after3, { ...plan(4, 'shelter'), recycler: 'yes' } as unknown as Decision).valid, false);
assert.equal(preview({ ...after3, shieldingKits: 0 }, plan(4, 'shield')).valid, false);
assert.equal(preview({ ...after3, shieldingKits: 0.5 }, plan(4, 'shield')).valid, false);
assert.throws(() => runCycle(after3, plan(4, 'shelter'), 3), /already been committed/);
const cap = runCycle({ ...initialState(), resources: { power: 100, air: 100, water: 100, food: 100, safety: 100 } }, { ...d1, mode: 'boost' });
assert.equal(cap.resources.air, 100); assert.equal(cap.resources.food, 100);
const c3 = runCycle(runCycle(initialState(), d1), plan(2, 'save'));
assert.equal(preview(c3, { ...plan(3, 'repair'), recycler: false }).next.resources.water, c3.resources.water - 13);
const c5 = runCycle(after3, plan(4, 'shelter'));
assert.deepEqual(preview(c5, plan(5, 'skip')).next.resources, preview(c5, plan(5, 'continue')).next.resources);
assert.equal(preview(c5, plan(5, 'off')).powerCost, 18);
assert.equal(preview(c5, plan(5, 'repair')).next.resources.food, c5.resources.food + 4);
const b2 = runCycle(initialState(), d1);
const battery = runCycle(b2, plan(2, 'battery'));
assert.equal(battery.backupCharges, 0);
assert.equal(battery.resources.power, b2.resources.power + 8 + 20 - 26);
assert.throws(() => runCycle(battery, plan(2, 'battery'), 2));
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
} });
saveGame(after3, plan(4, 'shelter', 'eco'));
assert.deepEqual(loadGame(), after3);
assert.deepEqual(loadDraft(after3), plan(4, 'shelter', 'eco'));
clearGame(); assert.equal(loadGame(), null);
const immutable = initialState();
const original = structuredClone(immutable);
preview(immutable, d1); runCycle(immutable, d1);
assert.deepEqual(immutable, original);
console.table(rows);
const provisional = scoreSummary(s, false, 4);
assert.equal(provisional.maximum, 90);
assert.equal(provisional.label, 'Provisional Mission Score');
assert.equal(provisional.value, scoreSummary(s, false, 0).value);
assert.equal(scoreSummary(s, true, 5).value, provisional.value + 10);
assert.equal(scoreSummary(s, true, 5).maximum, 100);
assert.equal(scoreSummary(s, true, 5).label, 'Final Mission and Learning Score');
const off = preview(c5, plan(5, 'off'));
const offToggle = preview(c5, { ...plan(5, 'off'), greenhouse: false });
assert.deepEqual(off.next, offToggle.next);
assert.equal(off.review.decision.greenhouse, false);
assert.equal(off.next.history.at(-1)?.decision.greenhouse, false);
assert.equal(off.review.delta.water, 4);
assert.equal(off.review.delta.food, -8);
assert.equal(off.powerCost, 18);
const shelterComms = preview(after3, { ...plan(4, 'shelter'), communications: true });
assert.equal(shelterComms.next.science, 5);
assert.equal(preview({ ...after3, science: 3 }, { ...plan(4, 'shelter'), communications: true }).next.science, 5);
assert.equal(preview({ ...after3, science: 7 }, { ...plan(4, 'shelter'), communications: true }).next.science, 7);
assert.equal(shelterComms.powerCost, 34);
assert.equal(shelterComms.next.resources.safety, 88);

// Visual ViewModel adapter, changed-settings preview, popup cancel, double-tap guard, v1/v2 storage restore.
const vmBase = initialState();
const vmBaseSnapshot = structuredClone(vmBase);
const vmDefault = getViewModel(vmBase, { mode: 'standard', greenhouse: true, recycler: true, communications: false }, 'none');
assert.equal(vmDefault.canRunCycle, true);
assert.equal(vmDefault.outcomeLabel, 'Mission Active');
assert.equal(vmDefault.resources.power.current, 68);
assert.equal(vmDefault.resources.power.forecast, 66);
assert.equal(vmDefault.resources.power.delta, -2);
assert.equal(vmDefault.resources.air.forecast, 54);
assert.equal(vmDefault.resources.water.forecast, 57);
assert.equal(vmDefault.resources.food.forecast, 40);
assert.equal(vmDefault.resources.safety.forecast, 90);

// Changed settings preview + popup-close-before-confirm must not mutate canonical gameState.
const vmChanged = getViewModel(vmBase, { mode: 'boost', greenhouse: true, recycler: true, communications: true }, 'none');
assert.equal(vmChanged.canRunCycle, true);
assert.equal(vmChanged.inventory.forecastScience, 5);
assert.equal(vmChanged.inventory.scienceDelta, 5);
assert.equal(vmChanged.resources.power.forecast, 56);
assert.equal(vmChanged.resources.air.forecast, 60);
assert.deepEqual(vmBase, vmBaseSnapshot);

// Cycle 5 event 'off' locks effective greenhouse OFF in ViewModel while keeping state untouched.
const vmCycle5Off = getViewModel(c5, { mode: 'standard', greenhouse: true, recycler: true, communications: false }, 'off');
assert.equal(vmCycle5Off.systems.greenhouse.lockedOff, true);
assert.equal(vmCycle5Off.systems.greenhouse.effective, false);
assert.equal(vmCycle5Off.forecast.effectiveGreenhouse, false);
assert.equal(vmCycle5Off.forecast.powerCost, 18);

// Invalid Power rejection in ViewModel disables Run Cycle and hides misleading forecast numbers.
const vmLowPower = getViewModel(low, { mode: 'standard', greenhouse: true, recycler: true, communications: false }, 'shelter');
assert.equal(vmLowPower.canRunCycle, false);
assert.equal(vmLowPower.forecast.valid, false);
assert.equal(vmLowPower.forecast.powerDeficit, 15);
assert.equal(vmLowPower.forecast.after, null);
assert.equal(vmLowPower.resources.power.forecast, null);
assert.equal(vmLowPower.event.options.find((o) => o.value === 'shelter')?.affordable, false);

// Double-click / synchronous re-entry guard simulation matching GameProvider.commit().
let currentMission = initialState();
let commitLock = false;
const safeCommit = (expectedCycle: number, decision: Decision) => {
  if (commitLock) return { ok: false as const, error: 'Already running' };
  commitLock = true;
  try {
    currentMission = runCycle(currentMission, decision, expectedCycle);
    return { ok: true as const };
  } finally {
    commitLock = false;
  }
};
assert.equal(safeCommit(1, d1).ok, true);
assert.throws(() => runCycle(currentMission, d1, 1), /already been committed/);
assert.equal(currentMission.cycle, 2);
assert.equal(currentMission.completedCycles, 1);

// Outcome labels on Mission Success vs Mission Needs Revision.
assert.equal(getViewModel(s, { mode: 'eco', greenhouse: true, recycler: true, communications: false }, 'continue').outcomeLabel, 'Mission Success');
assert.equal(getViewModel(zero.next, { mode: 'standard', greenhouse: true, recycler: true, communications: false }, 'shelter').outcomeLabel, 'Mission Needs Revision');

// Legacy v1 storage migration & invalid storage error handling.
const legacyV1History = c3.history.map(({ delta: _drop, ...rest }) => rest);
const legacyV1State = {
  resources: c3.resources,
  cycle: c3.cycle,
  completedCycles: c3.completedCycles,
  shieldingLevel: c3.shieldingLevel,
  shieldingKits: c3.shieldingKits,
  backupCharges: c3.backupCharges,
  science: c3.science,
  history: legacyV1History,
  status: c3.status,
};
storage.set('lunalab-mission-v1', JSON.stringify({ version: 1, state: legacyV1State }));
const restoredV1 = loadGame();
assert.ok(restoredV1);
assert.equal(restoredV1.maxCycles, 5);
assert.equal(restoredV1.quizCompleted, false);
assert.deepEqual(restoredV1.history[0].delta, c3.history[0].delta);
storage.set('lunalab-mission-v1', JSON.stringify({ version: 2, state: { ...c3, resources: { ...c3.resources, power: 150 } } }));
assert.throws(() => loadGame(), /could not be read/);
clearGame();

// Cycle 3 & Cycle 5 nonsensical repair guards in ViewModel when equipment is OFF.
const vmC3OffRepair = getViewModel(c3, { mode: 'standard', greenhouse: true, recycler: false, communications: false }, 'repair');
assert.equal(vmC3OffRepair.canRunCycle, false);
assert.equal(vmC3OffRepair.event.options.find((o) => o.value === 'repair')?.valid, false);
assert.equal(vmC3OffRepair.event.options.find((o) => o.value === 'skip')?.valid, true);

const vmC5OffRepair = getViewModel(c5, { mode: 'standard', greenhouse: false, recycler: true, communications: false }, 'repair');
assert.equal(vmC5OffRepair.canRunCycle, false);
assert.equal(vmC5OffRepair.event.options.find((o) => o.value === 'repair')?.valid, false);
assert.equal(vmC5OffRepair.event.options.find((o) => o.value === 'off')?.valid, true);

console.log('PASS: provisional/final scoring, unanswered-quiz exclusion, effective greenhouse state and costs, existing-science shelter deduction.');
console.log('PASS: boundary validation, deterministic forecast/commit parity, immutable inputs, inventory, duplicate-cycle guards, clamping, repairs, and versioned state/settings persistence.');
console.log('PASS: getViewModel adapter, changed-settings preview, popup-close non-mutation, invalid-power flags, C3/C5 off-equipment repair guards, double-tap prevention, outcome labels, and v1/v2 storage restore.');
