import type { ResourceKey, SourceLink } from '@/content/mission';
import { CSA_LINKS, MODES, MODULES } from '@/content/mission';
import type { Review } from '@/game/engine';
import { SCENARIO } from '@/game/scenario';

export type TeacherResourceKey = ResourceKey | 'science';

export interface LearningOutcomeItem {
  id: string;
  moduleId: 'solar' | 'habitat' | 'recycler' | 'greenhouse' | 'shelter' | 'comms';
  title: string;
  concept: string;
  gameMechanic: string;
  realScience: string;
}

export const TEACHER_OUTCOMES: LearningOutcomeItem[] = [
  {
    id: 'connected-systems',
    moduleId: 'solar',
    title: '1. Connected Base Systems',
    concept: 'Subsystems compete for a shared power and water budget.',
    gameMechanic: 'Solar Power feeds Habitat, Water Recycler, Greenhouse, Shelter, and Comms each cycle; turning too many on causes a Power Deficit.',
    realScience: 'Crewed lunar outposts require integrated power and thermal/life-support load management.',
  },
  {
    id: 'power-air-tradeoff',
    moduleId: 'habitat',
    title: '2. Power vs. Air Trade-Off',
    concept: 'Saving electricity reduces oxygen production.',
    gameMechanic: `Eco (${MODES.eco.power}⚡ → +${MODES.eco.air} Air), Standard (${MODES.standard.power}⚡ → +${MODES.standard.air} Air), and Boost (${MODES.boost.power}⚡ → +${MODES.boost.air} Air) against 4 crew consuming 10 Air/cycle.`,
    realScience: 'Spacecraft oxygen generation (electrolysis) consumes significant electrical power.',
  },
  {
    id: 'recycler-greenhouse-needs',
    moduleId: 'recycler',
    title: '3. Closed-Loop Water & Food Needs',
    concept: 'Recycling water enables plant growth without constant resupply.',
    gameMechanic: 'Water Recycler spends 6⚡ to recover +12 Water (+4 when clogged in C3). Greenhouse spends 8⚡ and 5 Water to grow +12 Food.',
    realScience: 'ISS Environmental Control and Life Support Systems (ECLSS) recycle ~90%+ of crew water.',
  },
  {
    id: 'backup-energy',
    moduleId: 'solar',
    title: '4. Energy Storage for Low Sunlight',
    concept: 'Single-use or stored reserves bridge shadowed periods.',
    gameMechanic: `Cycle 2 drops Solar output to +${SCENARIO.solar[1]}⚡. Spending the single Backup Battery adds +20⚡ once.`,
    realScience: 'Low solar elevation near the lunar south pole casts long crater shadows requiring battery reserves.',
  },
  {
    id: 'crew-protection',
    moduleId: 'shelter',
    title: '5. Radiation Protection Trade-Offs',
    concept: 'Shielding consumes mass, power, or science time.',
    gameMechanic: 'Cycle 4 Radiation Alert: Deploy Shield Kit (-4⚡, Level +1, Safety -5), Shelter (-4⚡, Safety -2, Science -5), or Continue (-15 Safety at Level 1).',
    realScience: 'Without Earth’s magnetic field or atmosphere, crews rely on shielding mass and storm shelters.',
  },
  {
    id: 'earth-comms',
    moduleId: 'comms',
    title: '6. Communicating with Earth',
    concept: 'Science return uses power and crosses finite light-speed distance.',
    gameMechanic: 'Switching Earth Radio ON costs 4⚡ per cycle and produces +5 Science Points.',
    realScience: 'Radio waves travel at the speed of light (~1.3 seconds one-way across ~384,400 km to the Moon).',
  },
];

export interface InquiryStage {
  step: number;
  id: 'observe' | 'predict' | 'choose' | 'watch' | 'explain';
  title: string;
  childCue: string;
  teacherPrompt: string;
}

