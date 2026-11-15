import type { SpaceWeather } from '@/services/space-weather-client';
// Same verified public record as the server fallback, bundled for backend outages.
export const archivedContext: SpaceWeather = {
  mode: 'ARCHIVED_DATA', status: 'OFFLINE_ARCHIVE', cached: false, stale: false,
  message: 'NASA context is unavailable. Showing a bundled historical example, not results for the selected dates. Training remains available.',
  records: [{
    provider: 'NASA_CCMC', id: '2024-05-10T00:10:00-FLR-001', eventType: 'FLR',
    observationTimeUTC: '2024-05-10T00:10:00.000Z', originalTime: '2024-05-10T00:10Z',
    sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30665/-1', sourceName: 'NASA CCMC DONKI',
    fetchedAtUTC: '2026-11-14T02:14:11.720Z',
    summary: 'A flare observed during May 2024, selected to introduce space-weather planning. Game consequences remain simulated.',
  }],
};
