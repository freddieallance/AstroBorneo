import type { ModuleId } from '@/content/mission';
import {
  getAstronaut,
  pickIndoorCrewmates,
  pickNpcPartner,
  type AstronautId,
  type AstronautProfile,
} from './astronauts';

export type SurvivalPhase = 'playing' | 'paused' | 'evacuating' | 'gameover';
export type ResourceKey = 'power' | 'air' | 'water' | 'food' | 'safety';
export type BaseResources = Record<ResourceKey, number>;
export type CrewSafetyStatus = 'safe' | 'caution' | 'danger' | 'evacuate';
export type EvacReason = 'all_stations_failed' | 'crew_unsafe';

export type MiniGameKind =
  | 'solar_aim'
  | 'plant_sprout'
  | 'oxygen_lock'
  | 'pipe_unclog'
  | 'shield_meteor'
  | 'radio_tune';

export interface Vec2 {
  x: number;
  y: number;
}

export interface StationMeta {
  id: ModuleId;
  label: string;
  miniGameTitle: string;
  miniGameHint: string;
  miniGameKind: MiniGameKind;
  pos: Vec2;
  interactPos: Vec2;
  accent: string;
}

export interface StationChoiceOption {
  id: string;
  title: string;
  badge: string;
  effectText: string;
  selfHeal: number;
  sideEffects: Partial<Record<ModuleId, number>>;
  resourceEffects?: Partial<BaseResources>;
  bonusScoreSec?: number;
  shieldBoostSec?: number;
  powerSaveSec?: number;
  consequenceNote: string;
  riskTag: 'safe' | 'tradeoff' | 'boost';
}

export interface StationState {
  id: ModuleId;
  health: number;
  maxHealth: number;
  baseDrainPerSec: number;
  cooldownSec: number;
  failed: boolean;
  failedAtSec: number | null;
  failureReason: string | null;
  repairFlashSec: number;
}

export interface ActorState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  walkPhase: number;
  target: Vec2 | null;
  pendingStationId: ModuleId | null;
}

export interface NpcState extends ActorState {
  profile: AstronautProfile;
  targetStation: ModuleId;
  taskPhase: 'walking' | 'working' | 'resting';
  taskTimerSec: number;
  dialogCooldownSec: number;
}

export interface IndoorCrewMember {
  profile: AstronautProfile;
  roomLabel: string;
  taskLabel: string;
  targetResource: ResourceKey;
  progress: number;
  cycleDurationSec: number;
  walksRight: boolean;
}

export interface NpcDialogMessage {
  id: string;
  speakerName: string;
  speakerId: AstronautId;
  text: string;
  severity: 'info' | 'warn' | 'critical';
  targetStation: ModuleId | null;
  timestampSec: number;
}

export interface StormState {
  active: boolean;
  kind: 'solar_flare' | 'meteor_shower' | 'dust_surge';
  label: string;
  remainingSec: number;
  nextStormInSec: number;
}

export interface ChoiceLogEntry {
  atSec: number;
  stationId: ModuleId;
  choiceTitle: string;
  consequenceNote: string;
  miniGameQuality: 'perfect' | 'good' | 'missed';
}

export interface FailureReport {
  survivalSeconds: number;
  solsSurvived: number;
  evacReason: EvacReason;
  finalCrewHealth: number;
  finalResources: BaseResources;
  firstFailedId: ModuleId | null;
  firstFailedLabel: string;
  lastFailedId: ModuleId | null;
  lastFailedLabel: string;
  failureOrder: { id: ModuleId; label: string; failedAtSec: number; reason: string }[];
  causeHeadline: string;
  causeDetail: string;
  miniGamesWon: number;
  npcAssists: number;
  choicesMade: ChoiceLogEntry[];
}

export interface SurvivalWorldState {
  phase: SurvivalPhase;
  playerProfile: AstronautProfile;
  player: ActorState;
  npc: NpcState;
  indoorCrew: [IndoorCrewMember, IndoorCrewMember];
  stations: Record<ModuleId, StationState>;
  resources: BaseResources;
  crewHealth: number;
  crewSafetyStatus: CrewSafetyStatus;
  crewWarnCooldownSec: number;
  elapsedSec: number;
  bonusScoreSec: number;
  solsSurvived: number;
  solLengthSec: number;
  shieldBoostSec: number;
  powerSaveSec: number;
  storm: StormState;
  dialog: NpcDialogMessage | null;
  dialogSeq: number;
  miniGamesWon: number;
  npcAssists: number;
  failureOrder: { id: ModuleId; label: string; failedAtSec: number; reason: string }[];
  choicesMade: ChoiceLogEntry[];
  failureReport: FailureReport | null;
  evacTimerSec: number;
  drainMultiplier: number;
}

export interface MoveInput {
  dx: number;
  dy: number;
}

export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 540;
export const WALK_BOUNDS = { minX: 60, maxX: 940, minY: 225, maxY: 485 };
export const ROCKET_PAD_POS: Vec2 = { x: 890, y: 458 };
export const INTERACT_RADIUS = 88;
export const PLAYER_BASE_SPEED = 205;
export const NPC_SPEED = 148;
export const SOL_DURATION_SEC = 20;
export const EVAC_ANIMATION_SEC = 4.6;

