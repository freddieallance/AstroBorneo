import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { useGame } from '@/state/game';
import { ErrorNote } from '@/components/kit';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/base', label: 'Moon Base' },
  { href: '/demo', label: 'How to Play' },
  { href: '/control', label: 'Mission Control' },
  { href: '/academy', label: 'Academy' },
  { href: '/history', label: 'History' },
  { href: '/about', label: 'NASA Sources' },
];

export function Wordmark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className={big ? 'h-12 w-12' : 'h-7 w-7'} aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="#ffcf79" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="16" cy="16" r="8" fill="#2b3574" stroke="#dce4ff" strokeWidth="1.2" />
        <path d="M16 8 a8 8 0 0 1 0 16 a5.5 8 0 0 0 0 -16" fill="#fffefa" />
        <circle cx="29" cy="16" r="2.2" fill="#ffe49e" />
      </svg>
      <span className={cn('font-display font-extrabold tracking-tight text-white', big ? 'text-5xl md:text-7xl' : 'text-lg')}>
        Astro<span className="text-[#ffe49e]">Borneo</span>
      </span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const { game, saveError, retrySave } = useGame();
  return (
    <div className="relative min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-white/15 bg-[#1b2252]/95">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="shrink-0" data-testid="link-home" aria-label="AstroBorneo home">
            <Wordmark />
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`link-nav-${n.href.slice(1)}`}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-bold transition',
                  loc === n.href
                    ? 'bg-[#ffe7a1] text-[#364272] shadow-sm'
                    : 'text-[#dce4ff] hover:bg-white/15 hover:text-white',
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {game && (
              <span className="hud-label hidden !text-[#ffe49e] sm:inline" data-testid="text-header-cycle">
                {game.status === 'active' ? `Cycle ${game.cycle} of 5` : game.status === 'success' ? 'Mission complete' : 'Mission ended'}
              </span>
            )}
            <button className="rounded-xl p-2 text-white hover:bg-white/15 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} data-testid="button-menu">
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-white/15 px-4 pb-3 md:hidden" aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-bold text-white hover:bg-white/15" data-testid={`link-mnav-${n.href.slice(1)}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      {saveError && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <ErrorNote text={saveError} onRetry={retrySave} />
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs font-medium text-[#cbd5f5]">
        Educational Simulation. Illustrative Resource Units. Not an Operational NASA Model. Not endorsed by NASA.
      </footer>
    </div>
  );
}
