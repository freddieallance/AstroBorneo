import {
  calculateCycle,
  resourceKeys,
  type CycleForecast,
  type EventChoice,
  type ResourceDelta,
  type Resources,
  type State,
  type SystemSettings,
} from './engine';
import { scoreSummary } from './scoring';
import { eventFor, MODES, RESOURCE_META, SYSTEMS, type ModuleId, type ResourceKey } from '../content/mission';

export type ResourceTone = 'ok' | 'warn' | 'bad';

export interface ResourceGaugeVM {
  key: ResourceKey;
  label: string;
  longLabel: string;
  current: number;
  forecast: number | null;
  delta: number | null;
  tone: ResourceTone;
  statusLabel: 'Healthy' | 'Watch' | 'Critical';
}

export interface EventOptionVM {
  value: EventChoice;
  label: string;
  detail: string;
  selected: boolean;
  valid: boolean;
  affordable: boolean;
  disabledReason: string | null;
  powerCost: number;
  solar: number;
  powerDeficit: number;
  safetyLoss: number;
  scienceChange: number;
}

export interface ModeOptionVM {
  id: SystemSettings['mode'];
  label: string;
  powerCost: number;
  airGain: number;
  netAir: number;
  selected: boolean;
  valid: boolean;
  affordable: boolean;
  powerDeficit: number;
  disabledReason: string | null;
}

export interface SystemOptionVM {
  id: 'greenhouse' | 'recycler' | 'communications';
  label: string;
  costLabel: string;
  gainLabel: string;
  requested: boolean;
  effective: boolean;
  lockedOff: boolean;
  lockReason: string | null;
  validWhenOn: boolean;
  validWhenOff: boolean;
  powerDeficitWhenOn: number;
  disabledReason: string | null;
}

export interface GameViewModel {
  cycle: number;
  maxCycles: number;
  completedCycles: number;
  status: State['status'];
  outcomeLabel: 'Mission Active' | 'Mission Success' | 'Mission Needs Revision';
  canRunCycle: boolean;
  resources: Record<ResourceKey, ResourceGaugeVM>;
  inventory: {
    shieldingLevel: number;
    shieldingKits: number;
    backupCharges: number;
    science: number;
    forecastScience: number | null;
    scienceDelta: number | null;
  };
  pending: {
    settings: SystemSettings;
    eventChoice: EventChoice;
    effectiveGreenhouse: boolean;
  };
  event: {
    cycle: number;
    title: string;
    severity: 'nominal' | 'caution' | 'alert';
    relatesTo: ModuleId;
    briefing: string;
    science: string;
    selected: EventChoice;
    hasValidSelection: boolean;
    options: EventOptionVM[];
  };
  modes: ModeOptionVM[];
  systems: Record<'greenhouse' | 'recycler' | 'communications', SystemOptionVM>;
  forecast: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    solar: number;
    powerCost: number;
    powerDeficit: number;
    effectiveGreenhouse: boolean;
    delta: ResourceDelta | null;
    after: Resources | null;
    explanations: string[];
    lesson: string;
    nextStatus: State['status'];
    eventConsequences: CycleForecast['eventConsequences'];
  };
  score: ReturnType<typeof scoreSummary>;
}

const getTone = (value: number): ResourceTone => (value >= 50 ? 'ok' : value >= 25 ? 'warn' : 'bad');
const getStatusLabel = (value: number): 'Healthy' | 'Watch' | 'Critical' =>
  value >= 50 ? 'Healthy' : value >= 25 ? 'Watch' : 'Critical';

/**
 * Pure ViewModel selector bridging AstroBorneo's Moon Base / popup UI to the
 * canonical simulation engine without duplicating formulas or mutating state.
 */