export const STATIONS: Record<ModuleId, StationMeta> = {
  solar: {
    id: 'solar',
    label: 'Sun Power',
    miniGameTitle: 'Aim the Sun Panels!',
    miniGameHint: 'Tap every glowing sun beam!',
    miniGameKind: 'solar_aim',
    pos: { x: 135, y: 325 },
    interactPos: { x: 205, y: 342 },
    accent: '#ffc76b',
  },
  greenhouse: {
    id: 'greenhouse',
    label: 'Plant Food',
    miniGameTitle: 'Water the Space Plants!',
    miniGameHint: 'Tap each thirsty sprout to grow!',
    miniGameKind: 'plant_sprout',
    pos: { x: 300, y: 410 },
    interactPos: { x: 230, y: 424 },
    accent: '#35d2a0',
  },
  habitat: {
    id: 'habitat',
    label: 'Crew Home',
    miniGameTitle: 'Lock Fresh Oxygen!',
    miniGameHint: 'Tap LOCK when needle hits green!',
    miniGameKind: 'oxygen_lock',
    pos: { x: 485, y: 358 },
    interactPos: { x: 405, y: 374 },
    accent: '#35d9e8',
  },
  recycler: {
    id: 'recycler',
    label: 'Water',
    miniGameTitle: 'Unclog the Water Pipes!',
    miniGameHint: 'Tap clogged valves to clear water!',
    miniGameKind: 'pipe_unclog',
    pos: { x: 655, y: 416 },
    interactPos: { x: 585, y: 430 },
    accent: '#4f8cff',
  },
  shelter: {
    id: 'shelter',
    label: 'Shield',
    miniGameTitle: 'Block Incoming Meteors!',
    miniGameHint: 'Tap meteors before they hit!',
    miniGameKind: 'shield_meteor',
    pos: { x: 805, y: 378 },
    interactPos: { x: 735, y: 392 },
    accent: '#ffc76b',
  },
  comms: {
    id: 'comms',
    label: 'Radio',
    miniGameTitle: 'Tune Signal to Earth!',
    miniGameHint: 'Tap +/- to lock the Earth wave!',
    miniGameKind: 'radio_tune',
    pos: { x: 905, y: 245 },
    interactPos: { x: 840, y: 268 },
    accent: '#9b8cff',
  },
};

export const STATION_ORDER: ModuleId[] = [
  'solar',
  'greenhouse',
  'habitat',
  'recycler',
  'shelter',
  'comms',
];

export const STATION_CHOICES: Record<ModuleId, StationChoiceOption[]> = {
  solar: [
    {
      id: 'solar-turbo',
      title: 'Turbo Sun Charge',
      badge: 'Big Power, Hot Shield',
      effectText: '⚡ +38 Sun · 🛡️ -10 Shield',
      selfHeal: 38,
      sideEffects: { shelter: -10 },
      consequenceNote: 'Turbo solar heat warmed up Shield!',
      riskTag: 'tradeoff',
    },
    {
      id: 'solar-clean',
      title: 'Wipe Dust Gently',
      badge: 'Safe & Steady',
      effectText: '⚡ +25 Sun · Safe',
      selfHeal: 25,
      sideEffects: {},
      consequenceNote: 'Solar panels cleaned safely.',
      riskTag: 'safe',
    },
    {
      id: 'solar-share',
      title: 'Share Battery Now',
      badge: 'Help Home & Water',
      effectText: '🏠 +18 Home · 💧 +18 Water · ⚡ -12 Sun',
      selfHeal: -12,
      sideEffects: { habitat: 18, recycler: 18 },
      consequenceNote: 'Shared battery charge to Home and Water.',
      riskTag: 'boost',
    },
  ],
  greenhouse: [
    {
      id: 'plant-super',
      title: 'Super Grow Lights',
      badge: 'Big Food & Air, Uses Water',
      effectText: '🌱 +36 Food · 🏠 +14 Home · 💧 -12 Water',
      selfHeal: 36,
      sideEffects: { habitat: 14, recycler: -12 },
      consequenceNote: 'Extra plants made fresh air but drank Water!',
      riskTag: 'tradeoff',
    },
    {
      id: 'plant-mist',
      title: 'Gentle Plant Care',
      badge: 'Safe & Steady',
      effectText: '🌱 +25 Food · Safe',
      selfHeal: 25,
      sideEffects: {},
      consequenceNote: 'Plants watered gently with zero waste.',
      riskTag: 'safe',
    },
    {
      id: 'plant-biofuel',
      title: 'Bio-Power Compost',
      badge: 'Feed Sun Battery',
      effectText: '⚡ +20 Sun · 🌱 -10 Food',
      selfHeal: -10,
      sideEffects: { solar: 20 },
      consequenceNote: 'Turned leaves into extra Sun Power.',
      riskTag: 'boost',
    },
  ],
  habitat: [
    {
      id: 'home-o2',
      title: 'Max Air Scrubbers',
      badge: 'Big Air Fix, High Power',
      effectText: '🏠 +38 Home · ⚡ -12 Sun',
      selfHeal: 38,
      sideEffects: { solar: -12 },
      consequenceNote: 'Air scrubbers fixed Home fast using extra Sun Power!',
      riskTag: 'tradeoff',
    },
    {
      id: 'home-patch',
      title: 'Seal Door & Filters',
      badge: 'Safe & Steady',
      effectText: '🏠 +25 Home · Safe',
      selfHeal: 25,
      sideEffects: {},
      consequenceNote: 'Air seals tightened safely.',
      riskTag: 'safe',
    },
    {
      id: 'home-ecosleep',
      title: 'Power-Save Mode',
      badge: 'Slows Drain Everywhere',
      effectText: '🏠 +12 Home · Slows All Drain 12s · 📡 -10 Radio',
      selfHeal: 12,
      sideEffects: { comms: -10 },
      powerSaveSec: 12,
      consequenceNote: 'Dimmed lights slowed base drain for 12s.',
      riskTag: 'boost',
    },
  ],
  recycler: [
    {
      id: 'water-flush',
      title: 'High-Pressure Flush',
      badge: 'Big Water + Plants, Costs Power',
      effectText: '💧 +38 Water · 🌱 +12 Food · ⚡ -11 Sun',
      selfHeal: 38,
      sideEffects: { greenhouse: 12, solar: -11 },
      consequenceNote: 'Pressure flush boosted Water & Plants using Sun Power!',
      riskTag: 'tradeoff',
    },
    {
      id: 'water-patch',
      title: 'Clean Pipe Filter',
      badge: 'Safe & Steady',
      effectText: '💧 +25 Water · Safe',
      selfHeal: 25,
      sideEffects: {},
      consequenceNote: 'Pipe filter cleared safely.',
      riskTag: 'safe',
    },
    {
      id: 'water-cool',
      title: 'Cool Down Solar Grid',
      badge: 'Protect Power & Shield',
      effectText: '⚡ +18 Sun · 🛡️ +12 Shield · 💧 -12 Water',
      selfHeal: -12,
      sideEffects: { solar: 18, shelter: 12 },
      consequenceNote: 'Sent cool water to Sun Power and Shield!',
      riskTag: 'boost',
    },
  ],
  shelter: [
    {
      id: 'shield-armor',
      title: 'Heavy Moon-Rock Armor',
      badge: 'Armor + Storm Block, Heavy Work',
      effectText: '🛡️ +38 Shield · Storm Armor 15s · 🏠 -10 Home',
      selfHeal: 38,
      sideEffects: { habitat: -10 },
      shieldBoostSec: 15,
      consequenceNote: 'Heavy armor blocked storms for 15s (crew used extra air).',
      riskTag: 'tradeoff',
    },
    {
      id: 'shield-weld',
      title: 'Patch Dome Tiles',
      badge: 'Safe & Steady',
      effectText: '🛡️ +25 Shield · Safe',
      selfHeal: 25,
      sideEffects: {},
      consequenceNote: 'Shield tiles welded safely.',
      riskTag: 'safe',
    },
    {
      id: 'shield-divert',
      title: 'Divert Shield Capacitor',
      badge: 'Emergency Power Boost',
      effectText: '⚡ +22 Sun · 🛡️ -12 Shield',
      selfHeal: -12,
      sideEffects: { solar: 22 },
      consequenceNote: 'Diverted capacitor charge to Sun Power.',
      riskTag: 'boost',
    },
  ],
  comms: [
    {
      id: 'radio-ping',
      title: 'Earth Relay Boost',
      badge: 'Big Radio + Time Bonus, Uses Power',
      effectText: '📡 +36 Radio · +8s Score · ⚡ -12 Sun',
      selfHeal: 36,
      sideEffects: { solar: -12 },
      bonusScoreSec: 8,
      consequenceNote: 'Strong Earth signal earned +8s bonus score!',
      riskTag: 'tradeoff',
    },
    {
      id: 'radio-tune',
      title: 'Align Satellite Dish',
      badge: 'Safe & Steady',
      effectText: '📡 +25 Radio · Safe',
      selfHeal: 25,
      sideEffects: {},
      consequenceNote: 'Earth dish aligned safely.',
      riskTag: 'safe',
    },
    {
      id: 'radio-salvage',
      title: 'Share Spare Chips',
      badge: 'Fix Home & Water',
      effectText: '🏠 +16 Home · 💧 +14 Water · 📡 -12 Radio',
      selfHeal: -12,
      sideEffects: { habitat: 16, recycler: 14 },
      consequenceNote: 'Used spare radio chips to help Home and Water.',
      riskTag: 'boost',
    },
  ],
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clientPointToWorldPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  worldWidth = WORLD_WIDTH,
  worldHeight = WORLD_HEIGHT,
): Vec2 | null {
  if (rect.width <= 0 || rect.height <= 0 || worldWidth <= 0 || worldHeight <= 0) return null;
  const scale = Math.min(rect.width / worldWidth, rect.height / worldHeight);
  const renderedWidth = worldWidth * scale;
  const renderedHeight = worldHeight * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;

  const rawX = ((clientX - rect.left - offsetX) / renderedWidth) * worldWidth;
  const rawY = ((clientY - rect.top - offsetY) / renderedHeight) * worldHeight;
  return {
    x: Math.max(0, Math.min(worldWidth, rawX)),
    y: Math.max(0, Math.min(worldHeight, rawY)),
  };
}

