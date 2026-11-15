import { resourceKeys, type Decision, type ResourceDelta, type Resources, type State } from './engine';
import { RESOURCE_META, type ModuleId, type ResourceKey } from '../content/mission';

export const RESOURCE_TO_MODULE: Record<ResourceKey, ModuleId> = {
  power: 'solar',
  air: 'habitat',
  water: 'recycler',
  food: 'greenhouse',
  safety: 'shelter',
};

export const STAR_THRESHOLDS = [
  { stars: 5, minPercent: 90, label: 'Outstanding' },
  { stars: 4, minPercent: 80, label: 'Strong Command' },
  { stars: 3, minPercent: 65, label: 'Solid Mission' },
  { stars: 2, minPercent: 45, label: 'Growing Engineer' },
  { stars: 1, minPercent: 0, label: 'First Attempt' },
] as const;

export function isMissionSurvivalMet(state: State): boolean {
  return state.completedCycles === 5 && resourceKeys.every((k) => state.resources[k] > 0);
}

export function getZeroResources(resources: Resources): ResourceKey[] {
  return resourceKeys.filter((k) => resources[k] <= 0);
}

export function deriveStarRating(value: number, maximum: number): {
  stars: number;
  maxStars: 5;
  percent: number;
  bandLabel: string;
} {
  const percent = maximum > 0 ? Math.round((value / maximum) * 100) : 0;
  const match = STAR_THRESHOLDS.find((t) => percent >= t.minPercent) ?? STAR_THRESHOLDS[STAR_THRESHOLDS.length - 1];
  return {
    stars: match.stars,
    maxStars: 5,
    percent,
    bandLabel: match.label,
  };
}

