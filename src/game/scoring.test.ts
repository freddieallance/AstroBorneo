import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDecision, initialState, runCycle, type Decision } from './engine';
import {
  buildFailureTip,
  buildMissionSnapshots,
  deriveStarRating,
  getZeroResources,
  isMissionSurvivalMet,
  RESOURCE_TO_MODULE,
  score,
  scoreBreakdown,
  scoreSummary,
} from './scoring';

const plan = (cycle: number, event: Decision['event'], mode: Decision['mode'] = 'standard'): Decision => ({
  ...defaultDecision(cycle),
  event,
  mode,
});

function playReferenceSuccessPath() {
  let s = initialState();
  s = runCycle(s, plan(1, 'none', 'standard'));
  s = runCycle(s, plan(2, 'save', 'eco'));
  s = runCycle(s, plan(3, 'skip', 'standard'));
  s = runCycle(s, plan(4, 'shield', 'standard'));
  s = runCycle(s, plan(5, 'continue', 'eco'));
  return s;
}

test('exact reference test: 65.75 rounds to 66/100 with 5/5 quiz and science=0 succeeds', () => {
  const s = playReferenceSuccessPath();
  assert.equal(s.completedCycles, 5);
  assert.deepEqual(s.resources, { power: 32, air: 50, water: 45, food: 44, safety: 85 });
  assert.equal(s.science, 0);
  assert.equal(s.status, 'success');
  assert.equal(isMissionSurvivalMet(s), true);

  // Provisional score before quiz: /90 excludes quiz (55.75 -> 56/90)
  const provisional = scoreSummary(s, false, 3);
  assert.equal(provisional.maximum, 90);
  assert.equal(provisional.label, 'Provisional Mission Score');
  assert.equal(provisional.value, 56);

  // 0/5 completed quiz: 55.75 -> 56/100
  const zeroQuiz = scoreSummary(s, true, 0);
  assert.equal(zeroQuiz.maximum, 100);
  assert.equal(zeroQuiz.label, 'Final Mission and Learning Score');
  assert.equal(zeroQuiz.value, 56);

  // 5/5 completed quiz: 25+12.75+7.5+4.5+4.4+1.6+0+10 = 65.75 -> 66/100
  const fullQuiz = scoreSummary(s, true, 5);
  assert.equal(fullQuiz.maximum, 100);
  assert.equal(fullQuiz.label, 'Final Mission and Learning Score');
  assert.equal(fullQuiz.value, 66);
  assert.equal(score(s, 5), 66);

  const bd = scoreBreakdown(s, true, 5);
  assert.equal(bd.rawTotal, 65.75);
  assert.equal(bd.roundedTotal, 66);
  assert.equal(bd.starRating.stars, 3);
  assert.equal(bd.starRating.percent, 66);
});

test('early resource exhaustion ends mission cleanly and snapshots omit uncompleted cycles', () => {
  let s = initialState();
  // Drain power aggressively across cycles to trigger early exhaustion at Cycle 3
  s = runCycle(s, { mode: 'boost', greenhouse: true, recycler: true, communications: true, event: 'none' });
  s = runCycle(s, { mode: 'boost', greenhouse: true, recycler: true, communications: true, event: 'save' });
  // At cycle 3: solar +22, power was 68+24-36=56 then 56+8-36=28; cost boost+gh+rec+comms = 18+8+6+4 = 36 -> 28+22-36 = 14; let's force 0 on Cycle 4 or test zero directly
  s = runCycle(s, { mode: 'boost', greenhouse: true, recycler: true, communications: true, event: 'repair' });
  // After C3: 28 + 22 - 42 = 8 Power; C4 solar +14 -> 22 available; eco+gh+rec+shelter? No, let's drain to 0 at C4:
  // Need cost 22: standard(12)+gh(8)+comms(4)=24 > 22, so eco(7)+gh(8)+rec(6)=21, or eco(7)+rec(6)+comms(4)+shelter(4)=21...
  // Let's craft boost(18)+comms(4)=22 exact!
  s = runCycle(s, { mode: 'boost', greenhouse: false, recycler: false, communications: true, event: 'continue' });

  assert.equal(s.completedCycles, 4);
  assert.equal(s.status, 'failed');
  assert.equal(s.resources.power, 0);
  assert.equal(isMissionSurvivalMet(s), false);
  assert.deepEqual(getZeroResources(s.resources), ['power']);
  assert.equal(RESOURCE_TO_MODULE.power, 'solar');
  assert.match(buildFailureTip(s), /Power hit 0/);

  // Snapshots contain ONLY Start + C1..C4 (never Cycle 5!)
  const snaps = buildMissionSnapshots(s);
  assert.equal(snaps.length, 5);
  assert.deepEqual(snaps.map((r) => r.label), ['Start', 'C1', 'C2', 'C3', 'C4']);
  assert.equal(snaps[0].resources.power, 68);
  assert.equal(snaps[4].resources.power, 0);

  // Double finish attempt is rejected
  assert.throws(() => runCycle(s, plan(5, 'off')));
});

test('star rating thresholds derive deterministically from real score', () => {
  assert.equal(deriveStarRating(56, 90).stars, 2); // 62%
  assert.equal(deriveStarRating(66, 100).stars, 3); // 66%
  assert.equal(deriveStarRating(80, 100).stars, 4); // 80%
  assert.equal(deriveStarRating(92, 100).stars, 5); // 92%
  assert.equal(deriveStarRating(20, 90).stars, 1); // 22%
});
