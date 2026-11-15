export type EventType = 'FLR' | 'SEP' | 'CME';
export type Provider = 'NASA_CCMC' | 'NASA_OPEN_APIS';
export interface Observation {
  provider: Provider; id: string; eventType: EventType; observationTimeUTC: string;
  originalTime: string; sourceUrl: string; sourceName: string; fetchedAtUTC: string; summary: string;
}
export interface DonkiProvider { id: Provider; request(type: EventType, start: string, end: string): Promise<unknown> }
const paths = { FLR: 'FLR', SEP: 'SEP', CME: 'CME' } as const;
async function request(base: string, type: EventType, start: string, end: string, key?: string) {
  const url = new URL(base + paths[type]);
  url.searchParams.set('startDate', start); url.searchParams.set('endDate', end);
  if (key) url.searchParams.set('api_key', key);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(response.status === 429 ? 'RATE_LIMITED' : response.status === 401 || response.status === 403 ? 'AUTH_ERROR' : 'UPSTREAM_ERROR');
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error('RESPONSE_TOO_LARGE');
  return JSON.parse(text);
}
// Independently verified against CCMC's OpenAPI on 2026-11-14; no security scheme.
export const ccmc: DonkiProvider = { id: 'NASA_CCMC', request: (t, s, e) => request('https://ccmc.gsfc.nasa.gov/DONKI-API/get/', t, s, e) };
export const openApis: DonkiProvider = { id: 'NASA_OPEN_APIS', request: (t, s, e) => {
  const key = process.env.NASA_API_KEY;
  if (!key) throw new Error('NOT_CONFIGURED');
  return request('https://api.nasa.gov/DONKI/', t, s, e, key);
} };
export function normalize(raw: unknown, provider: Provider, type: EventType, fetchedAtUTC: string): { records: Observation[]; incomplete: number } {
  if (!Array.isArray(raw)) throw new Error('INVALID_RESPONSE');
  const records: Observation[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') continue;
    // Both schemas currently use these fields; validation remains tied to each event type.
    const id = value[type === 'FLR' ? 'flrID' : type === 'SEP' ? 'sepID' : 'activityID'];
    const time = value[type === 'CME' ? 'startTime' : type === 'SEP' ? 'eventTime' : 'beginTime'];
    let source: URL;
    try { source = new URL(value.link); } catch { continue; }
    if (source.protocol !== 'https:' || !['ccmc.gsfc.nasa.gov', 'kauai.ccmc.gsfc.nasa.gov'].includes(source.hostname) || source.search || source.username || source.password) continue;
    if (typeof id !== 'string' || !id.includes(`-${type}-`) || typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(time) || !Number.isFinite(Date.parse(time))) continue;
    records.push({ provider, id, eventType: type, observationTimeUTC: new Date(time).toISOString(), originalTime: time,
      sourceUrl: source.href, sourceName: 'NASA CCMC DONKI', fetchedAtUTC,
      summary: 'NASA recorded a space-weather event. Mission planners study space weather when preparing protective procedures. This is not a measurement of radiation at our fictional Moon base.' });
  }
  return { records, incomplete: raw.length - records.length };
}