export const FIVE_STAGE_ACTIVITY: InquiryStage[] = [
  {
    step: 1,
    id: 'observe',
    title: 'Observe Base',
    childCue: 'Check the 5 gauges and glowing Moon Base buildings.',
    teacherPrompt: 'Ask: "Which resource is lowest right now, and how much sunlight is available this cycle?"',
  },
  {
    step: 2,
    id: 'predict',
    title: 'Predict a Change',
    childCue: 'Guess which gauges will go up or down before tapping.',
    teacherPrompt: 'Have students record an up/down arrow prediction on the printed worksheet before changing settings.',
  },
  {
    step: 3,
    id: 'choose',
    title: 'Choose Action',
    childCue: 'Switch Eco / Standard / Boost or pick an event picture.',
    teacherPrompt: 'Encourage students to test the live preview arrows when toggling Habitat mode or optional systems.',
  },
  {
    step: 4,
    id: 'watch',
    title: 'Watch Actual Result',
    childCue: 'Run the cycle and watch the buildings & gauges update.',
    teacherPrompt: 'Compare the before→after delta in the cycle reaction popup against students’ written predictions.',
  },
  {
    step: 5,
    id: 'explain',
    title: 'Explain Why',
    childCue: 'Share why the numbers moved using one sentence or picture.',
    teacherPrompt: 'Connect the observed delta back to crew consumption (-10 Air, -8 Water, -8 Food) and power trade-offs.',
  },
];

export interface ResourceFormulaSpec {
  key: TeacherResourceKey;
  label: string;
  unitNote: string;
  formulaSummary: string;
  inputs: string[];
  outputsAndCosts: string[];
  clampRule: string;
}

export const RESOURCE_FORMULAS: Record<TeacherResourceKey, ResourceFormulaSpec> = {
  power: {
    key: 'power',
    label: 'Power',
    unitNote: '0–100 illustrative units (must cover spending before launching a cycle)',
    formulaSummary: 'New Power = clamp(0..100, Start + Solar[cycle] + Battery(+20 if C2 battery) − TotalPowerCost)',
    inputs: [
      `Solar array output by cycle: C1 +${SCENARIO.solar[0]}, C2 +${SCENARIO.solar[1]}, C3 +${SCENARIO.solar[2]}, C4 +${SCENARIO.solar[3]}, C5 +${SCENARIO.solar[4]}`,
      'Backup Battery (Cycle 2 only, 1 charge): +20 Power',
    ],
    outputsAndCosts: [
      `Habitat Air Mode: Eco −${MODES.eco.power}, Standard −${MODES.standard.power}, Boost −${MODES.boost.power}`,
      'Optional systems (when ON): Water Recycler −6, Greenhouse −8, Earth Radio (Comms) −4',
      'Event extra Power costs: C3 Recycler Repair −6, C4 Shield or Shelter −4, C5 Greenhouse Repair −8',
    ],
    clampRule: 'Clamped to 0–100. Power deficit > 0 blocks cycle launch until systems/mode are adjusted.',
  },
  air: {
    key: 'air',
    label: 'Air',
    unitNote: '0–100 illustrative oxygen reserve units (mission fails if Air hits 0)',
    formulaSummary: 'New Air = clamp(0..100, Start + ModeAirGain − CrewBreathing(10))',
    inputs: [
      `Eco mode: +${MODES.eco.air} Air (net −4/cycle)`,
      `Standard mode: +${MODES.standard.air} Air (net +2/cycle)`,
      `Boost mode: +${MODES.boost.air} Air (net +8/cycle)`,
    ],
    outputsAndCosts: ['Four-astronaut crew breathing demand: −10 Air every cycle'],
    clampRule: 'Clamped to 0–100. Reaching 0 ends the mission.',
  },
  water: {
    key: 'water',
    label: 'Water',
    unitNote: '0–100 illustrative clean water units (mission fails if Water hits 0)',
    formulaSummary: 'New Water = clamp(0..100, Start + RecyclerRecovery − CrewUse(8) − GreenhouseUse(5 if ON))',
    inputs: [
      'Water Recycler ON (normal / C3 repaired): +12 Water',
      'Water Recycler ON in C3 without repair: +4 Water (clogged filter)',
      'Water Recycler OFF: +0 Water',
    ],
    outputsAndCosts: [
      'Crew drinking & hygiene: −8 Water every cycle',
      'Greenhouse irrigation (when ON and not turned off in C5): −5 Water',
    ],
    clampRule: 'Clamped to 0–100. Reaching 0 ends the mission.',
  },
  food: {
    key: 'food',
    label: 'Food',
    unitNote: '0–100 illustrative food store units (mission fails if Food hits 0)',
    formulaSummary: 'New Food = clamp(0..100, Start + GreenhouseOutput − CrewEating(8))',
    inputs: [
      'Greenhouse ON (Cycles 1–4, or Cycle 5 with Repair): +12 Food',
      'Greenhouse in Cycle 5 without Repair, or OFF: +0 Food',
    ],
    outputsAndCosts: ['Four-astronaut crew meals: −8 Food every cycle'],
    clampRule: 'Clamped to 0–100. Reaching 0 ends the mission.',
  },
  safety: {
    key: 'safety',
    label: 'Crew Safety',
    unitNote: '0–100 illustrative protection index (mission fails if Safety hits 0)',
    formulaSummary: 'New Safety = clamp(0..100, Start − Cycle4RadiationPenalty)',
    inputs: ['Starts at 90/100; Shielding Level begins at 1 (1 Shielding Kit available).'],
    outputsAndCosts: [
      'Cycles 1, 2, 3, 5: −0 Safety',
      'Cycle 4 Deploy Shield Kit: Shielding Level rises to 2, Safety −5',
      'Cycle 4 Shelter Crew: Safety −2 (and Science −5, minimum 0)',
      'Cycle 4 Continue Operations: Safety −15 at Level 1 (or −5 at Level 2+)',
    ],
    clampRule: 'Clamped to 0–100. Simplified training rule — NOT mapped from real radiation doses.',
  },
  science: {
    key: 'science',
    label: 'Science Points',
    unitNote: 'Non-negative cumulative points (capped at 15 pts for the 10-point score weight)',
    formulaSummary: 'New Science = max(0, Start + CommsGain(+5 if ON) − ShelterPenalty(up to 5 in C4))',
    inputs: ['Earth Radio (Communications) ON: +5 Science Points per cycle'],
    outputsAndCosts: ['Cycle 4 Shelter Crew option: −min(5, existing Science) points'],
    clampRule: 'Never drops below 0. Score formula awards min(science / 15, 1) × 10.',
  },
};

