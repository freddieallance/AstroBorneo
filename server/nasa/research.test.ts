import test from 'node:test';
import assert from 'node:assert/strict';
import { getNasaResearch, normalizeRadLabPayload, RADLAB_ARCHIVE } from './research';

test('normalizeRadLabPayload extracts valid positive finite dose rates and skips invalid entries', () => {
  const sample = {
    results: [
      { timestamp: '2022-04-01T23:00:00', instrument_id: 'DosTel2', absorbed_dose_rate: 10.216 },
      { timestamp: 'bad', instrument_id: 'DosTel1', absorbed_dose_rate: -5 },
      { timestamp: 'bad2', instrument_id: 'DosTel1', absorbed_dose_rate: 'not-a-number' },
      { time: '2022-04-01T23:01:00', instrument: 'DosTel1', doseRate: 8.5 },
    ],
  };
  const parsed = normalizeRadLabPayload(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].doseRate, 10.216);
  assert.equal(parsed[0].instrument, 'DosTel2');
  assert.equal(parsed[1].doseRate, 8.5);
});

test('getNasaResearch in offline mode returns ARCHIVED_DATA with real 2022 RadLab readings, never LIVE_DATA', async () => {
  const res = await getNasaResearch(true);
  assert.equal(res.radlab.mode, 'ARCHIVED_DATA');
  assert.equal(res.radlab.records.length, RADLAB_ARCHIVE.length);
  assert.equal(res.radlab.selected.doseRate, RADLAB_ARCHIVE[0].doseRate);
  assert.equal(res.osdr.id, 'OSD-314');
  assert.equal(res.osdr.mode, 'REFERENCE');
});
