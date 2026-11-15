import { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, BatteryCharging, ChevronDown, FlaskConical, Play, RotateCcw, Shield, Sprout, Droplets, Radio } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { preview, type Decision } from '@/game/engine';
import { useGame } from '@/state/game';
import { Bar, btn, Delta, ErrorNote, NoMission, Panel, Ring } from '@/components/kit';
import { CommsDemo } from '@/components/comms-demo';
import { DataSourcePanel } from '@/components/data-source-panel';
import { SpaceWeatherContext } from '@/components/space-weather-context';
import { EVENT_LABEL, eventFor, MODES, RESOURCE_META, SYSTEMS, type ResourceKey } from '@/content/mission';
import { CURRENT_DATA_MODE } from '@/services/nasa';
import { cn } from '@/lib/utils';

const KEYS: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];

export default function Control() {
  const { game, draft, setDraft, commit, abandon, startNew } = useGame();
  const [, go] = useLocation();
  const [confirm, setConfirm] = useState(false);
  const [restart, setRestart] = useState(false);
  const [running, setRunning] = useState(false);
  const committingRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [supplies, setSupplies] = useState(true);

  const fc = useMemo(() => (game ? preview(game, draft) : null), [game, draft]);
  if (!game || !fc) return <NoMission />;

  if (game.status !== 'active') {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="hud-label">Mission ended</p>
        <h1 className="mt-2 text-3xl font-bold">{game.status === 'success' ? 'All five cycles complete' : 'The mission needs revision'}</h1>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/results" className={btn.primary} data-testid="link-results">View results</Link>
          <Link href="/briefing" className={btn.ghost} data-testid="link-new-mission">New mission</Link>
        </div>
      </div>
    );
  }

  const ev = eventFor(game.cycle);
  const set = (p: Partial<Decision>) => { setErr(null); setDraft({ ...draft, ...p }); };
  const r = game.resources;
  const n = fc.next.resources;

  const run = () => {
    if (committingRef.current || running) return;
    committingRef.current = true;
    setRunning(true);
    try {
      const res = commit(game.cycle);
      setConfirm(false);
      if (res.ok) go('/review');
      else setErr(res.error);
    } finally {
      committingRef.current = false;
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* header strip */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud-label">Mission Control · Operation Lunar Dawn</p>
          <h1 className="text-3xl font-bold md:text-4xl">Cycle {game.cycle} <span className="text-dim">of 5</span></h1>
          <div className="mt-3 flex gap-1.5" aria-label={`Mission progress: ${game.completedCycles} of 5 cycles complete`} data-testid="progress-mission">
            {[1, 2, 3, 4, 5].map((c) => (
              <span key={c} className={cn('h-2 w-12 rounded-full', c <= game.completedCycles ? 'bg-ok' : c === game.cycle ? 'bg-aqua animate-pulse' : 'bg-plate')} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-warn/40 bg-warn/10 px-3 py-1.5 font-mono text-xs text-warn" data-testid="text-data-mode">DATA: {CURRENT_DATA_MODE}</span>
          <Link href="/base" className={btn.ghost} data-testid="link-base">View base</Link>
          <button className={btn.danger} onClick={() => setRestart(true)} data-testid="button-restart"><RotateCcw className="h-4 w-4" /> Restart</button>
        </div>
      </div>

      {/* primary three */}
      <div className="grid gap-4 md:grid-cols-3">
        {(['power', 'air', 'safety'] as const).map((k) => <Ring key={k} k={k} value={r[k]} forecast={fc.valid ? n[k] : undefined} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr_1fr]">
        {/* left: supplies + inventory */}
        <div className="space-y-6">
          <Collapsible open={supplies} onOpenChange={setSupplies} className="glass rounded-2xl p-5">
            <CollapsibleTrigger className="flex w-full items-center justify-between" data-testid="button-toggle-supplies">
              <span><span className="hud-label block text-left">Secondary</span><span className="font-display text-lg font-semibold">Supplies</span></span>
              <span className="flex items-center gap-2 font-mono text-sm text-dim">W {r.water} · F {r.food}<ChevronDown className={cn('h-4 w-4 transition', supplies && 'rotate-180')} /></span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <Bar k="water" value={r.water} forecast={fc.valid ? n.water : undefined} />
              <Bar k="food" value={r.food} forecast={fc.valid ? n.food : undefined} />
            </CollapsibleContent>
          </Collapsible>
          <Panel kicker="Inventory" title="Equipment and research">
            <dl className="grid grid-cols-2 gap-3">
              {[
                [Shield, 'Shielding level', game.shieldingLevel, 'shielding-level'],
                [Shield, 'Shielding kits', game.shieldingKits, 'shielding-kits'],
                [BatteryCharging, 'Backup charges', game.backupCharges, 'backup-charges'],
                [FlaskConical, 'Science points', game.science, 'science'],
              ].map(([Icon, label, v, id]) => {
                const I = Icon as typeof Shield;
                return (
                  <div key={id as string} className="rounded-xl bg-deep/50 p-3">
                    <I className="h-4 w-4 text-aqua" aria-hidden />
                    <dt className="mt-1 text-xs text-dim">{label as string}</dt>
                    <dd className="font-display text-2xl font-bold" data-testid={`value-${id}`}>{v as number}</dd>
                  </div>
                );
              })}
            </dl>
          </Panel>
        </div>

        {/* center: event + decisions */}
        <div className="space-y-6">
          <section className={cn('glass rounded-2xl p-5', ev.severity === 'alert' && 'border-bad/50', ev.severity === 'caution' && 'border-warn/40')} data-testid="panel-event">
            <p className="hud-label flex items-center gap-2">
              {ev.severity !== 'nominal' && <AlertTriangle className={cn('h-4 w-4', ev.severity === 'alert' ? 'text-bad' : 'text-warn')} />}
              Mission situation · Cycle {game.cycle}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{ev.title}</h2>
            <p className="mt-2 text-ink">{ev.briefing}</p>
            {ev.options.length > 1 && (
              <div role="radiogroup" aria-label="Event response" className="mt-4 grid gap-2">
                {ev.options.map((o) => {
                  const on = draft.event === o.value;
                  return (
                    <button key={o.value} role="radio" aria-checked={on} onClick={() => set({ event: o.value })}
                      className={cn('rounded-xl border p-3 text-left transition', on ? 'border-aqua bg-aqua/10' : 'border-dim/20 hover:border-dim/50')}
                      data-testid={`button-event-${o.value}`}>
                      <span className="flex items-center gap-2 font-semibold"><span className={cn('h-3 w-3 rounded-full border-2', on ? 'border-aqua bg-aqua' : 'border-dim')} />{o.label}</span>
                      <span className="mt-0.5 block pl-5 text-sm text-dim">{o.detail}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-4 rounded-xl bg-ion/10 p-3 text-sm text-ink"><span className="font-semibold text-aqua">Science: </span>{ev.science}</p>
          </section>

          <Panel kicker="Step 3" title="Life support mode">
            <div role="radiogroup" aria-label="Life support mode" className="grid grid-cols-3 gap-2">
              {(Object.keys(MODES) as (keyof typeof MODES)[]).map((m) => {
                const on = draft.mode === m;
                return (
                  <button key={m} role="radio" aria-checked={on} onClick={() => set({ mode: m })}
                    className={cn('rounded-xl border p-3 text-left transition', on ? 'border-ion bg-ion/15' : 'border-dim/20 hover:border-dim/50')}
                    data-testid={`button-mode-${m}`}>
                    <span className="block font-display font-bold">{MODES[m].label}</span>
                    <span className="block font-mono text-xs text-dim">Pwr -{MODES[m].power}</span>
                    <span className="block font-mono text-xs" style={{ color: MODES[m].net >= 0 ? '#35d2a0' : '#ff727e' }}>Air {MODES[m].net > 0 ? '+' : ''}{MODES[m].net}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-dim">{MODES[draft.mode].blurb} Life support can never be fully turned off. Real spacecraft air systems are more complex than this model.</p>
          </Panel>

          <Panel kicker="Step 4" title="Optional systems">
            <div className="space-y-3">
              {([
                ['greenhouse', Sprout],
                ['recycler', Droplets],
                ['communications', Radio],
              ] as const).map(([k, Icon]) => {
                const greenhouseOffEvent = k === 'greenhouse' && draft.event === 'off';
                return (
                  <div key={k} className="flex items-center gap-3 rounded-xl bg-deep/40 p-3">
                    <Icon className="h-5 w-5 text-aqua" aria-hidden />
                    <label htmlFor={`sw-${k}`} className="flex-1">
                      <span className="block font-semibold">{SYSTEMS[k].label}</span>
                      <span className="text-xs text-dim">{SYSTEMS[k].cost} · {SYSTEMS[k].gain}</span>
                      {greenhouseOffEvent && <span className="block text-xs text-warn">Turned off by your event response.</span>}
                    </label>
                    <Switch id={`sw-${k}`} checked={draft[k] && !greenhouseOffEvent} disabled={greenhouseOffEvent} onCheckedChange={(v) => set({ [k]: v } as Partial<Decision>)} data-testid={`switch-${k}`} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* right: forecast */}
        <div className="space-y-6">
          <Panel kicker="Step 6 · Forecast" title="If you run this cycle" className="lg:sticky lg:top-20">
            <p className="mb-3 text-sm">Effective Greenhouse: {fc.review.decision.greenhouse ? 'ON' : 'OFF'}</p>
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-ok/10 p-3"><span className="block text-dim">Solar generation</span><span className="font-mono text-lg text-ok" data-testid="text-solar">+{fc.solar}</span></div>
              <div className="rounded-xl bg-bad/10 p-3"><span className="block text-dim">Systems power cost</span><span className="font-mono text-lg text-bad" data-testid="text-power-cost">-{fc.powerCost}</span></div>
            </div>
            {fc.valid && <table className="w-full text-sm" data-testid="table-forecast">
              <thead><tr className="text-left text-dim"><th className="py-1 font-normal">Resource</th><th className="font-normal">Now</th><th className="font-normal">Change</th><th className="font-normal">After</th></tr></thead>
              <tbody>
                {KEYS.map((k) => (
                  <tr key={k} className="border-t border-dim/10">
                    <td className="py-1.5">{RESOURCE_META[k].label}</td>
                    <td className="font-mono">{r[k]}</td>
                    <td><Delta v={n[k] - r[k]} /></td>
                    <td className="font-mono">{n[k]}</td>
                  </tr>
                ))}
                <tr className="border-t border-dim/10">
                  <td className="py-1.5">Science</td><td className="font-mono">{game.science}</td><td><Delta v={fc.next.science - game.science} /></td><td className="font-mono">{fc.next.science}</td>
                </tr>
              </tbody>
            </table>}
            {fc.valid && fc.review.explanations.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-dim">
                {fc.review.explanations.map((e, i) => <li key={i}>· {e}</li>)}
              </ul>
            )}
            {!fc.valid && (
              <div className="mt-3 space-y-2" data-testid="text-forecast-errors">
                {fc.errors.map((e) => <ErrorNote key={e} text={e} />)}
              </div>
            )}
            {fc.valid && fc.next.status === 'failed' && (
              <p className="mt-3 rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm" role="alert">{fc.warnings.join(' ')}</p>
            )}
            {err && <div className="mt-3"><ErrorNote text={err} /></div>}
            <button className={cn(btn.primary, 'mt-4 w-full py-4 text-lg')} disabled={!fc.valid || running} onClick={() => setConfirm(true)} data-testid="button-run-cycle">
              <Play className="h-5 w-5" /> Run Cycle {game.cycle}
            </button>
            <p className="mt-2 text-center text-xs text-dim">You will be asked to confirm first.</p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CommsDemo enabled={draft.communications} />
        <div className="space-y-6">
          <Panel kicker="Decision history" title="Past cycles">
            {game.history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-dim/25 p-6 text-center text-dim">No cycles run yet. Your decisions will appear here.</p>
            ) : (
              <ol className="space-y-2" data-testid="list-history">
                {game.history.map((h) => (
                  <li key={h.cycle} className="rounded-xl bg-deep/40 p-3 text-sm">
                    <span className="font-mono text-aqua">C{h.cycle}</span> {MODES[h.decision.mode].label} mode · {EVENT_LABEL[h.decision.event]} · Greenhouse {h.decision.greenhouse && h.decision.event !== 'off' ? 'ON' : 'OFF'}
                    <span className="mt-1 block font-mono text-xs text-dim">
                      P <Delta v={h.after.power - h.before.power} /> A <Delta v={h.after.air - h.before.air} /> S <Delta v={h.after.safety - h.before.safety} /> W <Delta v={h.after.water - h.before.water} /> F <Delta v={h.after.food - h.before.food} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <DataSourcePanel cycle={game.cycle} />
          <SpaceWeatherContext />
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={(o) => !running && setConfirm(o)}>
        <AlertDialogContent className="border-dim/20 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm cycle {game.cycle}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-dim">
                <p>{MODES[draft.mode].label} life support · Greenhouse {draft.greenhouse && draft.event !== 'off' ? 'on' : 'off'} · Recycler {draft.recycler ? 'on' : 'off'} · Comms {draft.communications ? 'on' : 'off'}</p>
                <p>Event response: {EVENT_LABEL[draft.event]}</p>
                <p className="font-mono text-ink">Power {r.power} → {n.power} · Air {r.air} → {n.air} · Safety {r.safety} → {n.safety}</p>
                <p>This cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-run">Change plan</AlertDialogCancel>
            <AlertDialogAction disabled={running} onClick={(e) => { e.preventDefault(); run(); }} data-testid="button-confirm-run">Run simulation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className="border-dim/20 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Restart the mission?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">All progress in this mission will be erased and you will return to cycle 1.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restart">Keep playing</AlertDialogCancel>
            <AlertDialogAction className="bg-bad text-deep hover:bg-bad/90" onClick={() => { abandon(); startNew(); }} data-testid="button-confirm-restart">Restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
