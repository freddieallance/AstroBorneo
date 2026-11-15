import { useCallback, useEffect, useRef, useState } from 'react';
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
  Pause,
  Play,
  RotateCcw,
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
import { CrewCamPip } from '@/components/crew-cam-pip';
import { EvacuationSequence } from '@/components/evacuation-sequence';
import { GameOverLeaderboard } from '@/components/gameover-leaderboard';
import { NpcDialog } from '@/components/npc-dialog';
import { StationMiniGameModal } from '@/components/station-minigame-modal';
import { SurvivalCanvas } from '@/components/survival-canvas';
import { loadSfxPref, playSfx, saveSfxPref } from '@/lib/sfx';
import { stopSpeech } from '@/lib/speech';
import { cn } from '@/lib/utils';

const RESOURCE_ICONS: Record<ResourceKey, typeof Zap> = {
  power: Zap,
  air: Wind,
  water: Droplets,
  food: Sprout,
  safety: ShieldCheck,
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
    indoorCrew: [
      { ...w.indoorCrew[0] },
      { ...w.indoorCrew[1] },
    ],
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
  const [soundOn, setSoundOn] = useState(loadSfxPref);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const modalOpenRef = useRef<ModuleId | null>(null);
  modalOpenRef.current = openStationModal;

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

  const openStationIfReady = useCallback((id: ModuleId) => {
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
  }, [showConsequenceToast]);

  const handleOpenNearby = useCallback(() => {
    const w = worldRef.current;
    const near = findNearestInteractableStation(w);
    if (near && !w.stations[near.station.id].failed) {
      openStationIfReady(near.station.id);
    }
  }, [openStationIfReady]);

  const handleWalkToPoint = useCallback(
    (pt: Vec2) => {
      if (modalOpenRef.current) return;
      worldRef.current = setPlayerWalkTarget(worldRef.current, pt, null);
    },
    [],
  );

  const handleWalkToStation = useCallback(
    (id: ModuleId) => {
      if (modalOpenRef.current) return;
      const w = worldRef.current;
      if (w.stations[id].failed) return;
      worldRef.current = setPlayerWalkTarget(w, STATIONS[id].interactPos, id);
    },
    [],
  );

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

  // Sync document.body.dataset.state cleanly
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.state = hud.phase;
    return () => {
      delete document.body.dataset.state;
    };
  }, [hud.phase]);

  // Keyboard listener with edge-triggered Interact/Pause and focus-loss hygiene
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
        if (modalOpenRef.current) {
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
  }, [handleOpenNearby, togglePause]);

  // Main 60Hz simulation loop with throttled ~10Hz HUD React sync
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
        { modalOpen: modalOpenRef.current !== null },
      );
      worldRef.current = next;

      if (arrivedStationId && !modalOpenRef.current && next.phase === 'playing') {
        openStationIfReady(arrivedStationId);
      }

      // Close modal automatically if all stations fail
      if (next.phase === 'evacuating' && modalOpenRef.current) {
        setOpenStationModal(null);
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
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-deep text-ink">
      {/* Compact Perimeter Game HUD */}
      <header className="z-20 shrink-0 border-b border-dim/15 bg-hull/95 px-2 py-1.5 sm:px-5 sm:py-2">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Home + Player Astronaut + Crew Healthbar + Survival Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              onClick={() => playSfx('tap')}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dim/25 bg-deep/80 text-aqua hover:border-aqua"
              aria-label="Back to astronaut select"
              data-testid="link-home"
            >
              <Home className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-1.5 rounded-xl border border-aqua/35 bg-deep/80 px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5">
              <AstronautAvatar profile={playerProfile} size={26} />
              <div className="leading-tight">
                <span className="block font-display text-[11px] font-extrabold text-ink sm:text-xs">
                  {playerProfile.shortName}
                </span>
                <span className="block font-mono text-[9px] font-bold text-aqua tabular-nums sm:text-[10px]">
                  Sol {hud.solsSurvived}
                </span>
              </div>
            </div>

            {/* Crew Healthbar dependent on all resources */}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5',
                hud.crewHealth < 30
                  ? 'border-bad bg-bad/15 text-bad'
                  : hud.crewHealth < 60
                    ? 'border-warn bg-warn/15 text-warn'
                    : 'border-ok/45 bg-deep/85 text-ok',
              )}
              data-testid="hud-crew-health"
              title="Crew Health depends on all base resources. If it reaches 0%, the crew evacuates to Earth!"
            >
              <Heart className="hidden h-4 w-4 shrink-0 fill-current sm:block" />
              <div className="w-[56px] sm:w-[92px]">
                <div className="flex items-center justify-between gap-1 leading-none">
                  <span className="font-display text-[9px] font-extrabold text-ink sm:text-[10px]">CREW</span>
                  <span className="font-mono text-[9px] font-extrabold tabular-nums sm:text-[10px]">
                    {Math.round(hud.crewHealth)}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-deep/90">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      hud.crewHealth < 30 ? 'bg-bad' : hud.crewHealth < 60 ? 'bg-warn' : 'bg-ok',
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(hud.crewHealth)))}%` }}
                  />
                </div>
              </div>
              <span className="hidden rounded-md bg-deep/80 px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold uppercase sm:inline">
                {hud.crewSafetyStatus === 'safe'
                  ? 'SAFE'
                  : hud.crewSafetyStatus === 'caution'
                    ? 'WARN'
                    : 'DANGER!'}
              </span>
            </div>

            <div
              className="flex items-center gap-1 rounded-xl border border-aqua/40 bg-deep/85 px-2 py-1.5 sm:gap-1.5 sm:px-2.5"
              data-testid="hud-survival-timer"
            >
              <Clock className="hidden h-4 w-4 text-aqua sm:block" />
              <span className="font-mono text-sm font-extrabold text-ink tabular-nums sm:text-lg">
                {formatSurvivalTime(totalScoreSec)}
              </span>
            </div>

            <div
              className={cn(
                'hidden items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs font-extrabold xl:flex tabular-nums',
                hud.onlineCount <= 2
                  ? 'border-bad bg-bad/15 text-bad'
                  : hud.onlineCount <= 4
                    ? 'border-warn bg-warn/15 text-warn'
                    : 'border-ok/40 bg-ok/10 text-ok',
              )}
              data-testid="hud-stations-online"
            >
              <span>Stations: {hud.onlineCount}/6</span>
            </div>
          </div>

          {/* Center: 6 Clickable Quick-Status Station Chips */}
          <div className="order-3 grid w-full grid-cols-3 gap-1 sm:grid-cols-6 lg:order-2 lg:flex lg:w-auto lg:items-center lg:gap-1.5" data-testid="hud-station-bars">
            {STATION_ORDER.map((id) => {
              const st = hud.stations[id];
              const pct = Math.round(st.health);
              const toneColor = st.failed
                ? 'border-bad/80 bg-bad/15 text-bad'
                : pct < 35
                  ? 'border-bad bg-bad/15 text-bad'
                  : pct < 65
                    ? 'border-warn/70 bg-warn/10 text-warn'
                    : 'border-ok/50 bg-deep/80 text-ok';
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
                    'flex min-h-[40px] flex-col items-center justify-center rounded-xl border px-2 py-1 transition hover:brightness-110 disabled:opacity-55 lg:min-w-[74px]',
                    toneColor,
                  )}
                  title={`${STATIONS[id].label}: ${st.failed ? 'FAILED' : `${pct}%`}`}
                >
                  <span className="truncate font-display text-[10px] font-extrabold text-ink">
                    {STATIONS[id].label}
                  </span>
                  <span className="font-mono text-xs font-extrabold tabular-nums">
                    {st.failed ? 'DEAD' : `${pct}%`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Sound & Pause Buttons */}
          <div className="order-2 flex items-center gap-1.5 lg:order-3">
            <button
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                saveSfxPref(next);
                if (next) playSfx('tap');
              }}
              tabIndex={-1}
              className="grid h-11 w-11 place-items-center rounded-xl border border-dim/25 bg-plate text-aqua hover:border-aqua"
              aria-label={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
              data-testid="button-toggle-sound"
            >
              {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                playSfx('tap');
                togglePause();
              }}
              tabIndex={-1}
              className="inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-xl border border-dim/25 bg-plate px-0 font-display text-sm font-bold text-ink hover:border-aqua sm:w-auto sm:px-3"
              aria-label="Pause game"
              data-testid="button-pause"
            >
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>
        </div>

        {/* Second slim HUD strip: Base Resources Left */}
        <div
          className="mx-auto mt-1.5 grid max-w-[1440px] grid-cols-5 gap-1 sm:gap-1.5"
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
                  'flex items-center gap-1.5 rounded-lg border px-1.5 py-1 sm:px-2',
                  isCrit
                    ? 'border-bad/80 bg-bad/15 text-bad'
                    : isLow
                      ? 'border-warn/70 bg-warn/10 text-warn'
                      : 'border-dim/20 bg-deep/75 text-aqua',
                )}
              >
                <Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-0.5 leading-none sm:gap-1">
                    <span className="truncate font-display text-[9.5px] font-extrabold text-ink sm:text-[10px]">
                      {RESOURCE_LABELS[key]}
                    </span>
                    <span className="font-mono text-[9.5px] font-extrabold tabular-nums sm:text-[10px]">
                      {val}%{isLow ? '!' : ''}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-deep/90">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        isCrit ? 'bg-bad' : isLow ? 'bg-warn' : 'bg-ok',
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Playable Moon Base Arena */}
      <main className="relative flex-1 overflow-hidden">
        <SurvivalCanvas
          worldRef={worldRef}
          paused={Boolean(openStationModal) || hud.phase !== 'playing'}
          onWalkToPoint={handleWalkToPoint}
          onSelectStationOrWalk={handleWalkToStation}
          onOpenNearbyStation={handleOpenNearby}
        />

        {/* Upper-Left Storm / Active Buffs & Consequence Feedback */}
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[175px] flex-col gap-2 sm:left-5 sm:top-4 sm:max-w-xs">
          {hud.stormActive && (
            <div
              className="flex items-center gap-2 rounded-2xl border-2 border-bad bg-deep/90 px-3 py-2 shadow-xl"
              data-testid="hud-storm-alert"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-bad" />
              <span className="font-display text-xs font-extrabold text-bad sm:text-sm">
                {hud.stormLabel}!
              </span>
            </div>
          )}
          {hud.shieldBoostSec > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-ok/60 bg-deep/85 px-3 py-1.5 font-mono text-xs font-bold text-ok">
              <Shield className="h-4 w-4" /> Storm Armor {Math.ceil(hud.shieldBoostSec)}s
            </div>
          )}
          {toastMsg && (
            <div
              className="rounded-2xl border border-aqua/60 bg-hull/95 px-3 py-2 font-display text-xs font-bold text-aqua shadow-xl sm:text-sm"
              data-testid="hud-consequence-toast"
            >
              {toastMsg}
            </div>
          )}
        </div>

        {/* Upper-Right Small Monitor: The Other 2 Astronauts Working Inside Base */}
        <div className="pointer-events-none absolute right-3 top-3 z-20 sm:right-5 sm:top-4">
          <CrewCamPip
            worldRef={worldRef}
            indoorCrew={hud.indoorCrew}
            paused={Boolean(openStationModal) || hud.phase !== 'playing'}
          />
        </div>

        {/* Bottom HUD Overlay: NPC Alert Dialog + Nearby Interact CTA + Mobile D-Pad */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2.5 sm:inset-x-5 sm:bottom-4 sm:flex-row sm:items-end sm:justify-between">
          <NpcDialog
            dialog={hud.dialog}
            npcTargetStation={hud.npcTargetStation}
            npcTaskPhase={hud.npcTaskPhase}
            onWalkToStation={handleWalkToStation}
          />

          <div className="flex items-end justify-between gap-3 sm:justify-end">
            {/* Touch D-Pad for mobile/tablet players */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1 md:hidden" aria-label="Walk controls">
              <div />
              <button
                type="button"
                {...bindDpad(0, -1)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-dim/30 bg-hull/90 text-ink active:bg-aqua active:text-deep"
                aria-label="Walk up"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
              <div />
              <button
                type="button"
                {...bindDpad(-1, 0)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-dim/30 bg-hull/90 text-ink active:bg-aqua active:text-deep"
                aria-label="Walk left"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                {...bindDpad(0, 1)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-dim/30 bg-hull/90 text-ink active:bg-aqua active:text-deep"
                aria-label="Walk down"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
              <button
                type="button"
                {...bindDpad(1, 0)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-dim/30 bg-hull/90 text-ink active:bg-aqua active:text-deep"
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
                  'pointer-events-auto inline-flex min-h-[54px] items-center gap-2.5 rounded-2xl border-b-4 px-6 py-3 font-display text-lg font-extrabold shadow-2xl transition active:translate-y-0.5',
                  hud.nearbyCanOpen
                    ? 'border-[#b87b14] bg-warn text-deep hover:brightness-110'
                    : 'border-dim/40 bg-plate text-dim',
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
      </main>

      {/* Station Choice + Mini-Game Modal */}
      {openStationModal && hud.phase === 'playing' && (
        <StationMiniGameModal
          stationId={openStationModal}
          stationHealth={hud.stations[openStationModal].health}
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

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-deep/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          data-testid="pause-modal"
        >
          <div className="w-full max-w-sm rounded-3xl border-2 border-aqua/50 bg-hull p-6 text-center shadow-2xl">
            <h2 className="font-display text-3xl font-extrabold text-ink">Game Paused</h2>
            <p className="mt-1 font-mono text-sm font-bold text-aqua tabular-nums">
              Survived {formatSurvivalTime(totalScoreSec)} · {hud.onlineCount}/6 Stations Online
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={togglePause}
                data-testid="button-resume-play"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#139c73] bg-ok font-display text-lg font-extrabold text-deep hover:brightness-110"
              >
                <Play className="h-5 w-5 fill-current" />
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleRestart}
                data-testid="button-pause-restart"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dim/30 bg-plate font-display text-base font-extrabold text-ink hover:border-aqua"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Run
              </button>
              <button
                type="button"
                onClick={() => go('/')}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dim/30 bg-deep font-display text-base font-bold text-dim hover:text-ink"
              >
                <Users className="h-4 w-4" />
                Change Astronaut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return-to-Earth Rocket Evacuation Animation (Plays Before Game Over!) */}
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
