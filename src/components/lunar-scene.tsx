import { type KeyboardEvent } from 'react';
import type { ModuleId, ResourceKey } from '@/content/mission';
import { MODULES } from '@/content/mission';
import type { EventChoice, SystemSettings } from '@/game/engine';
import { RESOURCE_TO_MODULE } from '@/game/scoring';

export type ModuleStatus = { level: 'ok' | 'warn' | 'bad' | 'off'; text: string };
export interface SceneVisualState {
  cycle: number;
  solar: number;
  mode: SystemSettings['mode'];
  greenhouseOn: boolean;
  recyclerOn: boolean;
  commsOn: boolean;
  eventChoice: EventChoice;
  shieldingLevel: number;
  backupCharges: number;
  activeStatus: 'active' | 'success' | 'failed';
  failedResources?: ResourceKey[];
  spotlightId?: ModuleId | null;
  spotlightModules?: ModuleId[];
  pulseModules?: ModuleId[];
  recoveringModules?: ModuleId[];
  commsPingStage?: 'idle' | 'out' | 'back' | 'done';
}

const COL = { ok: '#35d2a0', warn: '#ffc76b', bad: '#ff727e', off: '#7e8ba8' };

const POS: Record<ModuleId, { x: number; y: number }> = {
  solar: { x: 135, y: 335 },
  greenhouse: { x: 300, y: 414 },
  habitat: { x: 485, y: 372 },
  recycler: { x: 655, y: 422 },
  shelter: { x: 805, y: 392 },
  comms: { x: 922, y: 238 },
};

const CHILD_LABEL: Record<ModuleId, string> = {
  solar: 'Sun Power',
  greenhouse: 'Plant Food',
  habitat: 'Crew Home',
  recycler: 'Water',
  shelter: 'Shield',
  comms: 'Radio',
};

const CHILD_OUTPUT_CHIP: Record<ModuleId, string> = {
  solar: '⚡',
  greenhouse: '🍎',
  habitat: '💨',
  recycler: '💧',
  shelter: '🛡️',
  comms: '★',
};

function ModuleIconGlyph({ id, color }: { id: ModuleId; color: string }) {
  switch (id) {
    case 'solar':
      return <path d="M-2 -8 L-6 1 H0 L-2 8 L6 -1 H0 Z" fill={color} />;
    case 'greenhouse':
      return <path d="M0 7 V-1 M0 1 C-6 -1 -6 -8 0 -8 C6 -8 6 -1 0 1 Z" fill={color} />;
    case 'habitat':
      return (
        <g fill={color}>
          <path d="M-7 5 v-2 a7 7 0 0 1 14 0 v2 z" />
          <circle cx="0" cy="-5" r="2.2" />
        </g>
      );
    case 'recycler':
      return <path d="M0 -8 C4 -3 6 0 6 3 A6 6 0 0 1 -6 3 C-6 0 -4 -3 0 -8 Z" fill={color} />;
    case 'shelter':
      return <path d="M0 -8 L7 -4 V2 C7 6 0 9 0 9 C0 9 -7 6 -7 2 V-4 Z" fill={color} />;
    case 'comms':
      return <path d="M-6 5 A8 8 0 0 1 6 5 M-3 2 A4 4 0 0 1 3 2 M0 6 V-1" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />;
  }
}

