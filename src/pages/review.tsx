import { useLocation } from 'wouter';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { useGame } from '@/state/game';
import { btn, Delta, NoMission, Panel, tone } from '@/components/kit';
import { CycleCauseEffectVisual } from '@/components/visual-lessons';
import { EVENT_LABEL, eventFor, MODES, RESOURCE_META, type ResourceKey } from '@/content/mission';

const KEYS: ResourceKey[] = ['power', 'air', 'safety', 'water', 'food'];

export default function Review() {
  const { game } = useGame();
  const [, go] = useLocation();
  if (!game) return <NoMission />;
  const rv = game.history[game.history.length - 1];
  if (!rv) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold text-white">No cycle to review yet</h1>
        <button className={`${btn.primary} mt-6`} onClick={() => go('/control')} data-testid="button-go-control">Go to Mission Control</button>
      </div>
    );
  }
  const ended = game.status !== 'active';
  const ev = eventFor(rv.cycle);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rise">
        <p className="hud-label !text-[#ffe49e]">Decision Review · Cycle {rv.cycle} complete</p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">What happened at the outpost</h1>
        <p className="mt-1 text-[#dce4ff]">{ev.title} · {MODES[rv.decision.mode].label} mode · {EVENT_LABEL[rv.decision.event]}</p>
      </div>
      <Panel kicker="Before and after" title="Resource changes">
        <div className="space-y-3" data-testid="table-review">
          {KEYS.map((k) => {
            const b = rv.before[k], a = rv.after[k];
            return (
              <div key={k} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
                <span className="font-semibold">{RESOURCE_META[k].label}</span>
                <div className="relative h-4 rounded-full bg-deep/70">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-dim/30" style={{ width: `${b}%` }} />
                  <div className="absolute inset-y-1 left-0 rounded-full transition-[width] duration-1000" style={{ width: `${a}%`, background: tone(a) }} />
                </div>
                <span className="w-28 text-right font-mono text-sm">{b} → {a} <Delta v={a - b} /></span>
              </div>
            );
          })}
          <div className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
            <span className="font-semibold">Science</span><span />
            <span className="w-28 text-right font-mono text-sm">{rv.scienceBefore} → {rv.scienceAfter} <Delta v={rv.scienceAfter - rv.scienceBefore} /></span>
          </div>
        </div>
      </Panel>
      <Panel kicker="Why" title="Which decisions caused the changes">
        <ul className="space-y-2">
          {rv.explanations.map((e, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-deep/40 p-3"><span className="font-mono text-aqua">{String(i + 1).padStart(2, '0')}</span>{e}</li>
          ))}
        </ul>
      </Panel>
      <section className="glass rounded-2xl border-aqua/40 p-6 space-y-3">
        <p className="hud-label flex items-center gap-2"><Lightbulb className="h-4 w-4 text-warn" /> Visual science takeaway</p>
        <CycleCauseEffectVisual record={rv} failed={game.status === 'failed'} />
        <p className="sr-only" data-testid="text-lesson">{rv.lesson}</p>
      </section>
      <div className="flex justify-end">
        <button className={btn.primary} onClick={() => go(ended ? '/results' : '/control')} data-testid="button-continue">
          {ended ? 'See mission results' : `Continue to cycle ${game.cycle}`} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
