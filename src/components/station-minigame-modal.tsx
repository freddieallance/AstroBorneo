import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  ExternalLink,
  Radio,
  Satellite,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Users,
  X,
} from 'lucide-react';
import type { ModuleId } from '@/content/mission';
import { STATION_NASA_FACTS, type SpaceWeatherViewSummary } from '@/content/nasa-grounding';
import {
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  STATION_CHOICES,
  STATIONS,
  type BaseResources,
  type ResourceKey,
  type StationChoiceOption,
} from '@/game/survival-engine';
import type { NasaResearchPayload } from '@/services/research-client';
import { playMusicalBeep, playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

function StationMiniIcon({ id }: { id: ModuleId }) {
  switch (id) {
    case 'solar':
      return <Sun className="h-6 w-6 text-[#d98a1c]" />;
    case 'greenhouse':
      return <Sprout className="h-6 w-6 text-[#259b6c]" />;
    case 'habitat':
      return <Users className="h-6 w-6 text-[#2c78b8]" />;
    case 'recycler':
      return <Droplets className="h-6 w-6 text-[#3478c6]" />;
    case 'shelter':
      return <Shield className="h-6 w-6 text-[#6f58b8]" />;
    case 'comms':
      return <Radio className="h-6 w-6 text-[#c94e6b]" />;
  }
}

const STATION_TO_RESOURCE: Record<ModuleId, ResourceKey> = {
  solar: 'power',
  habitat: 'air',
  recycler: 'water',
  greenhouse: 'food',
  shelter: 'safety',
  comms: 'safety',
};

const RESOURCE_COLORS: Record<ResourceKey, string> = {
  power: '#ffc56f',
  air: '#76dbae',
  water: '#73bfff',
  food: '#96df8a',
  safety: '#b4a0ef',
};

const BLOOM_EMOJIS = ['🌻', '🌼', '🌷', '🌺'];

export function StationMiniGameModal({
  stationId,
  stationHealth,
  resources,
  spaceWeather,
  research,
  onComplete,
  onClose,
}: {
  stationId: ModuleId;
  stationHealth: number;
  resources?: BaseResources;
  spaceWeather?: SpaceWeatherViewSummary;
  research?: NasaResearchPayload;
  onComplete: (choiceId: string, quality: 'perfect' | 'good' | 'missed') => void;
  onClose: () => void;
}) {
  const meta = STATIONS[stationId];
  const choices = STATION_CHOICES[stationId];
  const nasaFact = STATION_NASA_FACTS[stationId];
  const showDonkiBadge =
    Boolean(spaceWeather?.record) &&
    (stationId === 'shelter' || stationId === 'comms' || stationId === 'solar');

  const [step, setStep] = useState<'choice' | 'minigame'>('choice');
  const [selectedChoice, setSelectedChoice] = useState<StationChoiceOption | null>(null);
  const [hoveredChoice, setHoveredChoice] = useState<StationChoiceOption>(choices[0]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [oopsBanner, setOopsBanner] = useState<string | null>(null);

  // Mini-game states (keeping minigame-node-0..3, pipe-0..3, oxygen-lock-btn, radio-minus/plus intact)
  const [nodesDone, setNodesDone] = useState<boolean[]>([false, false, false, false]);
  const [decoyShake, setDecoyShake] = useState<number | null>(null);
  const [needlePos, setNeedlePos] = useState(15);
  const [locksCount, setLocksCount] = useState(0);
  const dirRef = useRef(1);
  const [pipes, setPipes] = useState<number[]>([1, 2, 1, 3]);
  const [freq, setFreq] = useState(2);
  const targetFreq = 5;

  const finishedRef = useRef(false);

  const finishGame = (quality: 'perfect' | 'good' | 'missed') => {
    if (finishedRef.current || !selectedChoice) return;
    finishedRef.current = true;
    playSfx(quality === 'missed' ? 'oops' : 'good');
    onComplete(selectedChoice.id, quality);
  };

  useEffect(() => {
    if (step !== 'minigame') return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 'minigame' && timeLeft === 0 && !finishedRef.current) {
      finishGame('missed');
    }
  });

  useEffect(() => {
    if (step !== 'minigame' || meta.miniGameKind !== 'oxygen_lock') return;
    const id = window.setInterval(() => {
      setNeedlePos((p) => {
        let next = p + dirRef.current * 4.5;
        if (next >= 96) {
          next = 96;
          dirRef.current = -1;
        } else if (next <= 4) {
          next = 4;
          dirRef.current = 1;
        }
        return next;
      });
    }, 40);
    return () => window.clearInterval(id);
  }, [step, meta.miniGameKind]);

  useEffect(() => {
    if (step !== 'minigame') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (meta.miniGameKind === 'oxygen_lock' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleLockOxygen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleLockOxygen = () => {
    if (needlePos >= 32 && needlePos <= 68) {
      playMusicalBeep(true);
      setOopsBanner(null);
      const nextLocks = locksCount + 1;
      setLocksCount(nextLocks);
      if (nextLocks >= 2) {
        finishGame(timeLeft >= 6 ? 'perfect' : 'good');
      }
    } else {
      playMusicalBeep(false);
      setOopsBanner('Wait until the golden needle hits the green zone!');
    }
  };

  const handleTapNode = (idx: number) => {
    if (nodesDone[idx]) return;
    playMusicalBeep(true);
    setOopsBanner(null);
    const next = [...nodesDone];
    next[idx] = true;
    setNodesDone(next);
    if (next.every(Boolean)) {
      finishGame(timeLeft >= 6 ? 'perfect' : 'good');
    }
  };

  const handleTapDecoy = (decoyIdx: number, message: string) => {
    playMusicalBeep(false);
    setDecoyShake(decoyIdx);
    setOopsBanner(message);
    window.setTimeout(() => setDecoyShake(null), 350);
  };

  const handleRotatePipe = (idx: number) => {
    playMusicalBeep(true);
    const next = [...pipes];
    next[idx] = (next[idx] + 1) % 4;
    setPipes(next);
    if (next.every((v) => v === 0)) {
      finishGame(timeLeft >= 5 ? 'perfect' : 'good');
    }
  };

  const handleAdjustFreq = (delta: number) => {
    const next = Math.max(1, Math.min(7, freq + delta));
    setFreq(next);
    if (next === targetFreq) {
      playMusicalBeep(true);
      finishGame(timeLeft >= 6 ? 'perfect' : 'good');
    } else {
      playSfx('tap');
    }
  };

  // Compute Before -> After resource preview for the hovered choice
  const previewDeltas = useMemo(() => {
    const deltas: Partial<Record<ResourceKey, number>> = {};
    const selfRes = STATION_TO_RESOURCE[stationId];
    deltas[selfRes] = (deltas[selfRes] ?? 0) + hoveredChoice.selfHeal;
    for (const [sid, delta] of Object.entries(hoveredChoice.sideEffects) as [ModuleId, number][]) {
      const rKey = STATION_TO_RESOURCE[sid];
      deltas[rKey] = (deltas[rKey] ?? 0) + delta;
    }
    return deltas;
  }, [hoveredChoice, stationId]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#14193f]/75 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.label} Station`}
      data-testid="station-minigame-modal"
    >
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[28px] border-[6px] border-white bg-[#fffefa] text-[#344270] shadow-[0_24px_60px_-14px_rgba(12,16,48,0.65)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#eaeeff] bg-[#f3f5ff] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-white bg-white shadow-sm">
              <StationMiniIcon id={stationId} />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#222a5b]">
                {meta.label}
              </h2>
              <p className="font-mono text-xs font-extrabold text-[#49be8f] tabular-nums">
                Station Health: {Math.round(stationHealth)}%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="grid h-11 w-11 place-items-center rounded-xl border-2 border-[#e0e6fa] bg-white text-[#5d6c96] hover:border-[#ff7b8a] hover:text-[#e04f64]"
            aria-label="Close station"
            data-testid="button-close-station-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Pick Choice & See Before -> After Preview */}
        {step === 'choice' && (
          <div className="p-5">
            <p className="font-display text-base font-extrabold text-[#222a5b]">
              1. Pick your plan (watch Before → After!):
            </p>

            {/* Interactive Before -> After resource strip */}
            {resources && (
              <div
                className="mt-2.5 grid grid-cols-5 gap-1.5 rounded-2xl border-2 border-[#e6ebfb] bg-[#f5f7ff] p-2.5"
                data-testid="choice-before-after-preview"
              >
                {RESOURCE_KEYS.map((rk) => {
                  const cur = Math.round(resources[rk]);
                  const delta = previewDeltas[rk] ?? 0;
                  const after = Math.max(0, Math.min(100, cur + delta));
                  return (
                    <div key={rk} className="rounded-xl bg-white px-1.5 py-1.5 text-center shadow-xs">
                      <span className="block font-display text-[10px] font-extrabold text-[#647498]">
                        {RESOURCE_LABELS[rk]}
                      </span>
                      <div className="mt-0.5 flex items-center justify-center gap-0.5 font-mono text-[10.5px] font-extrabold tabular-nums">
                        <span className="text-[#344270]">{cur}%</span>
                        {delta !== 0 && (
                          <span className={delta > 0 ? 'text-[#259b6c]' : 'text-[#e04f64]'}>
                            →{after}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e5eaf8]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${after}%`,
                            backgroundColor: RESOURCE_COLORS[rk],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 space-y-2.5">
              {choices.map((c) => {
                const isPreviewed = hoveredChoice.id === c.id;
                const tagColors =
                  c.riskTag === 'tradeoff'
                    ? 'border-[#ffcf79] bg-[#fff7e6] hover:bg-[#ffefcf]'
                    : c.riskTag === 'boost'
                      ? 'border-[#b4a0ef] bg-[#f4f0ff] hover:bg-[#ebe4ff]'
                      : 'border-[#76dbae] bg-[#ebfaf3] hover:bg-[#dcf7ea]';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setHoveredChoice(c)}
                    onFocus={() => setHoveredChoice(c)}
                    onClick={() => {
                      playSfx('tap');
                      setSelectedChoice(c);
                      setTimeLeft(10);
                      setOopsBanner(null);
                      setStep('minigame');
                    }}
                    data-testid={`choice-${c.id}`}
                    className={cn(
                      'flex min-h-[64px] w-full flex-col gap-1 rounded-2xl border-2 px-4 py-3 text-left transition active:translate-y-0.5',
                      tagColors,
                      isPreviewed && 'ring-2 ring-[#344270]/25',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-extrabold text-[#222a5b]">
                        {c.title}
                      </span>
                      <span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-[#506090]">
                        {c.badge}
                      </span>
                    </div>
                    <p className="font-mono text-xs font-extrabold text-[#364272]">
                      {c.effectText}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Real NASA Science Fact + Live ISS RadLab / OSDR-314 / DONKI */}
            <div
              className="mt-4 rounded-2xl border-2 border-[#cce2ff] bg-[#edf6ff] p-3.5"
              data-testid="station-nasa-fact"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Satellite className="h-4 w-4 text-[#2c78b8]" />
                  <span className="font-display text-xs font-extrabold uppercase tracking-wide text-[#245994]">
                    Real NASA Science · {nasaFact.headline}
                  </span>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-[#259b6c]">
                  {nasaFact.badgeLabel}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#344270]">
                {nasaFact.factText}
              </p>

              {/* Live/Archived ISS RadLab reading on Shelter */}
              {stationId === 'shelter' && research?.radlab && (
                <div
                  className="mt-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#d6c9ff] bg-[#f4f0ff] px-2.5 py-1.5 text-[11px]"
                  data-testid="station-radlab-badge"
                >
                  <span className="font-mono font-extrabold text-[#543a9e]">
                    {research.radlab.mode === 'LIVE_DATA' ? 'LIVE ISS RadLab' : 'ARCHIVED ISS RadLab'}:{' '}
                    {research.radlab.selected.doseRate.toFixed(1)} µGy/h ({research.radlab.selected.instrument})
                  </span>
                  <a
                    href={research.radlab.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#2c78b8] hover:underline"
                  >
                    RadLab API <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Live/Reference NASA OSDR-314 on Greenhouse */}
              {stationId === 'greenhouse' && research?.osdr && (
                <div
                  className="mt-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#b8edd4] bg-[#e9faf2] px-2.5 py-1.5 text-[11px]"
                  data-testid="station-osdr-badge"
                >
                  <span className="font-mono font-extrabold text-[#1e7a54]">
                    {research.osdr.id}: {research.osdr.title}
                  </span>
                  <a
                    href={research.osdr.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#259b6c] hover:underline"
                  >
                    OSDR-314 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Earth Calling ~1.3s/2.6s speed-of-light callout on Comms */}
              {stationId === 'comms' && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#ffd2dc] bg-[#fff0f3] px-2.5 py-1.5 text-[11px]">
                  <span className="font-mono font-extrabold text-[#9f3351]">
                    🌙 → 🌍 Earth Calling Delay: ~1.3s one way (~2.6s round-trip)
                  </span>
                </div>
              )}

              {showDonkiBadge && spaceWeather?.record && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#ffe0a6] bg-[#fff7e6] px-2.5 py-1.5 text-[11px]">
                  <span className="font-mono font-extrabold text-[#9b6110]">
                    {spaceWeather.modeBadge}: {spaceWeather.record.id}
                  </span>
                  <a
                    href={spaceWeather.record.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#2c78b8] hover:underline"
                  >
                    DONKI Record <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-[#5b6c94]">
                  Station choices stay simulated for fun gameplay.
                </span>
                <a
                  href={nasaFact.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-mono font-extrabold text-[#2c78b8] hover:underline"
                  data-testid="station-nasa-source-link"
                >
                  {nasaFact.sourceLabel} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Playful Interactive Mini-Game */}
        {step === 'minigame' && selectedChoice && (
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-display text-lg font-extrabold text-[#222a5b]">
                  2. {meta.miniGameTitle}
                </p>
                <p className="text-sm font-semibold text-[#607094]">
                  {meta.miniGameKind === 'solar_aim'
                    ? 'Tap the 4 dusty panels (skip Moon rocks!)'
                    : meta.miniGameKind === 'plant_sprout'
                      ? 'Tap the 4 seeds to bloom flowers (skip crater rocks!)'
                      : meta.miniGameKind === 'shield_meteor'
                        ? 'Tap all 4 shield pads to guard the crew!'
                        : meta.miniGameHint}
                </p>
              </div>
              <div className="rounded-xl border-2 border-[#ffcf79] bg-[#fff5dc] px-3 py-1.5 font-mono text-base font-extrabold text-[#9b6110] tabular-nums">
                {timeLeft}s
              </div>
            </div>

            {oopsBanner && (
              <p className="mt-2.5 rounded-xl border border-[#ffb8c2] bg-[#fff0f2] px-3 py-1.5 text-center font-display text-xs font-extrabold text-[#c43a51]">
                {oopsBanner}
              </p>
            )}

            <div className="mt-4 rounded-2xl border-2 border-[#e6ebfa] bg-[#f4f6ff] p-4 sm:p-5">
              {(meta.miniGameKind === 'solar_aim' ||
                meta.miniGameKind === 'plant_sprout' ||
                meta.miniGameKind === 'shield_meteor') && (
                <div className="grid grid-cols-3 gap-2.5">
                  {nodesDone.map((done, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTapNode(idx)}
                      data-testid={`minigame-node-${idx}`}
                      className={cn(
                        'flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-b-4 font-display text-xs font-extrabold transition active:translate-y-0.5 sm:text-sm',
                        done
                          ? 'border-[#49be8f] bg-[#e5f9ef] text-[#1f7d57]'
                          : meta.miniGameKind === 'solar_aim'
                            ? 'border-[#d6a34a] bg-[#ffeac1] text-[#6e460d] hover:brightness-105'
                            : meta.miniGameKind === 'plant_sprout'
                              ? 'border-[#6cc48c] bg-[#e4f9ec] text-[#1e6d4a] hover:brightness-105'
                              : 'border-[#9c89df] bg-[#efeaff] text-[#4c388f] hover:brightness-105',
                      )}
                    >
                      {done ? (
                        <>
                          <span className="text-2xl" aria-hidden>
                            {meta.miniGameKind === 'plant_sprout'
                              ? BLOOM_EMOJIS[idx % BLOOM_EMOJIS.length]
                              : meta.miniGameKind === 'solar_aim'
                                ? '✨'
                                : '🛡️'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {meta.miniGameKind === 'plant_sprout'
                              ? 'BLOOMED!'
                              : meta.miniGameKind === 'solar_aim'
                                ? 'CLEAN!'
                                : 'GUARDED!'}
                          </span>
                        </>
                      ) : meta.miniGameKind === 'solar_aim' ? (
                        <>
                          <span className="text-2xl" aria-hidden>🟫</span>
                          <span>WIPE PANEL</span>
                        </>
                      ) : meta.miniGameKind === 'plant_sprout' ? (
                        <>
                          <span className="text-2xl" aria-hidden>🌱</span>
                          <span>GROW SEED</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl" aria-hidden>☄️</span>
                          <span>BLOCK!</span>
                        </>
                      )}
                    </button>
                  ))}

                  {/* Playful Moon rock / crater decoys (non-blocking educational distractors) */}
                  {[0, 1].map((dIdx) => (
                    <button
                      key={`decoy-${dIdx}`}
                      type="button"
                      onClick={() =>
                        handleTapDecoy(
                          dIdx,
                          meta.miniGameKind === 'solar_aim'
                            ? "Oops! That's a Moon rock — tap dusty brown panels!"
                            : meta.miniGameKind === 'plant_sprout'
                              ? "Oops! Plants can't grow on crater rocks — tap seedlings!"
                              : 'Oops! Guard the flashing shield tiles!',
                        )
                      }
                      data-testid={`minigame-decoy-${dIdx}`}
                      className={cn(
                        'flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#d9dfef] bg-[#e9edf9] font-display text-xs font-extrabold text-[#67759c] transition hover:bg-[#e1e6f6]',
                        decoyShake === dIdx && 'border-[#ff7b8a] bg-[#ffe9ec] text-[#c43a51]',
                      )}
                    >
                      <span className="text-2xl" aria-hidden>
                        {dIdx === 0 ? '🪨' : '🌑'}
                      </span>
                      <span>Moon Rock</span>
                    </button>
                  ))}
                </div>
              )}

              {meta.miniGameKind === 'oxygen_lock' && (
                <div className="space-y-4 text-center">
                  <p className="font-mono text-sm font-extrabold text-[#344270] tabular-nums">
                    Locks Completed: {locksCount} / 2
                  </p>
                  <div className="relative h-10 w-full overflow-hidden rounded-xl border-2 border-[#d4ddf7] bg-white">
                    <div
                      className="absolute inset-y-0 border-x-2 border-[#49be8f] bg-[#76dbae]/45"
                      style={{ left: '32%', width: '36%' }}
                    />
                    <div
                      className="absolute inset-y-1 w-3 -translate-x-1/2 rounded-full bg-[#ffaf40] shadow"
                      style={{ left: `${needlePos}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLockOxygen}
                    data-testid="minigame-oxygen-lock-btn"
                    className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-6 py-3 font-display text-xl font-extrabold text-[#364272] shadow-[0_5px_0_#e7a959] hover:brightness-105 active:translate-y-0.5"
                  >
                    <Sparkles className="h-5 w-5" />
                    LOCK AIR NOW!
                  </button>
                </div>
              )}

              {meta.miniGameKind === 'pipe_unclog' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs font-extrabold text-[#5a6a93]">
                    Tap each pipe until all turn glowing blue (Straight!)
                  </p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {pipes.map((rot, idx) => {
                      const aligned = rot === 0;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRotatePipe(idx)}
                          data-testid={`minigame-pipe-${idx}`}
                          className={cn(
                            'flex min-h-[78px] flex-col items-center justify-center rounded-2xl border-2 font-mono text-xs font-extrabold transition',
                            aligned
                              ? 'border-[#49be8f] bg-[#e5f9ef] text-[#1f7d57]'
                              : 'border-[#ffcf79] bg-white text-[#9b6110]',
                          )}
                        >
                          <div
                            className={cn(
                              'h-3 w-12 rounded-full transition-transform',
                              aligned ? 'bg-[#4fb3f6]' : 'bg-[#ffb547]',
                            )}
                            style={{ transform: `rotate(${rot * 45}deg)` }}
                          />
                          <span className="mt-2">{aligned ? 'CLEAR' : 'TAP'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {meta.miniGameKind === 'radio_tune' && (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center gap-3 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-[#344270] shadow-xs">
                    <span>🌙 Moon Base</span>
                    <span className="font-mono text-[#4fb3f6]">
                      {freq === targetFreq ? '━━ CONNECTED ━━' : '· · ~ 1.3s light wave ~ · ·'}
                    </span>
                    <span>🌍 Earth</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div
                        key={bar}
                        className={cn(
                          'w-6 rounded-t-lg transition-all',
                          bar === targetFreq ? 'ring-2 ring-[#49be8f]' : '',
                          bar <= freq ? 'bg-[#4fb3f6]' : 'bg-[#dfe5f7]',
                        )}
                        style={{ height: `${18 + bar * 8}px` }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-sm font-extrabold text-[#222a5b] tabular-nums">
                    Signal: {freq} · Earth Target: {targetFreq}
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleAdjustFreq(-1)}
                      data-testid="minigame-radio-minus"
                      className="min-h-[52px] min-w-[96px] rounded-2xl border-2 border-[#d4ddf5] bg-white px-6 font-display text-2xl font-extrabold text-[#344270] shadow-[0_4px_0_#d4ddf5] hover:bg-[#eef2ff]"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustFreq(1)}
                      data-testid="minigame-radio-plus"
                      className="min-h-[52px] min-w-[96px] rounded-2xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-6 font-display text-2xl font-extrabold text-[#364272] shadow-[0_4px_0_#e7a959] hover:brightness-105"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-center font-mono text-xs font-extrabold text-[#364272]">
              Choice Effect: {selectedChoice.effectText}
            </p>
            <p className="mt-1 text-center font-mono text-[10px] font-bold text-[#607094]">
              Real NASA Ref: {nasaFact.badgeLabel} · {nasaFact.sourceLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