export interface CalculationTerm {
  label: string;
  amount: number;
}

export interface CycleResourceCalculation {
  cycle: number;
  resource: TeacherResourceKey;
  before: number;
  terms: CalculationTerm[];
  unclampedAfter: number;
  after: number;
  delta: number;
  clamped: boolean;
  equationText: string;
}

/**
 * Computes the exact deterministic calculation steps for a committed `Review`
 * row using the identical rules implemented in `src/game/engine.ts`.
 */
export function explainCycleResourceCalculation(
  review: Review,
  resource: TeacherResourceKey,
): CycleResourceCalculation {
  const { cycle, decision } = review;
  const terms: CalculationTerm[] = [];
  let before = 0;
  let actualAfter = 0;

  if (resource === 'power') {
    before = review.before.power;
    actualAfter = review.after.power;
    const solar = SCENARIO.solar[cycle - 1] ?? 0;
    terms.push({ label: `Cycle ${cycle} Solar Array`, amount: solar });
    if (cycle === 2 && decision.event === 'battery') {
      terms.push({ label: 'Backup Battery (+20)', amount: 20 });
    }
    const modeCost = MODES[decision.mode].power;
    terms.push({ label: `${MODES[decision.mode].label} Air Mode`, amount: -modeCost });
    if (decision.recycler) terms.push({ label: 'Water Recycler ON', amount: -6 });
    if (cycle === 3 && decision.event === 'repair') terms.push({ label: 'C3 Recycler Repair', amount: -6 });
    if (decision.greenhouse) terms.push({ label: 'Greenhouse ON', amount: -8 });
    if (cycle === 5 && decision.event === 'repair') terms.push({ label: 'C5 Greenhouse Repair', amount: -8 });
    if (decision.communications) terms.push({ label: 'Earth Radio ON', amount: -4 });
    if (cycle === 4 && (decision.event === 'shield' || decision.event === 'shelter')) {
      terms.push({
        label: decision.event === 'shield' ? 'C4 Deploy Shield' : 'C4 Shelter Crew',
        amount: -4,
      });
    }
  } else if (resource === 'air') {
    before = review.before.air;
    actualAfter = review.after.air;
    terms.push({ label: `${MODES[decision.mode].label} Air Output`, amount: MODES[decision.mode].air });
    terms.push({ label: '4 Crew Breathing', amount: -10 });
  } else if (resource === 'water') {
    before = review.before.water;
    actualAfter = review.after.water;
    if (decision.recycler) {
      const recovery = cycle === 3 && decision.event !== 'repair' ? 4 : 12;
      terms.push({
        label: cycle === 3 && decision.event !== 'repair' ? 'Clogged Recycler' : 'Water Recycler',
        amount: recovery,
      });
    }
    terms.push({ label: '4 Crew Water Use', amount: -8 });
    if (decision.greenhouse) terms.push({ label: 'Greenhouse Irrigation', amount: -5 });
  } else if (resource === 'food') {
    before = review.before.food;
    actualAfter = review.after.food;
    if (decision.greenhouse) {
      const foodOut = cycle === 5 && decision.event !== 'repair' ? 0 : 12;
      terms.push({
        label: cycle === 5 && decision.event !== 'repair' ? 'C5 Faulty Greenhouse' : 'Greenhouse Harvest',
        amount: foodOut,
      });
    }
    terms.push({ label: '4 Crew Meals', amount: -8 });
  } else if (resource === 'safety') {
    before = review.before.safety;
    actualAfter = review.after.safety;
    if (cycle === 4) {
      const loss = review.delta.safety;
      const eventName =
        decision.event === 'shield'
          ? 'C4 Solar Alert (Shielded)'
          : decision.event === 'shelter'
            ? 'C4 Solar Alert (Sheltered)'
            : 'C4 Solar Alert (Continued)';
      terms.push({ label: eventName, amount: loss });
    } else {
      terms.push({ label: 'No radiation penalty', amount: 0 });
    }
  } else {
    before = review.scienceBefore;
    actualAfter = review.scienceAfter;
    if (decision.communications) terms.push({ label: 'Earth Radio ON', amount: 5 });
    const shelterLoss = review.scienceAfter - (review.scienceBefore + (decision.communications ? 5 : 0));
    if (cycle === 4 && decision.event === 'shelter' && shelterLoss < 0) {
      terms.push({ label: 'C4 Shelter Science Cost', amount: shelterLoss });
    }
    if (terms.length === 0) terms.push({ label: 'No comms transmission', amount: 0 });
  }

  const unclampedAfter = before + terms.reduce((sum, t) => sum + t.amount, 0);
  const clamped = resource !== 'science' && unclampedAfter !== actualAfter;
  const delta = actualAfter - before;

  const termStr = terms
    .map((t) => `${t.amount >= 0 ? `+${t.amount}` : `${t.amount}`} (${t.label})`)
    .join(' ');
  const equationText = `${before} ${termStr} = ${actualAfter}${clamped ? ` (clamped from ${unclampedAfter})` : ''}`;

  return {
    cycle,
    resource,
    before,
    terms,
    unclampedAfter,
    after: actualAfter,
    delta,
    clamped,
    equationText,
  };
}

