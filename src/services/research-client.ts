import { useQuery } from '@tanstack/react-query';

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

export const ARCHIVED_RESEARCH_FALLBACK: NasaResearchPayload = {
  radlab: {
    mode: 'ARCHIVED_DATA',
    sourceName: 'NASA RadLab (ISS DosTel 2022 Archive)',
    docsUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
    sourceUrl:
      'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-02T01%3A05&absorbed_dose_rate%3E2&format=html',
    records: [
      { timestamp: '2022-04-01T23:00:00', instrument: 'DosTel2', doseRate: 10.2160856666667 },
      { timestamp: '2022-04-01T23:00:00', instrument: 'DosTel1', doseRate: 9.815504 },
    ],
    selected: { timestamp: '2022-04-01T23:00:00', instrument: 'DosTel2', doseRate: 10.2160856666667 },
    fetchedAtUTC: '2022-04-01T23:00:00Z',
  },
  osdr: {
    id: 'OSD-314',
    mode: 'REFERENCE',
    title: 'Arabidopsis red-light responses in spaceflight & partial gravity',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-314',
    fetchedAtUTC: '2022-04-01T23:00:00Z',
  },
};

export async function getNasaResearchClient(signal?: AbortSignal): Promise<NasaResearchPayload> {
  const res = await fetch('/api/nasa/research', { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Research request failed (${res.status})`);
  return (await res.json()) as NasaResearchPayload;
}

export function useGetNasaResearch() {
  return useQuery<NasaResearchPayload, Error>({
    queryKey: ['/api/nasa/research'],
    queryFn: ({ signal }) => getNasaResearchClient(signal),
    staleTime: 300_000,
    retry: false,
  });
}
