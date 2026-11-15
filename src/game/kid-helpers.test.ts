import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCycle, defaultDecision, initialState, runCycle } from './engine';
import { findPowerFixSuggestion } from './kid-helpers';

test('findPowerFixSuggestion returns null when power is sufficient', () => {
  const s = initialState();
  const d = defaultDecision(1);
  assert.equal(findPowerFixSuggestion(s, d, 'none'), null);
});

test('findPowerFixSuggestion resolves a Cycle 2 low-power deficit using real engine validation', () => {
  const s1 = runCycle(initialState(), { mode: 'boost', greenhouse: true, recycler: true, communications: true, event: 'none' }, 1);
  // Drain power artificially to simulate low-power state at Cycle 2
  const lowPower = { ...s1, resources: { ...s1.resources, power: 10 } };
  const heavyDraft = { mode: 'boost' as const, greenhouse: true, recycler: true, communications: true, event: 'save' as const };
  const before = calculateCycle(lowPower, heavyDraft, 'save');
  assert.ok(before.powerDeficit > 0);

  const fix = findPowerFixSuggestion(lowPower, heavyDraft, 'save');
  assert.ok(fix !== null);
  const fixedDraft = { ...heavyDraft, ...fix.patch };
  const after = calculateCycle(lowPower, fixedDraft, fix.patch.event ?? 'save');
  assert.equal(after.powerDeficit, 0);
  assert.equal(after.valid, true);
});
