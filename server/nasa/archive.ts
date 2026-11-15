import type { Observation } from './providers';
// Retrieved directly from the documented CCMC FLR endpoint on 2026-11-14.
// Original fields: flrID, beginTime, link; original response inspected before bundling.
export const archive: Observation[] = [{
  provider: 'NASA_CCMC', id: '2024-05-10T00:10:00-FLR-001', eventType: 'FLR',
  observationTimeUTC: '2024-05-10T00:10:00.000Z', originalTime: '2024-05-10T00:10Z',
  sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30665/-1',
  sourceName: 'NASA CCMC DONKI', fetchedAtUTC: '2026-11-14T02:14:11.720Z',
  summary: 'A solar flare observed during May 2024, selected to introduce space-weather planning. The radiation-protection decisions in AstroBorneo remain simulated, not inferred from this flare.',
}];
