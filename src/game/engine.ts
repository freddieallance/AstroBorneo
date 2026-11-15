import { SCENARIO } from './scenario';
export { score } from './scoring';
export type Resources = { power: number; air: number; water: number; food: number; safety: number };
export type Decision = {
  mode: 'eco' | 'standard' | 'boost';
  greenhouse: boolean; recycler: boolean; communications: boolean;
  event: 'none' | 'battery' | 'save' | 'repair' | 'skip' | 'shield' | 'shelter' | 'continue' | 'off';
};
export type Review = {
  cycle: number; before: Resources; after: Resources; decision: Decision;
  explanations: string[]; lesson: string; scienceBefore: number; scienceAfter: number;
  delta: ResourceDelta;
};
export type State = {
  maxCycles: number; quizCompleted: boolean; correctQuizAnswers: number;
  resources: Resources; cycle: number; completedCycles: number;
  shieldingLevel: number; shieldingKits: number; backupCharges: number;
  science: number; history: Review[]; status: 'active' | 'success' | 'failed';
};
export type GameState = State;
export type SystemSettings = Omit<Decision, 'event'>;
export type EventChoice = Decision['event'];
export type ResourceSnapshot = Resources;
export type ResourceDelta = Resources;
export type DecisionHistory = Review[];
export type CycleForecast = ReturnType<typeof calculateCycle>;
export type CycleResult = CycleForecast;
export const resourceKeys = ['power', 'air', 'water', 'food', 'safety'] as const;
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const lessons = [
  'Life support needs electricity. Saving power today can leave less air for tomorrow.',
  'Solar power changes with conditions. A backup battery helps now, but cannot be used twice.',
  'Recycling saves water, but the machines need power and sometimes repairs.',
  'Shelters and shielding help protect astronauts. Protection uses equipment, energy, or research time.',
  'Growing food needs water, electricity, and working equipment. Engineers plan for all three.',
];
export function initialState(): State {
  return { resources: { power: 68, air: 52, water: 58, food: 36, safety: 90 },
    maxCycles: SCENARIO.maxCycles, quizCompleted: false, correctQuizAnswers: 0,
    cycle: 1, completedCycles: 0, shieldingLevel: 1, shieldingKits: 1,
    backupCharges: 1, science: 0, history: [], status: 'active' };
}
export function defaultDecision(cycle: number): Decision {
  return { mode: 'standard', greenhouse: true, recycler: true, communications: false, event: 'none' };
}
export function preview(state: State, decision: Decision) {
  return calculateCycle(state, decision, decision.event);
}
export function calculateCycle(state: State, settings: SystemSettings, eventChoice: EventChoice) {
  const decision: Decision = { ...settings, event: eventChoice };
  const errors: string[] = [];
  const explanations: string[] = [];
  const cycle = state.cycle;
  const allowed = [['none'], ['battery', 'save'], ['repair', 'skip'], ['shield', 'shelter', 'continue'], ['repair', 'skip', 'continue', 'off']];
  if (state.status !== 'active' || cycle < 1 || cycle > 5) errors.push('This mission has ended. Start a new mission to play again.');
  if (!allowed[cycle - 1]?.includes(decision.event)) errors.push('Choose an action to see the complete forecast.');
  if (state.completedCycles !== cycle - 1 || state.history.some(r => r.cycle === cycle)) errors.push('This cycle has already run or the mission sequence is invalid.');
  if (!resourceKeys.every(k => Number.isFinite(state.resources[k]) && state.resources[k] >= 0 && state.resources[k] <= 100)
    || !(['shieldingLevel', 'shieldingKits', 'backupCharges'] as const).every(k => Number.isInteger(state[k]) && state[k] >= 0)
    || !Number.isFinite(state.science) || state.science < 0) errors.push('The mission contains invalid resources or equipment.');
  if (!['greenhouse', 'recycler', 'communications'].every(k => typeof settings[k as keyof SystemSettings] === 'boolean')) errors.push('Optional systems must be switched ON or OFF.');
  const mode = Object.hasOwn(SCENARIO.lifeSupport, decision.mode) ? SCENARIO.lifeSupport[decision.mode] : undefined;
  if (!mode) errors.push('Choose a life-support mode.');
  let powerCost = mode?.[0] ?? 12;
  const airGain = mode?.[1] ?? 12;
  const solar = SCENARIO.solar[cycle - 1] ?? 0;
  let battery = 0;
  let waterGain = 0;
  let foodGain = 0;
  let safetyLoss = 0;
  let science = state.science;
  let shieldingLevel = state.shieldingLevel;
  let shieldingKits = state.shieldingKits;
  let backupCharges = state.backupCharges;
  const greenhouse = decision.greenhouse && !(cycle === 5 && decision.event === 'off');
  decision.greenhouse = greenhouse;
  explanations.push(`Solar panels supply ${solar} Power. ${decision.mode} life support uses ${mode?.[0] ?? 12} Power and makes ${airGain} Air.`);
  if (cycle === 2 && decision.event === 'battery') {
    if (backupCharges < 1) errors.push('No backup battery charges remain.');
    else { battery = 20; backupCharges--; }
    explanations.push('A backup charge supplies 20 Power and is used up.');
  }
  if (decision.recycler) {
    powerCost += 6;
    waterGain = cycle === 3 && decision.event !== 'repair' ? 4 : 12;
    explanations.push(`Water recycling uses 6 Power and recovers ${waterGain} Water.`);
  }
  if (cycle === 3 && decision.event === 'repair') {
    powerCost += 6;
    explanations.push('Recycler repair uses 6 extra Power. Recovery returns to 12 Water when switched on.');
  }
  if (cycle === 5 && decision.event === 'repair') {
    powerCost += 8;
    explanations.push('Greenhouse repair uses 8 extra Power. Food grows only while the greenhouse is on.');
  }
  if (greenhouse) {
    powerCost += 8;
    foodGain = cycle === 5 && decision.event !== 'repair' ? 0 : 12;
    explanations.push(`The greenhouse uses 8 Power and 5 Water, producing ${foodGain} Food.`);
  }
  if (decision.communications) {
    powerCost += 4; science += 5;
    explanations.push('Communications uses 4 Power and earns 5 Science Points.');
  }
  if (cycle === 4) {
    if (decision.event === 'shield') {
      powerCost += 4;
      if (shieldingKits < 1) errors.push('No shielding kits remain.');
      else { shieldingKits--; shieldingLevel++; }
      safetyLoss = shieldingLevel >= 2 ? 5 : 15;
      explanations.push(`Shielding uses a kit and 4 Power. Regular operations at shielding level ${shieldingLevel} lose ${safetyLoss} Safety.`);
    } else if (decision.event === 'shelter') {
      powerCost += 4; safetyLoss = 2;
      science -= Math.min(5, state.science);
      explanations.push('Sheltering uses 4 extra Power, loses 2 Safety and up to 5 existing Science Points. This Power cost is an illustrative game mechanic, not a NASA shelter measurement. No regular radiation penalty is added.');
    } else {
      safetyLoss = shieldingLevel >= 2 ? 5 : 15;
      explanations.push(`Continuing operations loses ${safetyLoss} Safety at shielding level ${shieldingLevel}.`);
    }
  }
  // Teaching model: generation and the battery are available before this cycle's spending.
  const powerDeficit = Math.max(0, powerCost - state.resources.power - solar - battery);
  if (powerDeficit > 0) errors.push(`Not enough Power. You need ${powerDeficit} more units. Try ECO Air Mode or turn off an optional system.`);
  const resources: Resources = {
    power: clamp(state.resources.power + solar + battery - powerCost),
    air: clamp(state.resources.air + airGain - 10),
    water: clamp(state.resources.water + waterGain - 8 - (greenhouse ? 5 : 0)),
    food: clamp(state.resources.food + foodGain - 8),
    safety: clamp(state.resources.safety - safetyLoss),
  };
  explanations.push('The four crew members use 10 Air, 8 Water, and 8 Food each cycle.');
  const review: Review = { cycle, before: { ...state.resources }, after: resources,
    delta: Object.fromEntries(resourceKeys.map(k => [k, resources[k] - state.resources[k]])) as Resources,
    decision: { ...decision }, explanations, lesson: lessons[cycle - 1] ?? lessons[0],
    scienceBefore: state.science, scienceAfter: science };
  const failed = resourceKeys.some(key => resources[key] <= 0);
  const next: State = { ...state, resources, cycle: failed || cycle === 5 ? cycle : cycle + 1, completedCycles: state.completedCycles + 1,
    shieldingLevel, shieldingKits, backupCharges, science,
    history: [...state.history, review],
    status: failed ? 'failed' : cycle === 5 ? 'success' : 'active' };
  const warnings = resourceKeys.filter(k => resources[k] === 0).map(k => `Your base would run out of ${k === 'safety' ? 'Crew Safety' : k}. This mission will need revision. Try a different plan.`);
  return { next: errors.length ? state : next, review, delta: review.delta, valid: errors.length === 0, errors, warnings, powerCost, solar, powerDeficit,
    eventConsequences: { shieldingLevel: shieldingLevel - state.shieldingLevel, shieldingKits: shieldingKits - state.shieldingKits, backupCharges: backupCharges - state.backupCharges, safetyLoss, scienceChange: science - state.science } };
}
export function runCycle(state: State, decision: Decision, expectedCycle = state.cycle): State {
  if (expectedCycle !== state.cycle) throw new Error('This cycle has already been committed. Review the next cycle before continuing.');
  const result = preview(state, decision);
  if (!result.valid) throw new Error(result.errors.join(' '));
  return result.next;
}
