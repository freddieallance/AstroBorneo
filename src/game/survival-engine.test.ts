import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStationAction,
  countOperationalStations,
  createSurvivalWorld,
  EVAC_ANIMATION_SEC,
  findNearestInteractableStation,
  setPlayerWalkTarget,
  STATIONS,
  stepSurvivalWorld,
  WALK_BOUNDS,
} from './survival-engine';

test('initializes world with 6 healthy stations, player astronaut, and NPC partner', () => {
  const state = createSurvivalWorld('maya');
  assert.equal(state.phase, 'playing');
  assert.equal(state.playerProfile.id, 'maya');
  assert.notEqual(state.npc.profile.id, 'maya');
  assert.equal(countOperationalStations(state), 6);
  assert.ok(state.dialog !== null);
});

test('player moves with keyboard input and stays within lunar walkable bounds', () => {
  let state = createSurvivalWorld('zara');
  const startX = state.player.x;
  for (let i = 0; i < 40; i++) {
    state = stepSurvivalWorld(state, 0.04, { dx: 1, dy: 0 }).state;
  }
  assert.ok(state.player.x > startX);

  for (let i = 0; i < 200; i++) {
    state = stepSurvivalWorld(state, 0.05, { dx: 1, dy: 1 }).state;
  }
  assert.ok(state.player.x <= WALK_BOUNDS.maxX);
  assert.ok(state.player.y <= WALK_BOUNDS.maxY);
});

test('click-to-walk to a station arrives and detects station interaction proximity', () => {
  let state = createSurvivalWorld('leo');
  state = setPlayerWalkTarget(state, STATIONS.solar.interactPos, 'solar');

  let arrivedId = null;
  for (let i = 0; i < 160; i++) {
    const res = stepSurvivalWorld(state, 0.04, { dx: 0, dy: 0 });
    state = res.state;
    if (res.arrivedStationId) {
      arrivedId = res.arrivedStationId;
      break;
    }
  }
  assert.equal(arrivedId, 'solar');
  const nearby = findNearestInteractableStation(state);
  assert.ok(nearby);
  assert.equal(nearby.station.id, 'solar');
  assert.equal(nearby.canOpen, true);
});

test('station choices apply repair and linked trade-off consequences', () => {
  let state = createSurvivalWorld('leo');
  state.stations.solar.health = 50;
  state.stations.shelter.health = 80;

  state = applyStationAction(state, 'solar', 'solar-turbo', 'good');
  assert.ok(state.stations.solar.health > 85);
  assert.equal(state.stations.shelter.health, 70);
  assert.equal(state.miniGamesWon, 1);
  assert.equal(state.choicesMade.length, 1);
});

test('NPC walks to damaged station, assists repair, and posts alert dialog', () => {
  let state = createSurvivalWorld('zara');
  state.stations.recycler.health = 35;
  state.npc.dialogCooldownSec = 0;

  const initialAssists = state.npcAssists;
  for (let i = 0; i < 220; i++) {
    state = stepSurvivalWorld(state, 0.04, { dx: 0, dy: 0 }).state;
  }
  assert.ok(state.npcAssists > initialAssists);
});

test('when all 6 stations fail, transitions to evacuating animation and then gameover with failure report', () => {
  let state = createSurvivalWorld('kai', { drainMultiplier: 18 });

  let safetyBreak = 0;
  while (state.phase === 'playing' && safetyBreak < 2000) {
    state = stepSurvivalWorld(state, 0.05, { dx: 0, dy: 0 }).state;
    safetyBreak++;
  }

  assert.equal(state.phase, 'evacuating');
  assert.equal(countOperationalStations(state), 0);
  assert.ok(state.failureReport !== null);
  assert.equal(state.failureReport.failureOrder.length, 6);

  // Run through evacuation rocket sequence
  let evacSteps = 0;
  while (state.phase === 'evacuating' && evacSteps < 300) {
    state = stepSurvivalWorld(state, 0.05, { dx: 0, dy: 0 }).state;
    evacSteps++;
  }
  assert.equal(state.phase, 'gameover');
  assert.ok(state.evacTimerSec >= EVAC_ANIMATION_SEC);
});

test('low resources drain crew health and trigger crew_unsafe Return-to-Earth evacuation', () => {
  let state = createSurvivalWorld('maya', { drainMultiplier: 1 });
  state.resources = { power: 0, air: 0, water: 15, food: 10, safety: 10 };
  state.crewHealth = 22;

  let safetyBreak = 0;
  while (state.phase === 'playing' && safetyBreak < 600) {
    state = stepSurvivalWorld(state, 0.05, { dx: 0, dy: 0 }).state;
    safetyBreak++;
  }

  assert.equal(state.phase, 'evacuating');
  assert.ok(state.failureReport !== null);
  assert.equal(state.failureReport.evacReason, 'crew_unsafe');
  assert.equal(state.failureReport.finalCrewHealth, 0);
  assert.ok(state.failureReport.causeHeadline.includes('Crew Health fell to 0%'));
  assert.ok(state.failureReport.causeDetail.toLowerCase().includes('unsafe'));
});

test('healthy resources restore crew health and repair actions replenish base resources', () => {
  let state = createSurvivalWorld('zara');
  state.crewHealth = 70;
  state.resources = { power: 55, air: 60, water: 52, food: 58, safety: 62 };

  for (let i = 0; i < 60; i++) {
    state = stepSurvivalWorld(state, 0.05, { dx: 0, dy: 0 }).state;
  }
  assert.ok(state.crewHealth > 70);

  const beforePower = state.resources.power;
  state = applyStationAction(state, 'solar', 'solar-clean', 'perfect');
  assert.ok(state.resources.power > beforePower);
});

test('indoor crew advances tasks across cycles and boosts resources', () => {
  let state = createSurvivalWorld('leo');
  const initialTaskA = state.indoorCrew[0].taskLabel;
  const initialProgressA = state.indoorCrew[0].progress;

  for (let i = 0; i < 40; i++) {
    state = stepSurvivalWorld(state, 0.05, { dx: 0, dy: 0 }).state;
  }
  assert.notEqual(state.indoorCrew[0].progress, initialProgressA);

  // Run enough ticks to finish an 8s cycle and rotate tasks
  for (let i = 0; i < 160; i++) {
    state = stepSurvivalWorld(state, 0.05, { dx: 0, dy: 0 }).state;
  }
  assert.notEqual(state.indoorCrew[0].taskLabel, initialTaskA);
});
