import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  Droplets,
  Heart,
  Home,
  Music,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  Shield,
  ShieldCheck,
  Sprout,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ModuleId } from '@/content/mission';
import { formatSpaceWeatherSummary } from '@/content/nasa-grounding';
import {
  getAstronaut,
  isAstronautId,
  loadSelectedAstronautId,
  saveSelectedAstronautId,
  type AstronautId,
} from '@/game/astronauts';
import { formatSurvivalTime } from '@/game/leaderboard';
import {
  applyStationAction,
  countOperationalStations,
  createSurvivalWorld,
  findNearestInteractableStation,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  setPlayerWalkTarget,
  STATION_ORDER,
  STATIONS,
  stepSurvivalWorld,
  type BaseResources,
  type CrewSafetyStatus,
  type FailureReport,
  type IndoorCrewMember,
  type NpcDialogMessage,
  type ResourceKey,
  type StationState,
  type SurvivalPhase,
  type SurvivalWorldState,
  type Vec2,
} from '@/game/survival-engine';
import { AstronautAvatar } from '@/components/astronaut-avatar';
import { BaseNasaModal } from '@/components/base-nasa-modal';
import { CrewCamPip } from '@/components/crew-cam-pip';
import { EvacuationSequence } from '@/components/evacuation-sequence';
import { GameOverLeaderboard } from '@/components/gameover-leaderboard';
import { NpcDialog } from '@/components/npc-dialog';
import { StationMiniGameModal } from '@/components/station-minigame-modal';
import { SurvivalCanvas } from '@/components/survival-canvas';
import { useGetNasaResearch } from '@/services/research-client';
import {
  getGetSpaceWeatherQueryKey,
  loadSavedSpaceWeatherContext,
  saveSpaceWeatherContext,
  SPACE_WEATHER_UPDATED_EVENT,
  useGetSpaceWeather,
  type SavedSpaceWeatherContext,
} from '@/services/space-weather-client';
import {
  attachMusicLifecycle,
  loadMusicPref,
  loadSfxPref,
  playSfx,
  saveMusicPref,
  saveSfxPref,
  startBackgroundMusic,
  stopBackgroundMusic,
} from '@/lib/sfx';
import {
  CUTE_VOICE_STYLES,
  isSpeechSupported,
  loadVoiceStylePref,
  saveVoiceStylePref,
  speakText,
  stopSpeech,
  type CuteVoiceStyle,
} from '@/lib/speech';
import { cn } from '@/lib/utils';

const RESOURCE_ICONS: Record<ResourceKey, typeof Zap> = {
  power: Zap,
  air: Wind,
  water: Droplets,
  food: Sprout,
  safety: ShieldCheck,
};

const RESOURCE_BAR_COLORS: Record<ResourceKey, string> = {
  power: '#ffc56f',
  air: '#76dbae',
  water: '#73bfff',
  food: '#96df8a',
  safety: '#b4a0ef',
};

interface HudSnapshot {
  phase: SurvivalPhase;
  elapsedSec: number;
  bonusScoreSec: number;
  solsSurvived: number;
  onlineCount: number;
  crewHealth: number;
  crewSafetyStatus: CrewSafetyStatus;
  resources: BaseResources;
  indoorCrew: [IndoorCrewMember, IndoorCrewMember];
  stations: Record<ModuleId, StationState>;
  stormActive: boolean;
  stormLabel: string;
  shieldBoostSec: number;
  powerSaveSec: number;
  dialog: NpcDialogMessage | null;
  npcTargetStation: ModuleId;
  npcTaskPhase: 'walking' | 'working' | 'resting';
  nearbyStationId: ModuleId | null;
  nearbyCanOpen: boolean;
  evacTimerSec: number;
  failureReport: FailureReport | null;
}