export interface DataComparisonRow {
  aspect: string;
  simulated: string;
  nasaObservation: string;
}

export const DATA_MODE_COMPARISON: DataComparisonRow[] = [
  {
    aspect: 'Resource Units (0–100)',
    simulated: 'Fixed illustrative teaching units defined in scenario.ts & engine.ts',
    nasaObservation: 'Not present — NASA DONKI does not supply game Power, Air, Water, or Food scores',
  },
  {
    aspect: 'Solar & Space Weather',
    simulated: `Scripted Cycle 1–5 solar values (${SCENARIO.solar.join(', ')}) and Cycle 4 alert`,
    nasaObservation: 'Real historical/recent FLR, SEP, and CME catalog records via server /api/space-weather',
  },
  {
    aspect: 'Radiation & Crew Safety',
    simulated: 'Simplified Cycle 4 action tiers (-2, -5, or -15 Safety units)',
    nasaObservation: 'Flare classes are NOT lunar surface radiation doses and make no medical predictions',
  },
  {
    aspect: 'Fallback & Offline Behavior',
    simulated: 'Always available offline as SIMULATED_SCENARIO',
    nasaObservation: 'Falls back cleanly to ARCHIVED_DATA or SIMULATED_SCENARIO if offline or unkeyed',
  },
];

export const DONKI_LIMITATIONS: string[] = [
  'DONKI (Database Of Notifications, Knowledge, Information) is a NASA CCMC research catalog of preliminary space-weather events, not an operational mission forecast.',
  'NOAA Space Weather Prediction Center (SWPC) is the official US operational space-weather forecast authority.',
  'Observed NASA timestamps, event IDs, and links appear in the separate Space-Weather Context panel and NEVER modify AstroBorneo resources, penalties, or mission scores.',
  'If NASA_API_KEY is configured, it stays strictly in server environment variables and is never exposed in client JavaScript, VITE_* env vars, or browser storage.',
];

export const CSA_TEACHER_LINKS: SourceLink[] = CSA_LINKS;
export const TEACHER_MODULE_COUNT = MODULES.length;
