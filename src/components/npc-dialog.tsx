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
      ? 'border-[#ff7b8a]'
      : dialog.severity === 'warn'
        ? 'border-[#ffcf79]'
        : 'border-white';

  const statusChip =
    npcTaskPhase === 'working'
      ? `Fixing ${STATIONS[npcTargetStation].label}`
      : `Heading to ${STATIONS[npcTargetStation].label}`;

  return (
    <div
      className={cn(
        'pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-2 bg-[#fffefa] px-3.5 py-2.5 text-[#344270] shadow-[0_14px_34px_-10px_rgba(16,20,56,0.5)]',
        borderTone,
      )}
      role="status"
      aria-live="polite"
      data-testid="npc-dialog-box"
    >
      <AstronautAvatar profile={npcProfile} size={46} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-display text-xs font-extrabold uppercase tracking-wide text-[#364272]">
            {dialog.speakerName} (Crew)
          </span>
          <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#4e619e]">
            {statusChip}
          </span>
        </div>
        <p className="mt-0.5 font-sans text-sm font-bold leading-snug text-[#222a5b]" data-testid="npc-dialog-text">
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
            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-3 py-1.5 font-display text-xs font-extrabold text-[#364272] shadow-[0_3px_0_#e7a959] transition hover:brightness-105 active:translate-y-0.5"
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
            className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[#e0e6fa] bg-[#f4f6ff] text-[#4e619e] hover:border-[#b4a0ef]"
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