function snapshotFromWorld(w: SurvivalWorldState): HudSnapshot {
  const nearby = findNearestInteractableStation(w);
  return {
    phase: w.phase,
    elapsedSec: w.elapsedSec,
    bonusScoreSec: w.bonusScoreSec,
    solsSurvived: w.solsSurvived,
    onlineCount: countOperationalStations(w),
    crewHealth: w.crewHealth,
    crewSafetyStatus: w.crewSafetyStatus,
    resources: { ...w.resources },
    indoorCrew: [{ ...w.indoorCrew[0] }, { ...w.indoorCrew[1] }],
    stations: {
      solar: { ...w.stations.solar },
      greenhouse: { ...w.stations.greenhouse },
      habitat: { ...w.stations.habitat },
      recycler: { ...w.stations.recycler },
      shelter: { ...w.stations.shelter },
      comms: { ...w.stations.comms },
    },
    stormActive: w.storm.active,
    stormLabel: w.storm.label,
    shieldBoostSec: w.shieldBoostSec,
    powerSaveSec: w.powerSaveSec,
    dialog: w.dialog,
    npcTargetStation: w.npc.targetStation,
    npcTaskPhase: w.npc.taskPhase,
    nearbyStationId: nearby ? nearby.station.id : null,
    nearbyCanOpen: Boolean(nearby?.canOpen),
    evacTimerSec: w.evacTimerSec,
    failureReport: w.failureReport,
  };
}

