import { useState, type FormEvent } from 'react';
import { AlertTriangle, Award, Clock, Heart, RotateCcw, Trophy, Users } from 'lucide-react';
import { getAstronaut, type AstronautProfile } from '@/game/astronauts';
import {
  formatSurvivalTime,
  loadLeaderboard,
  saveLeaderboardEntry,
  type LeaderboardEntry,
} from '@/game/leaderboard';
import { RESOURCE_KEYS, RESOURCE_LABELS, type FailureReport } from '@/game/survival-engine';
import { AstronautAvatar } from './astronaut-avatar';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

export function GameOverLeaderboard({
  playerProfile,
  report,
  onPlayAgain,
  onChangeAstronaut,
}: {
  playerProfile: AstronautProfile;
  report: FailureReport;
  onPlayAgain: () => void;
  onChangeAstronaut: () => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [nameInput, setNameInput] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = saveLeaderboardEntry({
        playerName: nameInput,
        astronautId: playerProfile.id,
        survivalSeconds: report.survivalSeconds,
        solsSurvived: report.solsSurvived,
        miniGamesWon: report.miniGamesWon,
        firstFailedStation: report.firstFailedLabel,
        causeSummary: report.causeDetail,
      });
      playSfx('win');
      setEntries(res.entries);
      setSubmittedId(res.added.id);
      setSubmittedRank(res.rank);
      setFormError(null);
    } catch (err) {
      playSfx('oops');
      setFormError(err instanceof Error ? err.message : 'Please type your name!');
    }
  };

  const titleText =
    report.evacReason === 'crew_unsafe'
      ? 'Base Became Unsafe — Returned to Earth!'
      : 'All Stations Failed — Returned to Earth!';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
      style={{
        background:
          'radial-gradient(circle at 12% 8%, rgba(86,92,148,0.92), transparent 40%), linear-gradient(150deg, #252d66 0%, #151b42 100%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mission Ended - Returned to Earth"
      data-testid="gameover-screen"
    >
      <div className="mx-auto max-w-4xl space-y-5 py-2 text-[#344270]">
        {/* Top Hero Banner */}
        <div className="rounded-[28px] border-4 border-white bg-[#fffefa] p-5 shadow-[0_22px_50px_-14px_rgba(10,14,42,0.58)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <AstronautAvatar profile={playerProfile} size={64} className="shrink-0" />
              <div>
                <p className="inline-block rounded-full bg-[#fff3d6] px-2.5 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-wider text-[#9b6110]">
                  Emergency Evacuation Complete
                </p>
                <h1 className="mt-1 font-display text-2xl font-extrabold text-[#222a5b] sm:text-3xl">
                  {titleText}
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#5b6c94]">
                  {report.evacReason === 'crew_unsafe'
                    ? `${playerProfile.name} & crew flew home because life resources dropped too low.`
                    : `${playerProfile.name} survived until every Moon station went offline.`}
                </p>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-4 gap-2 text-center">
              <div className="min-w-[74px] rounded-2xl border-2 border-[#cce2ff] bg-[#edf6ff] px-2.5 py-2">
                <span className="block font-mono text-[10px] font-extrabold uppercase text-[#566894]">Time</span>
                <span
                  className="font-mono text-lg font-extrabold text-[#2c78b8] tabular-nums sm:text-xl"
                  data-testid="gameover-survival-time"
                >
                  {formatSurvivalTime(report.survivalSeconds)}
                </span>
              </div>
              <div className="min-w-[64px] rounded-2xl border-2 border-[#ffe0a6] bg-[#fff7e6] px-2.5 py-2">
                <span className="block font-mono text-[10px] font-extrabold uppercase text-[#8f6420]">Sols</span>
                <span className="font-mono text-lg font-extrabold text-[#b86d10] tabular-nums sm:text-xl">
                  {report.solsSurvived}
                </span>
              </div>
              <div className="min-w-[64px] rounded-2xl border-2 border-[#b8edd4] bg-[#e9faf2] px-2.5 py-2">
                <span className="block font-mono text-[10px] font-extrabold uppercase text-[#256f4f]">Fixed</span>
                <span className="font-mono text-lg font-extrabold text-[#1e7a54] tabular-nums sm:text-xl">
                  {report.miniGamesWon}
                </span>
              </div>
              <div className="min-w-[72px] rounded-2xl border-2 border-[#ffc7d0] bg-[#fff0f3] px-2.5 py-2">
                <span className="block font-mono text-[10px] font-extrabold uppercase text-[#9f3351]">Crew HP</span>
                <span className="font-mono text-lg font-extrabold text-[#c43a51] tabular-nums sm:text-xl">
                  {report.finalCrewHealth}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          {/* Left: Why We Failed & Final Resources Snapshot */}
          <div
            className="space-y-4 rounded-[28px] border-4 border-white bg-[#fffefa] p-5 shadow-[0_20px_44px_-12px_rgba(10,14,42,0.5)]"
            data-testid="gameover-failure-cause"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0f2] text-[#c43a51]">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h2 className="font-display text-xl font-extrabold text-[#222a5b]">
                Why We Returned to Earth
              </h2>
            </div>

            <div className="rounded-2xl border-2 border-[#ffc7d0] bg-[#fff2f4] p-4">
              <p className="font-display text-base font-extrabold text-[#c43a51]">
                {report.causeHeadline}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#45547a]">
                {report.causeDetail}
              </p>
            </div>

            <div>
              <p className="flex items-center gap-1.5 font-mono text-xs font-extrabold uppercase tracking-wider text-[#5b6c94]">
                <Heart className="h-3.5 w-3.5 text-[#c43a51]" /> Final Base Resources Left
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
                {RESOURCE_KEYS.map((k) => {
                  const val = report.finalResources[k];
                  return (
                    <div
                      key={k}
                      className={cn(
                        'rounded-xl border-2 px-1.5 py-2',
                        val < 30
                          ? 'border-[#ffc7d0] bg-[#fff0f2] text-[#c43a51]'
                          : 'border-[#e4e9f8] bg-[#f5f7ff] text-[#222a5b]',
                      )}
                    >
                      <span className="block font-display text-[10px] font-extrabold text-[#607094]">
                        {RESOURCE_LABELS[k]}
                      </span>
                      <span className="font-mono text-xs font-extrabold tabular-nums">
                        {val}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {report.failureOrder.length > 0 && (
              <div>
                <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#5b6c94]">
                  Station Failure Order
                </p>
                <div className="mt-2 space-y-1.5">
                  {report.failureOrder.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border-2 border-[#eaeeff] bg-[#f5f7ff] px-3 py-2 text-xs"
                    >
                      <span className="font-display font-extrabold text-[#222a5b]">
                        #{idx + 1} {item.label}
                      </span>
                      <span className="font-mono font-extrabold text-[#c43a51] tabular-nums">
                        at {formatSurvivalTime(item.failedAtSec)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Save Name + Competitive Highscore Leaderboard */}
          <div className="space-y-4 rounded-[28px] border-4 border-white bg-[#fffefa] p-5 shadow-[0_20px_44px_-12px_rgba(10,14,42,0.5)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff3d6] text-[#d98a1c]">
                  <Trophy className="h-5 w-5" />
                </span>
                <h2 className="font-display text-xl font-extrabold text-[#222a5b]">
                  Moon Survival Highscores
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2.5 py-1 font-mono text-[11px] font-extrabold text-[#4e619e]">
                <Clock className="h-3.5 w-3.5" /> Longest Wins
              </span>
            </div>

            {!submittedId ? (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border-2 border-[#b8edd4] bg-[#ebfaf3] p-4"
                data-testid="leaderboard-form"
              >
                <label htmlFor="astro-player-name" className="block font-display text-sm font-extrabold text-[#1e6d4a]">
                  Put your name on the Highscore Board!
                </label>
                <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="astro-player-name"
                    type="text"
                    maxLength={18}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Type your name..."
                    data-testid="input-highscore-name"
                    className="min-h-[48px] flex-1 rounded-xl border-2 border-[#cce4d8] bg-white px-3.5 font-display text-base font-bold text-[#222a5b] placeholder:text-[#8997b8] focus:border-[#49be8f] focus:outline-none"
                  />
                  <button
                    type="submit"
                    data-testid="button-save-highscore"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-5 font-display text-base font-extrabold text-[#364272] shadow-[0_4px_0_#e7a959] hover:brightness-105 active:translate-y-0.5"
                  >
                    <Award className="h-5 w-5" />
                    Save Score!
                  </button>
                </div>
                {formError && (
                  <p className="mt-2 text-xs font-extrabold text-[#c43a51]" role="alert">
                    {formError}
                  </p>
                )}
              </form>
            ) : (
              <div
                className="flex items-center gap-3 rounded-2xl border-2 border-[#49be8f] bg-[#e5f9ef] px-4 py-3"
                data-testid="leaderboard-saved-banner"
              >
                <Trophy className="h-6 w-6 shrink-0 text-[#d98a1c]" />
                <p className="font-display text-base font-extrabold text-[#1e7a54]">
                  Saved! You ranked #{submittedRank} on the Moon Survival Board!
                </p>
              </div>
            )}

            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1" data-testid="leaderboard-list">
              {entries.slice(0, 8).map((entry, idx) => {
                const astro = getAstronaut(entry.astronautId);
                const isNew = entry.id === submittedId;
                return (
                  <div
                    key={entry.id}
                    data-testid={`leaderboard-row-${idx}`}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5',
                      isNew
                        ? 'border-[#49be8f] bg-[#e5f9ef]'
                        : idx === 0
                          ? 'border-[#ffcf79] bg-[#fff5dc]'
                          : 'border-[#e6ebfa] bg-[#f5f7ff]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-xl font-mono text-sm font-extrabold',
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
                    <AstronautAvatar profile={astro} size={36} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-extrabold text-[#222a5b]">
                        {entry.playerName}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-[#607094]">
                        {astro.shortName} · Cause: {entry.firstFailedStation}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono text-base font-extrabold text-[#364272] tabular-nums">
                        {formatSurvivalTime(entry.survivalSeconds)}
                      </span>
                      <span className="block font-mono text-[10px] font-bold text-[#607094] tabular-nums">
                        Sol {entry.solsSurvived}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Play Again / Change Astronaut Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              playSfx('launch');
              onPlayAgain();
            }}
            data-start="true"
            data-testid="button-gameover-play-again"
            className="inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-9 font-display text-xl font-extrabold text-[#364272] shadow-[0_5px_0_#e7a959] hover:brightness-105 active:translate-y-0.5"
          >
            <RotateCcw className="h-6 w-6" />
            Play Again!
          </button>
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              onChangeAstronaut();
            }}
            data-testid="button-gameover-switch-astronaut"
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-white bg-white/95 px-6 font-display text-base font-extrabold text-[#344270] shadow-lg hover:bg-white"
          >
            <Users className="h-5 w-5 text-[#4e619e]" />
            Choose Astronaut
          </button>
        </div>
      </div>
    </div>
  );
}
