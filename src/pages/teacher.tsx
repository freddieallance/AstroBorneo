import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Database,
  Droplets,
  Eye,
  ExternalLink,
  FlaskConical,
  HelpCircle,
  Lock,
  Printer,
  Radio,
  Rocket,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { EVENT_LABEL, MODES, SOURCES, type ModuleId } from '@/content/mission';
import {
  CSA_TEACHER_LINKS,
  DATA_MODE_COMPARISON,
  DONKI_LIMITATIONS,
  explainCycleResourceCalculation,
  FIVE_STAGE_ACTIVITY,
  RESOURCE_FORMULAS,
  TEACHER_OUTCOMES,
  type TeacherResourceKey,
} from '@/content/teacher';
import { scoreSummary } from '@/game/scoring';
import { loadMissions, quizCorrect } from '@/lib/records';
import { useGame } from '@/state/game';
import { btn, Panel } from '@/components/kit';
import { cn } from '@/lib/utils';

const RESOURCE_KEYS: { key: TeacherResourceKey; label: string; icon: ReactNode }[] = [
  { key: 'power', label: 'Power', icon: <Zap className="h-4 w-4 text-warn" /> },
  { key: 'air', label: 'Air', icon: <Wind className="h-4 w-4 text-aqua" /> },
  { key: 'water', label: 'Water', icon: <Droplets className="h-4 w-4 text-aqua" /> },
  { key: 'food', label: 'Food', icon: <Sprout className="h-4 w-4 text-ok" /> },
  { key: 'safety', label: 'Crew Safety', icon: <Shield className="h-4 w-4 text-warn" /> },
  { key: 'science', label: 'Science', icon: <FlaskConical className="h-4 w-4 text-ion" /> },
];

const MODULE_ICONS: Record<ModuleId, ReactNode> = {
  solar: <Sun className="h-4 w-4 text-warn" />,
  habitat: <Users className="h-4 w-4 text-aqua" />,
  recycler: <Droplets className="h-4 w-4 text-aqua" />,
  greenhouse: <Sprout className="h-4 w-4 text-ok" />,
  shelter: <Shield className="h-4 w-4 text-warn" />,
  comms: <Radio className="h-4 w-4 text-ion" />,
};

const STAGE_ICONS: Record<'observe' | 'predict' | 'choose' | 'watch' | 'explain', ReactNode> = {
  observe: <Eye className="h-5 w-5 text-aqua" />,
  predict: <Sparkles className="h-5 w-5 text-warn" />,
  choose: <Rocket className="h-5 w-5 text-ok" />,
  watch: <Calculator className="h-5 w-5 text-aqua" />,
  explain: <HelpCircle className="h-5 w-5 text-ion" />,
};

