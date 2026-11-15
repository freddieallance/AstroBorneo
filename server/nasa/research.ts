export interface RadLabRecord {
  timestamp: string;
  instrument: string;
  doseRate: number;
}

export interface NasaResearchPayload {
  radlab: {
    mode: 'LIVE_DATA' | 'ARCHIVED_DATA';
    sourceName: string;
    docsUrl: string;
    sourceUrl: string;
    records: RadLabRecord[];
    selected: RadLabRecord;
    fetchedAtUTC: string;
  };
  osdr: {
    id: string;
    mode: 'LIVE_DATA' | 'REFERENCE';
    title: string;
    sourceUrl: string;
    fetchedAtUTC: string;
  };
}

export const RADLAB_API_URL =
  'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-02T01%3A05&absorbed_dose_rate&format=json';
export const RADLAB_DOCS_URL = 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/';
export const RADLAB_SOURCE_URL =
  'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-02T01%3A05&absorbed_dose_rate%3E2&format=html';
export const OSDR_API_URL = 'https://osdr.nasa.gov/osdr/data/osd/meta/314';
export const OSDR_STUDY_URL = 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-314';

// Verified historical ISS DosTel measurements from April 1, 2022 (never labeled LIVE_DATA).
export const RADLAB_ARCHIVE: RadLabRecord[] = [
  { timestamp: '2022-04-01T23:00:00', instrument: 'DosTel2', doseRate: 10.2160856666667 },
  { timestamp: '2022-04-01T23:00:00', instrument: 'DosTel1', doseRate: 9.815504 },
  { timestamp: '2022-04-01T23:00:35', instrument: 'DosTel2', doseRate: 11.088263 },
  { timestamp: '2022-04-01T23:02:13', instrument: 'DosTel1', doseRate: 7.949537 },
  { timestamp: '2022-04-01T23:02:15', instrument: 'DosTel2', doseRate: 8.210985 },
  { timestamp: '2022-04-01T23:03:53', instrument: 'DosTel1', doseRate: 6.228811 },
];

export function normalizeRadLabPayload(payload: unknown): RadLabRecord[] {
  const found: RadLabRecord[] = [];
  const seen = new Set<object>();

  function scan(obj: unknown, depth = 0): void {
    if (!obj || typeof obj !== 'object' || depth > 6) return;
    if (seen.has(obj) || found.length >= 200) return;
    seen.add(obj);

    if (Array.isArray(obj)) {
      for (const row of obj.slice(0, 200)) scan(row, depth + 1);
      return;
    }

    const rec = obj as Record<string, unknown>;
    const rawValue =
      rec.absorbed_dose_rate ??
      rec.absorbedDoseRate ??
      rec.dose_rate ??
      rec.doseRate;

    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      const dose = Number(rawValue);
      if (Number.isFinite(dose) && dose >= 0 && dose < 1_000_000) {
        found.push({
          doseRate: dose,
          timestamp: String(rec.timestamp ?? rec.time ?? rec.date ?? '2022-04-01T23:00:00'),
          instrument: String(rec.instrument_id ?? rec.instrument ?? 'DosTel'),
        });
        return;
      }
    }

    for (const child of Object.values(rec).slice(0, 60)) {
      if (child && typeof child === 'object') scan(child, depth + 1);
    }
  }

  scan(payload);
  return found;
}

let cachedResearch: { until: number; payload: NasaResearchPayload } | null = null;
let pendingResearch: Promise<NasaResearchPayload> | null = null;

async function fetchJsonWithTimeout(url: string, timeoutMs = 6000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const text = await res.text();
  if (text.length > 2_000_000) throw new Error('RESPONSE_TOO_LARGE');
  return JSON.parse(text);
}

export async function getNasaResearch(forceOffline = false): Promise<NasaResearchPayload> {
  const offline = forceOffline || process.env.NASA_DONKI_PROVIDER === 'OFFLINE';
  const nowIso = new Date().toISOString();

  if (offline) {
    return {
      radlab: {
        mode: 'ARCHIVED_DATA',
        sourceName: 'NASA RadLab (ISS DosTel 2022 Archive)',
        docsUrl: RADLAB_DOCS_URL,
        sourceUrl: RADLAB_SOURCE_URL,
        records: RADLAB_ARCHIVE,
        selected: RADLAB_ARCHIVE[0],
        fetchedAtUTC: '2022-04-01T23:00:00Z',
      },
      osdr: {
        id: 'OSD-314',
        mode: 'REFERENCE',
        title: 'Arabidopsis red-light responses in spaceflight & partial gravity',
        sourceUrl: OSDR_STUDY_URL,
        fetchedAtUTC: nowIso,
      },
    };
  }

  if (cachedResearch && cachedResearch.until > Date.now()) {
    return cachedResearch.payload;
  }
  if (pendingResearch) return pendingResearch;

  pendingResearch = (async () => {
    const [radRes, osdrRes] = await Promise.allSettled([
      fetchJsonWithTimeout(RADLAB_API_URL),
      fetchJsonWithTimeout(OSDR_API_URL),
    ]);

    const liveRecords =
      radRes.status === 'fulfilled' ? normalizeRadLabPayload(radRes.value) : [];
    const hasLiveRadLab = liveRecords.length > 0;
    const records = hasLiveRadLab ? liveRecords : RADLAB_ARCHIVE;

    const hasLiveOsdr =
      osdrRes.status === 'fulfilled' &&
      Boolean(osdrRes.value) &&
      typeof osdrRes.value === 'object';

    const payload: NasaResearchPayload = {
      radlab: {
        mode: hasLiveRadLab ? 'LIVE_DATA' : 'ARCHIVED_DATA',
        sourceName: hasLiveRadLab
          ? 'NASA RadLab (ISS DosTel)'
          : 'NASA RadLab (ISS DosTel 2022 Archive)',
        docsUrl: RADLAB_DOCS_URL,
        sourceUrl: RADLAB_SOURCE_URL,
        records,
        selected: records[0],
        fetchedAtUTC: hasLiveRadLab ? nowIso : '2022-04-01T23:00:00Z',
      },
      osdr: {
        id: 'OSD-314',
        mode: hasLiveOsdr ? 'LIVE_DATA' : 'REFERENCE',
        title: 'Arabidopsis red-light responses in spaceflight & partial gravity',
        sourceUrl: OSDR_STUDY_URL,
        fetchedAtUTC: nowIso,
      },
    };

    const ttlSec = Math.max(30, Math.min(86400, Number(process.env.NASA_CACHE_SECONDS ?? 900) || 900));
    cachedResearch = { payload, until: Date.now() + ttlSec * 1000 };
    return payload;
  })();

  try {
    return await pendingResearch;
  } finally {
    pendingResearch = null;
  }
}