export const RESOURCE_KEYS: readonly ResourceKey[] = ['power', 'air', 'water', 'food', 'safety'];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  power: 'Power',
  air: 'Air',
  water: 'Water',
  food: 'Food',
  safety: 'Safe',
};

const INDOOR_TASKS: readonly {
  roomLabel: string;
  taskLabel: string;
  targetResource: ResourceKey;
}[] = [
  { roomLabel: 'Power Deck', taskLabel: 'Solar Charge', targetResource: 'power' },
  { roomLabel: 'Plant Lab', taskLabel: 'Grow Plants', targetResource: 'food' },
  { roomLabel: 'Air Deck', taskLabel: 'Check Air', targetResource: 'air' },
  { roomLabel: 'Water Room', taskLabel: 'Filter Water', targetResource: 'water' },
  { roomLabel: 'Shield Pod', taskLabel: 'Check Shield', targetResource: 'safety' },
];

export function createSurvivalWorld(
  astronautId: AstronautId,
  options?: { drainMultiplier?: number },
): SurvivalWorldState {
  const playerProfile = getAstronaut(astronautId);
  const npcProfile = pickNpcPartner(playerProfile.id);
  const [indoorA, indoorB] = pickIndoorCrewmates(playerProfile.id, npcProfile.id);

  const stations: Record<ModuleId, StationState> = {
    solar: { id: 'solar', health: 100, maxHealth: 100, baseDrainPerSec: 1.55, cooldownSec: 0, failed: false, failedAtSec: null, failureReason: null, repairFlashSec: 0 },
    greenhouse: { id: 'greenhouse', health: 100, maxHealth: 100, baseDrainPerSec: 1.4, cooldownSec: 0, failed: false, failedAtSec: null, failureReason: null, repairFlashSec: 0 },
    habitat: { id: 'habitat', health: 100, maxHealth: 100, baseDrainPerSec: 1.35, cooldownSec: 0, failed: false, failedAtSec: null, failureReason: null, repairFlashSec: 0 },
    recycler: { id: 'recycler', health: 100, maxHealth: 100, baseDrainPerSec: 1.45, cooldownSec: 0, failed: false, failedAtSec: null, failureReason: null, repairFlashSec: 0 },
    shelter: { id: 'shelter', health: 100, maxHealth: 100, baseDrainPerSec: 1.25, cooldownSec: 0, failed: false, failedAtSec: null, failureReason: null, repairFlashSec: 0 },
    comms: { id: 'comms', health: 100, maxHealth: 100, baseDrainPerSec: 1.3, cooldownSec: 0, failed: false, failedAtSec: null, failureReason: null, repairFlashSec: 0 },
  };

  return {
    phase: 'playing',
    playerProfile,
    player: {
      x: 386,
      y: 446,
      vx: 0,
      vy: 0,
      facing: 1,
      walkPhase: 0,
      target: null,
      pendingStationId: null,
    },
    npc: {
      profile: npcProfile,
      x: 560,
      y: 418,
      vx: 0,
      vy: 0,
      facing: -1,
      walkPhase: 0,
      target: { ...STATIONS.recycler.interactPos },
      pendingStationId: null,
      targetStation: 'recycler',
      taskPhase: 'walking',
      taskTimerSec: 0,
      dialogCooldownSec: 1.5,
    },
    indoorCrew: [
      {
        profile: indoorA,
        roomLabel: INDOOR_TASKS[1].roomLabel,
        taskLabel: INDOOR_TASKS[1].taskLabel,
        targetResource: INDOOR_TASKS[1].targetResource,
        progress: 0.15,
        cycleDurationSec: 8,
        walksRight: true,
      },
      {
        profile: indoorB,
        roomLabel: INDOOR_TASKS[0].roomLabel,
        taskLabel: INDOOR_TASKS[0].taskLabel,
        targetResource: INDOOR_TASKS[0].targetResource,
        progress: 0.55,
        cycleDurationSec: 9,
        walksRight: false,
      },
    ],
    stations,
    resources: {
      power: 100,
      air: 100,
      water: 100,
      food: 100,
      safety: 100,
    },
    crewHealth: 100,
    crewSafetyStatus: 'safe',
    crewWarnCooldownSec: 0,
    elapsedSec: 0,
    bonusScoreSec: 0,
    solsSurvived: 1,
    solLengthSec: SOL_DURATION_SEC,
    shieldBoostSec: 0,
    powerSaveSec: 0,
    storm: {
      active: false,
      kind: 'solar_flare',
      label: 'Calm Lunar Sky',
      remainingSec: 0,
      nextStormInSec: 16,
    },
    dialog: {
      id: 'dlg-0',
      speakerName: npcProfile.shortName,
      speakerId: npcProfile.id,
      text: `Hi ${playerProfile.shortName}! Watch our Resources & Crew Health — fix yellow or red stations!`,
      severity: 'info',
      targetStation: null,
      timestampSec: 0,
    },
    dialogSeq: 1,
    miniGamesWon: 0,
    npcAssists: 0,
    failureOrder: [],
    choicesMade: [],
    failureReport: null,
    evacTimerSec: 0,
    drainMultiplier: Math.max(0.5, options?.drainMultiplier ?? 1),
  };
}

