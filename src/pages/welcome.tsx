import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, Check, Compass, Gamepad2, HeartHandshake, Rocket, Sparkles, Trophy, Volume2 } from 'lucide-react';
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
import { playMusicalBeep, playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

export default function Welcome() {
  const [, go] = useLocation();
  const [selectedId, setSelectedId] = useState<AstronautId>(() => loadSelectedAstronautId());
  const [leaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  const chosen = getAstronaut(selectedId);
  const npcPartner = pickNpcPartner(selectedId);

  const selectAstronaut = (id: AstronautId) => {
    playMusicalBeep(true);
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
    <div
      className="relative h-[100dvh] w-full overflow-y-auto text-white"
      style={{
        background:
          'radial-gradient(circle at 12% 8%, rgba(86,92,148,0.88), transparent 40%), radial-gradient(circle at 88% 18%, rgba(180,160,239,0.25), transparent 36%), linear-gradient(150deg, #252d66 0%, #151b42 100%)',
      }}
    >
      {/* Subtle twinkling star dots */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-60" aria-hidden>
        {[
          'left-[6%] top-[12%]',
          'left-[22%] top-[7%]',
          'left-[44%] top-[14%]',
          'left-[71%] top-[9%]',
          'left-[91%] top-[16%]',
          'left-[14%] top-[78%]',
          'left-[84%] top-[82%]',
        ].map((pos, i) => (
          <span
            key={i}
            className={cn(
              'absolute h-2 w-2 rounded-full bg-[#ffe9a6]',
              i % 2 === 0 ? 'opacity-70' : 'h-1.5 w-1.5 bg-[#a8e3fa] opacity-60',
              pos,
            )}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col justify-between px-4 py-3 sm:px-8 sm:py-4">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/14 px-3.5 py-1.5 shadow-sm ring-1 ring-white/20">
            <span className="text-xl" aria-hidden>
              🌙
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Astro<span className="text-[#ffe49e]">Borneo</span>
            </span>
            <span className="hidden rounded-full bg-[#ffcf79] px-2.5 py-0.5 text-[11px] font-extrabold text-[#364272] sm:inline-block">
              Moon Academy
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isSpeechSupported() && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  speakText(
                    `Yay, welcome to AstroBorneo! Pick your astronaut buddy, check the Story Guide, and tap Play!`,
                    true,
                  );
                }}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-extrabold text-white ring-1 ring-white/25 transition hover:bg-white/25"
                aria-label="Listen to game instructions"
                data-testid="button-welcome-listen"
              >
                <Volume2 className="h-4 w-4 text-[#ffe49e]" />
                <span>Listen</span>
              </button>
            )}
            <Link
              href="/about"
              className="whitespace-nowrap rounded-full bg-white/12 px-3 py-2 text-xs font-extrabold text-[#dce4ff] ring-1 ring-white/20 transition hover:bg-white/22 hover:text-white sm:px-3.5"
              data-testid="link-about-top"
            >
              <span className="sm:hidden">NASA Data</span>
              <span className="hidden sm:inline">Grown-ups &amp; NASA Data</span>
            </Link>
          </div>
        </header>

        {/* Main Hero: 4-Astronaut Picker + How-to-Play Story Guide & Highscore */}
        <main className="my-auto grid items-start gap-4 py-2.5 lg:grid-cols-[1.22fr_0.78fr]">
          <div className="rounded-[28px] border-4 border-white bg-[#fffefa] p-4 text-[#344270] shadow-[0_22px_50px_-14px_rgba(10,14,42,0.58)] sm:p-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-extrabold text-[#7d5a12]">
              <Sparkles className="h-3.5 w-3.5 text-[#e7a959]" />
              <span>Real NASA Space Science · Ages 7–12</span>
            </div>

            <h1
              className="mt-2.5 font-display text-3xl font-extrabold leading-[1.08] text-[#222a5b] sm:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              Pick Your Astronaut &amp;{' '}
              <span className="inline-block rounded-xl bg-[#ffe7a1] px-2.5 py-0.5 text-[#364272]">
                Survive
              </span>{' '}
              on the Moon!
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-[#607094]">
              Walk around your lunar base, choose smart fixes, and beat playful mini-games with your crewmate.
            </p>

            {/* 4 Selectable Astronaut Cards */}
            <div
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
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
                      'flex min-h-[72px] items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left transition active:translate-y-0.5',
                      isSelected
                        ? 'border-[#ffbf66] bg-[#fff5e0] shadow-[0_5px_0_#f0cf95]'
                        : 'border-[#dfe5f6] bg-[#f6f8ff] hover:border-[#b4a0ef] hover:bg-[#eef2ff]',
                    )}
                  >
                    <AstronautAvatar profile={astro} size={48} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-display text-base font-extrabold text-[#222a5b]">
                          {astro.name}
                        </span>
                        {isSelected && (
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ffbf66] text-[#364272]">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p
                        className="font-mono text-[11px] font-extrabold"
                        style={{ color: isSelected ? '#b4690e' : '#516296' }}
                      >
                        {astro.perkTitle}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#647397]">
                        {astro.perkHint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Crew Pairing + Play Button */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={launchGame}
                data-testid="button-start"
                data-start="true"
                className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-7 py-3 font-display text-xl font-extrabold text-[#364272] shadow-[0_5px_0_#e7a959] transition hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#e7a959] sm:text-2xl"
              >
                <Rocket className="h-6 w-6" />
                PLAY AS {chosen.shortName.toUpperCase()}!
              </button>

              <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#e4e9f8] bg-[#f3f5ff] px-3.5 py-2">
                <AstronautAvatar profile={npcPartner} size={34} />
                <div className="text-xs">
                  <span className="block font-mono text-[10px] font-extrabold uppercase text-[#7080a0]">
                    Crew Partner
                  </span>
                  <span className="font-display font-extrabold text-[#222a5b]">
                    {npcPartner.shortName} helps you!
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: How-to-Play Story Guide + Highscore Leaderboard */}
          <div className="space-y-3">
            <div
              className="rounded-[26px] border-4 border-white bg-[#fffefa] p-4 text-[#344270] shadow-[0_18px_42px_-14px_rgba(10,14,42,0.55)]"
              data-testid="home-how-to-play-card"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f1ecff] text-[#4e3896]">
                    <BookOpen className="h-4.5 w-4.5" />
                  </span>
                  <h2 className="font-display text-lg font-extrabold text-[#222a5b]">
                    How to Play
                  </h2>
                </div>
                <span className="rounded-full bg-[#fff3d6] px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-[#9b6110]">
                  Quick Guide
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-[#e3e8f8] bg-[#f4f6ff] p-2 text-center">
                  <Compass className="mx-auto h-4 w-4 text-[#2374b8]" />
                  <p className="mt-1 font-display text-xs font-extrabold text-[#222a5b]">1. Walk</p>
                  <p className="text-[10px] font-semibold text-[#5b6b94]">Move to any base dome</p>
                </div>
                <div className="rounded-2xl border border-[#e3e8f8] bg-[#f4f6ff] p-2 text-center">
                  <Gamepad2 className="mx-auto h-4 w-4 text-[#d98a1c]" />
                  <p className="mt-1 font-display text-xs font-extrabold text-[#222a5b]">2. Solve</p>
                  <p className="text-[10px] font-semibold text-[#5b6b94]">Pick plan &amp; mini-game</p>
                </div>
                <div className="rounded-2xl border border-[#e3e8f8] bg-[#f4f6ff] p-2 text-center">
                  <HeartHandshake className="mx-auto h-4 w-4 text-[#1b7c54]" />
                  <p className="mt-1 font-display text-xs font-extrabold text-[#222a5b]">3. Survive</p>
                  <p className="text-[10px] font-semibold text-[#5b6b94]">Keep 5 bars above 0%</p>
                </div>
              </div>

              <Link
                href="/demo"
                onClick={() => playSfx('tap')}
                data-testid="button-try-demo"
                className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#b4a0ef] bg-[#f1ecff] px-4 py-2 font-display text-sm font-extrabold text-[#3c2b7a] shadow-[0_3px_0_#d8ccf7] transition hover:bg-[#e7deff] active:translate-y-0.5"
              >
                <BookOpen className="h-4 w-4" />
                Open Story Demo (How-to-Play Guide)
              </Link>
            </div>

            <div
              className="rounded-[26px] border-4 border-white bg-[#fffefa] p-4 text-[#344270] shadow-[0_18px_42px_-14px_rgba(10,14,42,0.55)]"
              data-testid="welcome-leaderboard-card"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fff3d6] text-[#d98a1c]">
                    <Trophy className="h-4.5 w-4.5" />
                  </span>
                  <h2 className="font-display text-base font-extrabold text-[#222a5b]">
                    Top Moon Survivors
                  </h2>
                </div>
                <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-[#4e619e]">
                  Longest Time
                </span>
              </div>

              <div className="mt-2.5 space-y-1.5">
                {leaderboard.slice(0, 4).map((entry, idx) => {
                  const astro = getAstronaut(entry.astronautId);
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl border-2 px-3 py-1.5',
                        idx === 0
                          ? 'border-[#ffcf79] bg-[#fff5dc]'
                          : 'border-[#e6ebf9] bg-[#f5f7ff]',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-extrabold',
                          idx === 0
                            ? 'bg-[#ffc56f] text-[#364272]'
                            : idx === 1
                              ? 'bg-[#76dbae] text-[#1d4c3b]'
                              : idx === 2
                                ? 'bg-[#b4a0ef] text-white'
                                : 'bg-[#e3e8f8] text-[#5e6d94]',
                        )}
                      >
                        #{idx + 1}
                      </span>
                      <AstronautAvatar profile={astro} size={28} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-xs font-extrabold text-[#222a5b]">
                          {entry.playerName}
                        </p>
                        <p className="truncate text-[10px] font-semibold text-[#6b7a9e]">
                          {astro.shortName} · Sol {entry.solsSurvived}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-[#364272] tabular-nums">
                        {formatSurvivalTime(entry.survivalSeconds)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Safe Control Hint + Teacher Link */}
        <footer className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#dce4ff]">
          <span className="rounded-full bg-white/10 px-3 py-1 font-mono font-semibold text-[#e6ecff]">
            WASD / Arrows Move · Click Ground or Station · E / Space Open Mini-Game · Esc Pause
          </span>
          <div className="flex items-center gap-4">
            <Link href="/teacher" className="font-bold text-[#dce4ff] hover:text-white hover:underline">
              Teacher Guide
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
