/**
 * Local typed API client. Replaces the Replit-specific @workspace/api-client-react
 * package while preserving the existing /api/nasa/space-weather contract.
 * Requests always target the same origin: no credentials in the browser.
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { SpaceWeather, GetSpaceWeatherParams, SpaceWeatherRecord } from './space-weather-types';
export type { SpaceWeather, GetSpaceWeatherParams } from './space-weather-types';

const SPACE_WEATHER_KEY = 'lunalab.spaceWeather.v1';
const SPACE_WEATHER_EVENT = 'lunalab:space-weather-updated';

export interface SavedSpaceWeatherContext {
  eventType: 'FLR' | 'SEP' | 'CME';
  startDate: string;
  endDate: string;
  requestMode: 'auto' | 'archived' | 'simulated';
  lastMode: SpaceWeather['mode'];
  lastStatus: string;
  cached: boolean;
  stale: boolean;
  record: SpaceWeatherRecord | null;
}

export function defaultSavedSpaceWeatherContext(): SavedSpaceWeatherContext {
  return {
    eventType: 'FLR',
    startDate: '2024-05-10',
    endDate: '2024-05-10',
    requestMode: 'auto',
    lastMode: 'SIMULATED_SCENARIO',
    lastStatus: 'NOT_VERIFIED',
    cached: false,
    stale: false,
    record: null,
  };
}

function isValidDateString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s));
}

function sanitizeObservation(raw: unknown): SpaceWeatherRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SpaceWeatherRecord>;
  if (
    (r.provider !== 'NASA_CCMC' && r.provider !== 'NASA_OPEN_APIS') ||
    typeof r.id !== 'string' ||
    (r.eventType !== 'FLR' && r.eventType !== 'SEP' && r.eventType !== 'CME') ||
    typeof r.observationTimeUTC !== 'string' ||
    typeof r.originalTime !== 'string' ||
    typeof r.sourceUrl !== 'string' ||
    !r.sourceUrl.startsWith('https://') ||
    typeof r.sourceName !== 'string' ||
    typeof r.fetchedAtUTC !== 'string' ||
    typeof r.summary !== 'string'
  ) {
    return null;
  }
  return {
    provider: r.provider,
    id: r.id,
    eventType: r.eventType,
    observationTimeUTC: r.observationTimeUTC,
    originalTime: r.originalTime,
    sourceUrl: r.sourceUrl,
    sourceName: r.sourceName,
    fetchedAtUTC: r.fetchedAtUTC,
    summary: r.summary,
  };
}

export function loadSavedSpaceWeatherContext(): SavedSpaceWeatherContext {
  const def = defaultSavedSpaceWeatherContext();
  try {
    if (typeof localStorage === 'undefined') return def;
    const raw = localStorage.getItem(SPACE_WEATHER_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<SavedSpaceWeatherContext>;
    if (!parsed || typeof parsed !== 'object') return def;
    const eventType = parsed.eventType === 'FLR' || parsed.eventType === 'SEP' || parsed.eventType === 'CME' ? parsed.eventType : def.eventType;
    const startDate = isValidDateString(parsed.startDate) ? parsed.startDate : def.startDate;
    const endDate = isValidDateString(parsed.endDate) ? parsed.endDate : def.endDate;
    const requestMode =
      parsed.requestMode === 'auto' || parsed.requestMode === 'archived' || parsed.requestMode === 'simulated'
        ? parsed.requestMode
        : def.requestMode;
    // Truthful restoration: never present previously fetched LIVE_DATA as freshly connected before revalidation
    let lastMode: SpaceWeather['mode'] =
      parsed.lastMode === 'LIVE_DATA' || parsed.lastMode === 'ARCHIVED_DATA' || parsed.lastMode === 'SIMULATED_SCENARIO'
        ? parsed.lastMode
        : def.lastMode;
    let lastStatus = typeof parsed.lastStatus === 'string' && parsed.lastStatus ? parsed.lastStatus : def.lastStatus;
    let cached = Boolean(parsed.cached);
    let stale = Boolean(parsed.stale);
    if (requestMode === 'simulated') {
      lastMode = 'SIMULATED_SCENARIO';
      lastStatus = 'OFFLINE';
      cached = false;
      stale = false;
    } else if (lastMode === 'LIVE_DATA') {
      lastMode = 'ARCHIVED_DATA';
      lastStatus = 'CACHED_OFFLINE';
      cached = true;
      stale = true;
    }
    const record = requestMode === 'simulated' ? null : sanitizeObservation(parsed.record);
    return { eventType, startDate, endDate, requestMode, lastMode, lastStatus, cached, stale, record };
  } catch {
    return def;
  }
}

export function saveSpaceWeatherContext(ctx: SavedSpaceWeatherContext): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const safe: SavedSpaceWeatherContext = {
      eventType: ctx.eventType,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      requestMode: ctx.requestMode,
      lastMode: ctx.lastMode,
      lastStatus: ctx.lastStatus,
      cached: Boolean(ctx.cached),
      stale: Boolean(ctx.stale),
      record: ctx.requestMode === 'simulated' ? null : sanitizeObservation(ctx.record),
    };
    localStorage.setItem(SPACE_WEATHER_KEY, JSON.stringify(safe));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SPACE_WEATHER_EVENT, { detail: safe }));
    }
  } catch {
    /* optional metadata persistence */
  }
}

export const SPACE_WEATHER_UPDATED_EVENT = SPACE_WEATHER_EVENT;

export const getGetSpaceWeatherQueryKey = (params?: GetSpaceWeatherParams) =>
  ['/api/nasa/space-weather', params ?? {}] as const;

export function getSpaceWeatherUrl(params?: GetSpaceWeatherParams): string {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  return '/api/nasa/space-weather' + (search.size ? '?' + search : '');
}

export async function getSpaceWeather(params?: GetSpaceWeatherParams, signal?: AbortSignal): Promise<SpaceWeather> {
  const res = await fetch(getSpaceWeatherUrl(params), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`NASA context request failed (HTTP ${res.status})`);
  return await res.json() as SpaceWeather;
}

export function useGetSpaceWeather(
  params?: GetSpaceWeatherParams,
  options?: { query?: Omit<UseQueryOptions<SpaceWeather, Error>, 'queryFn'> },
) {
  return useQuery<SpaceWeather, Error>({
    queryKey: getGetSpaceWeatherQueryKey(params),
    queryFn: ({ signal }) => getSpaceWeather(params, signal),
    ...options?.query,
  });
}
