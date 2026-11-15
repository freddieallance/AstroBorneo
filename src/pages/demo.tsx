import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryCharging,
  CheckCircle2,
  ChevronDown,
  Database,
  Droplets,
  HelpCircle,
  Music,
  Pause,
  Play,
  Radio,
  Rocket,
  RotateCcw,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wind,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { MODES, RESOURCE_META, type ModuleId, type ResourceKey } from '@/content/mission';
import { QUIZ, QUIZ_VISUAL_META } from '@/content/quiz';
import { preview, type Decision, type EventChoice, type Review } from '@/game/engine';
import {
  buildDemoOutcomeState,
  clearDemoSession,
  commitDemoCycleOnce,
  createInitialDemoSession,
  DEMO_STEPS,
  getDemoForecastVM,
  loadDemoSession,
  saveDemoSession,
  type DemoSessionState,
} from '@/game/demo-scenario';
import { moduleStatuses } from '@/lib/modules';
import type { QuizState } from '@/lib/records';
import { isSpeechSupported, loadSoundPref, saveSoundPref, speakText, stopSpeech } from '@/lib/speech';
import {
  attachMusicLifecycle,
  loadMusicPref,
  playMusicalBeep,
  playSfx,
  saveMusicPref,
  startBackgroundMusic,
  stopBackgroundMusic,
} from '@/lib/sfx';
import {
  getGetSpaceWeatherQueryKey,
  loadSavedSpaceWeatherContext,
  SPACE_WEATHER_UPDATED_EVENT,
  useGetSpaceWeather,
  type SavedSpaceWeatherContext,
} from '@/services/space-weather-client';
import { LunarScene } from '@/components/lunar-scene';
import { ChoicePictogram } from '@/components/event-illustrations';
import { NasaSourceDialog, ResourceIcon } from '@/components/scene-overlays';
import { ChoiceVisualDiagram, VisualQuizScene } from '@/components/visual-quiz';
import { MissionReportDrawer, VisualEndingCard } from '@/components/visual-results';
import { btn, Delta, tone } from '@/components/kit';
import { cn } from '@/lib/utils';

const HUD_KEYS: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];

const FACILITY_CUES: { id: ModuleId; title: string; cue: string; icon: ReactNode }[] = [
  { id: 'solar', title: 'Sun Power', cue: 'Sunlight → ⚡ Power', icon: <Sun className="h-5 w-5 text-warn" /> },
  { id: 'habitat', title: 'Crew Home', cue: '⚡ Power → 💨 Air', icon: <Users className="h-5 w-5 text-aqua" /> },
  { id: 'recycler', title: 'Water Cleaner', cue: '⚡ Power → 💧 Water', icon: <Droplets className="h-5 w-5 text-aqua" /> },
  { id: 'greenhouse', title: 'Plant Food', cue: '⚡ + 💧 → 🌱 Food', icon: <Sprout className="h-5 w-5 text-ok" /> },
  { id: 'shelter', title: 'Shield Dome', cue: '🛡️ Protects Crew Safety', icon: <Shield className="h-5 w-5 text-warn" /> },
  { id: 'comms', title: 'Earth Radio', cue: '⚡ Power → 🔬 Science', icon: <Radio className="h-5 w-5 text-ion" /> },
];

function getRecoveringModules(review: Review): ModuleId[] {
  const mods: ModuleId[] = [];
  if (review.delta.power > 0) mods.push('solar');
  if (review.delta.air > 0) mods.push('habitat');
  if (review.delta.water > 0) mods.push('recycler');
  if (review.delta.food > 0) mods.push('greenhouse');
  if (review.scienceAfter > review.scienceBefore) mods.push('comms');
  return mods;
}

