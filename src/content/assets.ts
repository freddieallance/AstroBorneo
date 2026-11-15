import type { ModuleId } from './mission';

/**
 * Manifest of expected Scenario AI visual assets under `/public/assets/`.
 * Verified against `/public`: none of the Scenario AI artwork files have been
 * uploaded yet, so AstroBorneo renders interactive layered vector silhouettes
 * with independent DOM/SVG hotspots until these files are placed in `public/assets/`.
 */
export const SCENARIO_AI_ASSETS_PRESENT = false as const;

export interface ScenarioAiAssetSpec {
  filename: string;
  targetPath: string;
  role: 'background' | ModuleId | 'crew';
  notes: string;
  uploaded: boolean;
}

export const REQUIRED_SCENARIO_AI_ASSETS: ScenarioAiAssetSpec[] = [
  {
    filename: 'moon-base-bg.webp',
    targetPath: 'public/assets/moon-base-bg.webp',
    role: 'background',
    notes: 'South pole crater horizon, dark sky with Earth upper-right; no baked text.',
    uploaded: false,
  },
  {
    filename: 'habitat.png',
    targetPath: 'public/assets/habitat.png',
    role: 'habitat',
    notes: 'Transparent PNG, isometric/2.5D lunar living dome with viewport windows.',
    uploaded: false,
  },
  {
    filename: 'solar-array.png',
    targetPath: 'public/assets/solar-array.png',
    role: 'solar',
    notes: 'Transparent PNG, tall polar vertical solar panels matching base scale.',
    uploaded: false,
  },
  {
    filename: 'water-recycler.png',
    targetPath: 'public/assets/water-recycler.png',
    role: 'recycler',
    notes: 'Transparent PNG, cylindrical filtration tanks and loop piping.',
    uploaded: false,
  },
  {
    filename: 'greenhouse.png',
    targetPath: 'public/assets/greenhouse.png',
    role: 'greenhouse',
    notes: 'Transparent PNG, translucent plant dome with visible leafy trays.',
    uploaded: false,
  },
  {
    filename: 'shelter.png',
    targetPath: 'public/assets/shelter.png',
    role: 'shelter',
    notes: 'Transparent PNG, thick regolith-covered radiation shelter bunker.',
    uploaded: false,
  },
  {
    filename: 'communications.png',
    targetPath: 'public/assets/communications.png',
    role: 'comms',
    notes: 'Transparent PNG, high-gain dish pointed toward Earth.',
    uploaded: false,
  },
  {
    filename: 'astronaut.png',
    targetPath: 'public/assets/astronaut.png',
    role: 'crew',
    notes: 'Transparent PNG, stylized child-friendly astronaut figure; no baked labels.',
    uploaded: false,
  },
];
