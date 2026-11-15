import { archive } from './archive';
import { ccmc, openApis, normalize, type EventType, type Observation } from './providers';
export interface Result { mode: 'LIVE_DATA' | 'ARCHIVED_DATA' | 'SIMULATED_SCENARIO'; status: string; message: string; cached: boolean; stale: boolean; records: Observation[] }
const cache = new Map<string, { until: number; result: Result }>();
const pending = new Map<string, Promise<Result>>();
let lastRequest = 0;
export function validateDates(start: string, end: string) {
  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  return valid(start) && valid(end) && start <= end && Date.parse(end) - Date.parse(start) <= 30 * 86400000 && end <= new Date().toISOString().slice(0, 10);
}
export function fallback(status: string): Result {
  return { mode: archive.length ? 'ARCHIVED_DATA' : 'SIMULATED_SCENARIO', status, cached: false, stale: false,
    message: 'Live NASA data is unavailable. This separate historical example is not a result for your selected dates. You can still play the training mission.', records: archive };
}
export async function weather(type: EventType, start: string, end: string, mode: string): Promise<Result> {
  if (mode === 'simulated') return { mode: 'SIMULATED_SCENARIO', status: 'OFFLINE', message: 'Training scenario only. No NASA request made.', cached: false, stale: false, records: [] };
  if (mode === 'archived') return { ...fallback('ARCHIVE'), message: 'Bundled verified historical example. No live request made.' };
  const selected = process.env.NASA_DONKI_PROVIDER ?? 'NASA_CCMC';
  if (selected === 'OFFLINE') return fallback('NOT_CONFIGURED');
  if (!['NASA_CCMC', 'NASA_OPEN_APIS'].includes(selected)) return fallback('NOT_CONFIGURED');
  const key = `${selected}/${type}/${start}/${end}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return { ...hit.result, cached: true };
  if (pending.has(key)) return pending.get(key)!;
  if (Date.now() - lastRequest < 2000) return fallback('RATE_LIMITED');
  lastRequest = Date.now();
  const work = (async () => {
    let result: Result;
    try {
      const provider = selected === 'NASA_CCMC' ? ccmc : openApis;
      const raw = await provider.request(type, start, end);
      const { records, incomplete } = normalize(raw, provider.id, type, new Date().toISOString());
      result = { mode: records.length ? 'LIVE_DATA' : 'SIMULATED_SCENARIO', status: records.length ? 'CONNECTED' : incomplete ? 'INVALID_RECORDS' : 'EMPTY',
        message: records.length ? `Validated NASA response. ${incomplete} incomplete records omitted. Live means retrieved by API, not current lunar conditions.` : incomplete ? 'Incomplete observations were excluded. Training remains available.' : 'NASA returned no records for these dates. Training remains available.',
        cached: false, stale: false, records };
    } catch (error) {
      const safe = error instanceof Error && ['NOT_CONFIGURED', 'RATE_LIMITED', 'AUTH_ERROR', 'UPSTREAM_ERROR', 'INVALID_RESPONSE'].includes(error.message) ? error.message : 'UNAVAILABLE';
      result = fallback(safe);
      if (hit?.result.records.length && hit.result.mode === 'LIVE_DATA') result = { ...hit.result, mode: 'ARCHIVED_DATA', status: safe, cached: true, stale: true, message: 'Live request failed. Showing stale previously retrieved observations; retrieval times have not changed.' };
    }
    const configured = Number(process.env.NASA_CACHE_SECONDS ?? 900);
    const ttl = result.status === 'CONNECTED' || result.status === 'EMPTY' ? Math.max(30, Math.min(86400, Number.isFinite(configured) ? configured : 900)) : 30;
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { result, until: Date.now() + ttl * 1000 });
    return result;
  })();
  pending.set(key, work);
  try { return await work; } finally { pending.delete(key); }
}
