import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MODULES, type ModuleId } from '@/content/mission';
import type { ModuleStatus } from '@/components/lunar-scene';

const COL = { ok: '#35d2a0', warn: '#ffc76b', bad: '#ff727e', off: '#abb8d5' };

export function ModuleSheet({ id, status, details, onClose }: { id: ModuleId | null; status?: ModuleStatus; details: string[]; onClose: () => void }) {
  const m = MODULES.find((x) => x.id === id);
  return (
    <Sheet open={!!m} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-dim/20 bg-hull text-ink sm:max-w-md" data-testid="panel-module">
        {m && (
          <>
            <SheetHeader>
              <p className="hud-label">Module file</p>
              <SheetTitle className="font-display text-2xl text-ink">{m.name}</SheetTitle>
              <SheetDescription className="text-dim">{m.purpose}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {status && (
                <div className="rounded-xl border p-4" style={{ borderColor: `${COL[status.level]}66` }}>
                  <p className="hud-label">Current status</p>
                  <p className="font-display text-xl font-semibold" style={{ color: COL[status.level] }} data-testid="text-module-status">{status.text}</p>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {details.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>
              )}
              {[
                ['Needs', m.needs],
                ['Produces', m.output],
                ['Why scientists care', m.science],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-plate/60 p-4">
                  <p className="hud-label">{k}</p>
                  <p className="mt-1 text-ink">{v}</p>
                </div>
              ))}
              <p className="text-xs text-dim">Numbers are illustrative teaching units, not NASA measurements.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
