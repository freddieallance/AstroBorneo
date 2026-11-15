import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BatteryCharging,
  CheckCircle2,
  ClipboardList,
  Database,
  Droplets,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  History,
  Lightbulb,
  Lock,
  Radio,
  RotateCcw,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Users,
  Volume2,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import type { State } from '@/game/engine';
import {
  buildFailureTip,
  buildMissionInsights,
  buildMissionSnapshots,
  getZeroResources,
  isMissionSurvivalMet,
  RESOURCE_TO_MODULE,
  scoreBreakdown,
  scoreSummary,
  STAR_THRESHOLDS,
  type MissionSnapshotRow,
} from '@/game/scoring';
import {
  DISCLOSURES,
  EVENT_LABEL,
  MODES,
  RESOURCE_META,
  type ModuleId,
  type ResourceKey,
} from '@/content/mission';
import {
  buildLearningReflection,
  loadMissions,
  quizCorrect,
  type MissionRecord,
  type QuizState,
} from '@/lib/records';
import { speakText } from '@/lib/speech';
import { playSfx } from '@/lib/sfx';
import { btn, Delta, tone } from '@/components/kit';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const KEYS: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];

function ResultResourceIcon({ k, className = 'h-4 w-4' }: { k: ResourceKey | 'science'; className?: string }) {
  switch (k) {
    case 'power': return <Zap className={className} />;
    case 'air': return <Wind className={className} />;
    case 'safety': return <Shield className={className} />;
    case 'water': return <Droplets className={className} />;
    case 'food': return <Sprout className={className} />;
    case 'science': return <FlaskConical className={className} />;
  }
}

function CycleSlotIcon({ cycle, reached, failedHere }: { cycle: number; reached: boolean; failedHere: boolean }) {
  if (!reached) return <Lock className="h-3.5 w-3.5 text-dim/50" aria-hidden />;
  if (failedHere) return <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-hidden />;
  switch (cycle) {
    case 1: return <Users className="h-3.5 w-3.5 text-aqua" aria-hidden />;
    case 2: return <Sun className="h-3.5 w-3.5 text-warn" aria-hidden />;
    case 3: return <Droplets className="h-3.5 w-3.5 text-aqua" aria-hidden />;
    case 4: return <Shield className="h-3.5 w-3.5 text-ok" aria-hidden />;
    default: return <Sprout className="h-3.5 w-3.5 text-ok" aria-hidden />;
  }
}