function FaultWrenchBadge({ color = '#ffc76b', ringColor = '#ffc76b' }: { color?: string; ringColor?: string }) {
  return (
    <g transform="translate(46 -92)" aria-hidden>
      <circle r="14" fill="#111a35" stroke={ringColor} strokeWidth="2.2" />
      <path
        d="M-4.5 4.5 L4.5 -4.5 M2 -6.5 A3.5 3.5 0 0 1 6.5 -2 L3.5 -1.5 L1.5 -3.5 Z"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
}

/* Placeholder crew silhouettes until Scenario AI `public/assets/astronaut.png` is uploaded */
function AstronautSilhouette({ x, y, scale = 1, celebrating = false }: { x: number; y: number; scale?: number; celebrating?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden>
      <ellipse cx="0" cy="2" rx="7" ry="2.5" fill="#080d1f" opacity="0.45" />
      <rect x="-4" y="-14" width="8" height="11" rx="3" fill="#e6ecf8" />
      <rect x="-6" y="-13" width="2.5" height="7" rx="1.2" fill="#9fb4dc" />
      {celebrating && (
        <path d="M4 -12 L10 -20" stroke="#e6ecf8" strokeWidth="2.6" strokeLinecap="round" />
      )}
      <circle cx="0" cy="-19" r="5" fill="#f5f7ff" />
      <rect x="-3" y="-21" width="6" height="3.5" rx="1.5" fill="#35d9e8" />
      <rect x="-3.5" y="-3" width="2.5" height="4" rx="1" fill="#abb8d5" />
      <rect x="1" y="-3" width="2.5" height="4" rx="1" fill="#abb8d5" />
    </g>
  );
}

// TODO: Scenario AI art layer hook — when Scenario AI assets in src/content/assets.ts are
// uploaded to public/assets/, swap or layer <image href={...} /> sprites cleanly inside <Art />
// while keeping the independent SVG/DOM hitboxes intact.
function Art({ id, status, visual }: { id: ModuleId; status: ModuleStatus; visual?: SceneVisualState }) {
  const lowSun = visual ? visual.solar < 12 : false;
  const active = visual ? visual.activeStatus === 'active' : true;
  const fault = status.level === 'bad' || status.level === 'warn';
  const c3Unrepaired = Boolean(visual && active && visual.cycle === 3 && visual.recyclerOn && visual.eventChoice !== 'repair');
  const c5Unrepaired = Boolean(visual && active && visual.cycle === 5 && visual.greenhouseOn && visual.eventChoice !== 'repair');

  switch (id) {
    case 'solar': {
      const panelStroke = lowSun ? '#ffc76b' : '#4f8cff';
      const panelFill = lowSun ? '#18244a' : '#1f4594';
      const batteryActive = visual && active && visual.cycle === 2 && visual.eventChoice === 'battery';
      return (
        <g>
          {!lowSun && (
            <ellipse cx="0" cy="-64" rx="68" ry="44" fill="#ffc76b" fillOpacity="0.14" />
          )}
          {[-50, -18, 14].map((dx) => (
            <g key={dx}>
              <rect x={dx + 14} y={-20} width="4" height="40" fill="#6b7899" />
              <rect x={dx} y={-110} width="30" height="92" rx="3" fill={panelFill} stroke={panelStroke} strokeWidth="1.75" />
              {[0, 1, 2, 3].map((r) => (
                <line key={r} x1={dx} x2={dx + 30} y1={-110 + 23 * (r + 1)} y2={-110 + 23 * (r + 1)} stroke={panelStroke} strokeOpacity=".55" />
              ))}
              <line x1={dx + 15} x2={dx + 15} y1={-110} y2={-18} stroke={panelStroke} strokeOpacity=".55" />
            </g>
          ))}
          {/* Low polar shadow overlay on Cycle 2 */}
          {lowSun && active && (
            <path d="M-58 -110 L46 -18 L46 0 L-58 0 Z" fill="#080d1f" fillOpacity="0.48" />
          )}
          {/* Auxiliary Backup Battery pack beside Solar Array */}
          <g transform="translate(56 -24)">
            <rect
              x="-10"
              y="-14"
              width="20"
              height="26"
              rx="4"
              fill={batteryActive ? '#173832' : '#192647'}
              stroke={batteryActive ? '#35d2a0' : (visual?.backupCharges ?? 0) > 0 ? '#ffc76b' : '#6b7899'}
              strokeWidth="1.6"
            />
            <rect x="-4" y="-17" width="8" height="3" rx="1" fill="#abb8d5" />
            <path d="M0 -8 L-3 -1 H1 L-1 6 L4 -2 H0 Z" fill={batteryActive ? '#35d2a0' : (visual?.backupCharges ?? 0) > 0 ? '#ffc76b' : '#6b7899'} />
          </g>
        </g>
      );
    }

    case 'habitat': {
      const modeGlow = visual?.mode === 'boost' ? 0.95 : visual?.mode === 'eco' ? 0.38 : 0.72;
      const winColor = status.level === 'bad' ? '#ff727e' : '#35d9e8';
      return (
        <g>
          <ellipse cx="0" cy="-36" rx="92" ry="48" fill={winColor} fillOpacity={visual?.mode === 'boost' ? 0.16 : 0.08} />
          <rect x="-82" y="-52" width="164" height="52" rx="26" fill="#c9d1e6" />
          <rect x="-82" y="-52" width="164" height="52" rx="26" fill="url(#hullShade)" />
          <path d="M-46 -52 a46 46 0 0 1 92 0" fill="#dfe5f5" />
          {[-50, -25, 0, 25, 50].map((x) => (
            <circle key={x} cx={x} cy="-26" r="6.5" fill={winColor} fillOpacity={modeGlow} />
          ))}
          <rect x="-14" y="-98" width="28" height="10" rx="3" fill="#ffc76b" />
          {visual?.mode === 'boost' && (
            <path d="M-58 -54 a58 46 0 0 1 116 0" fill="none" stroke="#35d2a0" strokeWidth="2.5" strokeDasharray="6 6" />
          )}
        </g>
      );
    }

    case 'greenhouse': {
      const on = visual ? visual.greenhouseOn : status.level !== 'off';
      const c5Alert = Boolean(visual && active && visual.cycle === 5);
      return (
        <g opacity={on ? (c5Unrepaired ? 0.72 : 1) : 0.42}>
          {on && !c5Unrepaired && (
            <ellipse cx="0" cy="-34" rx="70" ry="38" fill="#35d2a0" fillOpacity="0.16" />
          )}
          <path
            d="M-62 0 v-32 a62 42 0 0 1 124 0 v32 z"
            fill={c5Unrepaired ? '#3c3348' : on ? '#35d2a0' : '#4a5574'}
            fillOpacity={on ? '.22' : '.16'}
            stroke={c5Unrepaired ? '#ffc76b' : on ? '#35d2a0' : '#6b7899'}
            strokeWidth="2.2"
          />
          {[-40, -20, 0, 20, 40].map((x) => (
            <line
              key={x}
              x1={x}
              x2={x}
              y1="0"
              y2={-Math.sqrt(Math.max(0, 1 - (x / 62) ** 2)) * 42 - 32}
              stroke={c5Unrepaired ? '#abb8d5' : on ? '#35d2a0' : '#6b7899'}
              strokeOpacity=".45"
            />
          ))}
          {[-36, -12, 12, 36].map((x) => (
            <path key={x} d={`M${x} -4 q-7 -15 0 -24 q7 9 0 24`} fill={on && !c5Unrepaired ? '#35d2a0' : '#6b7899'} />
          ))}
          <rect
            x="-50"
            y="-62"
            width="100"
            height="4.5"
            rx="2"
            className={c5Unrepaired ? 'lamp-blink' : undefined}
            fill={c5Unrepaired ? '#ff727e' : on ? '#ff9ad5' : '#4a5574'}
            fillOpacity={on ? '.9' : '.35'}
          />
          {c5Alert && !on && (
            <g transform="translate(0 -32)" aria-hidden>
              <circle r="10" fill="#111a35" stroke="#7e8ba8" strokeWidth="1.6" />
              <path d="M0 -5 V1 M-4 -3 A5 5 0 1 0 4 -3" stroke="#abb8d5" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </g>
          )}
          {c5Unrepaired && (
            <g transform="translate(0 -88)" aria-hidden>
              <path d="M0 -13 L12 9 H-12 Z" fill="#ffc76b" stroke="#111a35" strokeWidth="1.5" />
              <rect x="-1.2" y="-5" width="2.4" height="7" rx="1" fill="#111a35" />
              <circle cx="0" cy="5" r="1.4" fill="#111a35" />
            </g>
          )}
        </g>
      );
    }

    case 'recycler': {
      const on = visual ? visual.recyclerOn : status.level !== 'off';
      return (
        <g opacity={on ? 1 : 0.45}>
          <rect x="-56" y="-62" width="35" height="62" rx="10" fill="#9fb4dc" />
          <rect x="-15" y="-48" width="35" height="48" rx="10" fill="#8aa2cf" />
          <rect x="26" y="-38" width="30" height="38" rx="8" fill="#9fb4dc" />
          {/* Loop pipes */}
          <path
            d="M-21 -30 h6 M20 -20 h6"
            stroke={c3Unrepaired ? '#ffc76b' : on ? '#35d9e8' : '#6b7899'}
            strokeWidth="4.5"
            strokeLinecap="round"
            className={on && !c3Unrepaired ? 'flow-stream' : undefined}
          />
          <circle cx="-38" cy="-40" r="8" fill={c3Unrepaired ? '#ffc76b' : on ? '#35d9e8' : '#4a5574'} fillOpacity={on ? '.85' : '.35'} />
          {/* Reduced flow trickle when ON with C3 fault (never claim a leak); full flow when repaired/healthy */}
          {on && c3Unrepaired && (
            <g aria-hidden>
              <path
                d="M2 -31 C4.5 -27 5.5 -25 5.5 -23.5 A3.5 3.5 0 0 1 -1.5 -23.5 C-1.5 -25 -0.5 -27 2 -31 Z"
                fill="#ffc76b"
                className="trickle-drop"
              />
            </g>
          )}
          {on && !c3Unrepaired && (
            <>
              <circle cx="-38" cy="-40" r="12" fill="none" stroke="#35d9e8" strokeWidth="1.5" strokeOpacity="0.65" />
              <path d="M2 -34 C6 -29 7 -26 7 -24 A5 5 0 0 1 -3 -24 C-3 -26 -2 -29 2 -34 Z" fill="#35d9e8" fillOpacity="0.9" />
            </>
          )}
          {c3Unrepaired && <FaultWrenchBadge color="#ffc76b" ringColor="#ffc76b" />}
        </g>
      );
    }

    case 'shelter': {
      const stormAlert = Boolean(visual && active && visual.cycle === 4);
      const shieldUpgraded = (visual?.shieldingLevel ?? 1) >= 2 || (visual && active && visual.cycle === 4 && visual.eventChoice === 'shield');
      const sheltering = Boolean(visual && active && visual.cycle === 4 && visual.eventChoice === 'shelter');
      return (
        <g>
          {/* Thick physical regolith masonry & reinforced bunker (no sci-fi force-field bubble) */}
          {(shieldUpgraded || sheltering) && (
            <path
              d="M-84 0 q12 -82 84 -84 q72 2 84 84"
              fill="none"
              stroke={shieldUpgraded ? '#35d2a0' : '#35d9e8'}
              strokeWidth="3"
              strokeOpacity="0.45"
              className="pulse-soft"
            />
          )}
          <path d="M-78 0 q10 -74 78 -76 q68 2 78 76 z" fill="#545e78" stroke={shieldUpgraded ? '#35d2a0' : stormAlert ? '#ffc76b' : '#444e68'} strokeWidth="2.5" />
          <path d="M-76 0 q10 -72 76 -74 q66 2 76 74 z" fill="url(#regolith)" />
          {shieldUpgraded && (
            <path d="M-64 -4 q8 -56 64 -58 q56 2 64 58" fill="none" stroke="#35d2a0" strokeWidth="2.5" strokeOpacity="0.75" />
          )}
          <rect x="-15" y="-32" width="30" height="32" rx="4" fill="#111a35" stroke={shieldUpgraded ? '#35d2a0' : sheltering ? '#35d9e8' : '#ffc76b'} strokeWidth="2.4" />
          <path
            d="M0 -58 L9 -54 V-47 C9 -42 0 -39 0 -39 C0 -39 -9 -42 -9 -47 V-54 Z"
            fill={shieldUpgraded ? '#35d2a0' : sheltering ? '#35d9e8' : stormAlert ? '#ffc76b' : '#abb8d5'}
            fillOpacity="0.9"
          />
        </g>
      );
    }

    case 'comms': {
      const on = visual ? visual.commsOn : status.level !== 'off';
      return (
        <g opacity={on ? 1 : 0.55}>
          <rect x="-3" y="-90" width="6" height="90" fill="#9fb4dc" />
          <path d="M-20 0 L0 -40 L20 0" fill="none" stroke="#9fb4dc" strokeWidth="2.2" />
          <g transform="translate(0 -100) rotate(-32)">
            <path d="M-34 0 a34 20 0 0 0 68 0 z" fill="#dfe5f5" stroke="#abb8d5" />
            <line x1="0" y1="0" x2="0" y2="-26" stroke="#dfe5f5" strokeWidth="2" />
            <circle cx="0" cy="-28" r="3.5" fill={on ? '#35d9e8' : '#6b7899'} />
            {on && (
              <>
                <path d="M-14 -38 a18 18 0 0 1 28 0" fill="none" stroke="#35d9e8" strokeWidth="2" strokeLinecap="round" />
                <path d="M-22 -46 a28 28 0 0 1 44 0" fill="none" stroke="#35d9e8" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </g>
          {fault && <circle cx="0" cy="-128" r="5" fill="#ffc76b" />}
        </g>
      );
    }
  }
}

export function LunarScene({
  statuses,
  onSelect,
  selected,
  visual,
  compactLabels = false,
}: {
  statuses: Record<ModuleId, ModuleStatus>;
  onSelect: (id: ModuleId) => void;
  selected?: ModuleId | null;
  visual?: SceneVisualState;
  compactLabels?: boolean;
}) {
  const key = (id: ModuleId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };

  const lowSun = visual ? visual.solar < 12 : false;
  const stormAlert = visual && visual.activeStatus === 'active' && visual.cycle === 4;
  const missionSucceeded = visual?.activeStatus === 'success';
  const missionFailed = visual?.activeStatus === 'failed';
  const failedModuleSet = new Set<ModuleId>(
    missionFailed ? (visual?.failedResources ?? []).map((rk) => RESOURCE_TO_MODULE[rk]) : [],
  );
  const spotlightSet = new Set<ModuleId>([
    ...(visual?.spotlightId ? [visual.spotlightId] : []),
    ...(visual?.spotlightModules ?? []),
  ]);
  const hasSpotlight = spotlightSet.size > 0;
  const pulseSet = new Set<ModuleId>(visual?.pulseModules ?? []);
  const recoveringSet = new Set(visual?.recoveringModules ?? []);
  const ping = visual?.commsPingStage ?? 'idle';

  return (
    <svg
      viewBox="0 0 1000 540"
      className="h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Interactive lunar outpost. Select any building to control systems or inspect details."
      data-testid="scene-base"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b1b" />
          <stop offset="1" stopColor="#111a35" />
        </linearGradient>
        <radialGradient id="sun" cx="0.04" cy="0.58" r="0.52">
          <stop offset="0" stopColor="#ffc76b" stopOpacity={lowSun ? '.16' : '.58'} />
          <stop offset="1" stopColor="#ffc76b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="earth" cx=".35" cy=".35">
          <stop offset="0" stopColor="#7fd3ff" />
          <stop offset=".6" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#1b3270" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3c4666" />
          <stop offset="1" stopColor="#18203d" />
        </linearGradient>
        <linearGradient id="hullShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".2" />
          <stop offset="1" stopColor="#111a35" stopOpacity=".5" />
        </linearGradient>
        <pattern id="regolith" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#8b94ad" fillOpacity=".5" />
          <circle cx="6" cy="5" r=".8" fill="#2a3150" />
        </pattern>
      </defs>

      {/* Deep Lunar Sky */}
      <rect width="1000" height="540" fill="url(#sky)" pointerEvents="none" />
      <g pointerEvents="none">
        {Array.from({ length: 56 }, (_, i) => (
          <circle
            key={i}
            opacity={0.3 + (i % 5) * 0.15}
            cx={(i * 173) % 1000}
            cy={(i * 97) % 235}
            r={(i % 3) * 0.5 + 0.6}
            fill="#f5f7ff"
          />
        ))}
      </g>

      {/* Low South-Pole Sun Glow */}
      <rect width="1000" height="540" fill="url(#sun)" pointerEvents="none" />

      {/* Cycle 4 Gentle Solar-Energy Sky Effect (stylized teaching cue, not a measurement) */}
      {stormAlert && (
        <g pointerEvents="none" aria-hidden>
          <rect width="1000" height="300" fill="#ffc76b" fillOpacity="0.06" />
          <g className="solar-wave">
            <path d="M40 72 Q220 40 420 78 T860 58" fill="none" stroke="#ffc76b" strokeOpacity="0.32" strokeWidth="2.5" strokeDasharray="10 10" />
            <path d="M120 112 Q310 82 520 116 T940 94" fill="none" stroke="#ff727e" strokeOpacity="0.24" strokeWidth="2" strokeDasharray="8 12" />
          </g>
        </g>
      )}

      {/* Earth in Sky */}
      <g className="drift" pointerEvents="none">
        <circle cx="755" cy="96" r="34" fill="url(#earth)" />
        <path d="M743 76 q14 6 8 20 q-10 6 -16 -6z M765 104 q10 -4 14 6 q-6 8 -14 -6z" fill="#35d2a0" fillOpacity=".75" />
        <text x="755" y="150" textAnchor="middle" fill="#abb8d5" fontSize="11.5" fontFamily="JetBrains Mono">EARTH</text>
      </g>

      {/* Live Send-to-Earth Teaching Ping Beam (never changes game state) */}
      {(ping === 'out' || ping === 'back') && (
        <g aria-hidden pointerEvents="none">
          <line x1="905" y1="142" x2="780" y2="104" stroke="#35d9e8" strokeWidth="2.5" strokeDasharray="6 6" />
          <circle cx={ping === 'out' ? 842 : 880} cy={ping === 'out' ? 123 : 134} r="6" fill={ping === 'out' ? '#35d9e8' : '#35d2a0'} />
        </g>
      )}

      {/* Distant Crater Ridge & Regolith Terrain */}
      <g pointerEvents="none">
        <path d="M0 300 L90 262 L180 286 L260 242 L380 292 L470 272 L600 302 L720 256 L840 290 L1000 266 V540 H0 Z" fill="#222a47" />
        <path d="M0 332 Q200 302 400 332 T800 322 T1000 332 V540 H0 Z" fill="url(#ground)" />
        <path d="M0 332 L1000 362 L1000 382 L0 352Z" fill="#080d1f" opacity=".24" />
        <ellipse cx="420" cy="496" rx="120" ry="18" fill="#141a35" />
        <ellipse cx="420" cy="492" rx="110" ry="13" fill="#2b3456" />
        <ellipse cx="870" cy="510" rx="70" ry="10" fill="#141a35" />

        {/* Sparse Surface Rover/Footprint Path */}
        <path d="M330 415 Q410 400 485 385 Q580 398 655 422 Q730 412 805 395" fill="none" stroke="#8b94ad" strokeOpacity="0.24" strokeWidth="10" strokeLinecap="round" />

        {/* Power & Water Cables */}
        <g fill="none" stroke="#35d9e8" strokeOpacity=".58" strokeWidth="2.2">
          <path className="cable" d="M135 335 Q285 430 485 372" />
          <path className="cable" d="M485 372 Q580 432 655 422" />
          <path className="cable" d="M300 414 Q395 410 485 372" />
          <path className="cable" d="M485 372 Q665 390 805 392" />
          <path className="cable" d="M805 392 Q885 322 922 238" />
        </g>

        {/* Sparse stylized astronauts on base paths (friendly wave on mission success; safe indoors on shelter/fail) */}
        {missionSucceeded ? (
          <g aria-hidden>
            <AstronautSilhouette x={392} y={392} scale={1} celebrating />
            <AstronautSilhouette x={432} y={396} scale={0.95} celebrating />
            <AstronautSilhouette x={552} y={398} scale={0.95} celebrating />
            <AstronautSilhouette x={588} y={395} scale={0.9} celebrating />
            {/* Happy illuminated Base Ready sign over Habitat courtyard */}
            <g transform="translate(485 184)">
              <rect x="-74" y="-16" width="148" height="28" rx="14" fill="#13312f" stroke="#35d2a0" strokeWidth="2" />
              <text y="2" textAnchor="middle" fill="#35d2a0" fontSize="13" fontWeight="800" fontFamily="Outfit">
                BASE READY!
              </text>
            </g>
          </g>
        ) : !(stormAlert && visual?.eventChoice === 'shelter') && !missionFailed ? (
          <>
            <AstronautSilhouette x={410} y={392} scale={0.95} />
            <AstronautSilhouette x={570} y={398} scale={0.9} />
          </>
        ) : null}
      </g>

      {/* Subtle warm celebration glow when mission succeeded */}
      {missionSucceeded && (
        <ellipse cx="490" cy="360" rx="410" ry="140" fill="#35d2a0" fillOpacity="0.07" pointerEvents="none" />
      )}

      {/* Spotlight dim scrim during Guided Picture Intro or Active Event Spotlight */}
      {hasSpotlight && (
        <rect width="1000" height="540" fill="#070b1b" fillOpacity="0.52" pointerEvents="none" />
      )}

      {/* 6 Interactive Base Buildings */}
      {MODULES.map((m) => {
        const p = POS[m.id];
        const st = statuses[m.id];
        const isSel = selected === m.id;
        const isSpot = spotlightSet.has(m.id);
        const isPulsing = pulseSet.has(m.id);
        const isRecovering = recoveringSet.has(m.id);
        const isAffectedFail = failedModuleSet.has(m.id);
        const dimmed = (hasSpotlight && !isSpot) || isAffectedFail;
        const col = isAffectedFail ? COL.warn : COL[st.level];
        const isAttention =
          !hasSpotlight &&
          visual?.activeStatus === 'active' &&
          ((visual.cycle === 2 && m.id === 'solar' && visual.eventChoice === 'none') ||
            (visual.cycle === 3 && m.id === 'recycler' && visual.eventChoice !== 'repair') ||
            (visual.cycle === 4 && m.id === 'shelter' && visual.eventChoice === 'none') ||
            (visual.cycle === 5 && m.id === 'greenhouse' && visual.eventChoice === 'none'));
        const isOff = st.level === 'off';

        return (
          <g
            key={m.id}
            transform={`translate(${p.x} ${p.y})`}
            opacity={isAffectedFail ? 0.38 : dimmed ? 0.36 : 1}
            className="module-group"
            role="button"
            tabIndex={0}
            aria-label={`${m.name} (${CHILD_LABEL[m.id]}). Status: ${st.text}. Tap to inspect or adjust.`}
            onClick={() => onSelect(m.id)}
            onKeyDown={key(m.id)}
            data-testid={`button-module-${m.id}`}
            data-spotlight={isSpot ? 'true' : 'false'}
          >
            <g className="module-hit" pointerEvents="all">
              {/* Explicit full-footprint hitbox so sparse SVGs capture clicks reliably */}
              <rect
                x={m.id === 'comms' ? -68 : -74}
                y="-172"
                width={m.id === 'comms' ? 136 : 148}
                height="246"
                rx="14"
                fill="transparent"
                pointerEvents="all"
              />
              {(isSpot || isSel || isPulsing || isAttention || st.level === 'bad' || isRecovering) && (
                <ellipse
                  cx="0"
                  cy="4"
                  rx="102"
                  ry="20"
                  className={(isPulsing || isAttention) && !isSpot ? 'pulse-soft' : undefined}
                  fill={isSpot ? '#35d9e8' : isRecovering ? '#35d2a0' : isAttention ? '#ffc76b' : isPulsing ? '#4f8cff' : st.level === 'bad' ? '#ff727e' : 'none'}
                  fillOpacity={isSpot ? 0.18 : isRecovering ? 0.16 : isAttention ? 0.18 : isPulsing ? 0.12 : st.level === 'bad' ? 0.12 : 0}
                  stroke={isRecovering ? '#35d2a0' : isSpot ? '#35d9e8' : isAttention ? '#ffc76b' : isPulsing ? '#4f8cff' : st.level === 'bad' ? '#ff727e' : '#35d9e8'}
                  strokeWidth={isSpot || isAttention ? '3.4' : '2.2'}
                  strokeDasharray={isSpot || isAttention ? undefined : '6 5'}
                />
              )}
              <ellipse className="module-ring" style={isSel ? { opacity: 1 } : undefined} cx="0" cy="4" rx="94" ry="16" fill="none" stroke="#35d9e8" strokeWidth="2.5" strokeDasharray="6 5" />
              <ellipse cx="0" cy="4" rx="80" ry="10" fill="#080d1f" opacity=".48" />

              <Art id={m.id} status={st} visual={visual} />

              {/* Status beacon above module */}
              <g transform="translate(0 -142)">
                <circle r="14" fill="#111a35" stroke={col} strokeWidth="2.2" />
                <ModuleIconGlyph id={m.id} color={col} />
                {(st.level === 'bad' || st.level === 'warn' || isSpot || isPulsing || isAttention || isRecovering) && (
                  <circle r="14" fill="none" stroke={isRecovering ? '#35d2a0' : isAttention ? '#ffc76b' : isSpot ? '#35d9e8' : isPulsing ? '#4f8cff' : col} strokeWidth="2.5" className="beacon" />
                )}
              </g>

              {/* Bouncing visual TAP! pointer on urgent cycle buildings */}
              {isAttention && (
                <g transform="translate(0 -174)" className="bounce-gentle" aria-hidden>
                  <rect x="-24" y="-14" width="48" height="20" rx="10" fill="#ffc76b" />
                  <text y="0" textAnchor="middle" fill="#080d1f" fontSize="11" fontWeight="800" fontFamily="Outfit">
                    TAP!
                  </text>
                  <path d="M-5 6 L0 12 L5 6 Z" fill="#ffc76b" />
                </g>
              )}

              {/* High-contrast kid-friendly nameplate under module */}
              <g transform="translate(0 26)">
                <rect x="-72" y="-2" width="144" height={compactLabels ? '30' : '42'} rx="12" fill="#0f1730" fillOpacity=".96" stroke={isAttention ? '#ffc76b' : col} strokeOpacity=".85" strokeWidth="2" />
                <text y="16" textAnchor="middle" fill="#f5f7ff" fontSize="14" fontWeight="700" fontFamily="Outfit">
                  {CHILD_LABEL[m.id]}
                </text>
                {!compactLabels && (
                  <text y="33" textAnchor="middle" fill={isAttention ? '#ffc76b' : col} fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono">
                    {isOff
                      ? 'OFF'
                      : isAttention
                        ? 'NEEDS HELP!'
                        : m.id === 'solar'
                          ? `⚡ +${visual?.solar ?? 0} SUN`
                          : m.id === 'habitat'
                            ? `💨 ${visual?.mode === 'eco' ? 'SLOW' : visual?.mode === 'boost' ? 'FAST' : 'NORMAL'}`
                            : m.id === 'shelter'
                              ? `🛡️ LVL ${visual?.shieldingLevel ?? 1}`
                              : `${CHILD_OUTPUT_CHIP[m.id]} ${st.text.toUpperCase()}`}
                  </text>
                )}
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
