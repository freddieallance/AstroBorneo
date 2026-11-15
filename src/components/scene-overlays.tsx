import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryCharging,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Droplets,
  ExternalLink,
  Eye,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  Home,
  Lightbulb,
  Moon,
  Pause,
  Play,
  PowerOff,
  Radio,
  Rocket,
  RotateCcw,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  Users,
  Volume2,
  Wind,
  Wrench,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';
import type { Decision, EventChoice, Review, State } from '@/game/engine';
import { useGame } from '@/state/game';
import { getViewModel, type GameViewModel } from '@/game/view-model';
import { scoreSummary } from '@/game/scoring';
import { CSA_LINKS, EVENT_LABEL, MODULES, MODES, RESOURCE_META, SOURCES, SYSTEMS, type ModuleId, type ResourceKey } from '@/content/mission';
import { QUIZ, QUIZ_VISUAL_META } from '@/content/quiz';
import { buildLearningReflection, quizCorrect } from '@/lib/records';
import { speakText, stopSpeech } from '@/lib/speech';
import { getProviderStatuses } from '@/services/nasa';
import { btn, Delta, ErrorNote, tone } from '@/components/kit';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataSourcePanel } from '@/components/data-source-panel';
import { SpaceWeatherContext } from '@/components/space-weather-context';
import { ChoicePictogram, EventHeroIllustration } from '@/components/event-illustrations';
import { CycleCauseEffectVisual, ModuleVisualLesson } from '@/components/visual-lessons';
import { VisualQuizCard } from '@/components/visual-quiz';
import { MissionReportDrawer, VisualEndingCard } from '@/components/visual-results';
import { findPowerFixSuggestion } from '@/game/kid-helpers';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

const INTRO_STEPS: {
  id: ModuleId;
  title: string;
  needs: string;
  makes: string;
  line: string;
}[] = [
  {
    id: 'habitat',
    title: 'Crew Home',
    needs: 'Needs Power',
    makes: 'Makes Breathable Air',
    line: 'Four astronauts live here. Tap to choose Eco, Standard, or Boost air.',
  },
  {
    id: 'solar',
    title: 'Sun Power',
    needs: 'Uses Sunlight',
    makes: 'Makes Base Power',
    line: 'Tall panels catch low sunlight at the Moon south pole.',
  },
  {
    id: 'recycler',
    title: 'Water Cleaner',
    needs: 'Needs Power',
    makes: 'Cleans Crew Water',
    line: 'Cleans and reuses water so supplies last all 5 cycles.',
  },
  {
    id: 'greenhouse',
    title: 'Plant Food',
    needs: 'Power + Water',
    makes: 'Grows Fresh Food',
    line: 'Special grow lights help astronauts grow food on the Moon.',
  },
  {
    id: 'shelter',
    title: 'Shield Dome',
    needs: 'Shield Kits or Power',
    makes: 'Protects Crew Safety',
    line: 'Thick lunar soil walls help guard the crew during solar storms.',
  },
  {
    id: 'comms',
    title: 'Earth Radio',
    needs: 'Needs Power',
    makes: 'Sends Science Home',
    line: 'Sends science data across 384,400 km to Earth in about 1.3 seconds.',
  },
];

function ModuleBadgeIcon({ id, className = 'h-6 w-6' }: { id: ModuleId; className?: string }) {
  switch (id) {
    case 'habitat': return <Users className={cn(className, 'text-aqua')} />;
    case 'solar': return <Sun className={cn(className, 'text-warn')} />;
    case 'recycler': return <Droplets className={cn(className, 'text-aqua')} />;
    case 'greenhouse': return <Sprout className={cn(className, 'text-ok')} />;
    case 'shelter': return <Shield className={cn(className, 'text-warn')} />;
    case 'comms': return <Radio className={cn(className, 'text-ion')} />;
  }
}

export function ResourceIcon({ k, className = 'h-4 w-4' }: { k: ResourceKey | 'science'; className?: string }) {
  switch (k) {
    case 'power': return <Zap className={className} />;
    case 'air': return <Wind className={className} />;
    case 'safety': return <Shield className={className} />;
    case 'water': return <Droplets className={className} />;
    case 'food': return <Sprout className={className} />;
    case 'science': return <FlaskConical className={className} />;
  }
}

function PowerShortVisual({ deficit }: { deficit: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-bad/45 bg-bad/10 p-3 text-ink"
      role="alert"
      data-testid="visual-error-power"
    >
      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-deep/75 px-2.5 py-2 text-bad">
        <ZapOff className="h-5 w-5" aria-hidden />
        <ArrowRight className="h-3.5 w-3.5 text-dim" aria-hidden />
        <PowerOff className="h-5 w-5 text-warn" aria-hidden />
      </div>
      <div className="text-xs leading-snug">
        <p className="font-bold text-bad">Short by {deficit} Power</p>
        <p className="text-dim">Switch off an optional system or choose Eco Air.</p>
      </div>
    </div>
  );
}

function PopupSceneIllustration({ id, mode, active = true }: { id: ModuleId; mode?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 280 76" className="h-16 w-full rounded-xl border border-dim/15 bg-deep/80" aria-hidden>
      <rect width="280" height="76" fill="#080d1f" />
      <circle cx="32" cy="18" r="1.2" fill="#f5f7ff" opacity="0.7" />
      <circle cx="88" cy="12" r="1" fill="#f5f7ff" opacity="0.5" />
      <circle cx="235" cy="20" r="14" fill="#4f8cff" opacity="0.35" />
      <path d="M0 58 Q140 48 280 58 V76 H0 Z" fill="#222a47" />
      {id === 'habitat' && (
        <g transform="translate(140 54)">
          <rect x="-46" y="-26" width="92" height="26" rx="13" fill="#c9d1e6" />
          <path d="M-24 -26 a24 22 0 0 1 48 0" fill="#dfe5f5" />
          {[-26, -8, 10, 28].map((x) => (
            <circle key={x} cx={x} cy="-13" r="3.5" fill={mode === 'boost' ? '#35d2a0' : mode === 'eco' ? '#ffc76b' : '#35d9e8'} />
          ))}
        </g>
      )}
      {id === 'solar' && (
        <g transform="translate(140 56)">
          <circle cx="-86" cy="-32" r="14" fill="#ffc76b" opacity={active ? 0.85 : 0.35} />
          {[-34, -8, 18].map((dx) => (
            <rect key={dx} x={dx} y="-38" width="20" height="34" rx="2" fill="#1f4594" stroke={active ? '#4f8cff' : '#ffc76b'} strokeWidth="1.5" />
          ))}
        </g>
      )}
      {id === 'recycler' && (
        <g transform="translate(140 56)">
          <rect x="-34" y="-32" width="20" height="32" rx="5" fill="#9fb4dc" />
          <rect x="-6" y="-26" width="20" height="26" rx="5" fill="#8aa2cf" />
          <rect x="22" y="-20" width="18" height="20" rx="4" fill="#9fb4dc" />
          <path d="M-14 -16 H-6 M14 -12 H22" stroke={active ? '#35d9e8' : '#ffc76b'} strokeWidth="3" />
        </g>
      )}
      {id === 'greenhouse' && (
        <g transform="translate(140 56)">
          <path d="M-40 0 v-18 a40 24 0 0 1 80 0 v18 z" fill={active ? '#35d2a0' : '#4a5574'} fillOpacity="0.25" stroke={active ? '#35d2a0' : '#7e8ba8'} strokeWidth="2" />
          {[-20, 0, 20].map((x) => (
            <path key={x} d={`M${x} -3 q-5 -10 0 -16 q5 6 0 16`} fill={active ? '#35d2a0' : '#7e8ba8'} />
          ))}
        </g>
      )}
      {id === 'shelter' && (
        <g transform="translate(140 56)">
          <path d="M-44 0 q6 -38 44 -40 q38 2 44 40 z" fill="#545e78" stroke="#35d2a0" strokeWidth="2" />
          <rect x="-10" y="-20" width="20" height="20" rx="3" fill="#111a35" stroke="#ffc76b" strokeWidth="1.8" />
        </g>
      )}
      {id === 'comms' && (
        <g transform="translate(140 56)">
          <rect x="-2" y="-36" width="4" height="36" fill="#9fb4dc" />
          <path d="M-18 -38 a18 11 0 0 0 36 0 z" fill="#dfe5f5" transform="rotate(-24 0 -38)" />
          <line x1="16" y1="-44" x2="88" y2="-36" stroke="#35d9e8" strokeWidth="2" strokeDasharray="4 4" />
        </g>
      )}
    </svg>
  );
}