export function VisualEndingIllustration({
  success,
  affectedResources,
  affectedModule,
}: {
  success: boolean;
  affectedResources: ResourceKey[];
  affectedModule: ModuleId | null;
}) {
  const primaryZero = affectedResources[0];
  return (
    <svg
      viewBox="0 0 360 112"
      className="h-16 w-full rounded-2xl border border-[#dfe5fa] bg-[#52497e] sm:h-20"
      role="img"
      aria-label={
        success
          ? 'Illuminated Moon Base with friendly crew waving beside the glowing habitat and greenhouse.'
          : `Moon Base in night rest with the ${affectedModule ?? 'affected'} facility dimmed to show ${primaryZero ?? 'resource'} reached zero.`
      }
      data-testid="visual-ending-illustration"
    >
      <rect width="360" height="112" fill="#52497e" />
      <circle cx="32" cy="18" r="1.2" fill="#fffefa" opacity="0.75" />
      <circle cx="98" cy="12" r="1.1" fill="#fffefa" opacity="0.65" />
      <circle cx="234" cy="16" r="1.3" fill="#fffefa" opacity="0.75" />
      <circle cx="318" cy="24" r="16" fill="#2357b8" opacity={success ? 0.95 : 0.72} />
      <path d="M312 16 q8 3 4 9 q-6 3 -8 -3 z" fill="#57d3a1" opacity="0.85" />

      {/* Pastel Regolith Ground */}
      <path d="M0 90 Q180 78 360 90 V112 H0 Z" fill="#cfc6e2" />

      {success ? (
        <g>
          {/* Warm base celebration aura */}
          <ellipse cx="180" cy="78" rx="138" ry="30" fill="#35d2a0" fillOpacity="0.12" />
          {/* Illuminated Solar Panels */}
          <g transform="translate(52 84)">
            <rect x="-18" y="-34" width="12" height="30" rx="2" fill="#1f4594" stroke="#4f8cff" strokeWidth="1.5" />
            <rect x="-2" y="-34" width="12" height="30" rx="2" fill="#1f4594" stroke="#4f8cff" strokeWidth="1.5" />
          </g>
          {/* Illuminated Greenhouse */}
          <g transform="translate(114 86)">
            <path d="M-24 0 v-12 a24 16 0 0 1 48 0 v12 z" fill="#35d2a0" fillOpacity="0.28" stroke="#35d2a0" strokeWidth="1.8" />
            <path d="M-8 -3 q-4 -8 0 -13 q4 5 0 13 M8 -3 q-4 -8 0 -13 q4 5 0 13" fill="#35d2a0" />
          </g>
          {/* Glowing Habitat + Base Ready Sign */}
          <g transform="translate(200 84)">
            <rect x="-42" y="-26" width="84" height="26" rx="13" fill="#c9d1e6" />
            <path d="M-22 -26 a22 18 0 0 1 44 0" fill="#dfe5f5" />
            {[-24, -8, 8, 24].map((wx) => (
              <circle key={wx} cx={wx} cy="-13" r="3.6" fill="#35d9e8" />
            ))}
            {/* Friendly waving crew silhouettes */}
            {[-56, -42, 42, 56].map((ax) => (
              <g key={ax} transform={`translate(${ax} 2)`}>
                <rect x="-3" y="-12" width="6" height="9" rx="2.5" fill="#f5f7ff" />
                <path d="M3 -10 L7 -16" stroke="#f5f7ff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="0" cy="-16" r="3.8" fill="#f5f7ff" />
                <rect x="-2.2" y="-17.5" width="4.4" height="2.4" rx="1" fill="#35d9e8" />
              </g>
            ))}
          </g>
          {/* Recycler & Comms glowing */}
          <g transform="translate(292 84)">
            <rect x="-12" y="-22" width="12" height="22" rx="4" fill="#9fb4dc" />
            <circle cx="-6" cy="-14" r="3" fill="#35d9e8" />
            <rect x="12" y="-34" width="3" height="34" fill="#9fb4dc" />
            <path d="M4 -36 a10 6 0 0 0 18 0 z" fill="#dfe5f5" transform="rotate(-24 13 -36)" />
          </g>
          {/* Base Ready! ribbon */}
          <g transform="translate(180 24)">
            <rect x="-56" y="-12" width="112" height="22" rx="11" fill="#13312f" stroke="#35d2a0" strokeWidth="1.6" />
            <text y="3" textAnchor="middle" fill="#35d2a0" fontSize="10.5" fontWeight="800" fontFamily="Outfit">
              BASE READY!
            </text>
          </g>
        </g>
      ) : (
        <g>
          {/* Dimmed affected module visual — calm, zero injury/fear */}
          <g transform="translate(110 84)" opacity={affectedModule === 'solar' ? 0.35 : 0.9}>
            <rect x="-20" y="-34" width="13" height="30" rx="2" fill="#1a2c54" stroke={affectedModule === 'solar' ? '#ffc76b' : '#4f8cff'} strokeWidth="1.5" />
            <rect x="-2" y="-34" width="13" height="30" rx="2" fill="#1a2c54" stroke={affectedModule === 'solar' ? '#ffc76b' : '#4f8cff'} strokeWidth="1.5" />
          </g>
          <g transform="translate(184 84)" opacity={affectedModule === 'habitat' ? 0.38 : 0.9}>
            <rect x="-36" y="-24" width="72" height="24" rx="12" fill="#9fb0d0" />
            <path d="M-18 -24 a18 16 0 0 1 36 0" fill="#b9c6e0" />
            <circle cx="-14" cy="-12" r="3.2" fill={affectedModule === 'habitat' ? '#ffc76b' : '#35d9e8'} />
            <circle cx="0" cy="-12" r="3.2" fill={affectedModule === 'habitat' ? '#ffc76b' : '#35d9e8'} />
            <circle cx="14" cy="-12" r="3.2" fill={affectedModule === 'habitat' ? '#ffc76b' : '#35d9e8'} />
          </g>
          <g transform="translate(260 86)" opacity={affectedModule === 'greenhouse' || affectedModule === 'recycler' ? 0.38 : 0.85}>
            <path d="M-22 0 v-12 a22 15 0 0 1 44 0 v12 z" fill="#465273" stroke="#ffc76b" strokeWidth="1.6" />
          </g>
          {/* Helpful Try a New Plan Pill */}
          <g transform="translate(180 26)">
            <rect x="-70" y="-12" width="140" height="24" rx="12" fill="#2a2216" stroke="#ffc76b" strokeWidth="1.6" />
            <text y="4" textAnchor="middle" fill="#ffc76b" fontSize="10.5" fontWeight="800" fontFamily="Outfit">
              TRY A NEW PLAN
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

export function CycleTimelineStrip({ game }: { game: State }) {
  const zeroResources = getZeroResources(game.resources);
  return (
    <div className="rounded-2xl border border-dim/20 bg-deep/60 p-3" data-testid="visual-cycle-timeline">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="hud-label">5-Cycle Journey</span>
        <span className="font-mono text-[11px] text-dim tabular-nums">{game.completedCycles}/5 completed</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((c) => {
          const rec = game.history.find((h) => h.cycle === c);
          const reached = Boolean(rec);
          const failedHere = Boolean(rec && game.status === 'failed' && c === game.completedCycles && zeroResources.length > 0);
          return (
            <div
              key={c}
              data-testid={`timeline-cycle-${c}`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center',
                !reached
                  ? 'border-dashed border-dim/20 bg-hull/35 opacity-55'
                  : failedHere
                    ? 'border-warn/60 bg-warn/10'
                    : 'border-ok/40 bg-ok/10',
              )}
              title={
                rec
                  ? `Cycle ${c}: ${MODES[rec.decision.mode].label} mode, ${EVENT_LABEL[rec.decision.event]}`
                  : `Cycle ${c}: Not reached`
              }
            >
              <div className="flex items-center gap-1">
                <span className="font-mono text-[11px] font-bold text-ink">C{c}</span>
                <CycleSlotIcon cycle={c} reached={reached} failedHere={failedHere} />
              </div>
              <span className={cn('text-[10px] font-semibold leading-tight', !reached ? 'text-dim' : failedHere ? 'text-warn' : 'text-ok')}>
                {!reached ? 'Not reached' : failedHere ? 'Ended' : MODES[rec!.decision.mode].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VisualEndingCard({
  game,
  quiz,
  onStartQuiz,
  onRequestRestart,
  onOpenReport,
  onOpenSources,
  soundOn = false,
  quizCtaLabel,
}: {
  game: State;
  quiz: QuizState;
  onStartQuiz: () => void;
  onRequestRestart: () => void;
  onOpenReport: () => void;
  onOpenSources?: () => void;
  soundOn?: boolean;
  quizCtaLabel?: string;
}) {
  const qc = quiz.completed ? quizCorrect(quiz) : 0;
  const score = scoreSummary(game, quiz.completed, qc);
  const breakdown = scoreBreakdown(game, quiz.completed, qc);
  const survivalMet = isMissionSurvivalMet(game);
  const zeroResources = getZeroResources(game.resources);
  const affectedModule = zeroResources.length > 0 ? RESOURCE_TO_MODULE[zeroResources[0]] : null;
  const reflection = buildLearningReflection(game, quiz);
  const answeredCount = quiz.answers.filter((a) => a !== null).length;
  const failureTip = buildFailureTip(game);

  const spokenHeadline = survivalMet
    ? `Base ready! All four astronauts finished five cycles. ${score.label} is ${score.value} out of ${score.maximum}.`
    : `Try a new plan! ${zeroResources.map((k) => RESOURCE_META[k].label).join(' and ')} reached zero. ${failureTip}`;

  useEffect(() => {
    playSfx(survivalMet ? 'win' : 'oops');
    if (soundOn) speakText(spokenHeadline, false);
  }, [soundOn, spokenHeadline, survivalMet]);

  return (
    <div className="space-y-2" data-testid="visual-ending-card">
      {/* Illustrated Ending Hero (Happy Base OR Dimmed Affected Facility) */}
      <VisualEndingIllustration
        success={survivalMet}
        affectedResources={zeroResources}
        affectedModule={affectedModule}
      />

      {/* Child-Readable Headline + Affected Resource / Success Badge + Read-Aloud */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-xl border',
              survivalMet ? 'border-ok/50 bg-ok/15 text-ok' : 'border-warn/50 bg-warn/15 text-warn',
            )}
          >
            {survivalMet ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            ) : zeroResources[0] ? (
              <ResultResourceIcon k={zeroResources[0]} className="h-6 w-6" />
            ) : (
              <Wrench className="h-6 w-6" aria-hidden />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                  survivalMet ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn',
                )}
              >
                {survivalMet ? 'Base Ready!' : 'Try a New Plan'}
              </span>
              <span className="font-mono text-[11px] text-dim tabular-nums" data-testid="text-completed">
                {game.completedCycles}/5 Cycles
              </span>
            </div>
            <h2
              className={cn('mt-1 font-display text-2xl font-bold', survivalMet ? 'text-ok' : 'text-warn')}
              data-testid="text-outcome"
            >
              {survivalMet ? 'Mission Success' : 'Mission Needs Revision'}
            </h2>
            <p className="text-xs text-dim">
              {survivalMet
                ? 'All four crew members finished five cycles with every essential reserve above zero.'
                : `${zeroResources.map((k) => RESOURCE_META[k].label).join(' & ')} ran out. Engineers test, learn, and adjust the plan!`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => speakText(spokenHeadline, true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dim/25 bg-plate text-aqua hover:border-aqua"
          aria-label="Listen to mission ending"
          data-testid="button-speak-ending"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>

      {/* Optional 1-Step Tip on Early Exhaustion */}
      {!survivalMet && (
        <div
          className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-ink"
          data-testid="banner-failure-tip"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          <div>
            <span className="font-bold text-warn">1-Step Tip: </span>
            <span className="text-ink">{failureTip}</span>
          </div>
        </div>
      )}

      {/* Real Score Strip (Provisional /90 before quiz vs Final /100 after quiz) + Documented Stars */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-aqua/25 bg-deep/70 p-3">
        <div>
          <p className="hud-label" data-testid="text-score-label">{score.label}</p>
          <p className="font-display text-3xl font-bold text-aqua tabular-nums sm:text-4xl" data-testid="text-scene-score">
            {score.value}
            <span className="text-lg text-dim">/{score.maximum}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-dim">
            {quiz.completed
              ? `Includes ${qc}/5 quiz answers (exact: ${breakdown.rawTotal} → ${score.value}/100).`
              : answeredCount > 0
                ? `${answeredCount}/5 quiz questions saved — finish all 5 to score out of 100.`
                : 'Unanswered quiz questions are not marked wrong. Take the 5-question quiz for up to 10 points!'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            className="flex items-center gap-0.5"
            aria-label={`Score band: ${breakdown.starRating.stars} of 5 stars (${breakdown.starRating.percent}%)`}
            title={`Derived from ${score.value}/${score.maximum} (${breakdown.starRating.percent}%): ${breakdown.starRating.bandLabel}`}
            data-testid="badge-star-rating"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  'h-4 w-4',
                  n <= breakdown.starRating.stars ? 'fill-warn text-warn' : 'text-dim/30',
                )}
                aria-hidden
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-dim">
            {breakdown.starRating.bandLabel} · {breakdown.starRating.percent}%
          </span>
          <span className="font-mono text-[10px] text-ion">Science: {game.science} pts</span>
        </div>
      </div>

      {/* Compact 5-Icon End-State Summary */}
      <div className="grid grid-cols-5 gap-1.5" data-testid="summary-five-icons">
        {KEYS.map((k) => {
          const v = game.resources[k];
          const zero = v <= 0;
          return (
            <div
              key={k}
              className={cn(
                'rounded-xl border p-2 text-center',
                zero ? 'border-bad/60 bg-bad/15' : 'border-dim/15 bg-deep/55',
              )}
              data-testid={`end-resource-${k}`}
            >
              <div className="flex justify-center" style={{ color: tone(v) }}>
                <ResultResourceIcon k={k} className="h-4 w-4" />
              </div>
              <p className="mt-1 text-[10px] font-semibold text-dim">
                {k === 'safety' ? 'Safety' : RESOURCE_META[k].label}
              </p>
              <p className="font-mono text-sm font-bold tabular-nums" style={{ color: tone(v) }}>
                {v}
              </p>
            </div>
          );
        })}
      </div>

      {/* Visual 5-Cycle Timeline */}
      <CycleTimelineStrip game={game} />

      {/* Grounded Choice-Based Reflection (never invents wins) */}
      <div className="rounded-xl border border-dim/20 bg-deep/50 p-2.5 text-xs" data-testid="panel-outcome-reflection">
        <p className="hud-label">What Your Choices Did</p>
        <p className="mt-1 font-medium text-ink">{reflection.summaryLine}</p>
        <ul className="mt-1 space-y-0.5 text-dim">
          {reflection.missionFacts.slice(0, 2).map((fact, idx) => (
            <li key={idx}>· {fact}</li>
          ))}
        </ul>
      </div>

      {/* Primary Action Controls: Large Replay + Clear Quiz + Report/Sources */}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRequestRestart}
          className={cn(btn.primary, 'min-h-[46px] text-base')}
          data-testid="button-outcome-restart"
        >
          <RotateCcw className="h-5 w-5" /> Replay Mission
        </button>
        <button
          type="button"
          onClick={onStartQuiz}
          className={cn(btn.ghost, 'min-h-[46px] border-aqua/45 bg-aqua/10 text-ink hover:bg-aqua/20')}
          data-testid="button-open-scene-quiz"
        >
          <GraduationCap className="h-5 w-5 text-aqua" />
          {quizCtaLabel ??
            (quiz.completed
              ? 'Review Picture Quiz'
              : answeredCount > 0
                ? `Continue Quiz (${answeredCount}/5)`
                : 'Start 5-Question Quiz')}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dim/15 pt-2.5">
        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dim/25 bg-plate/60 px-3 py-1.5 text-xs font-semibold text-ink hover:border-aqua"
          data-testid="button-open-mission-report"
        >
          <ClipboardList className="h-3.5 w-3.5 text-aqua" /> Mission Report &amp; Charts
        </button>

        <div className="flex items-center gap-3 text-xs">
          {onOpenSources && (
            <button
              type="button"
              onClick={onOpenSources}
              className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline"
              data-testid="button-outcome-sources"
            >
              <Database className="h-3.5 w-3.5" /> NASA Sources
            </button>
          )}
          <Link href="/history" className="font-semibold text-dim hover:text-ink">
            History →
          </Link>
        </div>
      </div>
    </div>
  );
}

const CHART_SERIES: { key: ResourceKey; label: string; color: string; dash?: string }[] = [
  { key: 'power', label: 'Power', color: '#ffc76b' },
  { key: 'air', label: 'Air', color: '#35d9e8' },
  { key: 'safety', label: 'Safety', color: '#35d2a0' },
  { key: 'water', label: 'Water', color: '#4f8cff', dash: '4 3' },
  { key: 'food', label: 'Food', color: '#d29bff', dash: '2 2' },
];

function ResourceTrajectoryChart({ snapshots, completedCycles }: { snapshots: MissionSnapshotRow[]; completedCycles: number }) {
  const width = 520;
  const height = 190;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const slots = 6; // Start, C1, C2, C3, C4, C5 on X-axis (only real committed snapshots plotted!)

  const xForCycle = (c: number) => padL + (c / (slots - 1)) * innerW;
  const yForVal = (v: number) => padT + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  return (
    <div className="space-y-2 rounded-2xl border border-dim/20 bg-deep/70 p-3.5" data-testid="chart-resource-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="hud-label">Real Resource Trajectory (0–100)</p>
        {completedCycles < 5 && (
          <span className="font-mono text-[10px] text-warn">
            Plotted through Cycle {completedCycles} only (C{completedCycles + 1}–C5 unreached)
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role="img"
        aria-label={`Resource history chart from Start through Cycle ${completedCycles}`}
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = yForVal(tick);
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#5b6b94" strokeOpacity="0.22" strokeDasharray="3 3" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fill="#5b6b94" fontSize="9.5" fontFamily="JetBrains Mono">
                {tick}
              </text>
            </g>
          );
        })}

        {[0, 1, 2, 3, 4, 5].map((c) => {
          const x = xForCycle(c);
          const unreached = c > completedCycles;
          return (
            <g key={c}>
              <line x1={x} x2={x} y1={padT} y2={padT + innerH} stroke="#5b6b94" strokeOpacity={unreached ? 0.08 : 0.2} />
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill={unreached ? '#9aa7c9' : '#344270'}
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                {c === 0 ? 'Start' : `C${c}`}
              </text>
            </g>
          );
        })}

        {CHART_SERIES.map((s) => {
          const pts = snapshots.map((row) => `${xForCycle(row.cycle)},${yForVal(row.resources[s.key])}`).join(' ');
          return (
            <g key={s.key}>
              {snapshots.length > 1 && (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.4"
                  strokeDasharray={s.dash}
                  points={pts}
                />
              )}
              {snapshots.map((row) => (
                <circle
                  key={`${s.key}-${row.cycle}`}
                  cx={xForCycle(row.cycle)}
                  cy={yForVal(row.resources[s.key])}
                  r="3.4"
                  fill={s.color}
                  stroke="#fffefa"
                  strokeWidth="1.2"
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Accessible Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]" aria-label="Chart resource legend">
        {CHART_SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 font-mono text-ink">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MissionReportDrawer({
  open,
  onOpenChange,
  game,
  quiz,
  onOpenSources,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: State;
  quiz: QuizState;
  onOpenSources?: () => void;
}) {
  const [historyList, setHistoryList] = useState<MissionRecord[]>([]);

  useEffect(() => {
    if (open) {
      setHistoryList(loadMissions());
    }
  }, [open]);

  const qc = quiz.completed ? quizCorrect(quiz) : 0;
  const breakdown = scoreBreakdown(game, quiz.completed, qc);
  const snapshots = buildMissionSnapshots(game);
  const insights = buildMissionInsights(game);
  const reflection = buildLearningReflection(game, quiz);
  const survivalMet = isMissionSurvivalMet(game);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-dim/25 bg-hull text-ink sm:max-w-2xl"
        data-testid="drawer-mission-report"
      >
        <SheetHeader className="pr-8 text-left">
          <p className="hud-label">Adult &amp; Older Learner Details · Operation Lunar Dawn</p>
          <SheetTitle className="font-display text-2xl text-ink">Mission Report &amp; Score Breakdown</SheetTitle>
          <SheetDescription className="text-dim">
            Exact initial and committed snapshots, traceable resource deltas, chronological choices, and NASA educational context.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* 1. Score Formula & Exact Component Table */}
          <section className="rounded-2xl border border-aqua/25 bg-deep/65 p-4" data-testid="report-score-breakdown">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="hud-label">{breakdown.label}</p>
                <p className="font-display text-3xl font-bold text-aqua tabular-nums">
                  {breakdown.roundedTotal}/{breakdown.maximum}
                  <span className="ml-2 font-mono text-xs font-normal text-dim">
                    (unrounded sum: {breakdown.rawTotal})
                  </span>
                </p>
              </div>
              <span className="rounded-lg border border-dim/20 bg-hull px-2.5 py-1 font-mono text-xs text-ink">
                {breakdown.starRating.stars}/5 ★ ({breakdown.starRating.percent}%)
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dim/20 text-dim">
                    <th className="py-1.5 font-normal">Component</th>
                    <th className="py-1.5 font-normal">Formula</th>
                    <th className="py-1.5 text-right font-normal">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.rows.map((row) => (
                    <tr key={row.id} className="border-b border-dim/10">
                      <td className="py-1.5 font-semibold text-ink">{row.label}</td>
                      <td className="py-1.5 font-mono text-dim">{row.formula}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-aqua">
                        {row.pending ? `Pending /${row.weight}` : `${Math.round(row.points * 100) / 100}/${row.weight}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2.5 text-[11px] text-dim">
              <strong>Survival Rule:</strong> Mission survival requires 5 completed cycles AND Power, Air, Water, Food, and Crew Safety all &gt; 0 (currently{' '}
              <span className={survivalMet ? 'text-ok' : 'text-warn'}>{survivalMet ? 'met' : 'not met'}</span>). Science Points do not decide mission survival.
            </p>
            <p className="mt-1 text-[11px] text-dim">
              <strong>Star Thresholds:</strong>{' '}
              {STAR_THRESHOLDS.slice().reverse().map((t) => `${t.stars}★ ≥${t.minPercent}%`).join(' · ')}
            </p>
          </section>

          {/* 2. Real Trajectory Chart (Cycle X-Axis, Committed Only) */}
          <ResourceTrajectoryChart snapshots={snapshots} completedCycles={game.completedCycles} />

          {/* 3. Real Initial & Committed Snapshots + Traceable Deltas Table */}
          <section className="rounded-2xl border border-dim/20 bg-deep/60 p-4" data-testid="report-snapshots-table">
            <p className="hud-label mb-2">Initial &amp; Committed Resource Snapshots</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-dim/20 text-dim">
                    <th className="py-1.5 pr-2">Step</th>
                    <th className="py-1.5 px-1">Pwr</th>
                    <th className="py-1.5 px-1">Air</th>
                    <th className="py-1.5 px-1">Safe</th>
                    <th className="py-1.5 px-1">Wtr</th>
                    <th className="py-1.5 px-1">Food</th>
                    <th className="py-1.5 pl-1 text-right">Sci</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((row) => (
                    <tr key={row.key} className="border-b border-dim/10">
                      <td className="py-1.5 pr-2 font-bold text-aqua">{row.label}</td>
                      {(['power', 'air', 'safety', 'water', 'food'] as const).map((k) => {
                        const val = row.resources[k];
                        const d = row.delta ? row.delta[k] : null;
                        return (
                          <td key={k} className="py-1.5 px-1 tabular-nums">
                            <span style={{ color: tone(val) }} className="font-bold">{val}</span>
                            {d !== null && d !== 0 && (
                              <span className={cn('ml-1 text-[10px]', d > 0 ? 'text-ok' : 'text-bad')}>
                                ({d > 0 ? `+${d}` : d})
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1.5 pl-1 text-right tabular-nums text-ion">
                        {row.science}
                        {row.scienceDelta !== null && row.scienceDelta !== 0 && (
                          <span className="ml-1 text-[10px] text-dim">({row.scienceDelta > 0 ? `+${row.scienceDelta}` : row.scienceDelta})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {game.completedCycles < 5 && (
              <p className="mt-2 text-[11px] text-warn">
                Cycles {game.completedCycles + 1}–5 were not completed and are not shown as simulated results.
              </p>
            )}
          </section>

          {/* 4. Chronological Decision Log */}
          <section className="rounded-2xl border border-dim/20 bg-deep/60 p-4" data-testid="report-decision-log">
            <p className="hud-label mb-2">Chronological Decisions &amp; Causal Notes</p>
            {game.history.length === 0 ? (
              <p className="text-xs text-dim">No cycles have been committed yet.</p>
            ) : (
              <ol className="space-y-2.5 text-xs">
                {game.history.map((h) => (
                  <li key={h.cycle} className="rounded-xl border border-dim/15 bg-hull/75 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-aqua">
                        Cycle {h.cycle}: {MODES[h.decision.mode].label} Air · {EVENT_LABEL[h.decision.event]}
                      </span>
                      <span className="font-mono text-[11px] text-dim">
                        Greenhouse {h.decision.greenhouse ? 'ON' : 'OFF'} · Recycler {h.decision.recycler ? 'ON' : 'OFF'} · Comms {h.decision.communications ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px] text-dim">
                      <span>P <Delta v={h.delta.power} /></span>
                      <span>A <Delta v={h.delta.air} /></span>
                      <span>S <Delta v={h.delta.safety} /></span>
                      <span>W <Delta v={h.delta.water} /></span>
                      <span>F <Delta v={h.delta.food} /></span>
                      <span>Sci <Delta v={h.scienceAfter - h.scienceBefore} /></span>
                    </div>
                    {h.explanations.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-[11px] text-dim">
                        {h.explanations.map((ex, i) => (
                          <li key={i}>· {ex}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* 5. Strengths & Next-Time Suggestions */}
          <section className="grid gap-3 sm:grid-cols-2" data-testid="report-insights">
            <div className="rounded-2xl border border-ok/25 bg-ok/5 p-3.5 text-xs">
              <p className="hud-label text-ok">Strengths</p>
              {insights.strengths.length > 0 ? (
                <ul className="mt-1.5 space-y-1 text-ink">
                  {insights.strengths.map((s) => <li key={s}>· {s}</li>)}
                </ul>
              ) : (
                <p className="mt-1.5 text-dim">Keep testing strategies — strengths from your reserves will appear here.</p>
              )}
            </div>
            <div className="rounded-2xl border border-warn/25 bg-warn/5 p-3.5 text-xs">
              <p className="hud-label text-warn">Next Time</p>
              {insights.improve.length > 0 ? (
                <ul className="mt-1.5 space-y-1 text-ink">
                  {insights.improve.map((s) => <li key={s}>· {s}</li>)}
                </ul>
              ) : (
                <p className="mt-1.5 text-dim">All reserves ended strong. Try raising Science or completing the quiz!</p>
              )}
            </div>
          </section>

          <div className="rounded-xl border border-dim/15 bg-deep/55 p-3 text-xs">
            <p className="font-semibold text-aqua">Learning Reflection</p>
            <p className="mt-1 text-ink">{reflection.summaryLine}</p>
          </div>

          {/* 6. Local History Comparison (honest empty state if none saved) */}
          <section className="rounded-2xl border border-dim/20 bg-deep/60 p-4" data-testid="report-local-history">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="hud-label flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-aqua" /> Local History Comparison
              </p>
              <Link href="/history" className="text-[11px] font-semibold text-aqua hover:underline" onClick={() => onOpenChange(false)}>
                Full History →
              </Link>
            </div>
            {historyList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-dim/25 p-3 text-xs text-dim" data-testid="text-history-empty">
                No past attempts saved on this device yet. Finished or early-ended runs are recorded here for comparison.
              </p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {historyList.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-hull/75 px-3 py-2">
                    <div>
                      <span className={cn('font-semibold', item.outcome === 'success' ? 'text-ok' : 'text-warn')}>
                        {item.outcome === 'success' ? 'Mission Success' : 'Needs Revision'}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-dim">
                        {new Date(item.date).toLocaleDateString()} · {item.completedCycles}/5 cycles
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-ink">
                      Provisional {item.score}/90 · Sci {item.science}
                    </span>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-dim">
                  Stored history records save mission score without quiz (/90).
                </p>
              </div>
            )}
          </section>

          {/* 7. NASA Source Context & Educational Disclosures */}
          <section className="rounded-2xl border border-dim/20 bg-deep/60 p-4 text-xs" data-testid="report-nasa-context">
            <p className="hud-label">NASA Source Context &amp; Simulation Notes</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DISCLOSURES.map((d) => (
                <span key={d} className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] text-warn">
                  {d}
                </span>
              ))}
            </div>
            <p className="mt-2 text-dim">
              All 0–100 base values are illustrative training units, not operational NASA telemetry or radiation dose measurements.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-3">
              {onOpenSources && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenSources();
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Open Learn More / NASA Sources →
                </button>
              )}
              <Link href="/about" className="font-semibold text-dim hover:text-ink" onClick={() => onOpenChange(false)}>
                About &amp; Verified Links →
              </Link>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { ArrowDown, ArrowUp, BatteryCharging };
