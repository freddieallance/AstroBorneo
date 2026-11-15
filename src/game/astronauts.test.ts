import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTRONAUTS, getAstronaut, isAstronautId, pickIndoorCrewmates, pickNpcPartner } from './astronauts';

test('provides exactly 4 distinct selectable astronauts with unique perks', () => {
  assert.equal(ASTRONAUTS.length, 4);
  const ids = new Set(ASTRONAUTS.map((a) => a.id));
  assert.equal(ids.size, 4);
  for (const astro of ASTRONAUTS) {
    assert.ok(astro.name.length > 0);
    assert.ok(astro.perkHint.length > 0);
    assert.ok(astro.moveSpeedMult >= 1);
    assert.ok(astro.repairBonusMult >= 1);
  }
});

test('pickNpcPartner always selects a different crewmate from player', () => {
  for (const astro of ASTRONAUTS) {
    const npc = pickNpcPartner(astro.id);
    assert.notEqual(npc.id, astro.id);
    assert.ok(isAstronautId(npc.id));
  }
});

test('pickIndoorCrewmates returns the exact 2 remaining crewmates not playing or NPC', () => {
  for (const astro of ASTRONAUTS) {
    const npc = pickNpcPartner(astro.id);
    const [indoorA, indoorB] = pickIndoorCrewmates(astro.id, npc.id);
    const allIds = new Set([astro.id, npc.id, indoorA.id, indoorB.id]);
    assert.equal(allIds.size, 4);
  }
});

test('getAstronaut falls back safely for unknown id', () => {
  const fallback = getAstronaut(null);
  assert.equal(fallback.id, 'zara');
});
