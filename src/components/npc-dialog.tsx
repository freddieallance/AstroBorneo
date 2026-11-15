import { Navigation, Volume2 } from 'lucide-react';
import type { ModuleId } from '@/content/mission';
import { getAstronaut } from '@/game/astronauts';
import { STATIONS, type NpcDialogMessage } from '@/game/survival-engine';
import { AstronautAvatar } from './astronaut-avatar';
import { isSpeechSupported, speakText } from '@/lib/speech';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

export function NpcDialog({
  dialog,
  npcTargetStation,
  npcTaskPhase,
  onWalkToStation,
}: {
  dialog: NpcDialogMessage | null;
  npcTargetStation: ModuleId;
  npcTaskPhase: 'walking' | 'working' | 'resting';
  onWalkToStation: (id: ModuleId) => void;
}) {
  if (!dialog) return null;
  const npcProfile = getAstronaut(dialog.speakerId);

  const borderTone =
    dialog.severity === 'critical'
      ? 'border-bad/80'
      : dialog.severity === 'warn'
        ? 'border-warn/80'
        : 'border-aqua/55';

  const statusChip =
    npcTaskPhase === 'working'
      ? `Fixing ${STATIONS[npcTargetStation].label}`
      : `Heading to ${STATIONS[npcTargetStation].label}`;

  return (
    <div
      className={cn(
        'pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-2 bg-[#0d1631]/95 px-3.5 py-2.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.75)]',
        borderTone,
      )}
      role="status"
      aria-live="polite"
      data-testid="npc-dialog-box"
    >
      <AstronautAvatar profile={npcProfile} size={46} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-xs font-extrabold uppercase tracking-wide text-aqua">
            {dialog.speakerName} (Crew Partner)
          </span>
          <span className="font-mono text-[11px] font-bold text-dim">
            · {statusChip}
          </span>
        </div>
        <p className="mt-0.5 font-sans text-sm font-semibold leading-snug text-ink" data-testid="npc-dialog-text">
          {dialog.text}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {dialog.targetStation && (
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              onWalkToStation(dialog.targetStation!);
            }}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-warn/60 bg-warn/20 px-2.5 py-1.5 font-display text-xs font-extrabold text-warn transition hover:bg-warn/30"
            data-testid="button-npc-go-fix"
            title={`Walk to ${STATIONS[dialog.targetStation].label}`}
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Go</span>
          </button>
        )}
        {isSpeechSupported() && (
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              speakText(dialog.text, true);
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-dim/25 bg-plate/80 text-aqua hover:border-aqua"
            aria-label="Read partner message aloud"
            data-testid="button-npc-speak"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