export function findNearestInteractableStation(
  state: SurvivalWorldState,
): { station: StationMeta; dist: number; canOpen: boolean } | null {
  let best: { station: StationMeta; dist: number; canOpen: boolean } | null = null;
  for (const id of STATION_ORDER) {
    const meta = STATIONS[id];
    const st = state.stations[id];
    const dist = distanceBetween(state.player, meta.interactPos);
    if (dist <= INTERACT_RADIUS) {
      if (!best || dist < best.dist) {
        best = { station: meta, dist, canOpen: !st.failed && st.cooldownSec <= 0 };
      }
    }
  }
  return best;
}

export function countOperationalStations(state: SurvivalWorldState): number {
  return STATION_ORDER.filter((id) => !state.stations[id].failed).length;
}

function chooseNpcTargetStation(state: SurvivalWorldState): ModuleId | null {
  const alive = STATION_ORDER.filter((id) => !state.stations[id].failed);
  if (alive.length === 0) return null;
  alive.sort((a, b) => state.stations[a].health - state.stations[b].health);
  return alive[0];
}

function getFailureReason(state: SurvivalWorldState, id: ModuleId): string {
  if (id !== 'solar' && state.stations.solar.failed) {
    return `${STATIONS[id].label} ran out of power after Sun Power failed.`;
  }
  if (id === 'greenhouse' && state.stations.recycler.failed) {
    return 'Plant Food dried out after Water stopped flowing.';
  }
  if (state.storm.active) {
    return `${STATIONS[id].label} collapsed during a ${state.storm.label}.`;
  }
  if (state.stations.shelter.failed && (id === 'solar' || id === 'comms' || id === 'greenhouse')) {
    return `${STATIONS[id].label} wore down without Shield protection.`;
  }
  return `${STATIONS[id].label} drained to 0% before repairs arrived.`;
}

function emitDialog(
  state: SurvivalWorldState,
  text: string,
  severity: 'info' | 'warn' | 'critical',
  targetStation: ModuleId | null,
): void {
  state.dialog = {
    id: `dlg-${state.dialogSeq++}`,
    speakerName: state.npc.profile.shortName,
    speakerId: state.npc.profile.id,
    text,
    severity,
    targetStation,
    timestampSec: state.elapsedSec,
  };
}

function findLowestResource(resources: BaseResources): { key: ResourceKey; label: string; value: number } {
  let lowestKey: ResourceKey = 'power';
  for (const k of RESOURCE_KEYS) {
    if (resources[k] < resources[lowestKey]) lowestKey = k;
  }
  return { key: lowestKey, label: RESOURCE_LABELS[lowestKey], value: Math.round(resources[lowestKey]) };
}

