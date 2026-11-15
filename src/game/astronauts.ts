export type AstronautId = 'zara' | 'leo' | 'maya' | 'kai';

export type StationSpecialty = 'all' | 'power_shield' | 'bio_water' | 'comms_storm';

export interface AstronautProfile {
  id: AstronautId;
  name: string;
  shortName: string;
  role: string;
  perkTitle: string;
  perkHint: string;
  suitColor: string;
  trimColor: string;
  visorColor: string;
  backpackColor: string;
  moveSpeedMult: number;
  repairBonusMult: number;
  stormResistMult: number;
  specialty: StationSpecialty;
}

export const ASTRONAUTS: readonly AstronautProfile[] = [
  {
    id: 'zara',
    name: 'Commander Zara',
    shortName: 'Zara',
    role: 'Speed Leader',
    perkTitle: 'Moon Sprinter',
    perkHint: 'Runs 20% faster between stations',
    suitColor: '#f5f7ff',
    trimColor: '#35d9e8',
    visorColor: '#35d9e8',
    backpackColor: '#7ea4d8',
    moveSpeedMult: 1.2,
    repairBonusMult: 1.05,
    stormResistMult: 1.0,
    specialty: 'all',
  },
  {
    id: 'leo',
    name: 'Engineer Leo',
    shortName: 'Leo',
    role: 'Power & Shield Fixer',
    perkTitle: 'Super Wrench',
    perkHint: '+30% fix on Sun Power & Shield',
    suitColor: '#f5f7ff',
    trimColor: '#ffc76b',
    visorColor: '#ffb347',
    backpackColor: '#b9893d',
    moveSpeedMult: 1.0,
    repairBonusMult: 1.3,
    stormResistMult: 0.92,
    specialty: 'power_shield',
  },
  {
    id: 'maya',
    name: 'Botanist Maya',
    shortName: 'Maya',
    role: 'Plant & Water Hero',
    perkTitle: 'Green Thumb',
    perkHint: '+30% fix on Plant Food & Water',
    suitColor: '#f5f7ff',
    trimColor: '#35d2a0',
    visorColor: '#35d2a0',
    backpackColor: '#2c8a6c',
    moveSpeedMult: 1.05,
    repairBonusMult: 1.3,
    stormResistMult: 1.0,
    specialty: 'bio_water',
  },
  {
    id: 'kai',
    name: 'Pilot Kai',
    shortName: 'Kai',
    role: 'Storm & Radio Ace',
    perkTitle: 'Storm Guard',
    perkHint: '25% less storm damage + Radio boost',
    suitColor: '#f5f7ff',
    trimColor: '#4f8cff',
    visorColor: '#7eb2ff',
    backpackColor: '#355cb5',
    moveSpeedMult: 1.08,
    repairBonusMult: 1.15,
    stormResistMult: 0.75,
    specialty: 'comms_storm',
  },
] as const;

export const DEFAULT_ASTRONAUT_ID: AstronautId = 'zara';

export function isAstronautId(value: unknown): value is AstronautId {
  return value === 'zara' || value === 'leo' || value === 'maya' || value === 'kai';
}

export function getAstronaut(id: AstronautId | null | undefined): AstronautProfile {
  return ASTRONAUTS.find((a) => a.id === id) ?? ASTRONAUTS[0];
}

export function pickNpcPartner(playerId: AstronautId): AstronautProfile {
  const order: Record<AstronautId, AstronautId> = {
    zara: 'leo',
    leo: 'maya',
    maya: 'zara',
    kai: 'leo',
  };
  return getAstronaut(order[playerId]);
}

export function pickIndoorCrewmates(
  playerId: AstronautId,
  npcId: AstronautId,
): [AstronautProfile, AstronautProfile] {
  const others = ASTRONAUTS.filter((a) => a.id !== playerId && a.id !== npcId);
  return [others[0] ?? ASTRONAUTS[2], others[1] ?? ASTRONAUTS[3]];
}

const SELECTED_ASTRONAUT_KEY = 'astroborneo.selectedAstronaut.v1';

export function loadSelectedAstronautId(): AstronautId {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_ASTRONAUT_ID;
    const raw = localStorage.getItem(SELECTED_ASTRONAUT_KEY);
    return isAstronautId(raw) ? raw : DEFAULT_ASTRONAUT_ID;
  } catch {
    return DEFAULT_ASTRONAUT_ID;
  }
}

export function saveSelectedAstronautId(id: AstronautId): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SELECTED_ASTRONAUT_KEY, id);
    }
  } catch {
    /* ignore storage errors */
  }
}
