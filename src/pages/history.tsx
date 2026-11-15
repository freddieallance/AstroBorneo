import { useState } from 'react';
import { Link } from 'wouter';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { btn, ErrorNote, Panel } from '@/components/kit';
import { clearMissions, loadMissions, type MissionRecord } from '@/lib/records';

export default function History() {
  const [list, setList] = useState<MissionRecord[]>(loadMissions);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const clear = () => {
    try { clearMissions(); setList([]); setErr(null); } catch { setErr('History could not be cleared on this device.'); }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label !text-[#ffe49e]">Mission History</p>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Past attempts on this device</h1>
          <p className="text-[#dce4ff]">Scores here exclude the quiz.</p>
        </div>
        {list.length > 0 && <button className={btn.danger} onClick={() => setConfirm(true)} data-testid="button-clear-history"><Trash2 className="h-4 w-4" /> Clear history</button>}
      </div>
      {err && <ErrorNote text={err} />}
      {list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="font-display text-2xl">No completed missions yet</p>
          <p className="mt-2 text-dim">Finish or fail a mission and it will be logged here.</p>
          <Link href="/briefing" className={`${btn.primary} mt-6`} data-testid="link-history-start">Start a mission</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((m) => (
            <Panel key={m.id} kicker={new Date(m.date).toLocaleString()} title={m.outcome === 'success' ? 'Mission Success' : 'Mission Needs Revision'}>
              <div data-testid={`card-mission-${m.id}`}>
                <p className="font-mono text-sm text-dim">Provisional Mission Score {m.score}/90 · Cycles {m.completedCycles}/5 · Science {m.science}</p>
                <ul className="mt-2 space-y-0.5 text-sm">{m.decisions.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="border-dim/20 bg-hull text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all mission history?</AlertDialogTitle>
            <AlertDialogDescription className="text-dim">This removes every logged attempt. Your current mission is not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-bad text-white hover:bg-bad/90" onClick={clear} data-testid="button-confirm-clear">Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
