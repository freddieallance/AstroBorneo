import { Activity, ExternalLink, Radio, Satellite, Sparkles, Sprout, X } from 'lucide-react';
import {
  STATION_NASA_FACTS,
  type SpaceWeatherViewSummary,
} from '@/content/nasa-grounding';
import { STATION_ORDER } from '@/game/survival-engine';
import { ARCHIVED_RESEARCH_FALLBACK, type NasaResearchPayload } from '@/services/research-client';
import type { SpaceWeather } from '@/services/space-weather-types';
import {
  saveSpaceWeatherContext,
  type SavedSpaceWeatherContext,
} from '@/services/space-weather-client';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils';

export function BaseNasaModal({
  summary,
  weatherData,
  researchData,
  savedContext,
  isFetching,
  onUpdateContext,
  onClose,
}: {
  summary: SpaceWeatherViewSummary;
  weatherData: SpaceWeather | undefined;
  researchData?: NasaResearchPayload;
  savedContext: SavedSpaceWeatherContext;
  isFetching: boolean;
  onUpdateContext: (next: SavedSpaceWeatherContext) => void;
  onClose: () => void;
}) {
  const records = weatherData?.records ?? (summary.record ? [summary.record] : []);
  const research = researchData ?? ARCHIVED_RESEARCH_FALLBACK;

  const switchEventType = (eventType: 'FLR' | 'SEP' | 'CME') => {
    playSfx('tap');
    const next: SavedSpaceWeatherContext = {
      ...savedContext,
      eventType,
    };
    saveSpaceWeatherContext(next);
    onUpdateContext(next);
  };

  const switchMode = (requestMode: 'auto' | 'archived' | 'simulated') => {
    playSfx('tap');
    const next: SavedSpaceWeatherContext = {
      ...savedContext,
      requestMode,
      lastMode:
        requestMode === 'simulated'
          ? 'SIMULATED_SCENARIO'
          : requestMode === 'archived'
            ? 'ARCHIVED_DATA'
            : savedContext.lastMode,
      lastStatus:
        requestMode === 'simulated'
          ? 'OFFLINE'
          : requestMode === 'archived'
            ? 'ARCHIVE'
            : 'PENDING',
    };
    saveSpaceWeatherContext(next);
    onUpdateContext(next);
  };

  const badgeTone = summary.isLive
    ? 'border-[#49be8f] bg-[#e5f9ef] text-[#1e7a54]'
    : summary.isArchived
      ? 'border-[#ffcf79] bg-[#fff5dc] text-[#9b6110]'
      : 'border-[#d4ddf5] bg-[#eef2ff] text-[#506090]';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#14193f]/75 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Real NASA Data and Sources"
      data-testid="base-nasa-modal"
    >
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-[6px] border-white bg-[#fffefa] text-[#344270] shadow-[0_24px_60px_-14px_rgba(12,16,48,0.65)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-[#eaeeff] bg-[#f3f5ff] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-white bg-white text-[#2c78b8] shadow-xs">
              <Satellite className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-[#222a5b] sm:text-xl">
                Real NASA Science &amp; Space Weather
              </h2>
              <p className="font-mono text-[11px] font-bold text-[#607094]">
                Live APIs + Verified Archives · Game Rules Stay Separate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-[#e0e6fa] bg-white text-[#5d6c96] hover:border-[#ff7b8a] hover:text-[#e04f64]"
            aria-label="Close NASA data panel"
            data-testid="button-close-nasa-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* 1. NASA CCMC DONKI Feed */}
          <section className="rounded-2xl border-2 border-[#cce2ff] bg-[#edf6ff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#2c78b8]" />
                <span className="font-display text-sm font-extrabold text-[#222a5b]">
                  1. NASA CCMC DONKI Space-Weather Feed
                </span>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-extrabold',
                  badgeTone,
                )}
                data-testid="nasa-modal-mode-badge"
              >
                {summary.modeBadge}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5" role="group" aria-label="Space weather event type">
                {(['FLR', 'SEP', 'CME'] as const).map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => switchEventType(ev)}
                    data-testid={`nasa-event-${ev}`}
                    className={cn(
                      'min-h-[36px] rounded-xl border-2 px-3 font-mono text-xs font-extrabold transition',
                      savedContext.eventType === ev
                        ? 'border-[#4fb3f6] bg-white text-[#222a5b] shadow-xs'
                        : 'border-[#d4e3f8] bg-[#e2eefe] text-[#566894] hover:bg-white',
                    )}
                  >
                    {ev}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5" role="group" aria-label="NASA data mode">
                {(
                  [
                    { id: 'auto', label: 'Live API' },
                    { id: 'archived', label: 'May 2024 Archive' },
                    { id: 'simulated', label: 'Offline Sim' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => switchMode(m.id)}
                    data-testid={`nasa-mode-${m.id}`}
                    className={cn(
                      'min-h-[36px] rounded-xl border-2 px-2.5 font-mono text-[11px] font-extrabold transition',
                      savedContext.requestMode === m.id
                        ? 'border-[#49be8f] bg-[#e5f9ef] text-[#1e7a54]'
                        : 'border-[#d4e3f8] bg-white text-[#566894] hover:text-[#222a5b]',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-2.5 text-xs font-bold text-[#52638e]">
              {isFetching ? 'Checking NASA CCMC DONKI API…' : summary.statusText}
            </p>

            {summary.record ? (
              <div
                className="mt-2.5 rounded-xl border-2 border-white bg-white/90 p-3 text-xs shadow-xs"
                data-testid="nasa-modal-record"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-extrabold text-[#2c78b8]">
                    {summary.record.id}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#607094]">
                    UTC: {summary.record.originalTime}
                    {records.length > 1 ? ` (+${records.length - 1} more in range)` : ''}
                  </span>
                </div>
                <p className="mt-1.5 font-semibold leading-relaxed text-[#344270]">
                  {summary.record.summary}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono text-[#607094]">
                    Source: {summary.record.sourceName} ({summary.record.provider})
                  </span>
                  <a
                    href={summary.record.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-extrabold text-[#2c78b8] underline underline-offset-2"
                  >
                    View NASA Record <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-2 rounded-xl border border-[#d6e4f8] bg-white px-3 py-2 text-xs font-semibold text-[#607094]">
                No NASA observation displayed in Offline Simulation mode.
              </p>
            )}

            <p className="mt-2.5 text-[11px] font-bold text-[#9b6110]">
              Honest Grounding Note: {summary.disclaimer}
            </p>
          </section>

          {/* 2 & 3. NASA RadLab ISS Radiation & NASA OSDR-314 / CSA Food Toolkit */}
          <div className="grid gap-3 sm:grid-cols-2">
            <section
              className="rounded-2xl border-2 border-[#dcd2ff] bg-[#f4f0ff] p-3.5"
              data-testid="nasa-modal-radlab"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-[#6f58b8]" />
                  <h3 className="font-display text-xs font-extrabold uppercase tracking-wide text-[#4e3896]">
                    2. NASA RadLab (ISS)
                  </h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#543a9e]">
                  {research.radlab.mode === 'LIVE_DATA' ? 'LIVE API' : 'ARCHIVED'}
                </span>
              </div>
              <p className="mt-2 font-mono text-lg font-extrabold text-[#222a5b] tabular-nums">
                {research.radlab.selected.doseRate.toFixed(1)} µGy/h
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#51497a]">
                Instrument: {research.radlab.selected.instrument} · {research.radlab.selected.timestamp}
              </p>
              <a
                href={research.radlab.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-extrabold text-[#543a9e] hover:underline"
              >
                {research.radlab.sourceName} <ExternalLink className="h-3 w-3" />
              </a>
            </section>

            <section
              className="rounded-2xl border-2 border-[#bcecd3] bg-[#e9faf2] p-3.5"
              data-testid="nasa-modal-osdr"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sprout className="h-4 w-4 text-[#259b6c]" />
                  <h3 className="font-display text-xs font-extrabold uppercase tracking-wide text-[#1e7a54]">
                    3. NASA OSDR-314 &amp; CSA
                  </h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#1e7a54]">
                  {research.osdr.mode === 'LIVE_DATA' ? 'LIVE API' : 'STUDY REF'}
                </span>
              </div>
              <p className="mt-2 text-xs font-extrabold text-[#222a5b]">
                {research.osdr.id}: {research.osdr.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                <a
                  href={research.osdr.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono font-extrabold text-[#1e7a54] hover:underline"
                >
                  NASA OSDR-314 <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/food-production-in-space-toolkit.asp"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono font-extrabold text-[#1e7a54] hover:underline"
                >
                  CSA Food Toolkit <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </section>
          </div>

          {/* All 6 Stations Real NASA Science Grounding */}
          <section>
            <div className="mb-2.5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#d98a1c]" />
              <h3 className="font-display text-sm font-extrabold text-[#222a5b]">
                Real NASA &amp; Space Agency Data Behind All 6 Stations
              </h3>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {STATION_ORDER.map((id) => {
                const fact = STATION_NASA_FACTS[id];
                return (
                  <div
                    key={id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-[#e6ebfa] bg-[#f6f8ff] p-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-xs font-extrabold uppercase tracking-wide text-[#2c78b8]">
                          {fact.headline}
                        </span>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#259b6c]">
                          {fact.badgeLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#4f5f87]">
                        {fact.factText}
                      </p>
                    </div>
                    <a
                      href={fact.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-extrabold text-[#2c78b8] hover:underline"
                    >
                      {fact.sourceLabel} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