function buildFailureReport(state: SurvivalWorldState, evacReason: EvacReason): FailureReport {
  const first = state.failureOrder[0] ?? null;
  const last = state.failureOrder[state.failureOrder.length - 1] ?? first;
  const totalScoreSec = Math.round(state.elapsedSec + state.bonusScoreSec);
  const lowestRes = findLowestResource(state.resources);

  const causeHeadline =
    evacReason === 'crew_unsafe'
      ? `Crew Health fell to 0% (${lowestRes.label} ran too low) — Emergency Return to Earth!`
      : first && last
        ? `${first.label} broke first — then ${last.label} was the final failure!`
        : 'All Moon stations went offline — Returning to Earth!';

  const causeDetail =
    evacReason === 'crew_unsafe'
      ? `Astronauts need Power, Air, Water, Food, and Shield Safety to stay alive. ${lowestRes.label} dropped to ${lowestRes.value}%, making the Moon Base unsafe!`
      : first
        ? first.reason
        : 'Base systems drained to zero.';

  return {
    survivalSeconds: totalScoreSec,
    solsSurvived: state.solsSurvived,
    evacReason,
    finalCrewHealth: Math.round(state.crewHealth),
    finalResources: {
      power: Math.round(state.resources.power),
      air: Math.round(state.resources.air),
      water: Math.round(state.resources.water),
      food: Math.round(state.resources.food),
      safety: Math.round(state.resources.safety),
    },
    firstFailedId: first ? first.id : null,
    firstFailedLabel: first ? first.label : lowestRes.label,
    lastFailedId: last ? last.id : null,
    lastFailedLabel: last ? last.label : lowestRes.label,
    failureOrder: [...state.failureOrder],
    causeHeadline,
    causeDetail,
    miniGamesWon: state.miniGamesWon,
    npcAssists: state.npcAssists,
    choicesMade: [...state.choicesMade],
  };
}

function markStationFailed(state: SurvivalWorldState, id: ModuleId): void {
  const st = state.stations[id];
  if (st.failed) return;
  st.health = 0;
  st.failed = true;
  st.failedAtSec = Math.round(state.elapsedSec);
  const reason = getFailureReason(state, id);
  st.failureReason = reason;
  state.failureOrder.push({
    id,
    label: STATIONS[id].label,
    failedAtSec: Math.round(state.elapsedSec),
    reason,
  });

  const remaining = countOperationalStations(state);
  if (remaining > 0) {
    const nextUrgent = chooseNpcTargetStation(state);
    emitDialog(
      state,
      `${STATIONS[id].label} failed! Hurry — protect ${nextUrgent ? STATIONS[nextUrgent].label : 'the base'}!`,
      'critical',
      nextUrgent,
    );
  }
}

