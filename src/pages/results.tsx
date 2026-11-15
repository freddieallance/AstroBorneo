import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Rocket } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getZeroResources, scoreSummary } from '@/game/scoring';
import { defaultDecision, preview } from '@/game/engine';
import { useGame } from '@/state/game';
import { btn, NoMission } from '@/components/kit';
import { LunarScene } from '@/components/lunar-scene';
import { NasaSourceDialog } from '@/components/scene-overlays';
import { MissionReportDrawer, VisualEndingCard } from '@/components/visual-results';
import { moduleStatuses } from '@/lib/modules';
import { quizCorrect } from '@/lib/records';

export default function Results() {
  const { game, draft, quiz, abandon, startNew } = useGame();
  const [, go] = useLocation();
  const [retry, setRetry] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  if (!game) return <NoMission />;
  if (game.status === 'active') {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold">Mission still in progress</h1>
        <p className="mt-2 text-dim">Finish all five cycles to see your results.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/base" className={btn.primary} data-testid="button-back-base">
            <Rocket className="h-4 w-4" /> Back to Moon Base
          </Link>
          <button className={btn.ghost} onClick={() => go('/control')} data-testid="button-back-control">
            Classic Mission Control
          </button>
        </div>
      </div>
    );
  }

  const lastDecision = game.history[game.history.length - 1]?.decision ?? defaultDecision(game.cycle);
  const solar = preview(game, draft).solar;
  const statuses = moduleStatuses(game, lastDecision, solar);
  const zeroResources = getZeroResources(game.resources);
  const qc = quiz.completed ? quizCorrect(quiz) : 0;
  const total = scoreSummary(game, quiz.completed, qc);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label">Mission Results · Operation Lunar Dawn</p>
          <h1 className="text-2xl font-bold text-ink md:text-3xl">Your Moon Base Ending</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-aqua/30 bg-deep/75 px-3 py-1.5 font-mono text-xs text-aqua" data-testid="text-score">
            {total.label}: <strong>{total.value}</strong>/{total.maximum}
          </span>
          <Link href="/base" className={btn.ghost} data-testid="link-results-base">
            View Full-Screen Base
          </Link>
        </div>
      </div>

      {/* Persistent Moon Base Scene centered with Child-Readable Visual Ending */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-dim/20 bg-deep/90 shadow-2xl">
          <div className="aspect-[1000/560] w-full">
            <LunarScene
              statuses={statuses}
              onSelect={() => setReportOpen(true)}
              visual={{
                cycle: game.cycle,
                solar,
                mode: lastDecision.mode,
                greenhouseOn: lastDecision.greenhouse,
                recyclerOn: lastDecision.recycler,
                commsOn: lastDecision.communications,
                eventChoice: lastDecision.event,
                shieldingLevel: game.shieldingLevel,
                backupCharges: game.backupCharges,
                activeStatus: game.status,
                failedResources: zeroResources,
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dim/15 bg-hull/85 px-4 py-2.5 text-xs text-dim">
            <span>Tap any facility or open Mission Report for exact tables and charts.</span>
            <button
              type="button"
              onClick={() => go('/academy')}
              className="font-semibold text-aqua hover:underline"
              data-testid="button-academy"
            >
              Open Academy Quiz →
            </button>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6">
          <VisualEndingCard
            game={game}
            quiz={quiz}
            onStartQuiz={() => go('/academy')}
            onRequestRestart={() => setRetry(true)}
            onOpenReport={() => setReportOpen(true)}
            onOpenSources={() => setSourcesOpen(true)}
          />
        </div>
      </div>

      {/* Secondary Adult / Older-Learner Mission Report Drawer */}
      <MissionReportDrawer
        open={reportOpen}
        onOpenChange={setReportOpen}
        game={game}
        quiz={quiz}
        onOpenSources={() => {
          setReportOpen(false);
          setSourcesOpen(true);
        }}
      />

      <NasaSourceDialog open={sourcesOpen} onOpenChange={setSourcesOpen} cycle={game.cycle} />

      <AlertDialog open={retry} onOpenChange={setRetry}>
        <AlertDialogContent className="border-dim/20 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Replay the mission?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">
              This result stays saved in Mission History. Your active mission will reset to Cycle 1.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-retry">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                abandon();
                startNew();
                go('/base');
              }}
              data-testid="button-confirm-retry"
            >
              Replay Mission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