export default function JudgeDemo() {
  const [, go] = useLocation();
  const [session, setSession] = useState<DemoSessionState>(loadDemoSession);
  const [soundOn, setSoundOn] = useState(loadSoundPref);
  const [musicOn, setMusicOn] = useState(loadMusicPref);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showQuizWhy, setShowQuizWhy] = useState(false);
  const [showLessonNote, setShowLessonNote] = useState(false);
  const [quizDraftPick, setQuizDraftPick] = useState<number | null>(session.quizAnswer);
  const [recoveringModules, setRecoveringModules] = useState<ModuleId[]>([]);

  const [savedWeather, setSavedWeather] = useState<SavedSpaceWeatherContext>(loadSavedSpaceWeatherContext);
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<SavedSpaceWeatherContext>).detail;
      if (detail) setSavedWeather(detail);
    };
    window.addEventListener(SPACE_WEATHER_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SPACE_WEATHER_UPDATED_EVENT, onUpdate);
  }, []);

  const spaceWeatherParams = useMemo(
    () => ({
      eventType: savedWeather.eventType,
      startDate: savedWeather.startDate,
      endDate: savedWeather.endDate,
      mode: savedWeather.requestMode,
    }),
    [savedWeather.eventType, savedWeather.startDate, savedWeather.endDate, savedWeather.requestMode],
  );
  const spaceWeatherQuery = useGetSpaceWeather(spaceWeatherParams, {
    query: {
      queryKey: getGetSpaceWeatherQueryKey(spaceWeatherParams),
      enabled: savedWeather.requestMode !== 'simulated',
      staleTime: 300_000,
      retry: false,
    },
  });

  const nasaLabel =
    savedWeather.requestMode === 'simulated'
      ? 'Simulated Training'
      : spaceWeatherQuery.data?.mode === 'LIVE_DATA'
        ? 'Live NASA Context · Sim Rules'
        : (spaceWeatherQuery.data?.mode === 'ARCHIVED_DATA' && spaceWeatherQuery.data.records.length > 0) ||
            (savedWeather.lastMode === 'ARCHIVED_DATA' && savedWeather.record)
          ? 'Archived NASA Context'
          : 'Simulated Training';

  const hasArchivedOrLiveContext = nasaLabel !== 'Simulated Training';

  // Persist disposable Story Guide session strictly in sessionStorage (never touches player localStorage)
  useEffect(() => {
    saveDemoSession(session);
  }, [session]);

  useEffect(() => attachMusicLifecycle(() => musicOn), [musicOn]);

  useEffect(() => () => {
    stopSpeech();
    stopBackgroundMusic();
  }, []);

  const currentStep = DEMO_STEPS[session.stepIndex] ?? DEMO_STEPS[0];

  // Auto-advance optional facility spotlight only while user enables Play
  useEffect(() => {
    if (currentStep.id !== 'facilities' || !session.autoTour) return;
    const id = window.setInterval(() => {
      setSession((prev) => {
        if (prev.facilityIndex >= FACILITY_CUES.length - 1) {
          return { ...prev, autoTour: false, stepIndex: Math.min(DEMO_STEPS.length - 1, prev.stepIndex + 1) };
        }
        return { ...prev, facilityIndex: prev.facilityIndex + 1 };
      });
    }, 1800);
    return () => window.clearInterval(id);
  }, [currentStep.id, session.autoTour]);

  useEffect(() => {
    if (recoveringModules.length === 0) return;
    const t = window.setTimeout(() => setRecoveringModules([]), 1600);
    return () => window.clearTimeout(t);
  }, [recoveringModules]);

  // Optional presenter read-aloud only if speaker is ON
  useEffect(() => {
    if (!soundOn) return;
    if (currentStep.id === 'welcome') {
      speakText('You are Commander of the Moon Base. Keep four astronauts alive.');
    } else if (currentStep.id === 'facilities') {
      const f = FACILITY_CUES[session.facilityIndex];
      if (f) speakText(`${f.title}. ${f.cue.replace(/⚡|💨|💧|🌱|🛡️|🔬/g, '')}`);
    } else if (currentStep.id === 'tradeoff') {
      speakText('Tap Eco or Boost to see Power and Air trade-offs.');
    } else if (currentStep.id === 'event') {
      speakText('Cycle 2 Low Sun alert. Pick a picture action and run Cycle 2.');
    }
  }, [soundOn, currentStep.id, session.facilityIndex]);

  const activeState =
    currentStep.id === 'outcome' && session.outcomeState
      ? session.outcomeState
      : currentStep.id === 'calculate' && session.committedState
        ? session.committedState
        : session.midState;

  const vm = useMemo(() => getDemoForecastVM(session.midState, session.draft), [session.midState, session.draft]);
  const solar = useMemo(() => preview(activeState, session.draft).solar, [activeState, session.draft]);
  const statuses = useMemo(() => moduleStatuses(activeState, session.draft, solar), [activeState, session.draft, solar]);

  const demoReview = useMemo(
    () => session.committedState?.history.find((h) => h.cycle === 2) ?? null,
    [session.committedState],
  );

  const demoQuizQuestion = QUIZ[0];
  const demoQuizMeta = QUIZ_VISUAL_META[demoQuizQuestion.id];
  const demoQuizRecord: QuizState = useMemo(
    () => ({
      answers: [session.quizAnswer, null, null, null, null],
      completed: false,
      currentIndex: 0,
    }),
    [session.quizAnswer],
  );

  const goToStep = (nextIdx: number) => {
    playSfx('tap');
    const bounded = Math.max(0, Math.min(DEMO_STEPS.length - 1, nextIdx));
    setShowLessonNote(false);
    setShowQuizWhy(false);
    setSession((prev) => {
      const targetStep = DEMO_STEPS[bounded];
      let nextCommitted = prev.committedState;
      let nextOutcome = prev.outcomeState;

      // Ensure Cycle 2 runs ONCE via real engine before entering Step 5 (calculate) or Step 7 (outcome)
      if ((targetStep.id === 'calculate' || targetStep.id === 'outcome') && !nextCommitted) {
        const res = commitDemoCycleOnce(prev);
        nextCommitted = res.next.committedState;
        if (res.review) setRecoveringModules(getRecoveringModules(res.review));
      }
      if (targetStep.id === 'outcome') {
        const baseForOutcome = nextCommitted ?? prev.midState;
        const quizCorrectCount = prev.quizAnswer === demoQuizQuestion.answer ? 1 : 0;
        nextOutcome = buildDemoOutcomeState(baseForOutcome, quizCorrectCount);
      }
      return {
        ...prev,
        stepIndex: bounded,
        autoTour: false,
        committedState: nextCommitted,
        outcomeState: nextOutcome,
      };
    });
  };

  const handleRunCycleOnce = () => {
    playSfx('launch');
    playMusicalBeep(true);
    const res = commitDemoCycleOnce(session);
    if (res.review && res.ranNow) {
      setRecoveringModules(getRecoveringModules(res.review));
    }
    setSession({
      ...res.next,
      stepIndex: 4, // 'calculate'
      autoTour: false,
    });
  };

  const handleReplay = () => {
    playSfx('tap');
    stopSpeech();
    setRecoveringModules([]);
    setShowLessonNote(false);
    setShowQuizWhy(false);
    setQuizDraftPick(null);
    setSourcesOpen(false);
    setReportOpen(false);
    const fresh = createInitialDemoSession();
    setSession(fresh);
  };

  const handleExitDemo = () => {
    playSfx('tap');
    stopSpeech();
    stopBackgroundMusic();
    clearDemoSession();
    go('/');
  };

  // Keyboard support: ArrowRight / ArrowLeft for quick judge pacing, Escape to close sub-dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sourcesOpen || reportOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        if (session.stepIndex < DEMO_STEPS.length - 1) {
          e.preventDefault();
          goToStep(session.stepIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (session.stepIndex > 0) {
          e.preventDefault();
          goToStep(session.stepIndex - 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const spotlightId: ModuleId | null =
    currentStep.id === 'facilities'
      ? (FACILITY_CUES[session.facilityIndex]?.id ?? 'solar')
      : currentStep.id === 'tradeoff'
        ? 'habitat'
        : currentStep.id === 'event' || currentStep.id === 'calculate'
          ? 'solar'
          : null;

  const patchDemoDraft = (patch: Partial<Decision>) => {
    playMusicalBeep(true);
    setSession((prev) => ({
      ...prev,
      draft: { ...prev.draft, ...patch },
    }));
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSoundPref(next);
    if (!next) stopSpeech();
    else playSfx('tap');
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    saveMusicPref(next);
    if (next) {
      playMusicalBeep(true);
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  };

  const previewDeltas =
    currentStep.id === 'tradeoff' || currentStep.id === 'event'
      ? vm.forecast.delta
      : demoReview?.delta ?? null;

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-auto [@media(min-height:600px)]:overflow-hidden text-ink"
      style={{
        background:
          'radial-gradient(circle at 12% 8%, rgba(86, 92, 148, 0.88), transparent 40%), linear-gradient(150deg, #252d66 0%, #151b42 100%)',
      }}
      data-testid="page-judge-demo"
    >
      {/* Top Story Guide HUD: Matches Moon Base Cream Storybook Card */}
      <header className="z-30 mx-2.5 mt-2 shrink-0 rounded-[20px] border-2 border-white bg-[#fffefa] px-3 py-2 shadow-[0_8px_22px_rgba(8,14,42,0.22)] lg:mx-3 lg:px-4">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 xl:flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex-none">
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#ffca6b] bg-[#ffe7a1]/80 px-2.5 py-1 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#364272]"
              data-testid="badge-demo-scenario"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden 2xl:inline">How to Play · </span>Story Guide
            </span>

            <span
              className="shrink-0 rounded-xl border border-[#dce3fa] bg-[#f4f7ff] px-2 py-1 font-mono text-xs font-bold text-[#222a5b] tabular-nums"
              data-testid="text-demo-cycle"
            >
              C{activeState.cycle}/5
            </span>

            <button
              type="button"
              onClick={() => setSourcesOpen(true)}
              data-testid="button-demo-nasa-mode"
              className={cn(
                'inline-flex max-w-[132px] items-center gap-1 truncate rounded-xl border px-2 py-1 font-mono text-[10px] font-bold transition hover:brightness-95 sm:max-w-[160px] 2xl:max-w-none',
                hasArchivedOrLiveContext
                  ? 'border-[#b9d9ff] bg-[#eef6ff] text-[#2374b8]'
                  : 'border-[#ffdca6] bg-[#fff8e8] text-[#b86b0d]',
              )}
              title="Educational simulation. Click to inspect NASA Sources."
            >
              <Database className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{nasaLabel}</span>
            </button>
          </div>

          {/* Real Engine Resource Strip */}
          <div className="order-3 grid w-full grid-cols-3 gap-1.5 sm:grid-cols-6 xl:order-2 xl:flex xl:w-auto xl:flex-1 xl:items-center xl:justify-center" data-testid="demo-hud-resources">
            {HUD_KEYS.map((k) => {
              const val = activeState.resources[k];
              const d = previewDeltas ? previewDeltas[k] : null;
              return (
                <div
                  key={k}
                  data-testid={`demo-hud-${k}`}
                  className="flex items-center gap-1.5 rounded-xl border border-[#dfe5fa] bg-[#f4f7ff] px-2 py-1 xl:min-w-[66px] 2xl:min-w-[84px]"
                >
                  <span style={{ color: tone(val) }} className="shrink-0">
                    <ResourceIcon k={k} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-0.5">
                      <span className="hidden text-[10px] font-bold uppercase text-[#5b6b94] 2xl:inline">
                        {k === 'safety' ? 'Safe' : k === 'power' ? 'Pwr' : RESOURCE_META[k].label}
                      </span>
                      <span className="font-mono text-xs font-bold tabular-nums text-[#222a5b]" data-testid={`demo-hud-value-${k}`}>
                        {val}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#dde4fb]">
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(5, val)}%`, background: tone(val) }} />
                    </div>
                  </div>
                  {d !== null && d !== 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center font-mono text-[10px] font-bold tabular-nums',
                        d > 0 ? 'text-ok' : 'text-bad',
                      )}
                      data-testid={`demo-hud-delta-${k}`}
                    >
                      {d > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                      {Math.abs(d)}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-center gap-1 rounded-xl border border-[#dfe5fa] bg-[#f4f7ff] px-2 py-1 shrink-0" data-testid="demo-hud-science">
              <ResourceIcon k="science" className="h-3.5 w-3.5 text-ion" />
              <span className="font-mono text-xs font-bold tabular-nums text-[#222a5b]">{activeState.science}</span>
            </div>
          </div>

          {/* Right Controls: Music, Sound, Replay, Exit Guide */}
          <div className="order-2 flex shrink-0 items-center gap-1.5 xl:order-3">
            <button
              type="button"
              onClick={toggleMusic}
              aria-pressed={musicOn}
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold transition',
                musicOn
                  ? 'border-[#b9e6d5] bg-[#e9fbf3] text-[#1b7c54]'
                  : 'border-[#dce3fa] bg-[#f4f7ff] text-[#5b6b94] hover:text-[#222a5b]',
              )}
              data-testid="button-demo-music"
              aria-label={musicOn ? 'Turn off background music' : 'Turn on background music'}
            >
              <Music className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden 2xl:inline">{musicOn ? 'Music On' : 'Music Off'}</span>
            </button>
            {isSpeechSupported() && (
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundOn}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-xl border transition',
                  soundOn ? 'border-[#b9d9ff] bg-[#eef6ff] text-[#2374b8]' : 'border-[#dce3fa] bg-[#f4f7ff] text-[#5b6b94] hover:text-[#222a5b]',
                )}
                data-testid="button-demo-sound"
                aria-label={soundOn ? 'Turn off presenter voice' : 'Turn on presenter voice'}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#dce3fa] bg-[#f4f7ff] px-2.5 text-xs font-bold text-[#344270] hover:border-[#b9d9ff]"
              data-testid="button-demo-replay"
              title="One-tap Replay Guide"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#2374b8]" />
              <span className="hidden 2xl:inline">Replay</span>
            </button>
            <button
              type="button"
              onClick={handleExitDemo}
              className="inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-[#f5c7a8] bg-[#fff5eb] px-2.5 text-xs font-bold text-[#b86b0d] hover:bg-[#ffedd9] sm:px-3"
              data-testid="button-demo-exit"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Exit Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Persistent Moon Base Stage */}
      <main className="relative flex flex-1 min-h-[240px] flex-col gap-1.5 overflow-hidden px-2.5 py-1.5 lg:px-3">
        <div className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden rounded-[22px] border-4 border-white bg-[#52497e] shadow-[0_14px_34px_rgba(8,14,42,0.28)] [container-type:size]">
          <div
            className="relative"
            style={{
              width: 'min(100cqw, calc(100cqh * 1000 / 540), 1440px)',
              height: 'min(100cqh, calc(100cqw * 540 / 1000), calc(1440px * 540 / 1000))',
            }}
          >
            <LunarScene
            statuses={statuses}
            onSelect={(id) => {
              playMusicalBeep(true);
              if (currentStep.id === 'facilities') {
                const idx = FACILITY_CUES.findIndex((f) => f.id === id);
                if (idx >= 0) {
                  setSession((prev) => ({ ...prev, facilityIndex: idx, autoTour: false }));
                }
              } else if (id === 'habitat') {
                goToStep(2); // Jump to Trade-off
              } else if (id === 'solar') {
                goToStep(3); // Jump to Event
              }
            }}
            selected={spotlightId}
            visual={{
              cycle: activeState.cycle,
              solar,
              mode: session.draft.mode,
              greenhouseOn: session.draft.greenhouse,
              recyclerOn: session.draft.recycler,
              commsOn: session.draft.communications,
              eventChoice: session.draft.event,
              shieldingLevel: activeState.shieldingLevel,
              backupCharges: activeState.backupCharges,
              activeStatus: activeState.status,
              spotlightId,
              recoveringModules,
            }}
          />
          </div>

          {/* Step 1: How to Play Commander Welcome Card */}
          {currentStep.id === 'welcome' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-2.5 sm:p-4">
              <div
                className="pointer-events-auto max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border-[3px] border-white bg-[#fffefa] p-4 shadow-[0_14px_34px_rgba(8,14,42,0.28)]"
                data-testid="demo-card-welcome"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#dfe5fa] bg-[#eef3ff] text-[#2374b8]">
                      <Rocket className="h-6 w-6" aria-hidden />
                    </div>
                    <div>
                      <p className="hud-label whitespace-nowrap">Story Guide · 7 Quick Steps</p>
                      <h1 className="font-display text-2xl font-extrabold text-[#222a5b]">You are Commander!</h1>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-xl border border-[#dfe5fa] bg-[#f4f7ff] px-2.5 py-1 font-mono text-xs font-bold text-[#2374b8]">
                    4 Crew · 5 Systems
                  </span>
                </div>
                <p className="mt-2.5 text-sm text-[#4e5b8a]">
                  Learn how to balance Power, Air, Water, Food &amp; Safety in 7 quick steps before you launch your real Moon Base mission. Your saved mission stays untouched.
                </p>
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className={cn(btn.primary, 'flex-1')}
                    data-testid="button-demo-start-tour"
                  >
                    <Play className="h-4 w-4" /> Start Tour
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className={btn.ghost}
                    data-testid="button-demo-welcome-skip"
                  >
                    Skip to Trade-Off
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 6-Facility Spotlight with Tiny Icon Cues */}
          {currentStep.id === 'facilities' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center p-2.5 md:justify-start md:p-4">
              <div
                className="pointer-events-auto max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-aqua/45 bg-hull p-3.5 shadow-2xl"
                data-testid="demo-card-facilities"
              >
                {(() => {
                  const cur = FACILITY_CUES[session.facilityIndex] ?? FACILITY_CUES[0];
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-10 w-10 place-items-center rounded-xl border border-aqua/30 bg-plate">
                            {cur.icon}
                          </div>
                          <div>
                            <p className="hud-label">Facility {session.facilityIndex + 1} / 6</p>
                            <h2 className="font-display text-lg font-bold text-ink" data-testid="text-demo-facility-title">
                              {cur.title}
                            </h2>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSession((prev) => ({ ...prev, autoTour: !prev.autoTour }))}
                          className="inline-flex h-9 items-center gap-1 rounded-xl border border-dim/25 bg-plate px-2.5 text-xs font-semibold text-aqua hover:border-aqua"
                          data-testid="button-demo-autoplay"
                        >
                          {session.autoTour ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          {session.autoTour ? 'Pause' : 'Auto'}
                        </button>
                      </div>

                      <div className="mt-2.5 rounded-xl border border-dim/20 bg-deep/75 px-3 py-2 text-center font-mono text-sm font-bold text-ink">
                        {cur.cue}
                      </div>

                      <div className="mt-2.5 grid grid-cols-6 gap-1.5">
                        {FACILITY_CUES.map((f, idx) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSession((prev) => ({ ...prev, facilityIndex: idx, autoTour: false }))}
                            className={cn(
                              'grid h-10 place-items-center rounded-xl border transition',
                              idx === session.facilityIndex
                                ? 'border-aqua bg-aqua/20 ring-1 ring-aqua/60'
                                : 'border-dim/20 bg-deep/65 opacity-75 hover:opacity-100',
                            )}
                            aria-label={`Highlight ${f.title}`}
                            data-testid={`button-demo-facility-${f.id}`}
                          >
                            {f.icon}
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Step 3: Real Engineering Trade-Off (Eco vs Boost on Crew Home) */}
          {currentStep.id === 'tradeoff' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-2.5 sm:p-4">
              <div
                className="pointer-events-auto max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-aqua/45 bg-hull p-3.5 shadow-2xl sm:p-4"
                data-testid="demo-card-tradeoff"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-aqua" aria-hidden />
                    <h2 className="font-display text-lg font-bold text-ink">Crew Home · Eco vs Boost Trade-Off</h2>
                  </div>
                  <span className="rounded-md bg-aqua/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-aqua">
                    Live Engine Forecast
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Life support mode">
                  {vm.modes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={m.selected}
                      onClick={() => patchDemoDraft({ mode: m.id })}
                      data-testid={`demo-mode-${m.id}`}
                      className={cn(
                        'rounded-xl border p-2.5 text-left transition',
                        m.selected ? 'border-aqua bg-aqua/15 ring-2 ring-aqua/45' : 'border-dim/25 bg-deep/65 hover:border-aqua/50',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-ink sm:text-base">{m.label}</span>
                        {m.id === 'eco' && <BatteryCharging className="h-4 w-4 text-warn" />}
                        {m.id === 'standard' && <Wind className="h-4 w-4 text-aqua" />}
                        {m.id === 'boost' && <Rocket className="h-4 w-4 text-ok" />}
                      </div>
                      <p className="mt-1 font-mono text-xs text-warn">⚡ -{m.powerCost}</p>
                      <p className={cn('font-mono text-xs font-bold', m.netAir >= 0 ? 'text-ok' : 'text-bad')}>
                        💨 {m.netAir > 0 ? `+${m.netAir}` : m.netAir} Net Air
                      </p>
                    </button>
                  ))}
                </div>

                {vm.forecast.delta && vm.forecast.after && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" data-testid="demo-tradeoff-forecast">
                    {HUD_KEYS.map((k) => {
                      const d = vm.forecast.delta![k];
                      const after = vm.forecast.after![k];
                      return (
                        <div
                          key={k}
                          className={cn(
                            'rounded-xl border px-2.5 py-2 text-center',
                            k === 'power' || k === 'air' ? 'border-aqua/45 bg-deep/85' : 'border-dim/20 bg-deep/60',
                          )}
                          data-testid={`demo-forecast-${k}`}
                        >
                          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-dim">
                            <ResourceIcon k={k} className="h-3.5 w-3.5" />
                            <span>{k === 'safety' ? 'Safe' : RESOURCE_META[k].label}</span>
                          </div>
                          <p className="mt-0.5 font-mono text-xs text-ink tabular-nums">
                            {session.midState.resources[k]}→<strong style={{ color: tone(after) }}>{after}</strong>{' '}
                            <span className={cn('font-bold', d > 0 ? 'text-ok' : d < 0 ? 'text-bad' : 'text-dim')}>
                              ({d > 0 ? `+${d}` : d})
                            </span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Actual Cycle 2 Low Sun Event at Sun Power */}
          {currentStep.id === 'event' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-2.5 sm:p-4">
              <div
                className="pointer-events-auto max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-warn/50 bg-hull p-3.5 shadow-2xl sm:p-4"
                data-testid="demo-card-event"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warn" aria-hidden />
                    <h2 className="font-display text-lg font-bold text-ink">Cycle 2: Low Sun (+8 ⚡)</h2>
                  </div>
                  <span className="rounded-md bg-warn/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-warn">
                    Backup Batteries: {session.midState.backupCharges}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Cycle 2 Low Sun event choices">
                  {(['battery', 'save'] as const).map((choice) => {
                    const selected = session.draft.event === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => patchDemoDraft({ event: choice })}
                        data-testid={`demo-event-${choice}`}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition',
                          selected ? 'border-aqua bg-aqua/15 ring-2 ring-aqua/45' : 'border-dim/25 bg-deep/65 hover:border-aqua/50',
                        )}
                      >
                        <ChoicePictogram cycle={2} value={choice} active={selected} />
                        <span className="font-display text-sm font-bold text-ink sm:text-base">
                          {choice === 'battery' ? 'Use Battery (+20 ⚡)' : 'Save Battery'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {vm.forecast.delta && vm.forecast.after && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-aqua/40 bg-deep/65 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
                      <span>
                        ⚡ {session.midState.resources.power}→
                        <strong className={vm.forecast.delta.power >= 0 ? 'text-ok' : 'text-warn'}>
                          {vm.forecast.after.power}
                        </strong>
                      </span>
                      <span>
                        💨 {session.midState.resources.air}→<strong>{vm.forecast.after.air}</strong>
                      </span>
                      <span>
                        💧 {session.midState.resources.water}→<strong>{vm.forecast.after.water}</strong>
                      </span>
                      <span>
                        🌱 {session.midState.resources.food}→<strong>{vm.forecast.after.food}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunCycleOnce}
                      className={cn(btn.primary, 'min-h-[42px] px-4 py-2 text-sm')}
                      data-testid="button-demo-run-cycle"
                    >
                      <Play className="h-4 w-4" />
                      {session.committedState ? 'View Cycle 2 Result' : 'Run Cycle 2'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Actual Engine Output & Visible Building Response */}
          {currentStep.id === 'calculate' && demoReview && session.committedState && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-2.5 sm:p-4">
              <div
                className="pointer-events-auto max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-ok/50 bg-hull p-3.5 shadow-2xl sm:p-4"
                data-testid="demo-card-calculate"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden />
                    <h2 className="font-display text-lg font-bold text-ink">
                      Cycle 2 Computed ({MODES[demoReview.decision.mode].label} · {demoReview.decision.event === 'battery' ? 'Used Battery' : 'Saved Battery'})
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-aqua">
                    Batteries: {session.midState.backupCharges} → {session.committedState.backupCharges}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-5 gap-1.5" data-testid="demo-result-grid">
                  {HUD_KEYS.map((k) => {
                    const b = demoReview.before[k];
                    const a = demoReview.after[k];
                    const d = demoReview.delta[k];
                    return (
                      <div key={k} className="rounded-xl border border-dim/20 bg-deep/70 p-2 text-center">
                        <div className="flex justify-center" style={{ color: tone(a) }}>
                          <ResourceIcon k={k} className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 font-mono text-xs text-dim tabular-nums">
                          {b}→<strong className="text-ink">{a}</strong>
                        </p>
                        <p className={cn('font-mono text-[11px] font-bold tabular-nums', d > 0 ? 'text-ok' : d < 0 ? 'text-bad' : 'text-dim')}>
                          <Delta v={d} />
                        </p>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowLessonNote((v) => !v)}
                  className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-aqua hover:underline"
                  data-testid="button-demo-lesson-toggle"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  1-line science takeaway
                  <ChevronDown className={cn('h-3.5 w-3.5 transition', showLessonNote && 'rotate-180')} />
                </button>
                {showLessonNote && (
                  <p className="mt-1.5 rounded-xl bg-deep/65 p-2.5 text-xs text-ink" data-testid="text-demo-lesson">
                    {demoReview.lesson}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Single Visual 4-Choice Science Question Popup */}
          {currentStep.id === 'quiz' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#14193f]/72 p-3">
              <div
                className="max-h-[82dvh] w-full max-w-xl overflow-y-auto rounded-3xl border-[3px] border-white bg-[#fffefa] p-4 shadow-2xl"
                data-testid="demo-card-quiz"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="hud-label">Science Question · {demoQuizQuestion.topic}</span>
                  <button
                    type="button"
                    onClick={() => speakText(`${demoQuizMeta?.spokenPrompt ?? demoQuizQuestion.question}`, true)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-dim/25 bg-plate text-aqua hover:border-aqua"
                    aria-label="Listen to question"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>

                <VisualQuizScene questionId={demoQuizQuestion.id} />

                <h2 className="mt-3 font-display text-lg font-bold text-ink">
                  {demoQuizMeta?.shortPrompt ?? demoQuizQuestion.question}
                </h2>

                <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={demoQuizMeta?.shortPrompt ?? demoQuizQuestion.question}>
                  {demoQuizQuestion.choices.map((fullChoice, i) => {
                    const isSubmitted = session.quizAnswer !== null;
                    const isPicked = isSubmitted ? session.quizAnswer === i : quizDraftPick === i;
                    const isAns = i === demoQuizQuestion.answer;
                    const shortLabel = demoQuizMeta?.shortLabels[i] ?? fullChoice;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={isPicked}
                        disabled={isSubmitted}
                        onClick={() => {
                          playSfx('tap');
                          setQuizDraftPick(i);
                        }}
                        data-testid={`demo-quiz-answer-${i}`}
                        className={cn(
                          'flex flex-col items-center justify-between gap-1.5 rounded-2xl border p-2 text-center transition',
                          !isSubmitted && !isPicked && 'border-dim/25 bg-deep hover:border-aqua',
                          !isSubmitted && isPicked && 'border-aqua bg-aqua/15 ring-2 ring-aqua/60',
                          isSubmitted && isAns && 'border-ok bg-ok/15',
                          isSubmitted && isPicked && !isAns && 'border-warn bg-warn/15',
                          isSubmitted && !isAns && !isPicked && 'border-dim/15 bg-deep text-dim',
                        )}
                      >
                        <ChoiceVisualDiagram questionId={demoQuizQuestion.id} choiceIndex={i} />
                        <div className="flex items-center gap-1 text-xs font-bold text-ink">
                          <span className="font-mono text-dim">{String.fromCharCode(65 + i)}</span>
                          <span>{shortLabel}</span>
                          {isSubmitted && isAns && <CheckCircle2 className="h-3.5 w-3.5 text-ok" />}
                          {isSubmitted && isPicked && !isAns && <XCircle className="h-3.5 w-3.5 text-warn" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {session.quizAnswer === null ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={quizDraftPick === null}
                      onClick={() => {
                        if (quizDraftPick === null) return;
                        const ok = quizDraftPick === demoQuizQuestion.answer;
                        playMusicalBeep(ok);
                        playSfx(ok ? 'good' : 'oops');
                        setSession((prev) => ({ ...prev, quizAnswer: quizDraftPick }));
                      }}
                      className={cn(btn.primary, 'min-h-[42px] px-4 py-2 text-sm')}
                      data-testid="button-demo-quiz-submit"
                    >
                      Check Answer
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-ok/40 bg-ok/10 p-3 text-xs text-ink" data-testid="demo-quiz-feedback">
                    <p className="font-bold">
                      {session.quizAnswer === demoQuizQuestion.answer ? 'Great engineering!' : 'Good try!'} {demoQuizQuestion.explanation}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowQuizWhy((w) => !w)}
                      className="mt-1.5 inline-flex items-center gap-1 font-semibold text-aqua hover:underline"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Why? (NASA Source)
                    </button>
                    {showQuizWhy && demoQuizMeta && (
                      <p className="mt-1 text-dim">{demoQuizMeta.realWorldNote} ({demoQuizMeta.sourceTitle})</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 7: Visual End State + Optional NASA Sources Overlay */}
          {currentStep.id === 'outcome' && session.outcomeState && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#14193f]/72 p-3">
              <div
                className="max-h-[84dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border-[3px] border-white bg-[#fffefa] p-4 shadow-2xl sm:p-5"
                data-testid="demo-card-outcome"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-aqua/35 bg-aqua/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-aqua">
                    Story Guide · Real Engine C1–C5 Output
                  </span>
                  <button
                    type="button"
                    onClick={() => setSourcesOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-aqua/40 bg-aqua/15 px-3 py-1.5 text-xs font-bold text-aqua hover:bg-aqua/25"
                    data-testid="button-demo-open-sources"
                  >
                    <Database className="h-3.5 w-3.5" /> Open NASA Sources &amp; Simulation Proof
                  </button>
                </div>

                <VisualEndingCard
                  game={session.outcomeState}
                  quiz={demoQuizRecord}
                  onStartQuiz={() => goToStep(5)}
                  onRequestRestart={handleReplay}
                  onOpenReport={() => setReportOpen(true)}
                  onOpenSources={() => setSourcesOpen(true)}
                  quizCtaLabel="Revisit Guide Question"
                  soundOn={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Persistent Bottom Stepper Bar */}
        <footer className="z-30 shrink-0 rounded-[18px] border-2 border-white bg-[#fffefa] px-3 py-2 shadow-[0_8px_22px_rgba(8,14,42,0.22)]">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Guide steps">
              {DEMO_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === session.stepIndex}
                  onClick={() => goToStep(idx)}
                  data-testid={`button-demo-step-${s.id}`}
                  className={cn(
                    'rounded-xl border px-2.5 py-1 font-mono text-[11px] font-bold transition',
                    idx === session.stepIndex
                      ? 'border-[#ffca6b] bg-[#ffe7a1] text-[#364272]'
                      : idx < session.stepIndex
                        ? 'border-[#b9e6d5] bg-[#e9fbf3] text-[#1b7c54] hover:brightness-95'
                        : 'border-[#dce3fa] bg-[#f4f7ff] text-[#5b6b94] hover:text-[#222a5b]',
                  )}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={session.stepIndex === 0}
                onClick={() => goToStep(session.stepIndex - 1)}
                className={cn(btn.ghost, 'min-h-[38px] px-3 py-1.5 text-xs')}
                data-testid="button-demo-prev"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              {session.stepIndex < DEMO_STEPS.length - 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => goToStep(session.stepIndex < 2 ? 2 : DEMO_STEPS.length - 1)}
                    className={cn(btn.ghost, 'min-h-[38px] px-3 py-1.5 text-xs')}
                    data-testid="button-demo-skip"
                  >
                    {session.stepIndex < 2 ? 'Skip Tour' : 'Skip to End'}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(session.stepIndex + 1)}
                    className={cn(btn.primary, 'min-h-[38px] px-4 py-1.5 text-xs')}
                    data-testid="button-demo-next"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    playSfx('launch');
                    stopBackgroundMusic();
                    go('/base?autostart=1');
                  }}
                  className={cn(btn.primary, 'min-h-[38px] px-4 py-1.5 text-xs')}
                  data-testid="button-demo-finish-exit"
                >
                  <Rocket className="h-3.5 w-3.5" /> Start Real Mission
                </button>
              )}
            </div>
          </div>
        </footer>
      </main>

      <NasaSourceDialog open={sourcesOpen} onOpenChange={setSourcesOpen} cycle={activeState.cycle} />

      {session.outcomeState && (
        <MissionReportDrawer
          open={reportOpen}
          onOpenChange={setReportOpen}
          game={session.outcomeState}
          quiz={demoQuizRecord}
          onOpenSources={() => {
            setReportOpen(false);
            setSourcesOpen(true);
          }}
        />
      )}
    </div>
  );
}
