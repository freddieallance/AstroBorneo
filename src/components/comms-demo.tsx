import { useEffect, useRef, useState } from 'react';
import { Radio, Send } from 'lucide-react';
import { COMMS_REFLECTION } from '@/content/quiz';
import { btn, Panel } from '@/components/kit';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'up' | 'down' | 'received';

export function CommsDemo({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pick, setPick] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!enabled) {
      timers.current.forEach(clearTimeout);
      setPhase('idle');
    }
  }, [enabled]);

  const send = () => {
    timers.current.forEach(clearTimeout);
    setPhase('up');
    timers.current = [
      window.setTimeout(() => setPhase('down'), 1300),
      window.setTimeout(() => setPhase('received'), 2600),
    ];
  };
  const busy = phase === 'up' || phase === 'down';

  return (
    <Panel kicker="Communications demo" title="Moon to Earth messaging" action={<Radio className="h-5 w-5 text-aqua" aria-hidden />}>
      <div className="relative h-20 overflow-hidden rounded-xl bg-deep/70" aria-hidden>
        <div className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-[#9aa3bd]" />
        <span className="absolute left-3 bottom-1 hud-label">Moon</span>
        <div className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#7fd3ff,#4f8cff_60%,#1b3270)]" />
        <span className="absolute right-3 bottom-1 hud-label">Earth</span>
        <div className="absolute inset-x-16 top-1/2 border-t border-dashed border-dim/30" />
        {busy && (
          <div className="absolute inset-x-16 top-1/2 h-3 -translate-y-1/2">
            <div key={phase} className="h-3 w-full" style={{ animation: `${phase === 'up' ? 'sig-r' : 'sig-l'} 1.3s linear forwards` }}>
              <span className={cn('block h-3 w-3 rounded-full', phase === 'up' ? 'bg-aqua' : 'bg-ok')} />
            </div>
          </div>
        )}
        <style>{`@keyframes sig-r{from{transform:translateX(0)}to{transform:translateX(calc(100% - 12px))}}@keyframes sig-l{from{transform:translateX(calc(100% - 12px))}to{transform:translateX(0)}}`}</style>
      </div>
      <p className="mt-3 min-h-6 font-semibold" aria-live="polite" data-testid="status-comms">
        {phase === 'idle' && (enabled ? 'Ready to transmit.' : 'Turn on Communications to send a message.')}
        {phase === 'up' && 'Transmitting... signal crossing about 384,400 km (about 1.3 s one way).'}
        {phase === 'down' && 'Message arrived on Earth. Reply on the way back...'}
        {phase === 'received' && <span className="text-ok">Earth Reply Received. Round trip about 2.6 seconds.</span>}
      </p>
      <button className={cn(btn.primary, 'mt-3 w-full')} disabled={!enabled || busy} onClick={send} data-testid="button-send-earth">
        <Send className="h-4 w-4" /> Send to Earth
      </button>
      <p className="mt-3 text-sm text-dim">
        This is an illustrative demo, not a real NASA connection. Radio travels at the speed of light; real delays vary with distance and equipment. Sending does not change resources. Keeping Communications on costs 4 Power and earns 5 Science when the next cycle runs, so research competes with air, water and food for power.
      </p>
      <div className="mt-4 rounded-xl border border-dim/15 p-3">
        <p className="hud-label">Think about it (optional)</p>
        <p className="mt-1 font-semibold">{COMMS_REFLECTION.question}</p>
        <div className="mt-2 grid gap-2">
          {COMMS_REFLECTION.choices.map((c, i) => (
            <button key={i} onClick={() => setPick(i)} className={cn('rounded-lg border px-3 py-2 text-left text-sm transition', pick === i ? 'border-aqua bg-aqua/10' : 'border-dim/20 hover:border-dim/50')} data-testid={`button-reflect-${i}`}>
              {c.label}
            </button>
          ))}
        </div>
        {pick !== null && <p className="mt-2 text-sm text-ink" aria-live="polite">{COMMS_REFLECTION.choices[pick].feedback}</p>}
      </div>
    </Panel>
  );
}