export function getViewModel(
  gameState: State,
  pendingSettings: SystemSettings,
  eventChoice: EventChoice,
): GameViewModel {
  const forecast = calculateCycle(gameState, pendingSettings, eventChoice);
  const effectiveGreenhouse = forecast.review.decision.greenhouse;
  const ev = eventFor(gameState.cycle);
  const validEventSet = new Set<EventChoice>(ev.options.map((o) => o.value));

  const resources = Object.fromEntries(
    resourceKeys.map((key) => {
      const current = gameState.resources[key];
      const nextVal = forecast.valid ? forecast.next.resources[key] : null;
      const delta = forecast.valid ? forecast.delta[key] : null;
      return [
        key,
        {
          key,
          label: RESOURCE_META[key].label,
          longLabel: RESOURCE_META[key].long,
          current,
          forecast: nextVal,
          delta,
          tone: getTone(current),
          statusLabel: getStatusLabel(current),
        } satisfies ResourceGaugeVM,
      ];
    }),
  ) as Record<ResourceKey, ResourceGaugeVM>;

  const c3RepairBlocked = gameState.cycle === 3 && !pendingSettings.recycler;
  const c5RepairBlocked = gameState.cycle === 5 && !pendingSettings.greenhouse;
  const nonsenseRepairSelected =
    (c3RepairBlocked && eventChoice === 'repair') ||
    (c5RepairBlocked && eventChoice === 'repair');
  const nonsenseRepairMessage = c3RepairBlocked
    ? 'Water Recycler is OFF (0 Water recovered). Switch Water ON to fix, or pick Wait.'
    : c5RepairBlocked
      ? 'Greenhouse is OFF (0 Food grown). Switch Plants ON to fix, or pick Turn Off.'
      : null;

  const options: EventOptionVM[] = ev.options.map((opt) => {
    const optionPreview = calculateCycle(gameState, pendingSettings, opt.value);
    const blockedByOffSystem =
      opt.value === 'repair' && (c3RepairBlocked || c5RepairBlocked);
    const valid = optionPreview.valid && !blockedByOffSystem;
    const affordable = optionPreview.powerDeficit === 0;
    const disabledReason = blockedByOffSystem
      ? (c3RepairBlocked
          ? 'Water Recycler is OFF — recovers 0 Water. Switch it ON first.'
          : 'Greenhouse is OFF — switch Plants ON first to fix.')
      : optionPreview.valid
        ? null
        : (optionPreview.errors[0] ?? 'Action unavailable.');
    return {
      value: opt.value,
      label: opt.label,
      detail: opt.detail,
      selected: eventChoice === opt.value,
      valid,
      affordable,
      disabledReason,
      powerCost: optionPreview.powerCost,
      solar: optionPreview.solar,
      powerDeficit: optionPreview.powerDeficit,
      safetyLoss: optionPreview.eventConsequences.safetyLoss,
      scienceChange: optionPreview.eventConsequences.scienceChange,
    };
  });

  const modes: ModeOptionVM[] = (Object.keys(MODES) as SystemSettings['mode'][]).map((modeId) => {
    const modePreview = calculateCycle(gameState, { ...pendingSettings, mode: modeId }, eventChoice);
    const affordable = modePreview.powerDeficit === 0;
    return {
      id: modeId,
      label: MODES[modeId].label,
      powerCost: MODES[modeId].power,
      airGain: MODES[modeId].air,
      netAir: MODES[modeId].net,
      selected: pendingSettings.mode === modeId,
      valid: modePreview.valid,
      affordable,
      powerDeficit: modePreview.powerDeficit,
      disabledReason: modePreview.valid ? null : (modePreview.errors[0] ?? 'Mode unavailable.'),
    };
  });

  const systemIds = ['greenhouse', 'recycler', 'communications'] as const;
  const systems = Object.fromEntries(
    systemIds.map((id) => {
      const lockedOff = id === 'greenhouse' && gameState.cycle === 5 && eventChoice === 'off';
      const onPreview = calculateCycle(gameState, { ...pendingSettings, [id]: true }, eventChoice);
      const offPreview = calculateCycle(gameState, { ...pendingSettings, [id]: false }, eventChoice);
      const requested = pendingSettings[id];
      const effective = id === 'greenhouse' ? effectiveGreenhouse : requested;
      return [
        id,
        {
          id,
          label: SYSTEMS[id].label,
          costLabel: SYSTEMS[id].cost,
          gainLabel: SYSTEMS[id].gain,
          requested,
          effective,
          lockedOff,
          lockReason: lockedOff ? 'Turned off by your event response.' : null,
          validWhenOn: !lockedOff && onPreview.valid,
          validWhenOff: offPreview.valid,
          powerDeficitWhenOn: onPreview.powerDeficit,
          disabledReason: lockedOff
            ? 'Turned off by your event response.'
            : !onPreview.valid
              ? (onPreview.errors[0] ?? null)
              : null,
        } satisfies SystemOptionVM,
      ];
    }),
  ) as Record<'greenhouse' | 'recycler' | 'communications', SystemOptionVM>;

  const outcomeLabel: GameViewModel['outcomeLabel'] =
    gameState.status === 'success'
      ? 'Mission Success'
      : gameState.status === 'failed'
        ? 'Mission Needs Revision'
        : 'Mission Active';

  const effectiveErrors =
    nonsenseRepairSelected && nonsenseRepairMessage
      ? [...forecast.errors, nonsenseRepairMessage]
      : forecast.errors;
  const forecastValid = forecast.valid && !nonsenseRepairSelected;

  return {
    cycle: gameState.cycle,
    maxCycles: gameState.maxCycles,
    completedCycles: gameState.completedCycles,
    status: gameState.status,
    outcomeLabel,
    canRunCycle: gameState.status === 'active' && forecastValid,
    resources,
    inventory: {
      shieldingLevel: gameState.shieldingLevel,
      shieldingKits: gameState.shieldingKits,
      backupCharges: gameState.backupCharges,
      science: gameState.science,
      forecastScience: forecastValid ? forecast.next.science : null,
      scienceDelta: forecastValid ? forecast.eventConsequences.scienceChange : null,
    },
    pending: {
      settings: { ...pendingSettings, greenhouse: effectiveGreenhouse },
      eventChoice,
      effectiveGreenhouse,
    },
    event: {
      cycle: ev.cycle,
      title: ev.title,
      severity: ev.severity,
      relatesTo: ev.relatesTo,
      briefing: ev.briefing,
      science: ev.science,
      selected: eventChoice,
      hasValidSelection: validEventSet.has(eventChoice),
      options,
    },
    modes,
    systems,
    forecast: {
      valid: forecastValid,
      errors: effectiveErrors,
      warnings: forecast.warnings,
      solar: forecast.solar,
      powerCost: forecast.powerCost,
      powerDeficit: forecast.powerDeficit,
      effectiveGreenhouse,
      delta: forecastValid ? forecast.delta : null,
      after: forecastValid ? forecast.next.resources : null,
      explanations: forecast.review.explanations,
      lesson: forecast.review.lesson,
      nextStatus: forecast.next.status,
      eventConsequences: forecast.eventConsequences,
    },
    score: scoreSummary(gameState, gameState.quizCompleted, gameState.correctQuizAnswers),
  };
}
