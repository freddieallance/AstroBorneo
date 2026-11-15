export interface RadiationMeasurement {
  timestampUTC: string; instrumentId: string; location: string; sourceUrl: string;
  absorbedDoseRate?: { value: number; unit: 'microgray/hour' };
  doseEquivalentRate?: { value: number; unit: 'microsievert/hour' };
}
export interface StudyMetadata {
  id: string; title: string; subject: string; topic: string; sourceUrl: string;
  summary: string; datasetAvailable: boolean;
}
export interface MarsTerrain { sourceUrl: string; attribution: string; layerId: string }
export interface OptionalAdapter<T> {
  status: 'NOT_CONFIGURED'; documentation: string;
  load(): Promise<{ status: 'NOT_CONFIGURED'; records: T[] }>;
}
function planned<T>(documentation: string): OptionalAdapter<T> {
  return { status: 'NOT_CONFIGURED', documentation, load: async () => ({ status: 'NOT_CONFIGURED', records: [] }) };
}
export const radlab = planned<RadiationMeasurement>('https://visualization.osdr.nasa.gov/radlab/gui/data-api/');
export const osdr = planned<StudyMetadata>('https://osdr.nasa.gov/bio/repo/');
export const marsTrek = planned<MarsTerrain>('https://trek.nasa.gov/mars/');
