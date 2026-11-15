import type { ModuleId } from './mission';
import type { SpaceWeather, SpaceWeatherRecord } from '@/services/space-weather-types';
import type { SavedSpaceWeatherContext } from '@/services/space-weather-client';
import { archivedContext } from '@/services/archived-context';

export interface StationNasaFact {
  moduleId: ModuleId;
  badgeLabel: string;
  headline: string;
  factText: string;
  sourceLabel: string;
  sourceUrl: string;
}

export const STATION_NASA_FACTS: Record<ModuleId, StationNasaFact> = {
  solar: {
    moduleId: 'solar',
    badgeLabel: '~1.5° Lunar Tilt',
    headline: 'Polar Vertical Solar Arrays',
    factText:
      'Because the Moon’s axis tilts only ~1.5° (compared to Earth’s 23.5°), sunlight skims sideways at the south pole. Real Artemis concepts place tall vertical solar arrays on crater rims that catch sunlight up to ~80–90% of the lunar year.',
    sourceLabel: 'NASA Artemis · Lunar South Pole',
    sourceUrl: 'https://www.nasa.gov/humans-in-space/artemis/',
  },
  greenhouse: {
    moduleId: 'greenhouse',
    badgeLabel: 'OSDR-314 · ISS Crops',
    headline: 'Space Crop Growth Chambers',
    factText:
      'NASA OSDR-314 studied red-light responses in spaceflight seedlings, while ISS astronauts grow lettuce and radishes in Veggie & APH chambers. CSA’s Food Production Toolkit teaches how space crews recycle water and nutrients for plants.',
    sourceLabel: 'NASA OSDR-314 & CSA Toolkit',
    sourceUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-314',
  },
  habitat: {
    moduleId: 'habitat',
    badgeLabel: '21% O₂ Cabin Mix',
    headline: 'ECLSS Oxygen Generation',
    factText:
      'NASA’s Environmental Control and Life Support System (ECLSS) splits clean water into breathable oxygen (O₂) and hydrogen via electrolysis while scrubbers remove exhaled carbon dioxide (CO₂) to keep cabin air near Earth’s ~21% O₂.',
    sourceLabel: 'NASA ECLSS Reference',
    sourceUrl: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  recycler: {
    moduleId: 'recycler',
    badgeLabel: '~98% Water Recycled',
    headline: 'Closed-Loop Water Recovery',
    factText:
      'NASA’s ISS Water Recovery System reaches ~98% water recovery—cleaning crew moisture into drinking water so Moon bases need fewer resupply rockets. CSA’s Space Food & Water guides show how closed-loop recycling saves resources.',
    sourceLabel: 'NASA ECLSS & CSA Water',
    sourceUrl: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  shelter: {
    moduleId: 'shelter',
    badgeLabel: 'RadLab · Regolith Shield',
    headline: 'Space Radiation Protection',
    factText:
      'Unlike Earth, the Moon lacks a global magnetic field and thick atmosphere. NASA RadLab tracks real radiation dose rates (µGy/h) aboard the ISS, and NASA HRP studies piling lunar regolith and water tanks around shelters.',
    sourceLabel: 'NASA RadLab & HRP',
    sourceUrl: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
  },
  comms: {
    moduleId: 'comms',
    badgeLabel: '~384,400 km · 1.3s Delay',
    headline: 'Speed-of-Light Earth Link',
    factText:
      'At an average Earth–Moon distance of ~384,400 km, radio signals traveling at the speed of light take ~1.28 seconds one way (~2.6s round trip). NASA’s Space Communications and Navigation (SCaN) network relays telemetry home.',
    sourceLabel: 'NASA Science & SCaN',
    sourceUrl: 'https://science.nasa.gov/moon/facts/',
  },
};

export interface SpaceWeatherViewSummary {
  modeBadge: 'LIVE NASA DATA' | 'ARCHIVED NASA DATA' | 'SIMULATED TRAINING';
  isLive: boolean;
  isArchived: boolean;
  headline: string;
  record: SpaceWeatherRecord | null;
  statusText: string;
  disclaimer: string;
}

export function formatSpaceWeatherSummary(
  weather: SpaceWeather | undefined,
  saved: SavedSpaceWeatherContext,
  isFetching = false,
): SpaceWeatherViewSummary {
  if (saved.requestMode === 'simulated' || weather?.mode === 'SIMULATED_SCENARIO') {
    if (weather?.mode === 'SIMULATED_SCENARIO' && saved.requestMode !== 'simulated' && weather.status === 'EMPTY') {
      return {
        modeBadge: 'LIVE NASA DATA',
        isLive: true,
        isArchived: false,
        headline: `NASA DONKI (${saved.eventType}): 0 events in range`,
        record: null,
        statusText: weather.message,
        disclaimer: 'Real NASA query returned zero events for those dates. Base gameplay remains simulated.',
      };
    }
    return {
      modeBadge: 'SIMULATED TRAINING',
      isLive: false,
      isArchived: false,
      headline: 'Offline Training Scenario',
      record: null,
      statusText: weather?.message ?? 'Training mode only. Switch to NASA API or Archive to inspect real observations.',
      disclaimer: 'All base drain rates and storm timers in AstroBorneo are kid-friendly simulations.',
    };
  }

  if (weather?.mode === 'LIVE_DATA' && weather.records.length > 0) {
    const rec = weather.records[0];
    return {
      modeBadge: 'LIVE NASA DATA',
      isLive: true,
      isArchived: false,
      headline: `${rec.eventType} · ${rec.originalTime}`,
      record: rec,
      statusText: weather.message,
      disclaimer:
        'Real observation retrieved from NASA CCMC DONKI. Base resource drain and storm timing remain simulated.',
    };
  }

  if (weather?.mode === 'ARCHIVED_DATA' && weather.records.length > 0) {
    const rec = weather.records[0];
    return {
      modeBadge: 'ARCHIVED NASA DATA',
      isLive: false,
      isArchived: true,
      headline: `${rec.eventType} · ${rec.originalTime}`,
      record: rec,
      statusText: weather.message,
      disclaimer:
        'Bundled real May 2024 NASA CCMC DONKI archive (shown when live API is offline/archived). Never labeled as live.',
    };
  }

  if (saved.record) {
    return {
      modeBadge: 'ARCHIVED NASA DATA',
      isLive: false,
      isArchived: true,
      headline: `${saved.record.eventType} · ${saved.record.originalTime}`,
      record: saved.record,
      statusText: isFetching
        ? 'Checking NASA CCMC DONKI API… showing previously verified record.'
        : 'Showing previously verified NASA observation.',
      disclaimer:
        'Previously retrieved or archived NASA record — not a live connection until verified.',
    };
  }

  const fallbackRec = archivedContext.records[0] ?? null;
  return {
    modeBadge: 'ARCHIVED NASA DATA',
    isLive: false,
    isArchived: true,
    headline: fallbackRec ? `${fallbackRec.eventType} · ${fallbackRec.originalTime}` : 'May 2024 Solar Flare Archive',
    record: fallbackRec,
    statusText: isFetching
      ? 'Connecting to NASA CCMC DONKI…'
      : archivedContext.message,
    disclaimer:
      'Curated real NASA CCMC DONKI record from May 2024, clearly labeled as archived (not live).',
  };
}