const SHORT_EVENT_TITLE: Record<number, string> = {
  1: 'Ready to Start!',
  2: 'Less Sunlight Today!',
  3: 'Water Pipe Clogged!',
  4: 'Space Storm Coming!',
  5: 'Plant Lights Flickering!',
};

const SHORT_EVENT_HINT: Record<number, string> = {
  1: 'Check your buildings, then press GO!',
  2: 'Pick: Use Battery or Save It!',
  3: 'Fix the water pipe or wait?',
  4: 'Keep the astronauts safe!',
  5: 'Fix plant lights or save power?',
};

const SHORT_CHOICE_LABEL: Record<number, Partial<Record<EventChoice, string>>> = {
  2: { battery: '🔋 Use Battery', save: '💾 Save Battery' },
  3: { repair: '🔧 Fix Pipe', skip: '⏳ Wait' },
  4: { shield: '🛡️ Build Shield', shelter: '🏠 Hide Inside', continue: '⚡ Keep Working' },
  5: { repair: '🔧 Fix Lights', continue: '🌱 Keep Going', off: '🔌 Turn Off' },
};

/* 1. Picture-based 6-Step Guided Tour directly over the Moon Base */
export function GuidedIntroOverlay({
  step,
  onStep,
  onFinish,
  soundOn,
}: {
  step: number;
  onStep: (next: number) => void;
  onFinish: () => void;
  soundOn: boolean;
}) {
  const cur = INTRO_STEPS[step] ?? INTRO_STEPS[0];
  useEffect(() => {
    if (soundOn) speakText(`${cur.title}. ${cur.needs}. ${cur.makes}. ${cur.line}`);
    return () => stopSpeech();
  }, [cur, soundOn]);

  return (
    <div
      className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-aqua/45 bg-hull p-4 shadow-2xl"
      data-testid="overlay-guided-intro"
      role="dialog"
      aria-label={`Base guide step ${step + 1} of ${INTRO_STEPS.length}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-plate border border-aqua/30">
            <ModuleBadgeIcon id={cur.id} className="h-7 w-7" />
          </div>
          <div>
            <p className="hud-label">Step {step + 1} of {INTRO_STEPS.length}</p>
            <h2 className="font-display text-xl font-bold text-ink">{cur.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => speakText(`${cur.title}. ${cur.needs}. ${cur.makes}. ${cur.line}`, true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-dim/25 bg-plate/60 text-aqua hover:border-aqua"
            aria-label="Read this step aloud"
            data-testid="button-intro-speak"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-dim hover:bg-plate hover:text-ink"
            data-testid="button-intro-skip"
          >
            Skip
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
        <div className="flex flex-1 items-center gap-1.5 rounded-xl bg-deep/65 px-2.5 py-2 text-warn">
          <Zap className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{cur.needs}</span>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-aqua" aria-hidden />
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-aqua/30 bg-plate">
          <ModuleBadgeIcon id={cur.id} className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ok" aria-hidden />
        <div className="flex flex-1 items-center gap-1.5 rounded-xl bg-deep/65 px-2.5 py-2 text-ok">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{cur.makes}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-aqua/30 bg-aqua/10 px-3 py-2 text-xs font-semibold text-aqua">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <span>Tap the glowing building on the Moon Base, or tap Next.</span>
      </div>

      <p className="mt-2.5 text-sm text-ink">{cur.line}</p>

      <div className="mt-3 flex gap-1.5" aria-hidden>
        {INTRO_STEPS.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onStep(idx)}
            className={cn('h-2.5 flex-1 rounded-full transition', idx <= step ? 'bg-aqua' : 'bg-plate')}
            aria-label={`Jump to ${s.title}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className={cn(btn.ghost, 'min-h-[44px] px-3 py-2 text-sm')}
          disabled={step === 0}
          onClick={() => onStep(step - 1)}
          data-testid="button-intro-back"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < INTRO_STEPS.length - 1 ? (
          <button
            type="button"
            className={cn(btn.primary, 'min-h-[44px] px-4 py-2 text-sm')}
            onClick={() => onStep(step + 1)}
            data-testid="button-intro-next"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className={cn(btn.primary, 'min-h-[44px] px-4 py-2 text-sm')}
            onClick={onFinish}
            data-testid="button-intro-done"
          >
            Start Command <Play className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const KID_MODULE_NAME: Record<ModuleId, string> = {
  habitat: 'Crew Home',
  solar: 'Sun Power',
  recycler: 'Water Cleaner',
  greenhouse: 'Plant Food',
  shelter: 'Shield Dome',
  comms: 'Earth Radio',
};

const KID_MODE_META: Record<Decision['mode'], { title: string; tag: string; emoji: string }> = {
  eco: { title: 'Slow', tag: 'Saves ⚡', emoji: '🐢' },
  standard: { title: 'Normal', tag: 'Balanced', emoji: '👍' },
  boost: { title: 'Fast', tag: 'Extra 💨', emoji: '🚀' },
};

/* 2. Building Tap Control Popup (Kid-friendly, picture-first, live 5-resource impact) */
export function ModuleControlDialog({
  id,
  vm,
  draft,
  onSetDraft,
  onOpenEvent,
  onOpenSources,
  onClose,
  detailsMode,
  onCommsPingChange,
}: {
  id: ModuleId | null;
  vm: GameViewModel;
  draft: Decision;
  onSetDraft: (patch: Partial<Decision>) => void;
  onOpenEvent: () => void;
  onOpenSources?: () => void;
  onClose: () => void;
  detailsMode: boolean;
  onCommsPingChange?: (stage: 'idle' | 'out' | 'back' | 'done') => void;
}) {
  const m = MODULES.find((x) => x.id === id) ?? null;
  const [showScience, setShowScience] = useState(false);
  const [commsStage, setCommsStage] = useState<'idle' | 'out' | 'back' | 'done'>('idle');

  useEffect(() => {
    setShowScience(false);
    setCommsStage('idle');
    onCommsPingChange?.('idle');
  }, [id, onCommsPingChange]);

  useEffect(() => {
    onCommsPingChange?.(commsStage);
  }, [commsStage, onCommsPingChange]);

  useEffect(() => {
    if (commsStage !== 'out' && commsStage !== 'back') return;
    const t = window.setTimeout(() => {
      setCommsStage((prev) => (prev === 'out' ? 'back' : 'done'));
    }, 1300);
    return () => window.clearTimeout(t);
  }, [commsStage]);

  if (!m) return null;
  const isActive = vm.status === 'active';
  const previewKeys: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];
  const previewDelta = vm.forecast.delta;

  const renderControls = () => {
    switch (m.id) {
      case 'habitat':
        return (
          <div className="space-y-2.5">
            <p className="font-display text-base font-bold text-ink">Pick Air Speed</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Life support mode">
              {vm.modes.map((mode) => {
                const km = KID_MODE_META[mode.id];
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={mode.selected}
                    disabled={!isActive}
                    onClick={() => {
                      playSfx('tap');
                      onSetDraft({ mode: mode.id });
                    }}
                    data-testid={`scene-mode-${mode.id}`}
                    className={cn(
                      'flex min-h-[108px] flex-col items-center justify-between rounded-2xl border-2 p-3 text-center transition active:scale-[0.98]',
                      mode.selected
                        ? 'border-aqua bg-aqua/20 shadow-lg ring-2 ring-aqua/40'
                        : 'border-dim/25 bg-deep/60 hover:border-aqua/60',
                      !mode.affordable && 'border-bad/60 opacity-80',
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden>{km.emoji}</span>
                    <span className="font-display text-base font-extrabold text-ink">{km.title}</span>
                    <div className="flex flex-col items-center gap-0.5 font-mono text-xs font-bold">
                      <span className="text-warn">-{mode.powerCost} ⚡</span>
                      <span className={mode.netAir >= 0 ? 'text-ok' : 'text-bad'}>
                        {mode.netAir > 0 ? `+${mode.netAir}` : mode.netAir} 💨
                      </span>
                    </div>
                    {!mode.affordable && <span className="text-[11px] font-bold text-bad">Low Power!</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'greenhouse':
      case 'recycler':
      case 'comms': {
        const sysKey = m.id === 'comms' ? 'communications' : m.id;
        const sys = vm.systems[sysKey];
        const checked = sys.effective;
        const cannotEnable = !checked && sys.powerDeficitWhenOn > 0;
        const toggleSystem = () => {
          if (!isActive || sys.lockedOff || cannotEnable) return;
          playSfx(checked ? 'off' : 'on');
          onSetDraft({ [sysKey]: !checked } as Partial<Decision>);
        };
        return (
          <div className="space-y-3">
            <div
              className={cn(
                'flex items-center justify-between gap-3 rounded-2xl border-2 p-4 transition',
                checked ? 'border-ok/70 bg-ok/15' : 'border-dim/30 bg-deep/60',
              )}
            >
              <button
                type="button"
                onClick={toggleSystem}
                disabled={!isActive || sys.lockedOff || cannotEnable}
                className="flex flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    'grid h-12 w-14 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold',
                    checked ? 'bg-ok text-deep' : 'bg-plate text-dim',
                  )}
                >
                  {checked ? 'ON' : 'OFF'}
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-ink">
                    {checked ? `${KID_MODULE_NAME[m.id]} is ON` : `${KID_MODULE_NAME[m.id]} is OFF`}
                  </p>
                  <p className="font-mono text-xs font-semibold text-dim">
                    {sys.costLabel} · {sys.gainLabel}
                  </p>
                  {sys.lockedOff && (
                    <p className="mt-1 text-xs font-bold text-warn">{sys.lockReason}</p>
                  )}
                  {!sys.lockedOff && cannotEnable && (
                    <p className="mt-1 text-xs font-bold text-bad">
                      Needs +{sys.powerDeficitWhenOn} Power to turn ON!
                    </p>
                  )}
                </div>
              </button>
              <Switch
                checked={checked}
                disabled={!isActive || sys.lockedOff || cannotEnable}
                onCheckedChange={(v) => {
                  playSfx(v ? 'on' : 'off');
                  onSetDraft({ [sysKey]: v } as Partial<Decision>);
                }}
                data-testid={`scene-switch-${sysKey}`}
                aria-label={`Toggle ${sys.label}`}
              />
            </div>

            {!sys.lockedOff && cannotEnable && <PowerShortVisual deficit={sys.powerDeficitWhenOn} />}

            {isActive && ((m.id === 'recycler' && vm.cycle === 3) || (m.id === 'greenhouse' && vm.cycle === 5)) && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  onClose();
                  onOpenEvent();
                }}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#b87b14] bg-warn px-5 py-3 font-display text-base font-extrabold text-deep transition hover:brightness-110 active:translate-y-0.5"
                data-testid="button-module-fix-event"
              >
                <AlertTriangle className="h-5 w-5" /> Fix Day {vm.cycle} Problem!
              </button>
            )}
          </div>
        );
      }

      case 'solar':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-warn/35 bg-deep/65 p-3.5 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-dim">Sunlight Today</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-warn">+{vm.forecast.solar} ⚡</p>
                <p className="text-xs font-semibold text-dim">
                  {vm.forecast.solar < 12 ? 'Shadowy Sun' : 'Bright Sun'}
                </p>
              </div>
              <div className="rounded-2xl border border-aqua/35 bg-deep/65 p-3.5 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-dim">Batteries</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 font-display text-3xl font-extrabold text-aqua">
                  <BatteryCharging className="h-6 w-6" /> {vm.inventory.backupCharges}
                </p>
                <p className="text-xs font-semibold text-dim">Adds +20 ⚡</p>
              </div>
            </div>
            {isActive && vm.cycle === 2 && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  onClose();
                  onOpenEvent();
                }}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#b87b14] bg-warn px-5 py-3 font-display text-base font-extrabold text-deep transition hover:brightness-110 active:translate-y-0.5"
                data-testid="button-solar-event"
              >
                <BatteryCharging className="h-5 w-5" /> Use or Save Battery? (Tap Here!)
              </button>
            )}
          </div>
        );

      case 'shelter':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-ok/35 bg-deep/65 p-3.5 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-dim">Shield Wall</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-ok">Lv {vm.inventory.shieldingLevel}</p>
                <p className="text-xs font-semibold text-dim">Keeps crew safe</p>
              </div>
              <div className="rounded-2xl border border-warn/35 bg-deep/65 p-3.5 text-center">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-dim">Shield Kits</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-warn">{vm.inventory.shieldingKits}</p>
                <p className="text-xs font-semibold text-dim">Makes wall stronger</p>
              </div>
            </div>
            {isActive && vm.cycle === 4 && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  onClose();
                  onOpenEvent();
                }}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#b87b14] bg-warn px-5 py-3 font-display text-base font-extrabold text-deep transition hover:brightness-110 active:translate-y-0.5"
                data-testid="button-shelter-event"
              >
                <Shield className="h-5 w-5" /> Protect Crew! (Space Storm)
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        overlayClassName="bg-[#070b1b]/80"
        className="max-h-[90dvh] max-w-lg overflow-y-auto border-aqua/35 bg-hull text-ink"
        data-testid="dialog-module-control"
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-aqua/40 bg-plate">
                <ModuleBadgeIcon id={m.id} className="h-7 w-7" />
              </div>
              <div>
                <DialogTitle className="font-display text-2xl font-extrabold text-ink">
                  {KID_MODULE_NAME[m.id]}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-dim">{m.short}</DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                speakText(`${KID_MODULE_NAME[m.id]}. ${m.purpose}`, true);
              }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-aqua/40 bg-plate text-aqua hover:bg-aqua/15"
              aria-label="Read module info aloud"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <ModuleVisualLesson
          id={m.id}
          mode={draft.mode}
          solar={vm.forecast.solar}
          backupCharges={vm.inventory.backupCharges}
          shieldingLevel={vm.inventory.shieldingLevel}
          recyclerOn={vm.pending.settings.recycler}
          greenhouseOn={vm.pending.effectiveGreenhouse}
          commsOn={vm.pending.settings.communications}
          cycle={vm.cycle}
          commsStage={commsStage}
          onSendEarth={() => {
            playSfx('tap');
            setCommsStage('out');
          }}
          detailsMode={detailsMode}
        />

        {renderControls()}

        {/* Live 5-Bar Impact Strip so kids see cause & effect right away */}
        {previewDelta && (
          <div className="rounded-2xl border border-dim/20 bg-deep/55 p-2.5">
            <p className="mb-1.5 text-center font-display text-[11px] font-bold uppercase tracking-wider text-aqua">
              Next Day Effect
            </p>
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs font-bold tabular-nums">
              {previewKeys.map((k) => {
                const d = previewDelta[k];
                return (
                  <div key={k} className="rounded-xl bg-hull/80 py-1.5">
                    <div className="flex justify-center" style={{ color: tone(vm.resources[k].current) }}>
                      <ResourceIcon k={k} className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn('mt-0.5 block', d > 0 ? 'text-ok' : d < 0 ? 'text-bad' : 'text-dim')}>
                      {d > 0 ? `+${d}` : d}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            onClose();
          }}
          className={cn(btn.primary, 'w-full')}
          data-testid="button-module-done"
        >
          <CheckCircle2 className="h-5 w-5" /> Done!
        </button>

        <button
          type="button"
          onClick={() => setShowScience((s) => !s)}
          className="flex min-h-[40px] w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-dim hover:bg-plate/40 hover:text-ink"
          data-testid="button-module-science-toggle"
        >
          <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-aqua" /> Grown-up Science Info</span>
          <ChevronDown className={cn('h-4 w-4 transition', showScience && 'rotate-180')} />
        </button>
        {showScience && (
          <div className="space-y-2 rounded-xl bg-ion/10 p-3 text-sm text-ink">
            <p>{m.purpose}</p>
            <p className="text-dim">{m.science}</p>
            {detailsMode && (
              <div className="text-xs">
                <p className="font-mono text-aqua">Needs: {m.needs}</p>
                <p className="mt-0.5 font-mono text-ok">Produces: {m.output}</p>
              </div>
            )}
            {onOpenSources && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSources();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-aqua hover:underline"
                data-testid="button-module-open-sources"
              >
                <Database className="h-3.5 w-3.5" /> NASA Sources →
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* 3. Kid-Friendly 1-Tap Cycle Event & Launch Popup over the Moon Base */
export function CycleDecisionDialog({
  open,
  onOpenChange,
  game,
  draft,
  vm,
  stagedChoiceProp,
  onStageChoice,
  onSelectEvent,
  onSetDraft,
  onCommitCycle,
  onPreviewChoiceChange,
  onOpenSources,
  hasVerifiedDonkiContext = false,
  running,
  error,
  detailsMode,
  soundOn,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  game: State;
  draft: Decision;
  vm: GameViewModel;
  stagedChoiceProp?: EventChoice | null;
  onStageChoice?: (choice: EventChoice | null) => void;
  onSelectEvent: (choice: EventChoice) => void;
  onSetDraft: (patch: Partial<Decision>) => void;
  onCommitCycle: () => void;
  onPreviewChoiceChange?: (choice: EventChoice | null) => void;
  onOpenSources?: () => void;
  hasVerifiedDonkiContext?: boolean;
  running: boolean;
  error: string | null;
  detailsMode: boolean;
  soundOn: boolean;
}) {
  const [localStaged, setLocalStaged] = useState<EventChoice | null>(null);
  const [hoveredChoice, setHoveredChoice] = useState<EventChoice | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [fixAppliedNote, setFixAppliedNote] = useState<string | null>(null);

  const ev = vm.event;
  const shortTitle = SHORT_EVENT_TITLE[vm.cycle] ?? ev.title;
  const shortHint = SHORT_EVENT_HINT[vm.cycle] ?? ev.briefing;

  const validStagedProp =
    stagedChoiceProp && ev.options.some((o) => o.value === stagedChoiceProp)
      ? stagedChoiceProp
      : null;

  const stagedChoice: EventChoice | null =
    stagedChoiceProp !== undefined
      ? validStagedProp ?? (vm.event.hasValidSelection ? vm.event.selected : null)
      : localStaged;

  const updateStagedChoice = (choice: EventChoice | null) => {
    setLocalStaged(choice);
    onStageChoice?.(choice);
  };

  useEffect(() => {
    if (open) {
      if (stagedChoiceProp === undefined) {
        setLocalStaged(vm.event.hasValidSelection ? vm.event.selected : null);
      }
      setHoveredChoice(null);
      setShowHelp(false);
      setFixAppliedNote(null);
    } else {
      setHoveredChoice(null);
      setShowHelp(false);
      setFixAppliedNote(null);
      onPreviewChoiceChange?.(null);
    }
  }, [open, vm.cycle, vm.event.hasValidSelection, vm.event.selected, stagedChoiceProp, onPreviewChoiceChange]);

  useEffect(() => {
    if (!open || !soundOn) return;
    speakText(`Day ${vm.cycle}: ${shortTitle}. ${shortHint}`);
    return () => stopSpeech();
  }, [open, soundOn, vm.cycle, shortTitle, shortHint]);

  const activeChoice: EventChoice | null =
    ev.options.length <= 1
      ? 'none'
      : hoveredChoice ?? stagedChoice ?? (vm.event.hasValidSelection ? vm.event.selected : null);

  useEffect(() => {
    if (!open) return;
    onPreviewChoiceChange?.(activeChoice);
  }, [open, activeChoice, onPreviewChoiceChange]);

  const previewVm = activeChoice
    ? getViewModel(game, draft, activeChoice)
    : vm;

  const isChoiceReady = ev.options.length <= 1 || vm.event.hasValidSelection;
  const powerFix = previewVm.forecast.powerDeficit > 0
    ? findPowerFixSuggestion(game, draft, activeChoice ?? draft.event)
    : null;

  const keys: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];
  const currentResources = game.resources;
  const solarRatio = Math.min(100, Math.round((previewVm.forecast.powerCost / Math.max(1, previewVm.forecast.solar)) * 100));

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent
        overlayClassName="bg-[#070b1b]/80"
        className="flex max-h-[92dvh] max-w-2xl flex-col gap-3 overflow-hidden border-aqua/40 bg-hull p-4 text-ink shadow-2xl sm:p-6"
        data-testid="dialog-cycle-decision"
        onEscapeKeyDown={(e) => running && e.preventDefault()}
        onPointerDownOutside={(e) => running && e.preventDefault()}
      >
        <DialogHeader className="shrink-0 text-left">
          <div className="flex items-start justify-between gap-2 pr-8">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2',
                  ev.severity === 'alert'
                    ? 'border-bad/60 bg-bad/15'
                    : ev.severity === 'caution'
                      ? 'border-warn/60 bg-warn/15'
                      : 'border-ok/50 bg-ok/15',
                )}
              >
                <ModuleBadgeIcon id={ev.relatesTo} className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xs font-extrabold uppercase tracking-wider text-aqua">
                    Day {vm.cycle} of {vm.maxCycles}
                  </span>
                  {hasVerifiedDonkiContext && (
                    <span className="font-mono text-[10px] font-semibold text-aqua/80">
                      · NASA Space Weather
                    </span>
                  )}
                </div>
                <DialogTitle className="mt-0.5 font-display text-2xl font-extrabold text-ink sm:text-3xl">
                  {shortTitle}
                </DialogTitle>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setShowHelp((s) => !s);
                }}
                aria-expanded={showHelp}
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition',
                  showHelp ? 'border-aqua bg-aqua/15 text-aqua' : 'border-dim/25 bg-plate text-dim hover:border-aqua hover:text-ink',
                )}
                aria-label="Show science explanation and full details"
                data-testid="button-event-help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  speakText(`Day ${vm.cycle}: ${shortTitle}. ${ev.briefing}`, true);
                }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-aqua/35 bg-plate text-aqua hover:bg-aqua/15"
                aria-label="Read event aloud"
                data-testid="button-event-speak"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          <DialogDescription className="sr-only">{ev.briefing}</DialogDescription>

          {/* Friendly Big Prompt Chip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-display text-sm font-bold',
                ev.severity === 'alert'
                  ? 'bg-bad/20 text-bad'
                  : ev.severity === 'caution'
                    ? 'bg-warn/20 text-warn'
                    : 'bg-ok/15 text-ok',
              )}
              data-testid="text-event-short-hint"
            >
              {ev.severity !== 'nominal' ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              {shortHint}
            </span>

            {vm.cycle === 2 && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-warn/35 bg-deep/70 px-3 py-1 font-mono text-xs font-bold text-warn" data-testid="text-backup-count">
                <BatteryCharging className="h-4 w-4" aria-hidden />
                Batteries: {vm.inventory.backupCharges} · Sun +{vm.forecast.solar}
              </span>
            )}
            {vm.cycle === 4 && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-ok/35 bg-deep/70 px-3 py-1 font-mono text-xs font-bold text-ok" data-testid="text-shield-count">
                <Shield className="h-4 w-4" aria-hidden />
                Shield Kits: {vm.inventory.shieldingKits} · Lv {vm.inventory.shieldingLevel}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
          {/* Expressive Cycle Hero Illustration */}
          <EventHeroIllustration
            cycle={vm.cycle}
            previewChoice={activeChoice}
            recyclerOn={previewVm.pending.settings.recycler}
            greenhouseOn={previewVm.pending.effectiveGreenhouse}
            backupCharges={vm.inventory.backupCharges}
            shieldingLevel={vm.inventory.shieldingLevel}
            shieldingKits={vm.inventory.shieldingKits}
            powerCost={previewVm.forecast.powerCost}
            solar={previewVm.forecast.solar}
          />

          {/* Cycle 1 Visual Sun Power Meter */}
          {vm.cycle === 1 && (
            <div className="rounded-2xl border border-dim/20 bg-deep/55 p-3" data-testid="c1-power-cue">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-ink">
                  <Zap className="h-4 w-4 text-warn" aria-hidden /> Power Used vs Sun Made
                </span>
                <span className="font-mono text-dim">
                  Used {previewVm.forecast.powerCost} / Sun {previewVm.forecast.solar}
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-plate">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    previewVm.forecast.powerCost > previewVm.forecast.solar ? 'bg-warn' : 'bg-ok',
                  )}
                  style={{ width: `${solarRatio}%` }}
                />
              </div>
            </div>
          )}

          {/* 1-Tap Picture Choices (Cycles 2-5) */}
          {ev.options.length > 1 && (
            <div className="space-y-2" role="radiogroup" aria-label="Pick what to do">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-extrabold text-ink">
                  1. Tap a Picture!
                </p>
                {vm.event.hasValidSelection ? (
                  <span className="inline-flex items-center gap-1 font-display text-xs font-bold text-ok" data-testid="badge-choice-confirmed">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Picked! Ready to go
                  </span>
                ) : (
                  <span className="font-display text-xs font-bold text-aqua">Tap one card below</span>
                )}
              </div>

              <div className={cn('grid gap-2 sm:gap-2.5', ev.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                {ev.options.map((opt) => {
                  const isSelected = vm.event.hasValidSelection && vm.event.selected === opt.value;
                  const isHovered = hoveredChoice === opt.value;
                  const optPreview = getViewModel(game, draft, opt.value);
                  const blockedBySystem =
                    opt.value === 'repair' &&
                    ((vm.cycle === 3 && !draft.recycler) || (vm.cycle === 5 && !draft.greenhouse));
                  const blockedByInventory =
                    (vm.cycle === 2 && opt.value === 'battery' && vm.inventory.backupCharges < 1) ||
                    (vm.cycle === 4 && opt.value === 'shield' && vm.inventory.shieldingKits < 1);
                  const disabled = blockedBySystem || blockedByInventory;
                  const shortLabel = SHORT_CHOICE_LABEL[vm.cycle]?.[opt.value] ?? opt.label;
                  const pwrDelta = optPreview.forecast.delta?.power ?? null;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-describedby={`ev-opt-desc-${opt.value}`}
                      disabled={disabled}
                      onMouseEnter={() => setHoveredChoice(opt.value)}
                      onMouseLeave={() => setHoveredChoice((h) => (h === opt.value ? null : h))}
                      onFocus={() => setHoveredChoice(opt.value)}
                      onBlur={() => setHoveredChoice((h) => (h === opt.value ? null : h))}
                      onClick={() => {
                        playSfx('tap');
                        setFixAppliedNote(null);
                        updateStagedChoice(opt.value);
                        onSelectEvent(opt.value);
                      }}
                      data-testid={`scene-event-${opt.value}`}
                      className={cn(
                        'relative flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 p-2.5 text-center transition active:translate-y-0.5 sm:gap-2 sm:p-3',
                        isSelected
                          ? 'border-aqua bg-aqua/20 shadow-lg ring-2 ring-aqua/40'
                          : 'border-dim/30 bg-deep/65 hover:border-aqua/70',
                        disabled && 'cursor-not-allowed border-bad/30 opacity-45',
                      )}
                    >
                      {isSelected && (
                        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ok text-deep">
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                      <ChoicePictogram cycle={vm.cycle} value={opt.value} active={isSelected || isHovered} />
                      <span className="font-display text-sm font-extrabold leading-tight text-ink sm:text-base">{shortLabel}</span>

                      {/* Concise visual resource delta indicators */}
                      <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-[11px] font-bold">
                        {vm.cycle === 2 && opt.value === 'battery' && (
                          <span className="rounded-lg bg-ok/15 px-1.5 py-0.5 text-ok">+20 ⚡</span>
                        )}
                        {vm.cycle === 2 && opt.value === 'save' && (
                          <span className="rounded-lg bg-ion/15 px-1.5 py-0.5 text-aqua">Keep ×{vm.inventory.backupCharges}</span>
                        )}
                        {vm.cycle === 3 && opt.value === 'repair' && (
                          <>
                            <span className="rounded-lg bg-bad/15 px-1.5 py-0.5 text-bad">-6 ⚡</span>
                            <span className="rounded-lg bg-ok/15 px-1.5 py-0.5 text-ok">{draft.recycler ? '+12 💧' : '0 💧'}</span>
                          </>
                        )}
                        {vm.cycle === 3 && opt.value === 'skip' && (
                          <span className="rounded-lg bg-warn/15 px-1.5 py-0.5 text-warn">{draft.recycler ? '+4 💧' : '0 💧'}</span>
                        )}
                        {vm.cycle === 4 && opt.value === 'shield' && (
                          <>
                            <span className="rounded-lg bg-bad/15 px-1.5 py-0.5 text-bad">-4 ⚡</span>
                            <span className="rounded-lg bg-ok/15 px-1.5 py-0.5 text-ok">Lv +1</span>
                          </>
                        )}
                        {vm.cycle === 4 && opt.value === 'shelter' && (
                          <>
                            <span className="rounded-lg bg-bad/15 px-1.5 py-0.5 text-bad">-4 ⚡</span>
                            <span className="rounded-lg bg-warn/15 px-1.5 py-0.5 text-warn">-2 Safe</span>
                          </>
                        )}
                        {vm.cycle === 4 && opt.value === 'continue' && (
                          <span className="rounded-lg bg-bad/15 px-1.5 py-0.5 text-bad">-{opt.safetyLoss} Safe</span>
                        )}
                        {vm.cycle === 5 && opt.value === 'repair' && (
                          <>
                            <span className="rounded-lg bg-bad/15 px-1.5 py-0.5 text-bad">-8 ⚡</span>
                            <span className="rounded-lg bg-ok/15 px-1.5 py-0.5 text-ok">{draft.greenhouse ? '+12 🍎' : '0 🍎'}</span>
                          </>
                        )}
                        {vm.cycle === 5 && opt.value === 'continue' && (
                          <span className="rounded-lg bg-warn/15 px-1.5 py-0.5 text-warn">0 🍎</span>
                        )}
                        {vm.cycle === 5 && opt.value === 'off' && (
                          <span className="rounded-lg bg-aqua/15 px-1.5 py-0.5 text-aqua">Saves ⚡💧</span>
                        )}
                        {pwrDelta === null && optPreview.forecast.powerDeficit > 0 && !disabled && (
                          <span className="rounded-lg bg-bad/20 px-1.5 py-0.5 text-bad">Need +{optPreview.forecast.powerDeficit} ⚡</span>
                        )}
                      </div>

                      {disabled && opt.disabledReason && (
                        <span className="text-[11px] font-semibold text-bad">{opt.disabledReason}</span>
                      )}
                      <span id={`ev-opt-desc-${opt.value}`} className="sr-only">
                        {opt.label}. {opt.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Base Controls so kids can adjust Air / Plants / Water / Radio without leaving */}
          <div className="rounded-2xl border border-dim/20 bg-deep/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-xs font-extrabold uppercase tracking-wider text-dim">
                Quick Base Switches
              </span>
              <span className="font-mono text-xs font-bold text-dim">
                Sun <span className="text-ok">+{previewVm.forecast.solar}</span> · Used <span className="text-warn">-{previewVm.forecast.powerCost}</span>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {previewVm.modes.map((m) => {
                const km = KID_MODE_META[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setFixAppliedNote(null);
                      onSetDraft({ mode: m.id });
                    }}
                    className={cn(
                      'min-h-[42px] rounded-xl border-2 px-3 py-1.5 font-display text-xs font-bold transition',
                      m.selected ? 'border-aqua bg-aqua/20 text-ink' : 'border-dim/25 bg-hull/60 text-dim hover:text-ink',
                    )}
                    data-testid={`quick-mode-${m.id}`}
                  >
                    {km.emoji} {km.title} Air
                  </button>
                );
              })}
              {(['greenhouse', 'recycler', 'communications'] as const).map((k) => {
                const s = previewVm.systems[k];
                const short = k === 'greenhouse' ? '🌱 Plants' : k === 'recycler' ? '💧 Water' : '📡 Radio';
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={s.lockedOff}
                    onClick={() => {
                      playSfx(s.effective ? 'off' : 'on');
                      setFixAppliedNote(null);
                      onSetDraft({ [k]: !s.effective } as Partial<Decision>);
                    }}
                    className={cn(
                      'min-h-[42px] rounded-xl border-2 px-3 py-1.5 font-display text-xs font-bold transition',
                      s.effective ? 'border-ok/60 bg-ok/15 text-ok' : 'border-dim/25 bg-hull/60 text-dim',
                      s.lockedOff && 'opacity-45',
                    )}
                    data-testid={`quick-toggle-${k}`}
                  >
                    {short}: {s.effective ? 'ON' : 'OFF'}
                  </button>
                );
              })}
            </div>
            {fixAppliedNote && (
              <p className="mt-2 font-display text-xs font-bold text-ok" data-testid="text-autofix-applied">
                ✓ Fixed! {fixAppliedNote}
              </p>
            )}
          </div>

          {/* Live Before -> Tomorrow Preview */}
          <div
            className="rounded-2xl border border-dashed border-aqua/45 bg-deep/55 p-3"
            aria-live="polite"
            data-testid="scene-forecast-preview"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1.5 font-display text-xs font-extrabold uppercase tracking-wider text-aqua"
                data-testid="badge-preview-state"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                What Will Happen Next
              </span>
              {activeChoice && activeChoice !== 'none' && (
                <span className="font-display text-xs font-bold text-ink">
                  {SHORT_CHOICE_LABEL[vm.cycle]?.[activeChoice] ?? EVENT_LABEL[activeChoice]}
                </span>
              )}
            </div>

            {ev.options.length > 1 && !activeChoice ? (
              <p className="py-2 text-center font-display text-sm font-bold text-aqua">
                👆 Tap a picture above to see what happens!
              </p>
            ) : previewVm.forecast.valid && previewVm.forecast.after && previewVm.forecast.delta ? (
              <>
                <div className="grid grid-cols-5 gap-1.5">
                  {keys.map((k) => {
                    const delta = previewVm.forecast.delta![k];
                    const after = previewVm.forecast.after![k];
                    const changed = delta !== 0;
                    return (
                      <div
                        key={k}
                        className={cn(
                          'rounded-xl border p-2 text-center transition',
                          changed ? 'border-aqua/40 bg-hull' : 'border-transparent bg-hull/60',
                        )}
                        data-testid={`preview-resource-${k}`}
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-dim">
                          <span style={{ color: tone(after) }}>
                            <ResourceIcon k={k} className="h-4 w-4" />
                          </span>
                          <span>{k === 'safety' ? 'Safe' : RESOURCE_META[k].label}</span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-dim tabular-nums">
                          {currentResources[k]}→<span className="text-sm font-extrabold" style={{ color: tone(after) }}>{after}</span>
                        </p>
                        <p
                          className={cn(
                            'flex items-center justify-center gap-0.5 font-mono text-xs font-extrabold tabular-nums',
                            delta > 0 ? 'text-ok' : delta < 0 ? 'text-bad' : 'text-dim',
                          )}
                        >
                          {delta > 0 && <ArrowUp className="h-3 w-3" aria-hidden />}
                          {delta < 0 && <ArrowDown className="h-3 w-3" aria-hidden />}
                          {delta > 0 ? `+${delta}` : delta}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {(previewVm.forecast.eventConsequences.backupCharges !== 0 ||
                  previewVm.forecast.eventConsequences.shieldingKits !== 0 ||
                  previewVm.forecast.eventConsequences.shieldingLevel !== 0 ||
                  previewVm.inventory.scienceDelta !== 0) && (
                  <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] font-bold">
                    {previewVm.forecast.eventConsequences.backupCharges !== 0 && (
                      <span className="rounded-lg bg-warn/15 px-2 py-0.5 text-warn">
                        Battery {vm.inventory.backupCharges} → {vm.inventory.backupCharges + previewVm.forecast.eventConsequences.backupCharges}
                      </span>
                    )}
                    {previewVm.forecast.eventConsequences.shieldingKits !== 0 && (
                      <span className="rounded-lg bg-warn/15 px-2 py-0.5 text-warn">
                        Shield Kits {vm.inventory.shieldingKits} → {vm.inventory.shieldingKits + previewVm.forecast.eventConsequences.shieldingKits}
                      </span>
                    )}
                    {previewVm.forecast.eventConsequences.shieldingLevel !== 0 && (
                      <span className="rounded-lg bg-ok/15 px-2 py-0.5 text-ok">
                        Shield Lv {vm.inventory.shieldingLevel} → {vm.inventory.shieldingLevel + previewVm.forecast.eventConsequences.shieldingLevel}
                      </span>
                    )}
                    {previewVm.inventory.scienceDelta !== null && previewVm.inventory.scienceDelta !== 0 && (
                      <span className={cn('rounded-lg px-2 py-0.5', previewVm.inventory.scienceDelta > 0 ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn')}>
                        Science {previewVm.inventory.scienceDelta > 0 ? `+${previewVm.inventory.scienceDelta}` : previewVm.inventory.scienceDelta}
                      </span>
                    )}
                  </div>
                )}

                {(detailsMode || showHelp) && previewVm.forecast.explanations.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-dim">
                    {previewVm.forecast.explanations.map((ex, i) => <li key={i}>· {ex}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <div className="space-y-2.5" data-testid="scene-forecast-errors">
                {previewVm.forecast.powerDeficit > 0 && <PowerShortVisual deficit={previewVm.forecast.powerDeficit} />}
                {powerFix && (
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('on');
                      onSetDraft(powerFix.patch);
                      if (powerFix.patch.event) {
                        updateStagedChoice(powerFix.patch.event);
                      }
                      setFixAppliedNote(powerFix.label);
                    }}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-[#189ab4] bg-aqua px-4 py-2.5 font-display text-base font-extrabold text-deep shadow-lg transition hover:brightness-110 active:translate-y-0.5"
                    data-testid="button-autofix-power"
                  >
                    <Zap className="h-5 w-5" aria-hidden /> Fix Power For Me! ({powerFix.label})
                  </button>
                )}
                {previewVm.forecast.errors.map((e) => <ErrorNote key={e} text={e} />)}
              </div>
            )}
          </div>

          {/* Optional grown-up / science explanation behind ? toggle */}
          {(showHelp || detailsMode) && (
            <div className="space-y-2 rounded-2xl border border-ion/30 bg-ion/10 p-3 text-xs text-ink" data-testid="panel-event-help">
              <p>{ev.briefing}</p>
              <p className="text-aqua"><strong>Science:</strong> {ev.science}</p>
              {ev.options.length > 1 && (
                <ul className="space-y-1 text-dim">
                  {ev.options.map((o) => (
                    <li key={o.value}><strong>{SHORT_CHOICE_LABEL[vm.cycle]?.[o.value] ?? o.label}:</strong> {o.detail}</li>
                  ))}
                </ul>
              )}
              {onOpenSources && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenSources();
                  }}
                  data-testid="button-popup-source-badge"
                  className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline"
                >
                  <Database className="h-3.5 w-3.5" aria-hidden />
                  Open NASA &amp; Science Sources →
                </button>
              )}
            </div>
          )}

          {previewVm.forecast.valid && previewVm.forecast.nextStatus === 'failed' && (
            <p className="rounded-2xl border border-bad/50 bg-bad/15 p-3 text-sm font-bold text-bad" role="alert">
              ⚠️ Careful! Something will hit 0! Try turning another switch ON or picking a different picture!
            </p>
          )}

          {error && <ErrorNote text={error} />}
        </div>

        {/* Single Clear Action Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-dim/15 pt-3">
          <button
            type="button"
            className={cn(btn.ghost, 'px-3.5 text-sm sm:px-5')}
            onClick={() => {
              playSfx('tap');
              onOpenChange(false);
            }}
            data-testid="button-close-decision"
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Base</span>
          </button>

          <button
            type="button"
            disabled={!vm.canRunCycle || running}
            onClick={() => {
              playSfx('launch');
              onCommitCycle();
            }}
            className={cn(btn.primary, 'flex-1 whitespace-nowrap px-4 text-base sm:text-lg')}
            data-testid="button-stage-run-cycle"
          >
            {isChoiceReady && vm.forecast.powerDeficit <= 0 && <Rocket className="h-5 w-5 shrink-0" />}
            {!isChoiceReady
              ? '👆 Tap a Card Above'
              : vm.forecast.powerDeficit > 0
                ? '⚡ Fix Power First!'
                : `GO! Start Day ${vm.cycle}!`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* 4. Immediate Post-Commit Cycle Reaction Popup over the Moon Base */
export function CycleReactionDialog({
  record,
  gameStatus,
  nextCycle,
  onContinue,
  soundOn,
}: {
  record: Review | null;
  gameStatus: State['status'];
  nextCycle: number;
  onContinue: () => void;
  soundOn: boolean;
}) {
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    setShowWhy(false);
    if (!record) return;
    playSfx(gameStatus === 'failed' ? 'oops' : gameStatus === 'success' ? 'win' : 'good');
    if (soundOn) {
      speakText(`Day ${record.cycle} done! ${record.lesson}`);
    }
    return () => stopSpeech();
  }, [record, soundOn, gameStatus]);

  if (!record) return null;
  const keys: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];
  const ended = gameStatus !== 'active';

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onContinue()}>
      <DialogContent
        overlayClassName="bg-[#070b1b]/80"
        className={cn(
          'max-h-[90dvh] max-w-lg overflow-y-auto bg-hull text-ink shadow-2xl',
          gameStatus === 'failed' ? 'border-bad/55' : 'border-ok/50',
        )}
        data-testid="dialog-cycle-reaction"
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-display text-xs font-extrabold uppercase tracking-wider',
                    gameStatus === 'failed' ? 'text-bad' : 'text-ok',
                  )}
                  data-testid="badge-committed-state"
                >
                  {gameStatus === 'failed' ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                  Day {record.cycle} Done!
                </span>
              </div>
              <DialogTitle className="mt-1 font-display text-2xl font-extrabold text-ink sm:text-3xl">
                {gameStatus === 'failed'
                  ? 'Uh oh! Out of Supplies!'
                  : gameStatus === 'success'
                    ? 'HOORAY! All 5 Days Complete!'
                    : 'Great Job! Base Updated!'}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                speakText(`Day ${record.cycle} done! ${record.lesson}`, true);
              }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-aqua/35 bg-plate text-aqua hover:bg-aqua/15"
              aria-label="Read day result aloud"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
          <DialogDescription className="text-sm font-medium text-dim">
            {KID_MODE_META[record.decision.mode].emoji} {KID_MODE_META[record.decision.mode].title} Air ·{' '}
            {record.decision.event === 'none'
              ? 'Smooth Day!'
              : SHORT_CHOICE_LABEL[record.cycle]?.[record.decision.event] ?? EVENT_LABEL[record.decision.event]}
          </DialogDescription>
        </DialogHeader>

        {/* Visual Before -> After Resource Cards */}
        <div className="grid grid-cols-5 gap-1.5" data-testid="reaction-resource-grid">
          {keys.map((k) => {
            const b = record.before[k];
            const a = record.after[k];
            const d = a - b;
            return (
              <div key={k} className="rounded-2xl border border-dim/20 bg-deep/65 p-2 text-center">
                <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold" style={{ color: tone(a) }}>
                  <ResourceIcon k={k} className="h-4 w-4" />
                  <span className="text-dim">{k === 'safety' ? 'Safe' : RESOURCE_META[k].label}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-dim tabular-nums">
                  {b}→<span className="text-sm font-extrabold" style={{ color: tone(a) }}>{a}</span>
                </p>
                <p
                  className={cn(
                    'mt-0.5 inline-flex items-center justify-center gap-0.5 font-mono text-xs font-extrabold tabular-nums',
                    d > 0 ? 'text-ok' : d < 0 ? 'text-bad' : 'text-dim',
                  )}
                >
                  {d > 0 && <ArrowUp className="h-3 w-3" aria-hidden />}
                  {d < 0 && <ArrowDown className="h-3 w-3" aria-hidden />}
                  <Delta v={d} />
                </p>
              </div>
            );
          })}
        </div>

        <CycleCauseEffectVisual
          record={record}
          failed={gameStatus === 'failed'}
          onSpeak={() => speakText(`Day ${record.cycle} done! ${record.lesson}`, true)}
        />

        <button
          type="button"
          onClick={() => setShowWhy((w) => !w)}
          className="flex min-h-[42px] w-full items-center justify-between rounded-xl bg-plate/40 px-3 py-2 text-xs font-semibold text-dim hover:text-ink"
          data-testid="button-reaction-why"
        >
          <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-aqua" /> Grown-up Details &amp; Numbers</span>
          <ChevronDown className={cn('h-4 w-4 transition', showWhy && 'rotate-180')} />
        </button>
        {showWhy && (
          <ul className="space-y-1.5 rounded-xl bg-deep/50 p-3 text-xs text-dim">
            <li>Science: {record.scienceBefore} → {record.scienceAfter} (<Delta v={record.scienceAfter - record.scienceBefore} />)</li>
            {record.explanations.map((e, i) => <li key={i}>· {e}</li>)}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            onContinue();
          }}
          className={cn(btn.primary, 'min-h-[52px] w-full text-lg')}
          data-testid="button-reaction-continue"
        >
          {ended ? 'See Final Score! 🏆' : `Next! Day ${nextCycle}`} <ArrowRight className="h-5 w-5" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

/* 5. Mission Outcome & On-Scene Learning Quiz Overlay */
export function MissionOutcomeDialog({
  open,
  game,
  onRestart,
  onClose,
  onOpenSources,
  initialQuizMode = false,
  onQuizModeChange,
  soundOn = false,
}: {
  open: boolean;
  game: State;
  onRestart: () => void;
  onUpdateQuiz?: (completed: boolean, correct: number) => void;
  onClose: () => void;
  onOpenSources?: () => void;
  initialQuizMode?: boolean;
  onQuizModeChange?: (quizOpen: boolean) => void;
  soundOn?: boolean;
}) {
  const { quiz, quizSaveError, setQuizIndex, submitQuizAnswer, resetQuiz } = useGame();
  const [quizOpen, setQuizOpen] = useState(initialQuizMode);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (open && initialQuizMode) {
      setQuizOpen(true);
    } else if (open && !initialQuizMode && game.status !== 'active') {
      setQuizOpen(false);
    }
  }, [open, initialQuizMode, game.status]);

  const success = game.status === 'success';
  const activeMission = game.status === 'active';

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          overlayClassName="bg-[#070b1b]/80"
          className="max-h-[90dvh] max-w-2xl overflow-y-auto border-aqua/35 bg-hull p-4 text-ink shadow-2xl sm:p-5"
          data-testid="dialog-mission-outcome"
          onEscapeKeyDown={(e) => {
            if (reportOpen || confirmRestart) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (reportOpen || confirmRestart) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (reportOpen || confirmRestart) e.preventDefault();
          }}
        >
          <DialogHeader>
            <p className="font-display text-xs font-extrabold uppercase tracking-wider text-aqua">
              Moon Base · {game.completedCycles}/5 Days
            </p>
            <DialogTitle className={cn('font-display text-2xl font-extrabold sm:text-3xl', activeMission ? 'text-aqua' : success ? 'text-ok' : 'text-warn')} data-testid="text-scene-outcome">
              {activeMission ? 'Picture Quiz!' : success ? 'HOORAY! Mission Complete!' : "Let's Try Again!"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {activeMission
                ? 'Explore five picture science questions directly over your dimmed Moon Base.'
                : success
                  ? 'All four astronauts made it through five cycles.'
                  : 'An essential resource reached zero before Cycle 5 finished.'}
            </DialogDescription>
          </DialogHeader>

          {!quizOpen ? (
            <div className="space-y-3">
              <VisualEndingCard
                game={game}
                quiz={quiz}
                onStartQuiz={() => {
                  setQuizOpen(true);
                  onQuizModeChange?.(true);
                }}
                onRequestRestart={() => setConfirmRestart(true)}
                onOpenReport={() => setReportOpen(true)}
                onOpenSources={
                  onOpenSources
                    ? () => {
                        onClose();
                        onOpenSources();
                      }
                    : undefined
                }
                soundOn={soundOn}
              />
              <div className="flex justify-end">
                <Link href="/results" className="text-xs font-semibold text-dim hover:text-aqua" data-testid="link-full-results">
                  Open Dedicated Results View →
                </Link>
              </div>
            </div>
          ) : (
            <VisualQuizCard
              quiz={quiz}
              game={game}
              onSelectQuestion={setQuizIndex}
              onSubmitAnswer={submitQuizAnswer}
              onResetQuiz={resetQuiz}
              onBackToScore={() => {
                setQuizOpen(false);
                onQuizModeChange?.(false);
              }}
              quizSaveError={quizSaveError}
              soundOn={soundOn}
            />
          )}
        </DialogContent>
      </Dialog>

      <MissionReportDrawer
        open={reportOpen}
        onOpenChange={setReportOpen}
        game={game}
        quiz={quiz}
        onOpenSources={
          onOpenSources
            ? () => {
                setReportOpen(false);
                onClose();
                onOpenSources();
              }
            : undefined
        }
      />

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent className="border-dim/25 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new mission?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">
              This mission result stays in Mission History. Your active mission will reset to Cycle 1.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-outcome-restart">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmRestart(false); onRestart(); }} data-testid="button-confirm-outcome-restart">
              Replay Mission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* 6. Pause / Command & Settings Menu & NASA Source Overlays */
export function PauseDialog({
  open,
  onOpenChange,
  cycle,
  onRestart,
  onOpenGuide,
  onOpenNasa,
  onOpenQuiz,
  detailsMode,
  onToggleDetails,
  reducedMotion,
  onToggleReducedMotion,
  soundOn,
  onToggleSound,
  speechAvailable,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cycle: number;
  onRestart: () => void;
  onOpenGuide: () => void;
  onOpenNasa: () => void;
  onOpenQuiz?: () => void;
  detailsMode: boolean;
  onToggleDetails: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  speechAvailable: boolean;
}) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmTeacher, setConfirmTeacher] = useState(false);
  const [, go] = useLocation();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md border-dim/25 bg-hull text-ink" data-testid="dialog-pause">
          <DialogHeader>
            <p className="hud-label">Mission Menu · Cycle {cycle}</p>
            <DialogTitle className="font-display text-2xl text-ink">Command &amp; Settings</DialogTitle>
            <DialogDescription className="text-dim">Take a break, adjust accessibility, or open learning &amp; teacher views.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className={btn.primary} data-testid="button-pause-resume">
              <Play className="h-4 w-4" /> Resume Mission
            </button>

            {/* In-Menu Settings */}
            <div className="space-y-2 rounded-xl border border-dim/20 bg-deep/55 p-3">
              <p className="hud-label">Accessibility &amp; Teacher Settings</p>
              {speechAvailable && (
                <div className="flex items-center justify-between gap-3 py-1">
                  <label htmlFor="sw-menu-sound" className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Volume2 className="h-4 w-4 text-aqua" /> Read-Aloud Voice
                  </label>
                  <Switch id="sw-menu-sound" checked={soundOn} onCheckedChange={onToggleSound} data-testid="switch-menu-sound" />
                </div>
              )}
              <div className="flex items-center justify-between gap-3 py-1">
                <label htmlFor="sw-menu-motion" className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Sparkles className="h-4 w-4 text-aqua" /> Calm Motion (Reduced)
                </label>
                <Switch id="sw-menu-motion" checked={reducedMotion} onCheckedChange={onToggleReducedMotion} data-testid="switch-menu-reduced-motion" />
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <label htmlFor="sw-menu-details" className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <SlidersHorizontal className="h-4 w-4 text-aqua" /> Teacher / Science Details
                </label>
                <Switch id="sw-menu-details" checked={detailsMode} onCheckedChange={onToggleDetails} data-testid="button-toggle-details" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { onOpenChange(false); onOpenGuide(); }} className={cn(btn.ghost, 'px-3 py-2.5 text-sm')}>
                <BookOpen className="h-4 w-4 text-aqua" /> Base Guide
              </button>
              <button type="button" onClick={() => { onOpenChange(false); onOpenNasa(); }} className={cn(btn.ghost, 'px-3 py-2.5 text-xs sm:text-sm')} data-testid="button-nasa-source">
                <Database className="h-4 w-4 shrink-0 text-aqua" /> Learn More / Sources
              </button>
            </div>

            {onOpenQuiz && (
              <button type="button" onClick={() => { onOpenChange(false); onOpenQuiz(); }} className={cn(btn.ghost, 'py-2.5 text-sm')} data-testid="button-menu-open-quiz">
                <GraduationCap className="h-4 w-4 text-ok" /> In-Scene Learning Quiz
              </button>
            )}

            <div className="grid grid-cols-3 gap-2 text-sm">
              <Link href="/history" className={cn(btn.ghost, 'px-2.5 py-2.5 text-xs')} onClick={() => onOpenChange(false)}>
                History
              </Link>
              <Link href="/control" className={cn(btn.ghost, 'px-2.5 py-2.5 text-xs')} onClick={() => onOpenChange(false)}>
                Classic View
              </Link>
              <button
                type="button"
                onClick={() => setConfirmTeacher(true)}
                className={cn(btn.ghost, 'px-2.5 py-2.5 text-xs text-aqua')}
                data-testid="button-pause-teacher"
              >
                Teacher Guide
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/" className={cn(btn.ghost, 'px-3 py-2.5 text-sm')} onClick={() => onOpenChange(false)} data-testid="link-menu-exit">
                <Home className="h-4 w-4 text-dim" /> Exit
              </Link>
              <button type="button" onClick={() => setConfirmRestart(true)} className={cn(btn.danger, 'px-3 py-2.5 text-sm')} data-testid="button-pause-restart">
                <RotateCcw className="h-4 w-4" /> Restart
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent className="border-dim/25 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Restart from Cycle 1?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">Current mission progress will be reset to Cycle 1.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Playing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bad text-deep hover:bg-bad/90"
              onClick={() => {
                setConfirmRestart(false);
                onOpenChange(false);
                onRestart();
              }}
              data-testid="button-confirm-pause-restart"
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmTeacher} onOpenChange={setConfirmTeacher}>
        <AlertDialogContent className="border-dim/25 bg-hull text-ink" data-testid="dialog-confirm-teacher">
          <AlertDialogHeader>
            <AlertDialogTitle>Open Teacher &amp; Judge Guide?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">
              Your Cycle {cycle} mission stays safely paused and saved in this browser. Nothing will be reset, and you can return to the Moon Base anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-open-teacher">Stay on Moon Base</AlertDialogCancel>
            <AlertDialogAction
              className="bg-aqua text-deep hover:bg-aqua/90"
              onClick={() => {
                setConfirmTeacher(false);
                onOpenChange(false);
                go('/teacher');
              }}
              data-testid="button-confirm-open-teacher"
            >
              Open Teacher Guide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function NasaSourceDialog({
  open,
  onOpenChange,
  cycle,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cycle: number;
}) {
  const providers = getProviderStatuses();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto border-dim/20 bg-hull text-ink" data-testid="dialog-nasa-source">
        <DialogHeader>
          <p className="hud-label">Optional Detail Layer · Teachers, Judges &amp; Curious Explorers</p>
          <DialogTitle className="font-display text-2xl">Learn More / NASA Sources</DialogTitle>
          <DialogDescription className="text-dim">
            All game resources and safety rules are educational training simulations. Full science notes, units, NASA space-weather context, and verified citations live here.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="science" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-deep/80">
            <TabsTrigger value="science" data-testid="tab-sources-science">Science &amp; Units</TabsTrigger>
            <TabsTrigger value="weather" data-testid="tab-sources-weather">NASA Space Weather</TabsTrigger>
            <TabsTrigger value="links" data-testid="tab-sources-links">References &amp; Links</TabsTrigger>
          </TabsList>

          <TabsContent value="science" className="mt-4 space-y-3">
            <div className="rounded-xl border border-warn/35 bg-warn/10 p-3 text-xs text-ink">
              <strong>Dataset &amp; Art Note:</strong> Resource scores (0–100) are illustrative teaching units, not operational NASA measurements.
              Moon Base artwork and module diagrams are stylized educational illustrations (not official NASA photographs or official NASA products).
              Cycle 4 radiation protection is a simplified training exercise — never mapped from solar flare classes or ISS RadLab doses.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULES.map((mod) => (
                <div key={mod.id} className="rounded-xl border border-dim/20 bg-deep/60 p-3.5 text-xs">
                  <div className="flex items-center gap-2">
                    <ModuleBadgeIcon id={mod.id} className="h-4 w-4" />
                    <h3 className="font-display text-sm font-bold text-ink">{mod.name}</h3>
                  </div>
                  <p className="mt-1.5 text-ink">{mod.science}</p>
                  <p className="mt-2 font-mono text-[11px] text-warn">Uses: {mod.needs}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ok">Output: {mod.output}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="weather" className="mt-4 space-y-4">
            <DataSourcePanel cycle={cycle} />
            <SpaceWeatherContext />
          </TabsContent>

          <TabsContent value="links" className="mt-4 space-y-4">
            <div className="rounded-xl border border-dim/20 bg-deep/55 p-3.5">
              <p className="hud-label">Adapter Verification Status (Truthful Mode Labels)</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {providers.map((p) => (
                  <li key={p.provider.id} className="rounded-lg border border-dim/15 bg-hull/80 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{p.provider.name}</span>
                      <span className="font-mono text-[10px] font-bold text-warn">{p.mode}</span>
                    </div>
                    <p className="mt-1 text-dim">{p.message}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="hud-label">NASA &amp; Challenge References</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {SOURCES.map((s) => (
                  <li key={s.url} className="rounded-xl border border-dim/15 bg-deep/50 p-3 text-xs">
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline">
                      {s.title} <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-[11px] text-dim">{s.org}</p>
                    <p className="mt-1 text-dim">{s.note}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="hud-label">Canadian Space Agency Educational Links (Reference Only)</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {CSA_LINKS.map((s) => (
                  <li key={s.url} className="rounded-xl border border-dim/15 bg-deep/50 p-3 text-xs">
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline">
                      {s.title} <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-[11px] text-dim">{s.org}</p>
                    <p className="mt-1 text-dim">{s.note}</p>
                  </li>
                ))}
              </ul>
            </div>

            <details className="rounded-xl border border-dim/20 bg-deep/55 p-3 text-xs" data-testid="details-teacher-quiz-key">
              <summary className="cursor-pointer font-semibold text-aqua">
                Teacher / Judge Reference: All 5 Learning Questions &amp; Answer Key
              </summary>
              <div className="mt-2.5 space-y-2 border-t border-dim/15 pt-2.5">
                {QUIZ.map((item, idx) => {
                  const qMeta = QUIZ_VISUAL_META[item.id];
                  return (
                    <div key={item.id} className="rounded-lg bg-hull/65 p-2.5">
                      <p className="font-semibold text-ink">
                        Q{idx + 1} ({item.id} · {item.topic}): {item.question}
                      </p>
                      <p className="mt-0.5 text-ok">
                        Correct ({String.fromCharCode(65 + item.answer)}): {item.choices[item.answer]}
                      </p>
                      <p className="mt-0.5 text-dim">{item.explanation}</p>
                      {qMeta && <p className="mt-0.5 text-[11px] text-aqua">{qMeta.realWorldNote}</p>}
                    </div>
                  );
                })}
              </div>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/teacher"
                className="text-xs font-semibold text-ok hover:underline"
                onClick={() => onOpenChange(false)}
                data-testid="link-dialog-open-teacher"
              >
                Open Teacher &amp; Activity Guide →
              </Link>
              <Link href="/about" className="text-xs font-semibold text-aqua hover:underline" onClick={() => onOpenChange(false)}>
                Open full About &amp; Sources page →
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { Pause, X };