function moveActorToward(
  actor: ActorState,
  target: Vec2,
  speed: number,
  dt: number,
): boolean {
  const dx = target.x - actor.x;
  const dy = target.y - actor.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= Math.max(4, speed * dt)) {
    actor.x = clamp(target.x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
    actor.y = clamp(target.y, WALK_BOUNDS.minY, WALK_BOUNDS.maxY);
    actor.vx = 0;
    actor.vy = 0;
    return true;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  actor.vx = nx * speed;
  actor.vy = ny * speed;
  actor.x = clamp(actor.x + actor.vx * dt, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
  actor.y = clamp(actor.y + actor.vy * dt, WALK_BOUNDS.minY, WALK_BOUNDS.maxY);
  if (Math.abs(nx) > 0.08) actor.facing = nx >= 0 ? 1 : -1;
  actor.walkPhase += speed * dt * 0.09;
  return false;
}

export function stepSurvivalWorld(
  prev: SurvivalWorldState,
  rawDt: number,
  moveInput: MoveInput,
  options?: { modalOpen?: boolean },
): { state: SurvivalWorldState; arrivedStationId: ModuleId | null } {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  if (prev.phase === 'paused' || prev.phase === 'gameover') {
    return { state: prev, arrivedStationId: null };
  }

  const next: SurvivalWorldState = {
    ...prev,
    player: { ...prev.player },
    npc: { ...prev.npc },
    indoorCrew: [
      { ...prev.indoorCrew[0] },
      { ...prev.indoorCrew[1] },
    ],
    resources: { ...prev.resources },
    storm: { ...prev.storm },
    stations: {
      solar: { ...prev.stations.solar },
      greenhouse: { ...prev.stations.greenhouse },
      habitat: { ...prev.stations.habitat },
      recycler: { ...prev.stations.recycler },
      shelter: { ...prev.stations.shelter },
      comms: { ...prev.stations.comms },
    },
    failureOrder: [...prev.failureOrder],
    choicesMade: [...prev.choicesMade],
  };

  if (next.phase === 'evacuating') {
    next.evacTimerSec += dt;
    if (next.evacTimerSec >= EVAC_ANIMATION_SEC) {
      next.phase = 'gameover';
    }
    return { state: next, arrivedStationId: null };
  }

  const modalOpen = Boolean(options?.modalOpen);
  const simScale = modalOpen ? 0.15 : 1;
  const simDt = dt * simScale;

  // Player movement (always snappy while modal closed)
  let arrivedStationId: ModuleId | null = null;
  if (!modalOpen) {
    const speed = PLAYER_BASE_SPEED * next.playerProfile.moveSpeedMult;
    const hasKeys = Math.abs(moveInput.dx) > 0.01 || Math.abs(moveInput.dy) > 0.01;
    if (hasKeys) {
      next.player.target = null;
      next.player.pendingStationId = null;
      const len = Math.hypot(moveInput.dx, moveInput.dy) || 1;
      const nx = moveInput.dx / len;
      const ny = moveInput.dy / len;
      next.player.vx = nx * speed;
      next.player.vy = ny * speed;
      next.player.x = clamp(next.player.x + next.player.vx * dt, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
      next.player.y = clamp(next.player.y + next.player.vy * dt, WALK_BOUNDS.minY, WALK_BOUNDS.maxY);
      if (Math.abs(nx) > 0.08) next.player.facing = nx >= 0 ? 1 : -1;
      next.player.walkPhase += speed * dt * 0.09;
    } else if (next.player.target) {
      const reached = moveActorToward(next.player, next.player.target, speed, dt);
      if (reached) {
        const pending = next.player.pendingStationId;
        next.player.target = null;
        next.player.pendingStationId = null;
        if (pending && !next.stations[pending].failed && next.stations[pending].cooldownSec <= 0) {
          arrivedStationId = pending;
        }
      }
    } else {
      next.player.vx = 0;
      next.player.vy = 0;
    }
  }

  // Advance survival timer & buffs
  next.elapsedSec += simDt;
  next.solsSurvived = Math.max(1, Math.floor(next.elapsedSec / next.solLengthSec) + 1);
  if (next.shieldBoostSec > 0) next.shieldBoostSec = Math.max(0, next.shieldBoostSec - simDt);
  if (next.powerSaveSec > 0) next.powerSaveSec = Math.max(0, next.powerSaveSec - simDt);

  // Storm cadence & ramp
  if (!modalOpen) {
    if (next.storm.active) {
      next.storm.remainingSec = Math.max(0, next.storm.remainingSec - simDt);
      if (next.storm.remainingSec <= 0) {
        next.storm.active = false;
        next.storm.label = 'Calm Lunar Sky';
        next.storm.nextStormInSec = Math.max(12, 22 - next.solsSurvived * 1.4);
      }
    } else {
      next.storm.nextStormInSec -= simDt;
      if (next.storm.nextStormInSec <= 0) {
        const kinds: StormState['kind'][] = ['solar_flare', 'meteor_shower', 'dust_surge'];
        const pick = kinds[(next.solsSurvived + next.dialogSeq) % kinds.length];
        next.storm.active = true;
        next.storm.kind = pick;
        next.storm.label =
          pick === 'solar_flare'
            ? 'Solar Flare Storm'
            : pick === 'meteor_shower'
              ? 'Meteor Shower'
              : 'Lunar Dust Surge';
        next.storm.remainingSec = 9;
        const warnTarget: ModuleId =
          pick === 'solar_flare' ? 'shelter' : pick === 'meteor_shower' ? 'shelter' : 'solar';
        if (!next.stations[warnTarget].failed) {
          emitDialog(
            next,
            `Alert! ${next.storm.label}! Protect ${STATIONS[warnTarget].label}!`,
            'warn',
            warnTarget,
          );
        }
      }
    }
  }

  // Station health drain with difficulty ramp + cascade rules
  const difficultyRamp = 1 + Math.min(2.1, next.elapsedSec / 65);
  const powerSaveFactor = next.powerSaveSec > 0 ? 0.65 : 1;
  const solarFailedMult = next.stations.solar.failed ? 1.45 : 1;
  const waterFailedMult = next.stations.recycler.failed ? 1.5 : 1;
  const shieldFailedMult = next.stations.shelter.failed ? 1.45 : 1;
  const shieldBuffFactor = next.shieldBoostSec > 0 ? 0.55 : 1;
  const stormDamageFactor = next.storm.active
    ? 1.55 * shieldBuffFactor * next.playerProfile.stormResistMult * shieldFailedMult
    : 1;

  for (const id of STATION_ORDER) {
    const st = next.stations[id];
    if (st.cooldownSec > 0) st.cooldownSec = Math.max(0, st.cooldownSec - dt);
    if (st.repairFlashSec > 0) st.repairFlashSec = Math.max(0, st.repairFlashSec - dt);
    if (st.failed) continue;

    let drain = st.baseDrainPerSec * difficultyRamp * powerSaveFactor * next.drainMultiplier;
    if (id !== 'solar') drain *= solarFailedMult;
    if (id === 'greenhouse') drain *= waterFailedMult;
    if (id === 'solar' || id === 'shelter' || id === 'comms' || id === 'greenhouse') {
      drain *= stormDamageFactor;
    }

    st.health = Math.max(0, st.health - drain * simDt);
    if (st.health <= 0) {
      markStationFailed(next, id);
    }
  }

  // Update indoor crewmates (the other 2 astronauts) doing live base chores
  if (!modalOpen) {
    for (let i = 0; i < 2; i++) {
      const mate = next.indoorCrew[i];
      mate.progress += dt / mate.cycleDurationSec;
      if (mate.progress >= 1) {
        mate.progress = 0;
        mate.walksRight = !mate.walksRight;
        // Small helpful resource boost if corresponding station is still alive
        next.resources[mate.targetResource] = clamp(next.resources[mate.targetResource] + 3, 0, 100);
        // Rotate to next indoor task based on lowest resource
        const lowest = findLowestResource(next.resources);
        const matchedTask =
          INDOOR_TASKS.find((t) => t.targetResource === lowest.key) ??
          INDOOR_TASKS[(Math.floor(next.elapsedSec) + i) % INDOOR_TASKS.length];
        mate.roomLabel = matchedTask.roomLabel;
        mate.taskLabel = matchedTask.taskLabel;
        mate.targetResource = matchedTask.targetResource;
      }
    }
  }

  // Update Base Resources Left driven by station health, cascade & storms
  const stationResourceRate = (stationHealth: number, failed: boolean, baseDrain: number) => {
    if (failed) return -4.2 * next.drainMultiplier;
    if (stationHealth >= 60) return 1.1;
    if (stationHealth >= 35) return -0.9 * next.drainMultiplier;
    return -2.4 * next.drainMultiplier;
  };

  const solarRate =
    stationResourceRate(next.stations.solar.health, next.stations.solar.failed, 1.4) *
    (next.powerSaveSec > 0 ? 0.6 : 1);
  const airRate =
    stationResourceRate(next.stations.habitat.health, next.stations.habitat.failed, 1.3) +
    (next.stations.greenhouse.failed ? -1.0 : next.stations.greenhouse.health >= 50 ? 0.45 : 0);
  const waterRate =
    stationResourceRate(next.stations.recycler.health, next.stations.recycler.failed, 1.35) +
    (next.stations.solar.failed ? -0.9 : 0);
  const foodRate =
    stationResourceRate(next.stations.greenhouse.health, next.stations.greenhouse.failed, 1.25) +
    (next.stations.recycler.failed ? -0.9 : 0);
  const safetyRate =
    stationResourceRate(next.stations.shelter.health, next.stations.shelter.failed, 1.2) +
    (next.storm.active ? (next.shieldBoostSec > 0 ? -0.6 : -2.6 * next.drainMultiplier) : 0.4);

  next.resources.power = clamp(next.resources.power + solarRate * simDt, 0, 100);
  next.resources.air = clamp(next.resources.air + airRate * simDt, 0, 100);
  next.resources.water = clamp(next.resources.water + waterRate * simDt, 0, 100);
  next.resources.food = clamp(next.resources.food + foodRate * simDt, 0, 100);
  next.resources.safety = clamp(next.resources.safety + safetyRate * simDt, 0, 100);

  // Astronaut Crew Health relies on all 5 resources!
  const resValues = RESOURCE_KEYS.map((k) => next.resources[k]);
  const lowResourcesCount = resValues.filter((v) => v < 38).length;
  const zeroResourcesCount = resValues.filter((v) => v <= 1).length;
  const criticalLifeDrain =
    (next.resources.air <= 1 ? 2.4 : 0) +
    (next.resources.water <= 1 ? 1.8 : 0) +
    (next.resources.safety <= 1 && next.storm.active ? 2.2 : 0);

  if (lowResourcesCount === 0 && zeroResourcesCount === 0) {
    next.crewHealth = clamp(next.crewHealth + 1.5 * simDt, 0, 100);
  } else {
    const healthDropPerSec =
      (lowResourcesCount * 1.45 + zeroResourcesCount * 3.8 + criticalLifeDrain) *
      next.drainMultiplier;
    next.crewHealth = clamp(next.crewHealth - healthDropPerSec * simDt, 0, 100);
  }

  next.crewSafetyStatus =
    next.crewHealth <= 0
      ? 'evacuate'
      : next.crewHealth < 30
        ? 'danger'
        : next.crewHealth < 65 || lowResourcesCount >= 2
          ? 'caution'
          : 'safe';

  if (next.crewWarnCooldownSec > 0) {
    next.crewWarnCooldownSec = Math.max(0, next.crewWarnCooldownSec - simDt);
  }
  if (next.crewHealth > 0 && next.crewHealth < 40 && next.crewWarnCooldownSec <= 0) {
    const lowest = findLowestResource(next.resources);
    const targetMap: Record<ResourceKey, ModuleId> = {
      power: 'solar',
      air: 'habitat',
      water: 'recycler',
      food: 'greenhouse',
      safety: 'shelter',
    };
    const urgentStation = targetMap[lowest.key];
    emitDialog(
      next,
      `Crew Health ${Math.round(next.crewHealth)}%! ${lowest.label} is too low — fix ${STATIONS[urgentStation].label} or we return to Earth!`,
      'critical',
      next.stations[urgentStation].failed ? chooseNpcTargetStation(next) : urgentStation,
    );
    next.crewWarnCooldownSec = 7.5;
  }

  // Check if all 6 stations failed OR crew is no longer safe (crewHealth <= 0) -> Return to Earth!
  const allStationsDead = countOperationalStations(next) === 0;
  const crewUnsafe = next.crewHealth <= 0;
  if (allStationsDead || crewUnsafe) {
    next.phase = 'evacuating';
    next.evacTimerSec = 0;
    const evacReason: EvacReason = allStationsDead ? 'all_stations_failed' : 'crew_unsafe';
    next.failureReport = buildFailureReport(next, evacReason);
    emitDialog(
      next,
      crewUnsafe
        ? 'It is no longer safe on the Moon! Crew boarding Escape Rocket — returning to Earth!'
        : 'All stations failed! Everybody to the Escape Rocket — returning to Earth!',
      'critical',
      null,
    );
    return { state: next, arrivedStationId: null };
  }

  // NPC autonomous walking + repairs + alert dialogs
  if (!modalOpen) {
    next.npc.dialogCooldownSec = Math.max(0, next.npc.dialogCooldownSec - simDt);

    if (next.stations[next.npc.targetStation].failed) {
      const fallback = chooseNpcTargetStation(next);
      if (fallback) {
        next.npc.targetStation = fallback;
        next.npc.target = { ...STATIONS[fallback].interactPos };
        next.npc.taskPhase = 'walking';
      }
    }

    if (next.npc.taskPhase === 'walking') {
      const targetPos = STATIONS[next.npc.targetStation].interactPos;
      const reached = moveActorToward(next.npc, targetPos, NPC_SPEED, dt);
      if (reached) {
        next.npc.taskPhase = 'working';
        next.npc.taskTimerSec = 2.2;
      }
    } else if (next.npc.taskPhase === 'working') {
      next.npc.taskTimerSec -= simDt;
      if (next.npc.taskTimerSec <= 0) {
        const st = next.stations[next.npc.targetStation];
        if (!st.failed) {
          const habitatPenalty = next.stations.habitat.failed ? 0.55 : 1;
          const heal = 15 * habitatPenalty;
          st.health = clamp(st.health + heal, 0, st.maxHealth);
          st.repairFlashSec = 1.1;
          next.npcAssists += 1;
        }
        const nextTarget = chooseNpcTargetStation(next);
        if (nextTarget) {
          next.npc.targetStation = nextTarget;
          next.npc.target = { ...STATIONS[nextTarget].interactPos };
          next.npc.taskPhase = 'walking';
          if (next.npc.dialogCooldownSec <= 0) {
            const urgent = next.stations[nextTarget];
            if (urgent.health < 45) {
              emitDialog(
                next,
                `Watch out! ${STATIONS[nextTarget].label} is at ${Math.round(urgent.health)}%! Meet me there!`,
                'warn',
                nextTarget,
              );
              next.npc.dialogCooldownSec = 6.5;
            } else {
              emitDialog(
                next,
                `Fixed ${STATIONS[st.id].label}! Walking to check ${STATIONS[nextTarget].label}.`,
                'info',
                nextTarget,
              );
              next.npc.dialogCooldownSec = 8.5;
            }
          }
        }
      }
    }
  }

  return { state: next, arrivedStationId };
}

export function setPlayerWalkTarget(
  state: SurvivalWorldState,
  target: Vec2,
  stationId: ModuleId | null = null,
): SurvivalWorldState {
  if (state.phase !== 'playing') return state;
  return {
    ...state,
    player: {
      ...state.player,
      target: {
        x: clamp(target.x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
        y: clamp(target.y, WALK_BOUNDS.minY, WALK_BOUNDS.maxY),
      },
      pendingStationId: stationId,
    },
  };
}

export function applyStationAction(
  prev: SurvivalWorldState,
  stationId: ModuleId,
  choiceId: string,
  miniGameQuality: 'perfect' | 'good' | 'missed',
): SurvivalWorldState {
  if (prev.phase !== 'playing' && prev.phase !== 'paused') return prev;
  const targetStation = prev.stations[stationId];
  if (!targetStation || targetStation.failed) return prev;

  const choice = STATION_CHOICES[stationId].find((c) => c.id === choiceId) ?? STATION_CHOICES[stationId][0];
  const qualityMult = miniGameQuality === 'perfect' ? 1.25 : miniGameQuality === 'good' ? 1.0 : 0.35;

  const profile = prev.playerProfile;
  const isSpecialist =
    profile.specialty === 'all' ||
    (profile.specialty === 'power_shield' && (stationId === 'solar' || stationId === 'shelter')) ||
    (profile.specialty === 'bio_water' && (stationId === 'greenhouse' || stationId === 'recycler')) ||
    (profile.specialty === 'comms_storm' && stationId === 'comms');
  const perkMult = isSpecialist ? profile.repairBonusMult : 1;

  const next: SurvivalWorldState = {
    ...prev,
    indoorCrew: [
      { ...prev.indoorCrew[0] },
      { ...prev.indoorCrew[1] },
    ],
    resources: { ...prev.resources },
    stations: {
      solar: { ...prev.stations.solar },
      greenhouse: { ...prev.stations.greenhouse },
      habitat: { ...prev.stations.habitat },
      recycler: { ...prev.stations.recycler },
      shelter: { ...prev.stations.shelter },
      comms: { ...prev.stations.comms },
    },
    failureOrder: [...prev.failureOrder],
    choicesMade: [...prev.choicesMade],
  };

  // Apply primary station change
  const primaryDelta =
    choice.selfHeal >= 0
      ? Math.round(choice.selfHeal * qualityMult * perkMult)
      : choice.selfHeal;
  const primary = next.stations[stationId];
  primary.health = clamp(primary.health + primaryDelta, 0, primary.maxHealth);
  primary.cooldownSec = 3.5;
  primary.repairFlashSec = primaryDelta > 0 ? 1.4 : 0;
  if (primary.health <= 0) {
    markStationFailed(next, stationId);
  }

  // Station repair also replenishes its matching base resource!
  const stationToResource: Partial<Record<ModuleId, ResourceKey>> = {
    solar: 'power',
    habitat: 'air',
    recycler: 'water',
    greenhouse: 'food',
    shelter: 'safety',
  };
  const matchedRes = stationToResource[stationId];
  if (matchedRes) {
    const resDelta = primaryDelta >= 0 ? Math.round(primaryDelta * 0.75) : Math.round(primaryDelta * 0.5);
    next.resources[matchedRes] = clamp(next.resources[matchedRes] + resDelta, 0, 100);
  }

  // Apply trade-off / consequence deltas to linked stations & their resources
  for (const [linkedKey, rawDelta] of Object.entries(choice.sideEffects)) {
    const linkedId = linkedKey as ModuleId;
    const linked = next.stations[linkedId];
    if (!linked || linked.failed || typeof rawDelta !== 'number') continue;
    const scaledDelta = rawDelta > 0 ? Math.round(rawDelta * qualityMult) : rawDelta;
    linked.health = clamp(linked.health + scaledDelta, 0, linked.maxHealth);
    if (scaledDelta > 0) linked.repairFlashSec = 1.0;
    const linkedRes = stationToResource[linkedId];
    if (linkedRes) {
      next.resources[linkedRes] = clamp(next.resources[linkedRes] + Math.round(scaledDelta * 0.7), 0, 100);
    }
    if (linked.health <= 0) {
      markStationFailed(next, linkedId);
    }
  }

  if (choice.bonusScoreSec && miniGameQuality !== 'missed') {
    const extraComms = profile.specialty === 'comms_storm' ? 4 : 0;
    next.bonusScoreSec += choice.bonusScoreSec + extraComms;
  }
  if (choice.shieldBoostSec && miniGameQuality !== 'missed') {
    next.shieldBoostSec = Math.max(next.shieldBoostSec, choice.shieldBoostSec);
    next.resources.safety = clamp(next.resources.safety + 18, 0, 100);
  }
  if (choice.powerSaveSec && miniGameQuality !== 'missed') {
    next.powerSaveSec = Math.max(next.powerSaveSec, choice.powerSaveSec);
  }

  if (miniGameQuality !== 'missed') {
    next.miniGamesWon += 1;
    next.crewHealth = clamp(next.crewHealth + 4, 0, 100);
  }

  next.choicesMade.push({
    atSec: Math.round(next.elapsedSec),
    stationId,
    choiceTitle: choice.title,
    consequenceNote: choice.consequenceNote,
    miniGameQuality,
  });

  if (countOperationalStations(next) === 0) {
    next.phase = 'evacuating';
    next.evacTimerSec = 0;
    next.failureReport = buildFailureReport(next, 'all_stations_failed');
  } else {
    emitDialog(
      next,
      choice.consequenceNote,
      Object.values(choice.sideEffects).some((v) => (v ?? 0) < 0) ? 'warn' : 'info',
      stationId,
    );
  }

  return next;
}