export function score(state: State, quizCorrect = state.correctQuizAnswers): number {
  const r = state.resources;
  const raw =
    Math.min(state.completedCycles, 5) / 5 * 25 +
    r.safety / 100 * 15 +
    r.air / 100 * 15 +
    r.water / 100 * 10 +
    r.food / 100 * 10 +
    r.power / 100 * 5 +
    Math.min(state.science / 15, 1) * 10 +
    Math.min(5, Math.max(0, quizCorrect)) / 5 * 10;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function scoreSummary(state: State, quizCompleted: boolean, correctAnswers = 0) {
  return {
    value: score(state, quizCompleted ? correctAnswers : 0),
    maximum: quizCompleted ? 100 : 90,
    label: quizCompleted ? 'Final Mission and Learning Score' : 'Provisional Mission Score',
  };
}

export interface ScoreComponentRow {
  id: 'cycles' | 'safety' | 'air' | 'water' | 'food' | 'power' | 'science' | 'quiz';
  label: string;
  weight: number;
  formula: string;
  points: number;
  pending?: boolean;
}

export function scoreBreakdown(state: State, quizCompleted: boolean, correctAnswers = 0): {
  rows: ScoreComponentRow[];
  rawTotal: number;
  roundedTotal: number;
  maximum: number;
  label: string;
  starRating: ReturnType<typeof deriveStarRating>;
} {
  const r = state.resources;
  const cyclesCompleted = Math.min(state.completedCycles, 5);
  const boundedQuiz = Math.min(5, Math.max(0, correctAnswers));

  const cyclesPts = (cyclesCompleted / 5) * 25;
  const safetyPts = (r.safety / 100) * 15;
  const airPts = (r.air / 100) * 15;
  const waterPts = (r.water / 100) * 10;
  const foodPts = (r.food / 100) * 10;
  const powerPts = (r.power / 100) * 5;
  const sciencePts = Math.min(state.science / 15, 1) * 10;
  const quizPts = quizCompleted ? (boundedQuiz / 5) * 10 : 0;

  const rows: ScoreComponentRow[] = [
    { id: 'cycles', label: 'Completed Cycles', weight: 25, formula: `${cyclesCompleted}/5 × 25`, points: cyclesPts },
    { id: 'safety', label: 'Crew Safety', weight: 15, formula: `${r.safety}/100 × 15`, points: safetyPts },
    { id: 'air', label: 'Air Reserve', weight: 15, formula: `${r.air}/100 × 15`, points: airPts },
    { id: 'water', label: 'Water Supply', weight: 10, formula: `${r.water}/100 × 10`, points: waterPts },
    { id: 'food', label: 'Food Stores', weight: 10, formula: `${r.food}/100 × 10`, points: foodPts },
    { id: 'power', label: 'Power Stored', weight: 5, formula: `${r.power}/100 × 5`, points: powerPts },
    { id: 'science', label: 'Science Points', weight: 10, formula: `min(${state.science}/15, 1) × 10`, points: sciencePts },
    {
      id: 'quiz',
      label: 'Learning Quiz',
      weight: 10,
      formula: quizCompleted ? `${boundedQuiz}/5 × 10` : 'Incomplete (excluded from /90)',
      points: quizPts,
      pending: !quizCompleted,
    },
  ];

  const rawTotal = rows.reduce((sum, row) => sum + row.points, 0);
  const summary = scoreSummary(state, quizCompleted, boundedQuiz);
  return {
    rows,
    rawTotal: Math.round(rawTotal * 100) / 100,
    roundedTotal: summary.value,
    maximum: summary.maximum,
    label: summary.label,
    starRating: deriveStarRating(summary.value, summary.maximum),
  };
}

export interface MissionSnapshotRow {
  key: string;
  label: string;
  cycle: number;
  resources: Resources;
  delta: ResourceDelta | null;
  science: number;
  scienceDelta: number | null;
  decision: Decision | null;
  explanations: string[];
}

/**
 * Returns ONLY real initial and committed cycle snapshots from state.history.
 * Never fabricates or extrapolates uncompleted cycles.
 */
export function buildMissionSnapshots(state: State): MissionSnapshotRow[] {
  const initialResources: Resources = state.history[0]?.before ?? { ...state.resources };
  const initialScience = state.history[0]?.scienceBefore ?? state.science;

  const rows: MissionSnapshotRow[] = [
    {
      key: 'initial',
      label: 'Start',
      cycle: 0,
      resources: { ...initialResources },
      delta: null,
      science: initialScience,
      scienceDelta: null,
      decision: null,
      explanations: [],
    },
  ];

  for (const h of state.history) {
    rows.push({
      key: `cycle-${h.cycle}`,
      label: `C${h.cycle}`,
      cycle: h.cycle,
      resources: { ...h.after },
      delta: { ...h.delta },
      science: h.scienceAfter,
      scienceDelta: h.scienceAfter - h.scienceBefore,
      decision: { ...h.decision },
      explanations: [...h.explanations],
    });
  }

  return rows;
}

export function buildFailureTip(state: State): string {
  const zeros = getZeroResources(state.resources);
  if (zeros.length === 0) {
    return 'Check your power and life-support balance each cycle before launching.';
  }
  const primary = zeros[0];
  switch (primary) {
    case 'power':
      return 'Power hit 0: try Eco Air, switch off optional systems, or use the backup battery on Cycle 2.';
    case 'air':
      return 'Air hit 0: use Standard or Boost Air on sunny cycles to keep an oxygen buffer.';
    case 'water':
      return 'Water hit 0: keep the Water Recycler ON and repair it on Cycle 3 if Power allows.';
    case 'food':
      return 'Food hit 0: run the Greenhouse on Cycles 1–4 and fix it on Cycle 5 when you have Power.';
    case 'safety':
      return 'Crew Safety hit 0: use Shielding or Shelter during Cycle 4’s solar storm alert.';
  }
}

export function buildMissionInsights(state: State): {
  strengths: string[];
  improve: string[];
  affectedLabels: string[];
} {
  const r = state.resources;
  const strengths: string[] = [];
  const improve: string[] = [];
  if (r.safety >= 75) strengths.push('You kept the crew well protected.');
  else improve.push('Protect the crew during the radiation alert: shielding or sheltering costs a little now but saves Safety.');
  if (r.air >= 40) strengths.push('Air reserves stayed comfortable.');
  else improve.push('Try Standard or Boost mode earlier to build an air buffer before power gets tight.');
  if (r.water >= 30) strengths.push('Water was managed carefully.');
  else improve.push('Keep the Water Recycler running and consider repairing it when it breaks.');
  if (r.food >= 30) strengths.push('Food stores stayed healthy.');
  else improve.push('Run the greenhouse on sunny cycles so food grows before it runs low.');
  if (state.science >= 15) strengths.push('Strong research output from Communications.');
  else improve.push('When power allows, keep Communications on to earn Science Points.');
  if (r.power < 15) improve.push('Power ended very low. Save the backup battery for the shadowy cycle.');

  const affectedLabels = getZeroResources(r).map((k) => RESOURCE_META[k].label);
  return { strengths, improve, affectedLabels };
}
