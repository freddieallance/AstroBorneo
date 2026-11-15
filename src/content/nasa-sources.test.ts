import test from 'node:test';
import assert from 'node:assert/strict';
import { CSA_LINKS, MODULES, SOURCES } from './mission';
import { CURRENT_DATA_MODE, getProviderStatuses, getScenarioRecord } from '../services/nasa';
import { radlab, osdr } from '../services/optional-nasa';

test('all 6 modules have needs, output, and science content preserved', () => {
  assert.equal(MODULES.length, 6);
  for (const mod of MODULES) {
    assert.ok(mod.needs.length > 0);
    assert.ok(mod.output.length > 0);
    assert.ok(mod.science.length > 0);
  }
});

test('provider statuses never claim CONNECTED or READY without verification', () => {
  const statuses = getProviderStatuses();
  assert.ok(statuses.length >= 4);
  for (const s of statuses) {
    assert.ok(
      s.mode === 'NOT_CONFIGURED' || s.mode === 'NOT_VERIFIED',
      `Unexpected static mode ${s.mode} for ${s.provider.id}`,
    );
  }
  assert.equal(CURRENT_DATA_MODE, 'SIMULATED_SCENARIO');
  assert.equal(getScenarioRecord(4).mode, 'SIMULATED_SCENARIO');
  assert.equal(radlab.status, 'NOT_CONFIGURED');
  assert.equal(osdr.status, 'NOT_CONFIGURED');
});

test('NASA and CSA reference links match verified educational URLs', () => {
  const urls = new Set([...SOURCES, ...CSA_LINKS].map((s) => s.url));
  assert.ok(urls.has('https://api.nasa.gov/'));
  assert.ok(urls.has('https://ccmc.gsfc.nasa.gov/DONKI/api/'));
  assert.ok(urls.has('https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'));
  assert.ok(urls.has('https://osdr.nasa.gov/bio/repo/'));
  assert.ok(urls.has('https://visualization.osdr.nasa.gov/radlab/gui/data-api/'));
  assert.ok(urls.has('https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp'));
  assert.ok(urls.has('https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/'));
});
