import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { DISCLOSURES, RESOURCE_META, type ResourceKey } from '@/content/mission';
import { cn } from '@/lib/utils';

export const tone = (v: number) => (v >= 50 ? '#35d2a0' : v >= 25 ? '#ffc76b' : '#ff727e');
export const toneLabel = (v: number) => (v >= 50 ? 'Healthy' : v >= 25 ? 'Watch' : 'Critical');

export function Starfield({ count = 70 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => {
    const x = (i * 137.5) % 100;
    const y = (i * 61.8 * 1.7) % 100;
    return { x, y, s: (i % 3) + 1, d: (i % 7) * 0.6 };
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="twinkle absolute rounded-full bg-ink"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}
        />
      ))}
    </div>
  );
}

export function Disclosures({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} data-testid="text-disclosures">
      {DISCLOSURES.map((d) => (
        <span key={d} className="hud-label rounded-full border border-warn/30 bg-warn/5 px-3 py-1 !text-warn">
          {d}
        </span>
      ))}
    </div>
  );
}

export function Panel({ children, className, title, kicker, action }: { children: ReactNode; className?: string; title?: string; kicker?: string; action?: ReactNode }) {
  return (
    <section className={cn('glass rounded-2xl p-5', className)}>
      {(title || kicker) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {kicker && <p className="hud-label">{kicker}</p>}
            {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Ring({ k, value, forecast }: { k: ResourceKey; value: number; forecast?: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const col = tone(value);
  const delta = forecast !== undefined ? forecast - value : 0;
  return (
    <div className="reticle glass flex items-center gap-4 rounded-2xl p-4" data-testid={`gauge-${k}`}>
      <svg viewBox="0 0 110 110" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(171,184,213,0.15)" strokeWidth="9" />
        {forecast !== undefined && (
          <circle cx="55" cy="55" r={r} fill="none" stroke={tone(forecast)} strokeOpacity="0.35" strokeWidth="9" strokeDasharray={`${(Math.max(0, forecast) / 100) * c} ${c}`} />
        )}
        <circle cx="55" cy="55" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(Math.max(0, value) / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="min-w-0">
        <p className="hud-label">{RESOURCE_META[k].long}</p>
        <p className="font-display text-xl font-semibold text-ink">{RESOURCE_META[k].label}</p>
        <p className="font-display text-4xl font-bold leading-none" style={{ color: col }} data-testid={`value-${k}`}>
          {value}
          <span className="ml-1 text-sm font-normal text-dim">/100</span>
        </p>
        <p className="mt-1 text-sm text-dim">
          {toneLabel(value)}
          {forecast !== undefined && (
            <span className="ml-2 font-mono" style={{ color: delta > 0 ? '#35d2a0' : delta < 0 ? '#ff727e' : '#abb8d5' }} data-testid={`forecast-${k}`}>
              next {delta > 0 ? '+' : ''}{delta} → {forecast}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function Bar({ k, value, forecast }: { k: ResourceKey; value: number; forecast?: number }) {
  const delta = forecast !== undefined ? forecast - value : 0;
  return (
    <div data-testid={`bar-${k}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-semibold text-ink">{RESOURCE_META[k].label}</span>
        <span className="font-mono text-sm text-dim">
          <span style={{ color: tone(value) }}>{value}</span>
          {forecast !== undefined && (
            <span className="ml-2" style={{ color: delta > 0 ? '#35d2a0' : delta < 0 ? '#ff727e' : '#abb8d5' }}>
              {delta > 0 ? '+' : ''}{delta} → {forecast}
            </span>
          )}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-deep/70">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, value)}%`, background: tone(value) }} />
      </div>
      <p className="mt-1 text-xs text-dim">{RESOURCE_META[k].explain}</p>
    </div>
  );
}

export function Delta({ v }: { v: number }) {
  const c = v > 0 ? 'text-ok' : v < 0 ? 'text-bad' : 'text-dim';
  return <span className={cn('font-mono font-semibold', c)}>{v > 0 ? `+${v}` : v}</span>;
}

export function ErrorNote({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-ink" data-testid="status-error">
      <AlertTriangle className="h-4 w-4 text-bad" aria-hidden />
      <span className="flex-1">{text}</span>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-bad/40 px-3 py-1 font-semibold hover:bg-bad/20" data-testid="button-retry">
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function NoMission() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="hud-label">No active mission</p>
      <h1 className="mt-2 text-3xl font-bold">The outpost is waiting for a commander</h1>
      <p className="mt-3 text-dim">Start Operation Lunar Dawn from the mission briefing to unlock this screen.</p>
      <Link href="/briefing" className="mt-6 inline-flex rounded-xl bg-ion px-6 py-3 font-display font-semibold text-deep hover:brightness-110" data-testid="link-briefing">
        Go to Mission Briefing
      </Link>
    </div>
  );
}

export const btn = {
  primary: 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-b-4 border-[#1b5cd4] bg-ion px-6 py-3 font-display text-base font-bold text-deep shadow-[0_10px_28px_-10px_rgba(79,140,255,0.75)] transition hover:brightness-110 active:translate-y-0.5 active:border-b-0 disabled:cursor-not-allowed disabled:opacity-45',
  ghost: 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-dim/30 border-b-2 bg-plate/65 px-5 py-2.5 font-display font-semibold text-ink transition hover:border-aqua/60 hover:bg-plate active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45',
  danger: 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-bad/45 px-5 py-2.5 font-display font-semibold text-bad transition hover:bg-bad/15',
};