function SimVsNasaDiagram() {
  return (
    <svg
      viewBox="0 0 720 190"
      className="w-full rounded-2xl border border-[#dfe5fa] bg-[#252d66]"
      role="img"
      aria-label="Diagram showing AstroBorneo simulated resource rules separate from verified NASA DONKI observations"
    >
      <rect width="720" height="190" fill="#252d66" />
      {/* Left box: Simulated Educational Engine */}
      <rect x="20" y="20" width="280" height="150" rx="14" fill="#fffefa" stroke="#ffca6b" strokeWidth="2.2" />
      <text x="160" y="45" textAnchor="middle" fill="#b86b0d" fontSize="12" fontFamily="JetBrains Mono" fontWeight="700">
        SIMULATED_SCENARIO
      </text>
      <text x="160" y="68" textAnchor="middle" fill="#222a5b" fontSize="13" fontFamily="Outfit" fontWeight="800">
        Game Rules &amp; 0–100 Units
      </text>
      <text x="160" y="92" textAnchor="middle" fill="#4e5b8a" fontSize="11" fontFamily="Plus Jakarta Sans">
        • Fixed Cycles 1–5 Solar (+24, +8, +22, +14, +20)
      </text>
      <text x="160" y="112" textAnchor="middle" fill="#4e5b8a" fontSize="11" fontFamily="Plus Jakarta Sans">
        • Deterministic Engine (src/game/engine.ts)
      </text>
      <text x="160" y="132" textAnchor="middle" fill="#4e5b8a" fontSize="11" fontFamily="Plus Jakarta Sans">
        • Simplified C4 Radiation Safety Tiers (-2/-5/-15)
      </text>
      <text x="160" y="155" textAnchor="middle" fill="#1b7c54" fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono">
        Controls Base Gauges &amp; Score
      </text>

      {/* Center separation barrier */}
      <line x1="360" y1="22" x2="360" y2="168" stroke="#ffe49e" strokeWidth="2.5" strokeDasharray="6 5" />
      <rect x="308" y="64" width="104" height="58" rx="10" fill="#ffe7a1" stroke="#e7a959" strokeWidth="2" />
      <text x="360" y="88" textAnchor="middle" fill="#364272" fontSize="10.5" fontFamily="JetBrains Mono" fontWeight="700">
        STRICT
      </text>
      <text x="360" y="103" textAnchor="middle" fill="#364272" fontSize="10.5" fontFamily="JetBrains Mono" fontWeight="700">
        SEPARATION
      </text>
      <text x="360" y="116" textAnchor="middle" fill="#4e5b8a" fontSize="9" fontWeight="600" fontFamily="Plus Jakarta Sans">
        Never alters score
      </text>

      {/* Right box: Verified NASA Context */}
      <rect x="420" y="20" width="280" height="150" rx="14" fill="#fffefa" stroke="#6aa6ff" strokeWidth="2.2" />
      <text x="560" y="45" textAnchor="middle" fill="#2374b8" fontSize="12" fontFamily="JetBrains Mono" fontWeight="700">
        LIVE_DATA / ARCHIVED_DATA
      </text>
      <text x="560" y="68" textAnchor="middle" fill="#222a5b" fontSize="13" fontFamily="Outfit" fontWeight="800">
        NASA Space-Weather Context
      </text>
      <text x="560" y="92" textAnchor="middle" fill="#4e5b8a" fontSize="11" fontFamily="Plus Jakarta Sans">
        • Server route /api/space-weather (key server-only)
      </text>
      <text x="560" y="112" textAnchor="middle" fill="#4e5b8a" fontSize="11" fontFamily="Plus Jakarta Sans">
        • DONKI Catalog: FLR, SEP, CME + timestamps
      </text>
      <text x="560" y="132" textAnchor="middle" fill="#4e5b8a" fontSize="11" fontFamily="Plus Jakarta Sans">
        • Preliminary research data (not medical forecast)
      </text>
      <text x="560" y="155" textAnchor="middle" fill="#2374b8" fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono">
        Read-Only Educational Context
      </text>
    </svg>
  );
}

