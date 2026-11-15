import { calculateCycle, type Decision, type EventChoice, type State } from './engine';

export interface PowerFixSuggestion {
  label: string;
  patch: Partial<Decision>;
}

/**
 * Finds the gentlest 1-tap fix when a young player runs into a Power deficit,
 * testing candidates against the real simulation engine so the suggestion is
 * always truthful and valid.
 */
export function findPowerFixSuggestion(
  game: State,
  draft: Decision,
  eventChoice: EventChoice,
): PowerFixSuggestion | null {
  const current = calculateCycle(game, draft, eventChoice);
  if (current.powerDeficit <= 0) return null;

  const candidates: PowerFixSuggestion[] = [];

  if (game.cycle === 2 && eventChoice !== 'battery' && game.backupCharges > 0) {
    candidates.push({ label: 'Use Backup Battery (+20 Power)', patch: { event: 'battery' } });
  }
  if (draft.communications) {
    candidates.push({ label: 'Turn Radio OFF (Saves 4 Power)', patch: { communications: false } });
  }
  if (draft.mode === 'boost') {
    candidates.push({ label: 'Switch Air to Normal (Saves 6 Power)', patch: { mode: 'standard' } });
    candidates.push({ label: 'Switch Air to Slow (Saves 11 Power)', patch: { mode: 'eco' } });
  } else if (draft.mode === 'standard') {
    candidates.push({ label: 'Switch Air to Slow (Saves 5 Power)', patch: { mode: 'eco' } });
  }
  if (draft.greenhouse) {
    candidates.push({ label: 'Turn Plants OFF (Saves 8 Power)', patch: { greenhouse: false } });
  }
  if (draft.recycler) {
    candidates.push({ label: 'Turn Water Cleaner OFF (Saves 6 Power)', patch: { recycler: false } });
  }
  if (draft.communications && draft.mode !== 'eco') {
    candidates.push({
      label: 'Radio OFF + Slow Air',
      patch: { communications: false, mode: 'eco' },
    });
  }
  if (draft.greenhouse && draft.mode !== 'eco') {
    candidates.push({
      label: 'Plants OFF + Slow Air',
      patch: { greenhouse: false, mode: 'eco' },
    });
  }
  if (draft.greenhouse && draft.recycler && draft.communications) {
    candidates.push({
      label: 'Save Power (Slow Air + Radio OFF)',
      patch: { mode: 'eco', communications: false },
    });
  }
  candidates.push({
    label: 'Safe Power Plan (Slow Air only)',
    patch: { mode: 'eco', communications: false, greenhouse: false },
  });

  for (const cand of candidates) {
    const nextDraft: Decision = { ...draft, ...cand.patch };
    const nextEvent = cand.patch.event ?? eventChoice;
    const res = calculateCycle(game, nextDraft, nextEvent);
    if (res.powerDeficit === 0 && res.valid) {
      return cand;
    }
  }

  // Fallback: pick whichever reduces deficit the most
  let best: PowerFixSuggestion | null = null;
  let bestDeficit = current.powerDeficit;
  for (const cand of candidates) {
    const nextDraft: Decision = { ...draft, ...cand.patch };
    const nextEvent = cand.patch.event ?? eventChoice;
    const res = calculateCycle(game, nextDraft, nextEvent);
    if (res.powerDeficit < bestDeficit) {
      bestDeficit = res.powerDeficit;
      best = cand;
    }
  }
  return best;
}
