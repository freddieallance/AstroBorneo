import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, Rocket, Trophy, Volume2 } from 'lucide-react';
import { Starfield } from '@/components/kit';
import { Wordmark } from '@/components/shell';
import { AstronautAvatar } from '@/components/astronaut-avatar';
import {
  ASTRONAUTS,
  getAstronaut,
  loadSelectedAstronautId,
  pickNpcPartner,
  saveSelectedAstronautId,
  type AstronautId,
} from '@/game/astronauts';
import { formatSurvivalTime, loadLeaderboard, type LeaderboardEntry } from '@/game/leaderboard';
import { isSpeechSupported, speakText } from '@/lib/speech';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

export default function Welcome() {
  const [, go] = useLocation();
  const [selectedId, setSelectedId] = useState<AstronautId>(() => loadSelectedAstronautId());
  const [leaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  const chosen = getAstronaut(selectedId);
  const npcPartner = pickNpcPartner(selectedId);

  const selectAstronaut = (id: AstronautId) => {
    playSfx('tap');
    setSelectedId(id);
    saveSelectedAstronautId(id);
  };

  const launchGame = useCallback(() => {
    saveSelectedAstronautId(selectedId);
    playSfx('launch');
    go('/base');
  }, [selectedId, go]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'title';
    }
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('autostart') === '1') {
        launchGame();
      }
    }
  }, [launchGame]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'Enter' || e.key === ' ') && e.target === document.body) {
        e.preventDefault();
        launchGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [launchGame]);

  return (
    <div className="relative h-[100dvh] w-full overflow-y-auto bg-deep text-ink">
      <img
        src={`${import.meta.env.BASE_URL}lunar-horizon.jpg`}
        alt=""
        className="fixed inset-0 h-full w-full object-cover opacity-65"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-deep/60 via-deep/45 to-deep/95" />
      <div className="fixed inset-0 bg-gradient-to-r from-deep/92 via-deep/65 to-deep/40" />
      <Starfield count={40} />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col justify-between px-4 py-5 sm:px-8 sm:py-7">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-4">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            {isSpeechSupported() && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  speakText(
                    `Welcome to AstroBorneo! Pick your astronaut, then tap Play! Walk to stations, solve mini-games, and see how long you survive on the Moon!`,
                    true,
                  );
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-aqua/45 bg-hull/85 px-4 py-2 text-sm font-bold text-aqua transition hover:bg-plate"
                aria-label="Listen to game instructions"
                data-testid="button-welcome-listen"
              >
                <Volume2 className="h-5 w-5" />
                <span>Listen</span>
              </button>
            )}
            <Link
              href="/about"
              className="text-sm font-semibold text-dim underline-offset-4 hover:text-ink hover:underline"
              data-testid="link-about-top"
            >
              Grown-ups
            </Link>
          </div>
        </header>

        {/* Main Hero: 4-Astronaut Picker + Highscore Preview */}
        <main className="my-auto grid items-center gap-6 py-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <h1
              className="font-display text-3xl font-extrabold leading-[1.08] text-ink sm:text-5xl"
              style={{ textWrap: 'balance' }}
            >
              Pick Your Astronaut &amp; <span className="text-warn">Survive</span> on the Moon!
            </h1>

            {/* 4 Selectable Astronaut Cards */}
            <div
              className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Choose your astronaut"
              data-testid="astronaut-picker"
            >
              {ASTRONAUTS.map((astro) => {
                const isSelected = astro.id === selectedId;
                return (
                  <button
                    key={astro.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => selectAstronaut(astro.id)}
                    data-testid={`select-astronaut-${astro.id}`}
                    className={cn(
                      'flex min-h-[82px] items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left transition active:translate-y-0.5',
                      isSelected
                        ? 'border-aqua bg-hull/95 shadow-[0_12px_30px_-10px_rgba(53,217,232,0.5)]'
                        : 'border-dim/25 bg-hull/75 hover:border-aqua/50 hover:bg-hull/90',
                    )}
                  >
                    <AstronautAvatar profile={astro} size={52} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-display text-base font-extrabold text-ink">
                          {astro.name}
                        </span>
                        {isSelected && (
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aqua text-deep">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] font-bold" style={{ color: astro.trimColor }}>
                        {astro.perkTitle}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-dim">
                        {astro.perkHint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Crew Pairing + Play Button */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={launchGame}
                data-testid="button-start"
                data-start="true"
                className="inline-flex min-h-[64px] items-center justify-center gap-3 rounded-2xl border-b-4 border-[#139c73] bg-ok px-10 py-4 font-display text-2xl font-extrabold text-deep shadow-[0_16px_40px_-10px_rgba(53,210,160,0.75)] transition hover:brightness-110 active:translate-y-0.5 active:border-b-0 sm:text-3xl"
              >
                <Rocket className="h-7 w-7" />
                PLAY AS {chosen.shortName.toUpperCase()}!
              </button>

              <div className="flex items-center gap-2.5 rounded-2xl border border-dim/25 bg-hull/80 px-3.5 py-2">
                <AstronautAvatar profile={npcPartner} size={34} />
                <div className="text-xs">
                  <span className="block font-mono text-[10px] font-bold uppercase text-dim">
                    NPC Partner
                  </span>
                  <span className="font-display font-bold text-ink">
                    {npcPartner.shortName} helps you!
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Highscore Leaderboard Card */}
          <div className="rounded-3xl border border-aqua/35 bg-hull/90 p-5 shadow-2xl" data-testid="welcome-leaderboard-card">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warn" />
                <h2 className="font-display text-lg font-extrabold text-ink">
                  Top Moon Survivors
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-aqua">Longest Time</span>
            </div>

            <div className="mt-3.5 space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const astro = getAstronaut(entry.astronautId);
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3 py-2',
                      idx === 0 ? 'border-warn/50 bg-warn/10' : 'border-dim/20 bg-deep/75',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-extrabold',
                        idx === 0 ? 'bg-warn text-deep' : 'bg-plate text-dim',
                      )}
                    >
                      #{idx + 1}
                    </span>
                    <AstronautAvatar profile={astro} size={32} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-extrabold text-ink">
                        {entry.playerName}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-dim">
                        {astro.shortName} · Sol {entry.solsSurvived}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-aqua tabular-nums">
                      {formatSurvivalTime(entry.survivalSeconds)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Bottom Safe Control Hint + Teacher Link */}
        <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-dim">
          <span className="font-mono font-semibold text-dim">
            WASD / Arrows Move · Click Ground or Station · E / Space Open Mini-Game · Esc Pause
          </span>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="font-semibold text-aqua hover:underline" data-testid="button-try-demo">
              Story Demo
            </Link>
            <Link href="/teacher" className="font-semibold text-dim hover:text-ink hover:underline">
              Teacher Guide
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
