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
      className="fixed inset-0 z-50 overflow-y-auto bg-deep/95 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Mission Ended - Returned to Earth"
      data-testid="gameover-screen"
    >
      <div className="mx-auto max-w-4xl space-y-5 py-2">
        {/* Top Hero Banner */}
        <div className="rounded-3xl border-2 border-warn/55 bg-hull p-5 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <AstronautAvatar profile={playerProfile} size={64} className="shrink-0" />
              <div>
                <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-warn">
                  Emergency Evacuation Complete
                </p>
                <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                  {titleText}
                </h1>
                <p className="mt-1 text-sm font-semibold text-dim">
                  {report.evacReason === 'crew_unsafe'
                    ? `${playerProfile.name} & crew flew home because life resources dropped too low.`
                    : `${playerProfile.name} survived until every Moon station went offline.`}
                </p>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-4 gap-2 text-center">
              <div className="min-w-[74px] rounded-2xl border border-aqua/35 bg-deep/85 px-2.5 py-2">
                <span className="block font-mono text-[10px] font-bold uppercase text-dim">Time</span>
                <span
                  className="font-mono text-lg font-extrabold text-aqua tabular-nums sm:text-xl"
                  data-testid="gameover-survival-time"
                >
                  {formatSurvivalTime(report.survivalSeconds)}
                </span>
              </div>
              <div className="min-w-[64px] rounded-2xl border border-warn/35 bg-deep/85 px-2.5 py-2">
                <span className="block font-mono text-[10px] font-bold uppercase text-dim">Sols</span>
                <span className="font-mono text-lg font-extrabold text-warn tabular-nums sm:text-xl">
                  {report.solsSurvived}
                </span>
              </div>
              <div className="min-w-[64px] rounded-2xl border border-ok/35 bg-deep/85 px-2.5 py-2">
                <span className="block font-mono text-[10px] font-bold uppercase text-dim">Fixed</span>
                <span className="font-mono text-lg font-extrabold text-ok tabular-nums sm:text-xl">
                  {report.miniGamesWon}
                </span>
              </div>
              <div className="min-w-[72px] rounded-2xl border border-bad/35 bg-deep/85 px-2.5 py-2">
                <span className="block font-mono text-[10px] font-bold uppercase text-dim">Crew HP</span>
                <span className="font-mono text-lg font-extrabold text-bad tabular-nums sm:text-xl">
                  {report.finalCrewHealth}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          {/* Left: Why We Failed & Final Resources Snapshot */}
          <div className="space-y-4 rounded-3xl border border-bad/45 bg-hull p-5 shadow-xl" data-testid="gameover-failure-cause">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-6 w-6 text-bad" />
              <h2 className="font-display text-xl font-extrabold text-ink">
                Why We Had to Return to Earth
              </h2>
            </div>

            <div className="rounded-2xl border border-bad/35 bg-bad/10 p-4">
              <p className="font-display text-base font-extrabold text-bad">
                {report.causeHeadline}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {report.causeDetail}
              </p>
            </div>

            {/* Final Base Resources Snapshot */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-dim">
                <Heart className="h-3.5 w-3.5 text-bad" /> Final Base Resources Left
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
                {RESOURCE_KEYS.map((k) => {
                  const val = report.finalResources[k];
                  return (
                    <div
                      key={k}
                      className={cn(
                        'rounded-xl border px-1.5 py-2',
                        val < 30 ? 'border-bad bg-bad/15 text-bad' : 'border-dim/20 bg-deep/75 text-ink',
                      )}
                    >
                      <span className="block font-display text-[10px] font-bold text-dim">
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
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-dim">
                  Station Failure Order
                </p>
                <div className="mt-2 space-y-1.5">
                  {report.failureOrder.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-dim/20 bg-deep/75 px-3 py-2 text-xs"
                    >
                      <span className="font-display font-bold text-ink">
                        #{idx + 1} {item.label}
                      </span>
                      <span className="font-mono font-bold text-bad tabular-nums">
                        at {formatSurvivalTime(item.failedAtSec)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Save Name + Competitive Highscore Leaderboard */}
          <div className="space-y-4 rounded-3xl border border-aqua/40 bg-hull p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-6 w-6 text-warn" />
                <h2 className="font-display text-xl font-extrabold text-ink">
                  Moon Survival Highscores
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-aqua">
                <Clock className="h-3.5 w-3.5" /> Longest Wins
              </span>
            </div>

            {!submittedId ? (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-ok/45 bg-deep/85 p-4" data-testid="leaderboard-form">
                <label htmlFor="astro-player-name" className="block font-display text-sm font-extrabold text-ink">
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
                    className="min-h-[48px] flex-1 rounded-xl border-2 border-dim/30 bg-hull px-3.5 font-display text-base font-bold text-ink placeholder:text-dim/60 focus:border-aqua focus:outline-none"
                  />
                  <button
                    type="submit"
                    data-testid="button-save-highscore"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-b-4 border-[#139c73] bg-ok px-5 font-display text-base font-extrabold text-deep hover:brightness-110 active:translate-y-0.5"
                  >
                    <Award className="h-5 w-5" />
                    Save Score!
                  </button>
                </div>
                {formError && (
                  <p className="mt-2 text-xs font-bold text-bad" role="alert">
                    {formError}
                  </p>
                )}
              </form>
            ) : (
              <div
                className="flex items-center gap-3 rounded-2xl border-2 border-ok bg-ok/15 px-4 py-3"
                data-testid="leaderboard-saved-banner"
              >
                <Trophy className="h-6 w-6 shrink-0 text-warn" />
                <p className="font-display text-base font-extrabold text-ok">
                  Saved! You ranked #{submittedRank} on the Moon Survival Board!
                </p>
              </div>
            )}

            {/* Ranked List */}
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1" data-testid="leaderboard-list">
              {entries.slice(0, 8).map((entry, idx) => {
                const astro = getAstronaut(entry.astronautId);
                const isNew = entry.id === submittedId;
                return (
                  <div
                    key={entry.id}
                    data-testid={`leaderboard-row-${idx}`}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3.5 py-2.5',
                      isNew
                        ? 'border-ok bg-ok/15'
                        : idx === 0
                          ? 'border-warn/50 bg-warn/10'
                          : 'border-dim/20 bg-deep/75',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-xl font-mono text-sm font-extrabold',
                        idx === 0
                          ? 'bg-warn text-deep'
                          : idx === 1
                            ? 'bg-aqua text-deep'
                            : idx === 2
                              ? 'bg-ion text-deep'
                              : 'bg-plate text-dim',
                      )}
                    >
                      #{idx + 1}
                    </span>
                    <AstronautAvatar profile={astro} size={36} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-extrabold text-ink">
                        {entry.playerName}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-dim">
                        {astro.shortName} · Cause: {entry.firstFailedStation}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono text-base font-extrabold text-aqua tabular-nums">
                        {formatSurvivalTime(entry.survivalSeconds)}
                      </span>
                      <span className="block font-mono text-[10px] font-bold text-dim tabular-nums">
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
            className="inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl border-b-4 border-[#139c73] bg-ok px-9 font-display text-xl font-extrabold text-deep shadow-xl hover:brightness-110 active:translate-y-0.5"
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
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-dim/30 bg-plate px-6 font-display text-base font-extrabold text-ink hover:border-aqua"
          >
            <Users className="h-5 w-5 text-aqua" />
            Choose Astronaut
          </button>
        </div>
      </div>
    </div>
  );
}