export default function Base() {
  const [, go] = useLocation();

  const [initConfig] = useState(() => {
    let astronautId: AstronautId = loadSelectedAstronautId();
    let drainMultiplier = 1;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const astroParam = params.get('astronaut');
      if (isAstronautId(astroParam)) {
        astronautId = astroParam;
        saveSelectedAstronautId(astroParam);
      }
      const drainParam = Number(params.get('drainScale'));
      if (Number.isFinite(drainParam) && drainParam > 0.5 && drainParam <= 60) {
        drainMultiplier = drainParam;
      }
    }
    return { astronautId, drainMultiplier };
  });

  const worldRef = useRef<SurvivalWorldState>(
    createSurvivalWorld(initConfig.astronautId, { drainMultiplier: initConfig.drainMultiplier }),
  );
  const [hud, setHud] = useState<HudSnapshot>(() => snapshotFromWorld(worldRef.current));
  const [openStationModal, setOpenStationModal] = useState<ModuleId | null>(null);
  const [nasaModalOpen, setNasaModalOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(loadSfxPref);
  const [musicOn, setMusicOn] = useState(loadMusicPref);
  const [voiceStyle, setVoiceStyle] = useState<CuteVoiceStyle>(loadVoiceStylePref);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [savedWeather, setSavedWeather] = useState<SavedSpaceWeatherContext>(loadSavedSpaceWeatherContext);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<SavedSpaceWeatherContext>).detail;
      if (detail) setSavedWeather(detail);
    };
    window.addEventListener(SPACE_WEATHER_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SPACE_WEATHER_UPDATED_EVENT, onUpdate);
  }, []);

  // Gentle 16-note Web Audio space melody lifecycle (auto-starts on first gesture if Music On)
  useEffect(() => {
    return attachMusicLifecycle(() => musicOn && hud.phase === 'playing');
  }, [musicOn, hud.phase]);

  const weatherParams = useMemo(
    () => ({
      eventType: savedWeather.eventType,
      startDate: savedWeather.startDate,
      endDate: savedWeather.endDate,
      mode: savedWeather.requestMode,
    }),
    [savedWeather.eventType, savedWeather.startDate, savedWeather.endDate, savedWeather.requestMode],
  );
  const weatherQuery = useGetSpaceWeather(weatherParams, {
    query: {
      queryKey: getGetSpaceWeatherQueryKey(weatherParams),
      enabled: savedWeather.requestMode !== 'simulated',
      staleTime: 300_000,
      retry: false,
    },
  });
  const researchQuery = useGetNasaResearch();

  useEffect(() => {
    if (!weatherQuery.data) return;
    saveSpaceWeatherContext({
      eventType: savedWeather.eventType,
      startDate: savedWeather.startDate,
      endDate: savedWeather.endDate,
      requestMode: savedWeather.requestMode,
      lastMode: weatherQuery.data.mode,
      lastStatus: weatherQuery.data.status,
      cached: weatherQuery.data.cached,
      stale: weatherQuery.data.stale,
      record: weatherQuery.data.records[0] ?? null,
    });
  }, [
    weatherQuery.data,
    savedWeather.eventType,
    savedWeather.startDate,
    savedWeather.endDate,
    savedWeather.requestMode,
  ]);

  const weatherSummary = useMemo(
    () => formatSpaceWeatherSummary(weatherQuery.data, savedWeather, weatherQuery.isFetching),
    [weatherQuery.data, savedWeather, weatherQuery.isFetching],
  );

  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const modalOpenRef = useRef<boolean>(false);
  modalOpenRef.current = Boolean(openStationModal) || nasaModalOpen;

  const syncHudNow = useCallback(() => {
    setHud(snapshotFromWorld(worldRef.current));
  }, []);

  const showConsequenceToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const openStationIfReady = useCallback(
    (id: ModuleId) => {
      const w = worldRef.current;
      if (w.phase !== 'playing') return;
      const st = w.stations[id];
      if (!st || st.failed) return;
      if (st.cooldownSec > 0) {
        showConsequenceToast(`${STATIONS[id].label} just finished! Ready in ${Math.ceil(st.cooldownSec)}s.`);
        return;
      }
      keysHeldRef.current.clear();
      touchMoveRef.current = { dx: 0, dy: 0 };
      playSfx('tap');
      setOpenStationModal(id);
    },
    [showConsequenceToast],
  );

  const handleOpenNearby = useCallback(() => {
    const w = worldRef.current;
    const near = findNearestInteractableStation(w);
    if (near && !w.stations[near.station.id].failed) {
      openStationIfReady(near.station.id);
    }
  }, [openStationIfReady]);

  const handleWalkToPoint = useCallback((pt: Vec2) => {
    if (modalOpenRef.current) return;
    worldRef.current = setPlayerWalkTarget(worldRef.current, pt, null);
  }, []);

  const handleWalkToStation = useCallback((id: ModuleId) => {
    if (modalOpenRef.current) return;
    const w = worldRef.current;
    if (w.stations[id].failed) return;
    worldRef.current = setPlayerWalkTarget(w, STATIONS[id].interactPos, id);
  }, []);

  const handleRestart = useCallback(() => {
    stopSpeech();
    keysHeldRef.current.clear();
    touchMoveRef.current = { dx: 0, dy: 0 };
    setOpenStationModal(null);
    setToastMsg(null);
    const freshAstro = loadSelectedAstronautId();
    worldRef.current = createSurvivalWorld(freshAstro, { drainMultiplier: initConfig.drainMultiplier });
    syncHudNow();
  }, [initConfig.drainMultiplier, syncHudNow]);

  const togglePause = useCallback(() => {
    const w = worldRef.current;
    if (w.phase === 'playing') {
      keysHeldRef.current.clear();
      worldRef.current = { ...w, phase: 'paused' };
      syncHudNow();
    } else if (w.phase === 'paused') {
      keysHeldRef.current.clear();
      worldRef.current = { ...w, phase: 'playing' };
      syncHudNow();
    }
  }, [syncHudNow]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.state = hud.phase;
    return () => {
      delete document.body.dataset.state;
    };
  }, [hud.phase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const code = e.code;

      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        if (!modalOpenRef.current && worldRef.current.phase === 'playing') {
          e.preventDefault();
        }
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (nasaModalOpen) {
          setNasaModalOpen(false);
          return;
        }
        if (openStationModal) {
          setOpenStationModal(null);
          return;
        }
        if (worldRef.current.phase === 'playing' || worldRef.current.phase === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (!e.repeat && (code === 'KeyE' || code === 'Space')) {
        if (!modalOpenRef.current && worldRef.current.phase === 'playing') {
          handleOpenNearby();
          return;
        }
      }

      keysHeldRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const clearInputs = () => {
      keysHeldRef.current.clear();
      touchMoveRef.current = { dx: 0, dy: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [handleOpenNearby, togglePause, nasaModalOpen, openStationModal]);

  useEffect(() => {
    let lastTs = performance.now();
    let hudAccum = 0;
    let prevOnline = countOperationalStations(worldRef.current);
    let prevPhase = worldRef.current.phase;
    let prevDialogId = worldRef.current.dialog?.id ?? null;
    let rafId = 0;

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const held = keysHeldRef.current;
      let dx = touchMoveRef.current.dx;
      let dy = touchMoveRef.current.dy;
      if (held.has('KeyA') || held.has('ArrowLeft')) dx -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) dx += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) dy -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) dy += 1;

      const { state: next, arrivedStationId } = stepSurvivalWorld(
        worldRef.current,
        rawDt,
        { dx, dy },
        { modalOpen: modalOpenRef.current },
      );
      worldRef.current = next;

      if (arrivedStationId && !modalOpenRef.current && next.phase === 'playing') {
        openStationIfReady(arrivedStationId);
      }

      if (next.phase === 'evacuating' && modalOpenRef.current) {
        setOpenStationModal(null);
        setNasaModalOpen(false);
      }

      const curOnline = countOperationalStations(next);
      const curDialogId = next.dialog?.id ?? null;
      const isStaticPhase = next.phase === 'gameover' || next.phase === 'paused';
      hudAccum += rawDt;
      const hudSyncInterval = modalOpenRef.current ? 1.0 : 0.12;

      if (
        curOnline !== prevOnline ||
        next.phase !== prevPhase ||
        curDialogId !== prevDialogId ||
        (!isStaticPhase && hudAccum >= hudSyncInterval)
      ) {
        if (curOnline < prevOnline) playSfx('oops');
        prevOnline = curOnline;
        prevPhase = next.phase;
        prevDialogId = curDialogId;
        hudAccum = 0;
        setHud(snapshotFromWorld(next));
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [openStationIfReady]);

  const playerProfile = worldRef.current.playerProfile;
  const npcProfile = worldRef.current.npc.profile;
  const totalScoreSec = Math.round(hud.elapsedSec + hud.bonusScoreSec);

  const bindDpad = (dx: number, dy: number) => ({
    onPointerDown: () => {
      touchMoveRef.current = { dx, dy };
    },
    onPointerUp: () => {
      touchMoveRef.current = { dx: 0, dy: 0 };
    },
    onPointerLeave: () => {
      touchMoveRef.current = { dx: 0, dy: 0 };
    },
    onPointerCancel: () => {
      touchMoveRef.current = { dx: 0, dy: 0 };
    },
  });

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden text-[#344270]"
      style={{
        background:
          'radial-gradient(circle at 10% 5%, #565c94, transparent 35%), linear-gradient(150deg, #252d66, #151b42)',
      }}
    >
      {/* Slim Storybook Cream & Indigo HUD */}
      <header className="z-20 shrink-0 px-2 pt-1.5 sm:px-3.5 sm:pt-2">
        <div className="mx-auto max-w-[1440px] rounded-2xl border-2 border-white bg-[#fffefa] px-2.5 py-1.5 shadow-[0_10px_28px_-10px_rgba(12,16,48,0.5)] sm:px-3.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            {/* Left: Home + Player Astronaut + Crew Healthbar + Survival Clock */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                onClick={() => playSfx('tap')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[#e3e8f8] bg-[#f4f6ff] text-[#4e619e] hover:border-[#b4a0ef]"
                aria-label="Back to astronaut select"
                data-testid="link-home"
              >
                <Home className="h-4 w-4" />
              </Link>

              <div className="flex items-center gap-1.5 rounded-xl border-2 border-[#e4e9f8] bg-[#f4f6ff] px-2 py-0.5 sm:gap-2 sm:px-2.5">
                <AstronautAvatar profile={playerProfile} size={24} />
                <div className="leading-tight">
                  <span className="block font-display text-[11px] font-extrabold text-[#222a5b] sm:text-xs">
                    {playerProfile.shortName}
                  </span>
                  <span className="block font-mono text-[9.5px] font-extrabold text-[#5c6f9f] tabular-nums">
                    Sol {hud.solsSurvived}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border-2 px-2 py-0.5 sm:gap-2 sm:px-2.5',
                  hud.crewHealth < 30
                    ? 'border-[#ff7b8a] bg-[#fff0f2] text-[#c43a51]'
                    : hud.crewHealth < 60
                      ? 'border-[#ffcf79] bg-[#fff7e6] text-[#9b6110]'
                      : 'border-[#76dbae] bg-[#ebfaf3] text-[#1e7a54]',
                )}
                data-testid="hud-crew-health"
                title="Crew Health depends on all base resources. If it reaches 0%, the crew evacuates to Earth!"
              >
                <Heart className="hidden h-3.5 w-3.5 shrink-0 fill-current sm:block" />
                <div className="w-[54px] sm:w-[82px]">
                  <div className="flex items-center justify-between gap-1 leading-none">
                    <span className="font-display text-[9px] font-extrabold text-[#222a5b] sm:text-[10px]">
                      CREW
                    </span>
                    <span className="font-mono text-[9px] font-extrabold tabular-nums sm:text-[10px]">
                      {Math.round(hud.crewHealth)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, Math.round(hud.crewHealth)))}%`,
                        backgroundColor:
                          hud.crewHealth < 30 ? '#ff7b8a' : hud.crewHealth < 60 ? '#ffc56f' : '#76dbae',
                      }}
                    />
                  </div>
                </div>
                <span className="hidden rounded-full bg-white px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase sm:inline">
                  {hud.crewSafetyStatus === 'safe'
                    ? 'SAFE'
                    : hud.crewSafetyStatus === 'caution'
                      ? 'WARN'
                      : 'DANGER!'}
                </span>
              </div>

              <div
                className="flex items-center gap-1 rounded-xl border-2 border-[#ffe0a6] bg-[#fff5dc] px-2 py-0.5 sm:gap-1.5 sm:px-2.5"
                data-testid="hud-survival-timer"
              >
                <Clock className="hidden h-3.5 w-3.5 text-[#b86d10] sm:block" />
                <span className="font-mono text-sm font-extrabold text-[#364272] tabular-nums sm:text-base">
                  {formatSurvivalTime(totalScoreSec)}
                </span>
              </div>

              <div
                className={cn(
                  'hidden items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 font-mono text-xs font-extrabold xl:flex tabular-nums',
                  hud.onlineCount <= 2
                    ? 'border-[#ff7b8a] bg-[#fff0f2] text-[#c43a51]'
                    : hud.onlineCount <= 4
                      ? 'border-[#ffcf79] bg-[#fff7e6] text-[#9b6110]'
                      : 'border-[#76dbae] bg-[#ebfaf3] text-[#1e7a54]',
                )}
                data-testid="hud-stations-online"
              >
                <span>{hud.onlineCount}/6 Online</span>
              </div>
            </div>

            {/* Center: Slim Quick-Walk Station Pills (no duplicate % — % is already on canvas stations) */}
            <div
              className="order-3 grid w-full grid-cols-3 gap-1 sm:grid-cols-6 lg:order-2 lg:flex lg:w-auto lg:items-center lg:gap-1"
              data-testid="hud-station-bars"
            >
              {STATION_ORDER.map((id) => {
                const st = hud.stations[id];
                const pct = Math.round(st.health);
                const dotColor = st.failed
                  ? '#e04862'
                  : pct < 35
                    ? '#e04862'
                    : pct < 65
                      ? '#e79d2c'
                      : '#1fb37e';
                const toneColor = st.failed
                  ? 'border-[#ff7b8a] bg-[#fff0f2] text-[#c43a51]'
                  : pct < 35
                    ? 'border-[#ff9eaa] bg-[#fff4f6] text-[#a6293f]'
                    : pct < 65
                      ? 'border-[#ffcf79] bg-[#fff8e8] text-[#9b6110]'
                      : 'border-[#dce3f8] bg-[#f4f6ff] text-[#222a5b]';
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={st.failed}
                    onClick={() => {
                      playSfx('tap');
                      handleWalkToStation(id);
                    }}
                    data-testid={`hud-station-${id}`}
                    className={cn(
                      'flex min-h-[30px] items-center justify-center gap-1.5 rounded-xl border px-2 py-0.5 transition hover:brightness-95 disabled:opacity-55',
                      toneColor,
                    )}
                    title={`Walk to ${STATIONS[id].label} (${st.failed ? 'OFFLINE' : `${pct}%`})`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor }}
                      aria-hidden
                    />
                    <span className="truncate font-display text-[10.5px] font-extrabold">
                      {STATIONS[id].label}
                    </span>
                    {st.failed && (
                      <span className="font-mono text-[9.5px] font-extrabold">OFF</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: NASA Data, Music, Sound & Pause Buttons */}
            <div className="order-2 flex items-center gap-1.5 lg:order-3">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  keysHeldRef.current.clear();
                  playSfx('tap');
                  setNasaModalOpen(true);
                }}
                tabIndex={-1}
                className={cn(
                  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 px-2.5 font-mono text-xs font-extrabold transition',
                  weatherSummary.isLive
                    ? 'border-[#76dbae] bg-[#e5f9ef] text-[#1e7a54]'
                    : weatherSummary.isArchived
                      ? 'border-[#ffcf79] bg-[#fff5dc] text-[#9b6110]'
                      : 'border-[#d7e0f7] bg-[#f3f5ff] text-[#506090]',
                )}
                aria-label={`Open Real NASA Data and Sources (${weatherSummary.modeBadge})`}
                data-testid="button-open-nasa-data"
                title={`${weatherSummary.modeBadge}: ${weatherSummary.headline}`}
              >
                <Satellite className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {weatherSummary.isLive ? 'NASA LIVE' : weatherSummary.isArchived ? 'NASA ARCHIVE' : 'NASA SIM'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !musicOn;
                  setMusicOn(next);
                  saveMusicPref(next);
                  if (next) {
                    playSfx('tap');
                    startBackgroundMusic();
                  } else {
                    stopBackgroundMusic();
                  }
                }}
                tabIndex={-1}
                className={cn(
                  'inline-flex h-10 items-center justify-center gap-1 rounded-xl border-2 px-2.5 font-display text-xs font-extrabold transition',
                  musicOn
                    ? 'border-[#b4a0ef] bg-[#f1ecff] text-[#4e3896]'
                    : 'border-[#e3e8f8] bg-[#f4f6ff] text-[#6a79a0]',
                )}
                aria-label={musicOn ? 'Turn off space music' : 'Turn on space music'}
                data-testid="button-toggle-music"
                title="Toggle cheerful space melody"
              >
                <Music className="h-4 w-4" />
                <span className="hidden xl:inline">{musicOn ? 'Music On' : 'Music'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  saveSfxPref(next);
                  if (next) playSfx('tap');
                }}
                tabIndex={-1}
                className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[#e3e8f8] bg-[#f4f6ff] text-[#4e619e] hover:border-[#b4a0ef]"
                aria-label={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
                data-testid="button-toggle-sound"
              >
                {soundOn ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  playSfx('tap');
                  togglePause();
                }}
                tabIndex={-1}
                className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#e3e8f8] bg-[#f4f6ff] px-0 font-display text-sm font-extrabold text-[#344270] hover:border-[#b4a0ef] sm:w-auto sm:px-3"
                aria-label="Pause game"
                data-testid="button-pause"
              >
                <Pause className="h-4 w-4" />
                <span className="hidden sm:inline">Pause</span>
              </button>
            </div>
          </div>

          {/* Second slim HUD strip: Pastel Resource Meters */}
          <div
            className="mt-1.5 grid grid-cols-5 gap-1 rounded-xl bg-[#f3f5ff] p-1 sm:gap-1.5"
            data-testid="hud-resources-left"
          >
            {RESOURCE_KEYS.map((key) => {
              const val = Math.round(hud.resources[key]);
              const Icon = RESOURCE_ICONS[key];
              const isCrit = val < 20;
              const isLow = val < 38;
              return (
                <div
                  key={key}
                  data-testid={`hud-resource-${key}`}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-1 py-1 sm:gap-1.5 sm:px-2',
                    isCrit
                      ? 'border-[#ff7b8a] bg-[#fff0f2] text-[#c43a51]'
                      : isLow
                        ? 'border-[#ffcf79] bg-[#fff7e6] text-[#9b6110]'
                        : 'border-white bg-white text-[#344270]',
                  )}
                >
                  <Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-0.5 leading-none sm:gap-1">
                      <span className="font-display text-[8.5px] font-extrabold text-[#222a5b] sm:text-[10px]">
                        {RESOURCE_LABELS[key]}
                      </span>
                      <span className="font-mono text-[8.5px] font-extrabold tabular-nums sm:text-[10px]">
                        {val}%{isLow ? '!' : ''}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e6ebf9]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, val))}%`,
                          backgroundColor: isCrit
                            ? '#ff7b8a'
                            : isLow
                              ? '#ffc56f'
                              : RESOURCE_BAR_COLORS[key],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Playable Moon Base Arena inside Crisp White Storybook Frame */}
      <main className="relative flex-1 p-1.5 sm:p-3">
        <div className="relative mx-auto h-full w-full max-w-[1440px] overflow-hidden rounded-[22px] border-4 border-white shadow-[0_18px_46px_-12px_rgba(10,14,42,0.65)]">
          <SurvivalCanvas
            worldRef={worldRef}
            paused={Boolean(openStationModal) || nasaModalOpen || hud.phase !== 'playing'}
            onWalkToPoint={handleWalkToPoint}
            onSelectStationOrWalk={handleWalkToStation}
            onOpenNearbyStation={handleOpenNearby}
          />

          {/* Upper-Left Storm / Active Buffs & Consequence Feedback */}
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[195px] flex-col gap-2 sm:left-4 sm:top-4 sm:max-w-xs">
            {hud.stormActive && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setNasaModalOpen(true);
                }}
                className="pointer-events-auto flex flex-col gap-1 rounded-2xl border-2 border-[#ff7b8a] bg-[#fffefa] px-3 py-2 text-left text-[#c43a51] shadow-xl transition hover:scale-[1.01]"
                data-testid="hud-storm-alert"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-[#c43a51]" />
                  <span className="font-display text-xs font-extrabold sm:text-sm">
                    {hud.stormLabel}!
                  </span>
                </div>
                {weatherSummary.record && (
                  <span className="font-mono text-[10px] font-extrabold text-[#2c78b8]">
                    {weatherSummary.modeBadge}: {weatherSummary.record.id}
                  </span>
                )}
              </button>
            )}
            {hud.shieldBoostSec > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border-2 border-white bg-[#e5f9ef] px-3 py-1.5 font-mono text-xs font-extrabold text-[#1e7a54] shadow-md">
                <Shield className="h-4 w-4" /> Storm Armor {Math.ceil(hud.shieldBoostSec)}s
              </div>
            )}
            {toastMsg && (
              <div
                className="rounded-2xl border-2 border-white bg-[#fffefa] px-3 py-2 font-display text-xs font-extrabold text-[#222a5b] shadow-xl sm:text-sm"
                data-testid="hud-consequence-toast"
              >
                {toastMsg}
              </div>
            )}
          </div>

          {/* Upper-Right Crew Cam Monitor */}
          <div className="pointer-events-none absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
            <CrewCamPip
              worldRef={worldRef}
              indoorCrew={hud.indoorCrew}
              paused={Boolean(openStationModal) || nasaModalOpen || hud.phase !== 'playing'}
            />
          </div>

          {/* Bottom HUD Overlay: NPC Dialog + Interact CTA + Mobile D-Pad */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2.5 sm:inset-x-4 sm:bottom-4 sm:flex-row sm:items-end sm:justify-between">
            <NpcDialog
              dialog={hud.dialog}
              npcTargetStation={hud.npcTargetStation}
              npcTaskPhase={hud.npcTaskPhase}
              onWalkToStation={handleWalkToStation}
            />

            <div className="flex items-end justify-between gap-3 sm:justify-end">
              <div className="pointer-events-auto grid grid-cols-3 gap-1 md:hidden" aria-label="Walk controls">
                <div />
                <button
                  type="button"
                  {...bindDpad(0, -1)}
                  className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white bg-[#fffefa]/95 text-[#344270] shadow active:bg-[#ffe7a1]"
                  aria-label="Walk up"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <div />
                <button
                  type="button"
                  {...bindDpad(-1, 0)}
                  className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white bg-[#fffefa]/95 text-[#344270] shadow active:bg-[#ffe7a1]"
                  aria-label="Walk left"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  {...bindDpad(0, 1)}
                  className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white bg-[#fffefa]/95 text-[#344270] shadow active:bg-[#ffe7a1]"
                  aria-label="Walk down"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  {...bindDpad(1, 0)}
                  className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white bg-[#fffefa]/95 text-[#344270] shadow active:bg-[#ffe7a1]"
                  aria-label="Walk right"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              {hud.nearbyStationId && !hud.stations[hud.nearbyStationId].failed && (
                <button
                  type="button"
                  onClick={handleOpenNearby}
                  data-testid="button-open-nearby-station"
                  className={cn(
                    'pointer-events-auto inline-flex min-h-[54px] items-center gap-2.5 rounded-2xl px-6 py-3 font-display text-lg font-extrabold shadow-2xl transition active:translate-y-0.5',
                    hud.nearbyCanOpen
                      ? 'bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] text-[#364272] shadow-[0_5px_0_#e7a959] hover:brightness-105'
                      : 'border-2 border-white bg-[#eef2ff] text-[#607094]',
                  )}
                >
                  <Wrench className="h-5 w-5" />
                  <span>
                    {hud.nearbyCanOpen
                      ? `OPEN ${STATIONS[hud.nearbyStationId].label.toUpperCase()} [E]`
                      : `${STATIONS[hud.nearbyStationId].label} Ready Soon...`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Station Choice + Mini-Game Modal */}
      {openStationModal && hud.phase === 'playing' && (
        <StationMiniGameModal
          stationId={openStationModal}
          stationHealth={hud.stations[openStationModal].health}
          resources={hud.resources}
          spaceWeather={weatherSummary}
          research={researchQuery.data}
          onClose={() => setOpenStationModal(null)}
          onComplete={(choiceId, quality) => {
            const next = applyStationAction(worldRef.current, openStationModal, choiceId, quality);
            worldRef.current = next;
            setOpenStationModal(null);
            syncHudNow();
            const lastChoice = next.choicesMade[next.choicesMade.length - 1];
            if (lastChoice) {
              showConsequenceToast(lastChoice.consequenceNote);
            }
          }}
        />
      )}

      {/* Real NASA Space-Weather & Science Sources Modal */}
      {nasaModalOpen && (
        <BaseNasaModal
          summary={weatherSummary}
          weatherData={weatherQuery.data}
          researchData={researchQuery.data}
          savedContext={savedWeather}
          isFetching={weatherQuery.isFetching}
          onUpdateContext={setSavedWeather}
          onClose={() => setNasaModalOpen(false)}
        />
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#14193f]/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          data-testid="pause-modal"
        >
          <div className="w-full max-w-sm rounded-[28px] border-[6px] border-white bg-[#fffefa] p-6 text-center text-[#344270] shadow-2xl">
            <h2 className="font-display text-3xl font-extrabold text-[#222a5b]">Game Paused</h2>
            <p className="mt-1 font-mono text-sm font-extrabold text-[#4e619e] tabular-nums">
              Survived {formatSurvivalTime(totalScoreSec)} · {hud.onlineCount}/6 Stations Online
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={togglePause}
                data-testid="button-resume-play"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] font-display text-lg font-extrabold text-[#364272] shadow-[0_5px_0_#e7a959] hover:brightness-105"
              >
                <Play className="h-5 w-5 fill-current" />
                Keep Playing
              </button>
              {isSpeechSupported() && (
                <div className="rounded-2xl border-2 border-[#e0e6fa] bg-[#f4f6ff] p-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-extrabold uppercase tracking-wide text-[#4e619e]">
                      Read Voice Style
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playSfx('tap');
                        speakText('Hi Commander! Our Moon Base crew is ready to help!', true, { style: voiceStyle });
                      }}
                      className="rounded-full bg-[#fff3d6] px-2.5 py-0.5 font-display text-[11px] font-extrabold text-[#9b6110] hover:bg-[#ffe7a1]"
                      data-testid="button-pause-test-voice"
                    >
                      Test Voice
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Read voice style">
                    {CUTE_VOICE_STYLES.map((opt) => {
                      const active = voiceStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            playSfx('tap');
                            setVoiceStyle(opt.id);
                            saveVoiceStylePref(opt.id);
                            speakText(`Hi! This is the ${opt.label} voice!`, true, { style: opt.id });
                          }}
                          data-testid={`button-voice-style-${opt.id}`}
                          className={cn(
                            'rounded-xl border-2 px-2 py-1.5 text-center transition',
                            active
                              ? 'border-[#ffbf66] bg-[#fff5e0] text-[#222a5b] shadow-sm'
                              : 'border-[#dfe5f6] bg-white text-[#5b6b94] hover:border-[#b4a0ef]',
                          )}
                        >
                          <span className="block font-display text-xs font-extrabold">{opt.label}</span>
                          <span className="block text-[10px] font-semibold opacity-80">{opt.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleRestart}
                data-testid="button-pause-restart"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e0e6fa] bg-[#f4f6ff] font-display text-base font-extrabold text-[#344270] hover:border-[#b4a0ef]"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Run
              </button>
              <button
                type="button"
                onClick={() => go('/')}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#e0e6fa] bg-white font-display text-base font-bold text-[#607094] hover:text-[#222a5b]"
              >
                <Users className="h-4 w-4" />
                Change Astronaut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return-to-Earth Rocket Evacuation Animation */}
      {hud.phase === 'evacuating' && (
        <EvacuationSequence
          playerProfile={playerProfile}
          npcProfile={npcProfile}
          elapsedEvacSec={hud.evacTimerSec}
          failureReport={hud.failureReport}
          onSkip={() => {
            worldRef.current = { ...worldRef.current, phase: 'gameover' };
            syncHudNow();
          }}
        />
      )}

      {/* Game Over + Failure Breakdown + Highscore Name Entry & Leaderboard */}
      {hud.phase === 'gameover' && hud.failureReport && (
        <GameOverLeaderboard
          playerProfile={getAstronaut(playerProfile.id)}
          report={hud.failureReport}
          onPlayAgain={handleRestart}
          onChangeAstronaut={() => go('/')}
        />
      )}
    </div>
  );
}
