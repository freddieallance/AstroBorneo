import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, runCycle, type Decision, type State } from '../game/engine';
import {
  CSA_TEACHER_LINKS,
  DATA_MODE_COMPARISON,
  DONKI_LIMITATIONS,
  explainCycleResourceCalculation,
  FIVE_STAGE_ACTIVITY,
  RESOURCE_FORMULAS,
  TEACHER_OUTCOMES,
  type TeacherResourceKey,
} from './teacher';

const RESOURCES_AND_SCIENCE: TeacherResourceKey[] = [
  'power',
  'air',
  'water',
  'food',
  'safety',
  'science',
];

function playDecisions(decisions: Decision[]): State {
  let state = initialState();
  for (let i = 0; i < decisions.length; i++) {
    state = runCycle(state, decisions[i], i + 1);
  }
  return state;
}

test('Teacher outcomes cover all 6 core curriculum concepts and 5 inquiry stages', () => {
  assert.equal(TEACHER_OUTCOMES.length, 6);
  assert.equal(FIVE_STAGE_ACTIVITY.length, 5);
  assert.deepEqual(
    FIVE_STAGE_ACTIVITY.map((s) => s.title),
    ['Observe Base', 'Predict a Change', 'Choose Action', 'Watch Actual Result', 'Explain Why'],
  );
  assert.ok(DATA_MODE_COMPARISON.length >= 4);
  assert.ok(DONKI_LIMITATIONS.length >= 3);
  for (const key of RESOURCES_AND_SCIENCE) {
    assert.ok(RESOURCE_FORMULAS[key].formulaSummary.length > 0);
  }
});

test('Official CSA STEM and Food Production Toolkit links match verified educational URLs', () => {
  const urls = CSA_TEACHER_LINKS.map((l) => l.url);
  assert.ok(
    urls.includes('https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp'),
  );
  assert.ok(
    urls.includes('https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/'),
  );
});

test('explainCycleResourceCalculation matches real engine outputs across all 5 cycles and branches', () => {
  const pathA = playDecisions([
    { mode: 'boost', greenhouse: true, recycler: true, communications: true, event: 'none' },
    { mode: 'eco', greenhouse: true, recycler: true, communications: false, event: 'battery' },
    { mode: 'standard', greenhouse: true, recycler: true, communications: true, event: 'repair' },
    { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'shelter' },
    { mode: 'standard', greenhouse: true, recycler: true, communications: true, event: 'repair' },
  ]);

  const pathB = playDecisions([
    { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'none' },
    { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'save' },
    { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'skip' },
    { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'shield' },
    { mode: 'standard', greenhouse: false, recycler: true, communications: false, event: 'off' },
  ]);

  for (const state of [pathA, pathB]) {
    const beforeSnapshot = JSON.stringify(state);
    assert.equal(state.history.length, 5);

    for (const review of state.history) {
      for (const k of RESOURCES_AND_SCIENCE) {
        const calc = explainCycleResourceCalculation(review, k);
        const expectedBefore = k === 'science' ? review.scienceBefore : review.before[k];
        const expectedAfter = k === 'science' ? review.scienceAfter : review.after[k];
        assert.equal(calc.before, expectedBefore);
        assert.equal(calc.after, expectedAfter);
        assert.equal(calc.delta, expectedAfter - expectedBefore);

        if (k === 'science') {
          assert.equal(Math.max(0, calc.unclampedAfter), calc.after);
        } else {
          assert.equal(Math.max(0, Math.min(100, calc.unclampedAfter)), calc.after);
        }
      }
    }

    assert.equal(JSON.stringify(state), beforeSnapshot, 'Teacher calculation explainer must never mutate state');
  }
});
