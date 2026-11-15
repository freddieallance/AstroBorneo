import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Droplets, Radio, Shield, Sparkles, Sprout, Sun, Users, X } from 'lucide-react';
import type { ModuleId } from '@/content/mission';
import { STATION_CHOICES, STATIONS, type StationChoiceOption } from '@/game/survival-engine';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

function StationMiniIcon({ id }: { id: ModuleId }) {
  switch (id) {
    case 'solar': return <Sun className="h-6 w-6 text-warn" />;
    case 'greenhouse': return <Sprout className="h-6 w-6 text-ok" />;
    case 'habitat': return <Users className="h-6 w-6 text-aqua" />;
    case 'recycler': return <Droplets className="h-6 w-6 text-ion" />;
    case 'shelter': return <Shield className="h-6 w-6 text-warn" />;
    case 'comms': return <Radio className="h-6 w-6 text-ion" />;
  }
}

export function StationMiniGameModal({
  stationId,
  stationHealth,
  onComplete,
  onClose,
}: {
  stationId: ModuleId;
  stationHealth: number;
  onComplete: (choiceId: string, quality: 'perfect' | 'good' | 'missed') => void;
  onClose: () => void;
}) {
  const meta = STATIONS[stationId];
  const choices = STATION_CHOICES[stationId];

  const [step, setStep] = useState<'choice' | 'minigame'>('choice');
  const [selectedChoice, setSelectedChoice] = useState<StationChoiceOption | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);

  // Mini-game states
  // 1. solar_aim & plant_sprout & shield_meteor: 4 clickable targets
  const [nodesDone, setNodesDone] = useState<boolean[]>([false, false, false, false]);
  // 2. oxygen_lock: oscillating needle 0..100, need 2 locks inside 35..65
  const [needlePos, setNeedlePos] = useState(15);
  const [locksCount, setLocksCount] = useState(0);
  const dirRef = useRef(1);
  // 3. pipe_unclog: 4 pipe tiles rotated 0..3, tap until all match 0
  const [pipes, setPipes] = useState<number[]>([1, 2, 1, 3]);
  // 4. radio_tune: match slider/button value (1..7) to target (5)
  const [freq, setFreq] = useState(2);
  const targetFreq = 5;

  const finishedRef = useRef(false);

  const finishGame = (quality: 'perfect' | 'good' | 'missed') => {
    if (finishedRef.current || !selectedChoice) return;
    finishedRef.current = true;
    playSfx(quality === 'missed' ? 'oops' : 'good');
    onComplete(selectedChoice.id, quality);
  };

  // Countdown timer during mini-game
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

  // Oscillate needle for oxygen_lock
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

  // Keyboard support inside mini-game (Space/Enter for oxygen lock)
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
      playSfx('on');
      const nextLocks = locksCount + 1;
      setLocksCount(nextLocks);
      if (nextLocks >= 2) {
        finishGame(timeLeft >= 6 ? 'perfect' : 'good');
      }
    } else {
      playSfx('oops');
    }
  };

  const handleTapNode = (idx: number) => {
    if (nodesDone[idx]) return;
    playSfx('on');
    const next = [...nodesDone];
    next[idx] = true;
    setNodesDone(next);
    if (next.every(Boolean)) {
      finishGame(timeLeft >= 6 ? 'perfect' : 'good');
    }
  };

  const handleRotatePipe = (idx: number) => {
    playSfx('tap');
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
      playSfx('on');
      finishGame(timeLeft >= 6 ? 'perfect' : 'good');
    } else {
      playSfx('tap');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-deep/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.label} Station`}
      data-testid="station-minigame-modal"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border-2 border-aqua/60 bg-hull shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dim/20 bg-deep/80 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-dim/25 bg-plate">
              <StationMiniIcon id={stationId} />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">
                {meta.label}
              </h2>
              <p className="font-mono text-xs font-bold text-aqua tabular-nums">
                Health: {Math.round(stationHealth)}%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="grid h-11 w-11 place-items-center rounded-xl border border-dim/25 bg-plate text-dim hover:border-bad hover:text-bad"
            aria-label="Close station"
            data-testid="button-close-station-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Pick Choice & See Consequences */}
        {step === 'choice' && (
          <div className="p-5">
            <p className="font-display text-base font-extrabold text-ink">
              1. Pick what to do (every choice changes the base!):
            </p>
            <div className="mt-3.5 space-y-2.5">
              {choices.map((c) => {
                const tagBorder =
                  c.riskTag === 'tradeoff'
                    ? 'border-warn/60 hover:border-warn'
                    : c.riskTag === 'boost'
                      ? 'border-ion/60 hover:border-ion'
                      : 'border-ok/60 hover:border-ok';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setSelectedChoice(c);
                      setTimeLeft(10);
                      setStep('minigame');
                    }}
                    data-testid={`choice-${c.id}`}
                    className={cn(
                      'flex min-h-[64px] w-full flex-col gap-1 rounded-2xl border-2 bg-deep/75 px-4 py-3 text-left transition hover:bg-plate/80 active:translate-y-0.5',
                      tagBorder,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-extrabold text-ink">
                        {c.title}
                      </span>
                      <span className="font-mono text-xs font-bold text-dim">
                        {c.badge}
                      </span>
                    </div>
                    <p className="font-mono text-xs font-bold text-aqua">
                      {c.effectText}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Quick Interactive Mini-Game */}
        {step === 'minigame' && selectedChoice && (
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-display text-lg font-extrabold text-warn">
                  2. {meta.miniGameTitle}
                </p>
                <p className="text-sm font-semibold text-dim">{meta.miniGameHint}</p>
              </div>
              <div className="rounded-xl border border-warn/40 bg-deep px-3 py-1.5 font-mono text-base font-extrabold text-warn tabular-nums">
                {timeLeft}s
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dim/25 bg-deep/85 p-5">
              {(meta.miniGameKind === 'solar_aim' ||
                meta.miniGameKind === 'plant_sprout' ||
                meta.miniGameKind === 'shield_meteor') && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {nodesDone.map((done, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTapNode(idx)}
                      data-testid={`minigame-node-${idx}`}
                      className={cn(
                        'flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 font-display text-sm font-extrabold transition active:translate-y-0.5',
                        done
                          ? 'border-ok bg-ok/20 text-ok'
                          : 'border-warn bg-warn/20 text-warn hover:brightness-110',
                      )}
                    >
                      {done ? (
                        <>
                          <CheckCircle2 className="h-7 w-7" />
                          <span>DONE!</span>
                        </>
                      ) : meta.miniGameKind === 'solar_aim' ? (
                        <>
                          <Sun className="h-7 w-7" />
                          <span>AIM SUN</span>
                        </>
                      ) : meta.miniGameKind === 'plant_sprout' ? (
                        <>
                          <Sprout className="h-7 w-7" />
                          <span>WATER</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-7 w-7" />
                          <span>BLOCK!</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {meta.miniGameKind === 'oxygen_lock' && (
                <div className="space-y-4 text-center">
                  <p className="font-mono text-sm font-bold text-aqua tabular-nums">
                    Locks Completed: {locksCount} / 2
                  </p>
                  <div className="relative h-10 w-full overflow-hidden rounded-xl border border-dim/30 bg-plate">
                    <div
                      className="absolute inset-y-0 bg-ok/35 border-x-2 border-ok"
                      style={{ left: '32%', width: '36%' }}
                    />
                    <div
                      className="absolute inset-y-1 w-2.5 -translate-x-1/2 rounded-full bg-warn shadow"
                      style={{ left: `${needlePos}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLockOxygen}
                    data-testid="minigame-oxygen-lock-btn"
                    className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#139c73] bg-ok px-6 py-3 font-display text-xl font-extrabold text-deep hover:brightness-110 active:translate-y-0.5"
                  >
                    <Sparkles className="h-5 w-5" />
                    LOCK AIR NOW!
                  </button>
                </div>
              )}

              {meta.miniGameKind === 'pipe_unclog' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs font-bold text-dim">
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
                              ? 'border-aqua bg-aqua/20 text-aqua'
                              : 'border-warn/60 bg-plate text-warn',
                          )}
                        >
                          <div
                            className={cn(
                              'h-3 w-12 rounded-full transition-transform',
                              aligned ? 'bg-aqua' : 'bg-warn',
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
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div
                        key={bar}
                        className={cn(
                          'w-6 rounded-t-lg transition-all',
                          bar === targetFreq
                            ? 'ring-2 ring-ok'
                            : '',
                          bar <= freq ? 'bg-aqua' : 'bg-plate',
                        )}
                        style={{ height: `${18 + bar * 8}px` }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-sm font-bold text-ink tabular-nums">
                    Signal: {freq} · Earth Target: {targetFreq}
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleAdjustFreq(-1)}
                      data-testid="minigame-radio-minus"
                      className="min-h-[52px] min-w-[96px] rounded-2xl border-b-4 border-dim/40 bg-plate px-6 font-display text-2xl font-extrabold text-ink hover:border-aqua"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustFreq(1)}
                      data-testid="minigame-radio-plus"
                      className="min-h-[52px] min-w-[96px] rounded-2xl border-b-4 border-[#139c73] bg-ok px-6 font-display text-2xl font-extrabold text-deep hover:brightness-110"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-center font-mono text-xs font-bold text-aqua">
              Choice Effect: {selectedChoice.effectText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