export default function Teacher() {
  const { game, quiz } = useGame();
  const pastMissions = useMemo(() => loadMissions(), []);
  const [selectedResource, setSelectedResource] = useState<TeacherResourceKey>('power');
  const [worksheetPreview, setWorksheetPreview] = useState(false);

  const inspectedState = game;
  const inspectedQuizCorrect = useMemo(() => quizCorrect(quiz), [quiz]);

  const formula = RESOURCE_FORMULAS[selectedResource];
  const scoreInfo = inspectedState
    ? scoreSummary(inspectedState, quiz.completed, inspectedQuizCorrect)
    : null;

  const activeMissionPaused = Boolean(game && game.status === 'active');

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  return (
    <div className="space-y-6" data-testid="page-teacher">
      {/* Top Privacy & Protected Return Header */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="hud-label !text-[#ffe49e]">Optional Educator &amp; Judge Layer · Separate From Child HUD</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-white md:text-4xl">
              Teacher &amp; Judge Guide
            </h1>
            <p className="mt-2 max-w-3xl text-base text-[#dce4ff]">
              Detailed learning outcomes, exact simulation math, real mission history inspection, and NASA vs. simulated data boundaries — tucked cleanly away so young explorers only see visual controls on the Moon Base.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeMissionPaused && (
              <Link href="/base" className={btn.primary} data-testid="button-teacher-return-base">
                <ArrowLeft className="h-4 w-4" /> Return to Moon Base (C{game!.cycle}/5)
              </Link>
            )}
            <Link href="/about" className={btn.ghost} data-testid="link-teacher-about">
              <Database className="h-4 w-4 text-aqua" /> NASA Sources
            </Link>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-[#b9e6d5] bg-[#e9fbf3] px-4 py-3 text-sm text-[#174d36]"
          data-testid="banner-teacher-privacy"
        >
          <Lock className="h-4 w-4 shrink-0 text-[#1b7c54]" aria-hidden />
          <p className="flex-1">
            <strong>No accounts or personal tracking:</strong> AstroBorneo never asks for student names, school IDs, birth dates, or contact info. Saved missions live strictly in this browser&apos;s local storage and are never cloud-shared.
            {activeMissionPaused && ` Your Cycle ${game!.cycle} mission stays safely paused and unchanged.`}
          </p>
        </div>
      </div>

      {/* Section 1: 6 Intended Learning Outcomes */}
      <div className="no-print">
        <Panel
          kicker="Curriculum Alignment · Ages 7–12"
          title="Summary of Intended Learning Outcomes"
          action={<BookOpen className="h-5 w-5 text-aqua" aria-hidden />}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-teacher-outcomes">
            {TEACHER_OUTCOMES.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-dim/20 bg-deep/60 p-4"
                data-testid={`outcome-card-${item.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-dim/25 bg-plate">
                    {MODULE_ICONS[item.moduleId]}
                  </span>
                  <h3 className="font-display text-base font-bold text-ink">{item.title}</h3>
                </div>
                <p className="mt-2 text-sm font-semibold text-aqua">{item.concept}</p>
                <p className="mt-1.5 text-xs text-ink">
                  <strong className="text-dim">Game rule:</strong> {item.gameMechanic}
                </p>
                <p className="mt-1.5 text-xs text-dim">
                  <strong className="text-ink">Real space connection:</strong> {item.realScience}
                </p>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      {/* Section 2: Illustrated Five-Stage Inquiry Activity */}
      <div className="no-print">
        <Panel kicker="Classroom Sequence" title="Five-Stage Guided Investigation Activity">
          <div className="grid gap-3 md:grid-cols-5" data-testid="grid-five-stages">
            {FIVE_STAGE_ACTIVITY.map((stage, idx) => (
              <div
                key={stage.id}
                className="relative flex flex-col justify-between rounded-xl border border-aqua/25 bg-deep/65 p-3.5"
                data-testid={`stage-card-${stage.id}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-aqua/30 bg-plate">
                      {STAGE_ICONS[stage.id]}
                    </span>
                    <span className="font-mono text-xs font-bold text-dim">
                      STAGE {stage.step}/5
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-display text-base font-bold text-ink">{stage.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-aqua">{stage.childCue}</p>
                </div>
                <p className="mt-2.5 border-t border-dim/15 pt-2 text-xs text-dim">{stage.teacherPrompt}</p>
                {idx < FIVE_STAGE_ACTIVITY.length - 1 && (
                  <ArrowRight
                    className="mt-2 hidden h-4 w-4 self-end text-aqua/60 md:block"
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Section 3: Interactive Resource Calculation & Real State History Inspector */}
      <div className="no-print">
        <Panel
          kicker="Read-Only Engine Audit · Zero Score Mutation"
          title="Exact Resource Calculation & Real State History"
          action={<Calculator className="h-5 w-5 text-aqua" aria-hidden />}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select a resource to inspect">
              {RESOURCE_KEYS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={selectedResource === item.key}
                  onClick={() => setSelectedResource(item.key)}
                  data-testid={`button-teacher-resource-${item.key}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition',
                    selectedResource === item.key
                      ? 'border-[#ffca6b] bg-[#ffe7a1] text-[#364272]'
                      : 'border-dim/20 bg-deep/65 text-dim hover:border-aqua/40 hover:text-ink',
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {pastMissions.length > 0 && (
              <span className="rounded-lg border border-dim/20 bg-deep/70 px-2.5 py-1 font-mono text-[11px] text-dim" data-testid="text-teacher-past-count">
                {pastMissions.length} completed attempt{pastMissions.length === 1 ? '' : 's'} logged locally
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1.35fr]">
            {/* Exact Formula Reference */}
            <div className="rounded-xl border border-aqua/30 bg-deep/70 p-4" data-testid="panel-teacher-formula">
              <p className="hud-label">Exact Engine Rule · {formula.label}</p>
              <p className="mt-1 text-xs text-dim">{formula.unitNote}</p>
              <div className="mt-3 rounded-lg border border-dim/20 bg-hull/80 p-3 font-mono text-xs text-aqua">
                {formula.formulaSummary}
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-ok">Inputs &amp; Gains</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-dim">
                    {formula.inputs.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-warn">Costs &amp; Crew Demand</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-dim">
                    {formula.outputsAndCosts.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <p className="border-t border-dim/15 pt-2 text-[11px] text-dim">{formula.clampRule}</p>
              </div>
            </div>

            {/* Real Committed History Table */}
            <div className="rounded-xl border border-dim/20 bg-deep/70 p-4" data-testid="panel-teacher-history">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="hud-label">Actual Committed State History (Read-Only)</p>
                {scoreInfo && (
                  <span className="rounded-md border border-dim/25 bg-hull px-2.5 py-1 font-mono text-xs text-aqua" data-testid="text-teacher-readonly-score">
                    {scoreInfo.label}: {scoreInfo.value}/{scoreInfo.maximum}
                  </span>
                )}
              </div>

              {!inspectedState || inspectedState.history.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-dim/30 bg-hull/45 p-5 text-center text-sm text-dim" data-testid="empty-teacher-history">
                  No committed cycles have been recorded in this mission yet. Play at least Cycle 1 on the Moon Base to inspect exact cycle-by-cycle calculations here.
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {inspectedState.history.map((rev) => {
                    const calc = explainCycleResourceCalculation(rev, selectedResource);
                    return (
                      <div
                        key={rev.cycle}
                        className="rounded-xl border border-dim/20 bg-hull/80 p-3 text-xs"
                        data-testid={`teacher-history-cycle-${rev.cycle}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold text-ink">
                            Cycle {rev.cycle} · {MODES[rev.decision.mode].label} · {EVENT_LABEL[rev.decision.event]}
                          </span>
                          <span className="font-mono font-bold text-aqua">
                            {calc.before} → {calc.after} ({calc.delta >= 0 ? `+${calc.delta}` : calc.delta})
                          </span>
                        </div>
                        <p className="mt-1.5 font-mono text-[11px] text-dim">{calc.equationText}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {pastMissions.length > 0 && (
                <div className="mt-4 border-t border-dim/15 pt-3" data-testid="teacher-past-missions-summary">
                  <p className="hud-label">Logged Past Mission Attempts (Read-Only)</p>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {pastMissions.slice(0, 4).map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dim/15 bg-hull/60 px-2.5 py-1.5">
                        <span className="text-ink">
                          {new Date(m.date).toLocaleDateString()} · {m.outcome === 'success' ? 'Success' : 'Needs Revision'} ({m.completedCycles}/5 cycles)
                        </span>
                        <span className="font-mono text-aqua">Provisional {m.score}/90 · Science {m.science}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* Section 4: Simulated vs Verified NASA Observations Diagram & DONKI Limits */}
      <div className="no-print">
        <Panel kicker="Scientific Honesty & Data Boundaries" title="Educational Simulation vs. Verified NASA Observations">
          <SimVsNasaDiagram />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-dim/20 text-dim">
                  <th className="py-2 pr-3 font-mono uppercase">Aspect</th>
                  <th className="py-2 pr-3 font-mono text-aqua uppercase">Simulated Training (SIMULATED_SCENARIO)</th>
                  <th className="py-2 font-mono text-ion uppercase">NASA Context (LIVE_DATA / ARCHIVED_DATA)</th>
                </tr>
              </thead>
              <tbody>
                {DATA_MODE_COMPARISON.map((row) => (
                  <tr key={row.aspect} className="border-b border-dim/10">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{row.aspect}</td>
                    <td className="py-2.5 pr-3 text-dim">{row.simulated}</td>
                    <td className="py-2.5 text-dim">{row.nasaObservation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3.5 text-xs">
            <p className="font-display text-sm font-bold text-warn">DONKI Limits &amp; Server Security</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-ink">
              {DONKI_LIMITATIONS.map((lim) => (
                <li key={lim}>{lim}</li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {/* Section 5: Optional Printable Observation Worksheet */}
      <Panel
        kicker="Classroom Handout"
        title="Printable Observation Worksheet"
        action={
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWorksheetPreview((v) => !v)}
              className={cn(btn.ghost, 'min-h-[40px] px-3 py-1.5 text-xs')}
              data-testid="button-toggle-worksheet-preview"
            >
              <Eye className="h-3.5 w-3.5 text-aqua" />
              {worksheetPreview ? 'Hide Print Preview' : 'Preview Worksheet'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className={cn(btn.primary, 'min-h-[40px] px-4 py-1.5 text-xs')}
              data-testid="button-print-worksheet"
            >
              <Printer className="h-3.5 w-3.5" /> Print Worksheet
            </button>
          </div>
        }
      >
        <p className="no-print text-sm text-dim">
          Prints a clean white-background classroom worksheet using browser print CSS (`@media print`). Committed cycle values from this browser appear automatically; unplayed cycles remain open for student predictions.
        </p>

        <div
          className={cn(
            'print-worksheet mt-4 rounded-xl border border-dim/25 bg-white p-6 text-slate-900',
            worksheetPreview ? 'block' : 'hidden print:block',
          )}
          data-testid="section-printable-worksheet"
        >
          <div className="border-b-2 border-slate-300 pb-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
              AstroBorneo: Mission Survival Academy · Classroom Observation Sheet
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
              Lunar Outpost Trade-Off &amp; Systems Log
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Privacy note: Do NOT write student names, school IDs, birth dates, or personal contact details on shared handouts.
            </p>
          </div>

          <div className="mt-4">
            <h3 className="font-display text-sm font-bold uppercase text-slate-800">
              Part 1 · Five-Stage Investigation Check
            </h3>
            <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
              {FIVE_STAGE_ACTIVITY.map((s) => (
                <div key={s.id} className="rounded border border-slate-300 p-2">
                  <p className="font-bold text-slate-900">{s.step}. {s.title}</p>
                  <p className="mt-1 text-[11px] text-slate-600">[ ] Done</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-display text-sm font-bold uppercase text-slate-800">
              Part 2 · Predictions &amp; Actual Cycle Changes (0–100 Illustrative Units)
            </h3>
            <table className="mt-2 w-full border-collapse border border-slate-300 text-left text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2">Cycle</th>
                  <th className="border border-slate-300 p-2">My Prediction (↑ / ↓ &amp; Why)</th>
                  <th className="border border-slate-300 p-2">Chosen Action</th>
                  <th className="border border-slate-300 p-2">Actual Resource Result (End of Cycle)</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((c) => {
                  const real = inspectedState?.history.find((h) => h.cycle === c);
                  return (
                    <tr key={c}>
                      <td className="border border-slate-300 p-2 font-mono font-bold">Cycle {c}</td>
                      <td className="border border-slate-300 p-2 text-slate-500">
                        Pwr ___ Air ___ Water ___ Food ___ Safe ___
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-800">
                        {real
                          ? `${MODES[real.decision.mode].label} · ${EVENT_LABEL[real.decision.event]}`
                          : 'Eco / Std / Boost · Event: _________'}
                      </td>
                      <td className="border border-slate-300 p-2 font-mono text-slate-800">
                        {real
                          ? `Pwr ${real.after.power} (${real.delta.power >= 0 ? `+${real.delta.power}` : real.delta.power}), Air ${real.after.air}, H2O ${real.after.water}, Food ${real.after.food}, Safe ${real.after.safety}`
                          : 'Pwr ___ Air ___ H2O ___ Food ___ Safe ___'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 space-y-3 text-xs">
            <h3 className="font-display text-sm font-bold uppercase text-slate-800">
              Part 3 · Explain Why (Crew Survival Reflection)
            </h3>
            <div className="rounded border border-slate-300 p-3">
              <p className="font-semibold text-slate-800">
                1. What happened when you saved electricity by switching Crew Home to Eco mode?
              </p>
              <div className="mt-4 border-b border-dashed border-slate-400" />
            </div>
            <div className="rounded border border-slate-300 p-3">
              <p className="font-semibold text-slate-800">
                2. Which system needed both Power and Water before it could help the crew?
              </p>
              <div className="mt-4 border-b border-dashed border-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">
              AstroBorneo Educational Simulation · Illustrative resource units only · Not an operational NASA prediction or medical tool.
            </p>
          </div>
        </div>
      </Panel>

      {/* Section 6: Official CSA & NASA Reference Links */}
      <div className="no-print grid gap-6 lg:grid-cols-2">
        <Panel kicker="Canadian Space Agency · Reference Links Only" title="CSA STEM & Food Production Toolkits">
          <p className="mb-3 text-xs text-dim">
            External educator reference links (not integrated APIs). Verify Canadian Space Agency copyright and reuse terms before copying or embedding external media.
          </p>
          <ul className="space-y-2.5">
            {CSA_TEACHER_LINKS.map((link) => (
              <li key={link.url} className="rounded-xl border border-dim/20 bg-deep/55 p-3 text-xs">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-aqua hover:underline"
                  data-testid={`link-teacher-csa-${link.title.slice(0, 12).replace(/\W/g, '')}`}
                >
                  {link.title} <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <p className="mt-0.5 font-mono text-[11px] text-dim">{link.url}</p>
                <p className="mt-1 text-dim">{link.note}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel kicker="NASA Reference Catalog" title="Science & Engineering Sources">
          <ul className="space-y-2">
            {SOURCES.slice(0, 6).map((s) => (
              <li key={s.url} className="rounded-xl border border-dim/15 bg-deep/55 p-2.5 text-xs">
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline">
                  {s.title} <ExternalLink className="h-3 w-3" />
                </a>
                <p className="mt-0.5 text-dim">{s.note}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
