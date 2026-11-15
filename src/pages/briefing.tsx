import { useState } from 'react';
import { useLocation } from 'wouter';
import { Rocket } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { btn, Disclosures, Panel } from '@/components/kit';
import { useGame } from '@/state/game';
import { EVENTS } from '@/content/mission';

const OBJECTIVES = [
  'Maintain breathable air.',
  'Keep the crew safe.',
  'Manage limited electricity.',
  'Produce or conserve food.',
  'Recycle water.',
  'Complete scientific research when resources permit.',
  'Respond to unexpected mission events.',
];
const CREW = [
  ['Cmdr. Amara Okafor', 'Mission commander'],
  ['Dr. Kenji Watanabe', 'Geologist'],
  ['Eng. Lucía Ferreira', 'Life support engineer'],
  ['Dr. Noah Tremblay', 'Botanist'],
];

export default function Briefing() {
  const { game, startNew } = useGame();
  const [, go] = useLocation();
  const [confirm, setConfirm] = useState(false);
  const inProgress = game && game.status === 'active' && game.completedCycles > 0;

  const begin = () => {
    startNew();
    go('/base');
  };

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="hud-label">Mission Briefing · Classified: Junior Commanders Only</p>
        <h1 className="mt-2 text-4xl font-bold md:text-6xl">Operation <span className="text-aqua">Lunar Dawn</span></h1>
        <p className="mt-3 max-w-3xl text-lg text-dim">
          You command a fictional research outpost near the Moon's south polar region. The Sun skims the horizon here, the nights can be long, and every watt counts.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel kicker="Your goals" title="Mission objectives">
          <ol className="grid gap-2 sm:grid-cols-2">
            {OBJECTIVES.map((o, i) => (
              <li key={o} className="flex gap-3 rounded-xl bg-deep/40 p-3">
                <span className="font-mono text-aqua">{String(i + 1).padStart(2, '0')}</span>
                <span>{o}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="space-y-6">
          <Panel kicker="Crew of four (fictional)" title="Who you are protecting">
            <ul className="space-y-2">
              {CREW.map(([n, r]) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ion/20 font-display font-bold text-aqua">{n.split(' ').slice(-2).map((w) => w[0]).join('')}</span>
                  <span><span className="block font-semibold">{n}</span><span className="text-sm text-dim">{r}</span></span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel kicker="Duration" title="Five operational cycles">
            <p className="text-dim">Each cycle is one game step, not a real lunar day. Expect these situations:</p>
            <ul className="mt-3 space-y-1.5">
              {EVENTS.map((e) => (
                <li key={e.cycle} className="flex gap-3 text-sm"><span className="font-mono text-dim">C{e.cycle}</span>{e.title}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <Disclosures />
      <div className="flex flex-wrap gap-3">
        <button className={`${btn.primary} px-8 py-4 text-lg`} onClick={() => (inProgress ? setConfirm(true) : begin())} data-testid="button-start-simulation">
          <Rocket className="h-5 w-5" /> Start Simulation
        </button>
        {game?.status === 'active' && (
          <button className={btn.ghost} onClick={() => go('/control')} data-testid="button-resume-briefing">Resume cycle {game.cycle}</button>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="border-dim/20 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">You have a mission in progress at cycle {game?.cycle}. Starting a new one will replace it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-new">Keep current mission</AlertDialogCancel>
            <AlertDialogAction onClick={begin} className="bg-bad text-deep hover:bg-bad/90" data-testid="button-confirm-new">Start new mission</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
