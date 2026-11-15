/**
 * NASA Data Integration layer (placeholder).
 *
 * Status: NO provider is connected. Every provider reports NOT_CONFIGURED and the
 * game uses a clearly labeled SIMULATED_SCENARIO. This file never fabricates NASA
 * records. See artifacts/lunalab/NASA_INTEGRATION.md for developer setup.
 *
 * Providers are deliberately separate: they may differ in base URL, auth, paths,
 * parameters and response schemas. Do not merge them.
 */

export type DataMode = 'LIVE_DATA' | 'ARCHIVED_DATA' | 'SIMULATED_SCENARIO' | 'NOT_CONFIGURED' | 'NOT_VERIFIED';

export interface ProviderConfig {
  id: 'nasa-open-apis-donki' | 'ccmc-donki-api' | 'nasa-radlab' | 'nasa-osdr';
  name: string;
  baseUrl: string;
  docsUrl: string;
  auth: string;
  optional: boolean;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'nasa-open-apis-donki',
    name: 'NASA Open APIs: DONKI',
    baseUrl: 'https://api.nasa.gov/DONKI/',
    docsUrl: 'https://api.nasa.gov/',
    auth: 'Requires NASA_API_KEY (api_key query parameter). Must be held in a server secret and called through a controlled backend route, never in the browser bundle.',
    optional: false,
  },
  {
    id: 'ccmc-donki-api',
    name: 'NASA CCMC public DONKI API',
    baseUrl: 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/',
    docsUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/api/',
    auth: 'Public API, no key. Adapter schema documented; see Space-Weather Context for live or archived status.',
    optional: false,
  },
  {
    id: 'nasa-radlab',
    name: 'NASA RadLab (optional)',
    baseUrl: 'NOT SET',
    docsUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
    auth: 'To be determined from official documentation.',
    optional: true,
  },
  {
    id: 'nasa-osdr',
    name: 'NASA Open Science Data Repository (optional)',
    baseUrl: 'NOT SET',
    docsUrl: 'https://osdr.nasa.gov/bio/repo/',
    auth: 'Reference link only; not an integrated live API in this version.',
    optional: true,
  },
];

export interface ProviderStatus {
  provider: ProviderConfig;
  mode: DataMode;
  message: string;
  lastVerifiedAt: string | null;
}

/**
 * Returns the connection status of each provider. Until a backend route performs a
 * real, verified request, every provider is NOT_CONFIGURED. Never return LIVE_DATA
 * without a successful real response.
 */
export function getProviderStatuses(): ProviderStatus[] {
  return PROVIDERS.map((provider) => ({
    provider,
    mode: provider.id === 'ccmc-donki-api' ? 'NOT_VERIFIED' : 'NOT_CONFIGURED',
    message: provider.id === 'ccmc-donki-api'
      ? 'Interface ready; run a Space-Weather Context check to verify live or archived status.'
      : 'Configuration required; no connected-data claim.',
    lastVerifiedAt: null,
  }));
}

export interface DataSourceRecord {
  sourceName: string;
  mode: DataMode;
  eventId: string;
  observedAt: string;
  retrievedAt: string;
  sourceUrl: string;
  disclaimer: string;
}

/** The record shown in the NASA Data Source panel for the active scenario. */
export function getScenarioRecord(cycle: number): DataSourceRecord {
  return {
    sourceName: 'AstroBorneo Operation Lunar Dawn scenario',
    mode: 'SIMULATED_SCENARIO',
    eventId: `ASTROBORNEO-SIM-C${cycle}`,
    observedAt: 'Not applicable (simulated)',
    retrievedAt: 'Not applicable (no NASA request made)',
    sourceUrl: 'None. Game scenario values defined by the AstroBorneo team.',
    disclaimer:
      'Simulated educational scenario. Values are illustrative teaching units, not NASA measurements. A solar flare class is not a lunar surface radiation dose, and AstroBorneo makes no medical predictions.',
  };
}

export const CURRENT_DATA_MODE: DataMode = 'SIMULATED_SCENARIO';
