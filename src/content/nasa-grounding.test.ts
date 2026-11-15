import test from 'node:test';
import assert from 'node:assert/strict';
import { STATION_NASA_FACTS, formatSpaceWeatherSummary } from './nasa-grounding';
import { STATION_ORDER } from '../game/survival-engine';
import { defaultSavedSpaceWeatherContext } from '../services/space-weather-client';
import { archivedContext } from '../services/archived-context';
import type { SpaceWeather } from '../services/space-weather-types';

test('all 6 stations have real NASA grounding facts with HTTPS NASA source attribution', () => {
  assert.equal(STATION_ORDER.length, 6);
  for (const id of STATION_ORDER) {
    const fact = STATION_NASA_FACTS[id];
    assert.ok(fact, `Missing NASA fact for ${id}`);
    assert.equal(fact.moduleId, id);
    assert.ok(fact.badgeLabel.length > 0);
    assert.ok(fact.headline.length > 0);
    assert.ok(fact.factText.length > 20);
    assert.ok(fact.sourceLabel.includes('NASA'));
    assert.ok(fact.sourceUrl.startsWith('https://'));
  }
});

test('formatSpaceWeatherSummary never labels archived or offline fallback data as LIVE', () => {
  const saved = defaultSavedSpaceWeatherContext();
  const archivedSummary = formatSpaceWeatherSummary(archivedContext, saved, false);
  assert.equal(archivedSummary.modeBadge, 'ARCHIVED NASA DATA');
  assert.equal(archivedSummary.isLive, false);
  assert.equal(archivedSummary.isArchived, true);
  assert.ok(archivedSummary.record?.id.includes('FLR'));

  const noDataYet = formatSpaceWeatherSummary(undefined, saved, false);
  assert.equal(noDataYet.modeBadge, 'ARCHIVED NASA DATA');
  assert.equal(noDataYet.isLive, false);
});

test('formatSpaceWeatherSummary marks verified API records as LIVE NASA DATA', () => {
  const saved = defaultSavedSpaceWeatherContext();
  const livePayload: SpaceWeather = {
    mode: 'LIVE_DATA',
    status: 'CONNECTED',
    cached: false,
    stale: false,
    message: 'Validated NASA response.',
    records: [
      {
        provider: 'NASA_CCMC',
        id: '2024-05-10T00:10:00-FLR-001',
        eventType: 'FLR',
        observationTimeUTC: '2024-05-10T00:10:00.000Z',
        originalTime: '2024-05-10T00:10Z',
        sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30665/-1',
        sourceName: 'NASA CCMC DONKI',
        fetchedAtUTC: '2026-11-15T00:00:00.000Z',
        summary: 'Real solar flare observation.',
      },
    ],
  };
  const liveSummary = formatSpaceWeatherSummary(livePayload, saved, false);
  assert.equal(liveSummary.modeBadge, 'LIVE NASA DATA');
  assert.equal(liveSummary.isLive, true);
  assert.equal(liveSummary.isArchived, false);
  assert.equal(liveSummary.record?.id, '2024-05-10T00:10:00-FLR-001');
});

test('formatSpaceWeatherSummary respects simulated request mode', () => {
  const simSaved = { ...defaultSavedSpaceWeatherContext(), requestMode: 'simulated' as const };
  const simSummary = formatSpaceWeatherSummary(undefined, simSaved, false);
  assert.equal(simSummary.modeBadge, 'SIMULATED TRAINING');
  assert.equal(simSummary.isLive, false);
  assert.equal(simSummary.record, null);
});
