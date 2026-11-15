import { ArrowRight, BatteryCharging, Droplets, Radio, Shield, Sparkles, Sprout, Sun, Volume2, Wind, Zap } from 'lucide-react';
import { MODES, type ModuleId } from '@/content/mission';
import type { Decision, Review } from '@/game/engine';
import { speakText } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { btn } from '@/components/kit';

export interface ModuleVisualLessonProps {
  id: ModuleId;
  mode: Decision['mode'];
  solar: number;
  backupCharges: number;
  shieldingLevel: number;
  recyclerOn: boolean;
  greenhouseOn: boolean;
  commsOn: boolean;
  cycle: number;
  commsStage?: 'idle' | 'out' | 'back' | 'done';
  onSendEarth?: () => void;
  detailsMode?: boolean;
}

interface LessonMeta {
  alt: string;
  caption: string;
  speak: string;
  inputLabel: string;
  outputLabel: string;
}

function getLessonMeta(props: ModuleVisualLessonProps): LessonMeta {
  const { id, mode, solar, backupCharges, shieldingLevel, recyclerOn, greenhouseOn, commsOn, cycle } = props;
  switch (id) {
    case 'habitat': {
      const m = MODES[mode];
      const kidName = mode === 'eco' ? 'Slow' : mode === 'boost' ? 'Fast' : 'Normal';
      return {
        alt: `Diagram: Power (${m.power}) flows into the Habitat air unit, producing Breathable Air (${m.air}) for 4 astronauts.`,
        caption: `${kidName} Air: -${m.power} Power → +${m.air} Air (Crew uses 10)`,
        speak: `Crew Home air unit uses ${m.power} power to make ${m.air} air. Slow saves power, Fast makes extra air.`,
        inputLabel: `-${m.power} Power`,
        outputLabel: `+${m.air} Air`,
      };
    }
    case 'solar':
      return {
        alt: `Diagram: Low polar sunlight hits the Solar Array, generating +${solar} Power, with ${backupCharges} stored backup battery available.`,
        caption: `Sun (+${solar} Power) + Battery (×${backupCharges}) → Base Electricity`,
        speak: `Sunlight hits the tall solar panels to make ${solar} power this cycle. Backup batteries store extra power for shadows.`,
        inputLabel: cycle === 2 ? 'Low Sun' : 'Polar Sun',
        outputLabel: `+${solar} Power`,
      };
    case 'recycler': {
      const out = !recyclerOn ? 0 : cycle === 3 ? 4 : 12;
      return {
        alt: `Diagram: Used water and 6 Power enter the Water Recycler loop, producing +${out} clean water.`,
        caption: recyclerOn ? `-6 Power + Used Water → +${out} Clean Water` : 'Recycler OFF: 0 Power used → 0 Water recovered',
        speak: recyclerOn
          ? `The water recycler uses 6 power to clean used water in a loop, recovering ${out} water.`
          : 'The water recycler is switched off, so it uses no power and recovers no water.',
        inputLabel: recyclerOn ? '-6 Power + Used' : 'OFF (0 Power)',
        outputLabel: `+${out} Water`,
      };
    }
    case 'greenhouse': {
      const out = !greenhouseOn ? 0 : cycle === 5 ? 0 : 12;
      return {
        alt: `Diagram: 5 Water and 8 Power enter the Greenhouse, growing +${out} Food plants.`,
        caption: greenhouseOn
          ? cycle === 5
            ? '-8 Power · -5 Water → Grow-light fault (Fix for +12 Food)'
            : '-8 Power + -5 Water → +12 Fresh Food'
          : 'Greenhouse OFF: 0 Power & Water → 0 Food',
        speak: greenhouseOn
          ? 'The greenhouse needs 8 power and 5 water to grow 12 food under grow lights.'
          : 'The greenhouse is off, saving power and water while growing no food.',
        inputLabel: greenhouseOn ? '-8 Pwr · -5 Water' : 'OFF',
        outputLabel: `+${out} Food`,
      };
    }
    case 'shelter':
      return {
        alt: `Diagram: Solar particle warning waves hit the thick lunar soil Shelter at Shield Level ${shieldingLevel}, protecting astronauts inside. Simplified training model.`,
        caption: `Shield Level ${shieldingLevel} Regolith Wall → Protects Crew Safety`,
        speak: `Thick lunar soil walls and shelter procedures help shield astronauts from space radiation. Simplified training model, not a real dose.`,
        inputLabel: 'Solar Particles',
        outputLabel: `Safe Crew (Lv ${shieldingLevel})`,
      };
    case 'comms':
      return {
        alt: 'Diagram: Radio ping animation between Moon dish and Earth across 384,400 km (~1.3 seconds one-way, ~2.6 seconds round-trip; total delay varies).',
        caption: commsOn
          ? 'Comm ON: -4 Power → +5 Science when cycle runs (~1.3s Moon→Earth)'
          : 'Comm OFF: Enable Radio to test Send to Earth (~1.3s one-way)',
        speak: 'Radio signals travel at the speed of light between the Moon and Earth in about 1.3 seconds one way, or 2.6 seconds round trip. Real delays vary.',
        inputLabel: commsOn ? '-4 Pwr on Launch' : 'OFF',
        outputLabel: commsOn ? '+5 Sci on Launch' : '0 Sci',
      };
  }
}

export function ModuleVisualLesson(props: ModuleVisualLessonProps) {
  const { id, mode, solar, backupCharges, shieldingLevel, recyclerOn, greenhouseOn, commsOn, cycle, commsStage = 'idle', onSendEarth, detailsMode } = props;
  const meta = getLessonMeta(props);
  const busyComms = commsStage === 'out' || commsStage === 'back';

  return (
    <div
      className="rounded-2xl border border-aqua/30 bg-deep/75 p-3"
      role="region"
      aria-label={`${id} visual lesson`}
      data-testid={`visual-lesson-${id}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-aqua">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          <span>How It Works</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-plate/80 px-2 py-0.5 font-mono text-[10px] text-warn">{meta.inputLabel}</span>
          <ArrowRight className="h-3 w-3 text-aqua" aria-hidden />
          <span className="rounded-md bg-plate/80 px-2 py-0.5 font-mono text-[10px] text-ok">{meta.outputLabel}</span>
          <button
            type="button"
            onClick={() => speakText(meta.speak, true)}
            className="ml-1 grid h-7 w-7 place-items-center rounded-lg border border-dim/25 bg-plate text-aqua hover:border-aqua"
            aria-label={`Read ${id} lesson aloud`}
            data-testid={`button-speak-lesson-${id}`}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Picture-first SVG flow diagram: object -> resource used -> resource produced */}
      <svg
        viewBox="0 0 360 104"
        className="h-24 w-full rounded-xl border border-dim/15 bg-[#080d1f]"
        role="img"
        aria-label={meta.alt}
      >
        <defs>
          <marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#35d9e8" />
          </marker>
        </defs>

        {id === 'habitat' && (
          <g>
            {/* Input: Power Bolt */}
            <g transform="translate(52 50)">
              <circle r="22" fill="#192647" stroke="#ffc76b" strokeWidth="1.8" />
              <path d="M2 -12 L-7 2 H0 L-2 12 L8 -2 H1 Z" fill="#ffc76b" />
              <text y="34" textAnchor="middle" fill="#ffc76b" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">-{MODES[mode].power} PWR</text>
            </g>
            <path d="M80 50 H122" stroke="#35d9e8" strokeWidth="2.5" className="flow-stream" markerEnd={`url(#arrow-${id})`} />
            {/* Object: Habitat Air Unit */}
            <g transform="translate(180 54)">
              <rect x="-42" y="-22" width="84" height="34" rx="16" fill="#c9d1e6" />
              <path d="M-22 -22 a22 18 0 0 1 44 0" fill="#dfe5f5" />
              <circle cx="-16" cy="-6" r="4" fill="#35d9e8" />
              <circle cx="0" cy="-6" r="4" fill="#35d9e8" />
              <circle cx="16" cy="-6" r="4" fill="#35d9e8" />
              <text y="30" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">AIR UNIT</text>
            </g>
            <path d="M234 50 H276" stroke="#35d9e8" strokeWidth="2.5" className="flow-stream" markerEnd={`url(#arrow-${id})`} />
            {/* Output: Breathable Air + Astronaut */}
            <g transform="translate(310 50)">
              <circle r="22" fill="#143238" stroke="#35d2a0" strokeWidth="1.8" />
              <circle cx="-3" cy="-5" r="6" fill="#f5f7ff" />
              <rect x="-7" y="-7" width="8" height="4" rx="1.5" fill="#35d9e8" />
              <path d="M-10 10 C-6 4 4 4 8 10" stroke="#35d2a0" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <text y="34" textAnchor="middle" fill="#35d2a0" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">+{MODES[mode].air} AIR</text>
            </g>
          </g>
        )}

        {id === 'solar' && (
          <g>
            {/* Input: Polar Sun */}
            <g transform="translate(52 50)">
              <circle r="20" fill="#ffc76b" fillOpacity={solar < 12 ? 0.2 : 0.35} />
              <circle r="11" fill="#ffc76b" opacity={solar < 12 ? 0.65 : 1} />
              <text y="34" textAnchor="middle" fill="#ffc76b" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                {solar < 12 ? 'LOW SUN' : 'SUNLIGHT'}
              </text>
            </g>
            <path d="M80 50 H122" stroke="#ffc76b" strokeWidth="2.5" className="flow-stream" markerEnd={`url(#arrow-${id})`} />
            {/* Object: Solar Array */}
            <g transform="translate(178 58)">
              {[-24, 0, 24].map((x) => (
                <rect key={x} x={x - 9} y="-34" width="18" height="42" rx="2" fill="#1f4594" stroke={solar < 12 ? '#ffc76b' : '#4f8cff'} strokeWidth="1.6" />
              ))}
              <text y="28" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">PANELS</text>
            </g>
            <path d="M226 50 H268" stroke="#35d9e8" strokeWidth="2.5" className="flow-stream" markerEnd={`url(#arrow-${id})`} />
            {/* Output: Power + Battery Reserve */}
            <g transform="translate(308 50)">
              <rect x="-24" y="-22" width="48" height="44" rx="8" fill="#192647" stroke="#35d2a0" strokeWidth="1.8" />
              <path d="M2 -14 L-7 0 H0 L-2 12 L8 -2 H1 Z" fill="#ffc76b" />
              <text y="35" textAnchor="middle" fill="#35d2a0" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">+{solar} PWR · BATT ×{backupCharges}</text>
            </g>
          </g>
        )}

        {id === 'recycler' && (
          <g opacity={recyclerOn ? 1 : 0.55}>
            {/* Input: Power + Used Drop */}
            <g transform="translate(52 50)">
              <circle r="22" fill="#192647" stroke="#ffc76b" strokeWidth="1.6" />
              <path d="M-8 -10 L-13 -1 H-8 L-10 7 L-3 -2 H-8 Z" fill="#ffc76b" />
              <path d="M8 -8 C12 -2 13 1 13 3 A5 5 0 0 1 3 3 C3 1 4 -2 8 -8 Z" fill="#8aa2cf" />
              <text y="34" textAnchor="middle" fill="#ffc76b" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                {recyclerOn ? '-6 PWR + USED' : 'OFF'}
              </text>
            </g>
            <path d="M82 50 H122" stroke="#35d9e8" strokeWidth="2.5" className={recyclerOn ? 'flow-stream' : undefined} markerEnd={`url(#arrow-${id})`} />
            {/* Object: Water Recycler Loop */}
            <g transform="translate(180 54)">
              <rect x="-36" y="-28" width="20" height="36" rx="5" fill="#9fb4dc" />
              <rect x="-10" y="-22" width="20" height="30" rx="5" fill="#8aa2cf" />
              <rect x="16" y="-16" width="18" height="24" rx="4" fill="#9fb4dc" />
              <path d="M-26 -34 C0 -46 26 -34 26 -18" fill="none" stroke="#35d9e8" strokeWidth="2" className={recyclerOn ? 'flow-stream' : undefined} />
              <path d="M26 14 C0 24 -26 14 -26 8" fill="none" stroke="#35d9e8" strokeWidth="2" className={recyclerOn ? 'flow-stream' : undefined} />
              <text y="32" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">LOOP FILTER</text>
            </g>
            <path d="M232 50 H274" stroke="#35d9e8" strokeWidth="2.5" className={recyclerOn ? 'flow-stream' : undefined} markerEnd={`url(#arrow-${id})`} />
            {/* Output: Clean Water */}
            <g transform="translate(310 50)">
              <circle r="22" fill="#132e3c" stroke={recyclerOn ? '#35d9e8' : '#6b7899'} strokeWidth="1.8" />
              <path d="M0 -13 C7 -3 9 2 9 6 A9 9 0 0 1 -9 6 C-9 2 -7 -3 0 -13 Z" fill={recyclerOn ? '#35d9e8' : '#6b7899'} />
              <text y="34" textAnchor="middle" fill={recyclerOn ? '#35d9e8' : '#abb8d5'} fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                +{!recyclerOn ? 0 : cycle === 3 ? 4 : 12} WATER
              </text>
            </g>
          </g>
        )}

        {id === 'greenhouse' && (
          <g opacity={greenhouseOn ? 1 : 0.55}>
            {/* Input: Water + Lightning */}
            <g transform="translate(52 50)">
              <circle r="22" fill="#192647" stroke="#35d9e8" strokeWidth="1.6" />
              <path d="M-7 -9 C-3 -3 -2 0 -2 2 A5 5 0 0 1 -12 2 C-12 0 -11 -3 -7 -9 Z" fill="#35d9e8" />
              <path d="M9 -10 L3 -1 H8 L6 8 L13 -2 H8 Z" fill="#ffc76b" />
              <text y="34" textAnchor="middle" fill="#35d9e8" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                {greenhouseOn ? '-8 PWR · -5 WTR' : 'OFF'}
              </text>
            </g>
            <path d="M82 50 H122" stroke="#35d9e8" strokeWidth="2.5" className={greenhouseOn ? 'flow-stream' : undefined} markerEnd={`url(#arrow-${id})`} />
            {/* Object: Greenhouse Dome */}
            <g transform="translate(180 62)">
              <path d="M-40 0 v-18 a40 26 0 0 1 80 0 v18 z" fill={greenhouseOn ? '#35d2a0' : '#4a5574'} fillOpacity="0.22" stroke={greenhouseOn ? '#35d2a0' : '#7e8ba8'} strokeWidth="2" />
              <rect x="-28" y="-34" width="56" height="4" rx="2" fill={greenhouseOn && cycle !== 5 ? '#ff9ad5' : '#ff727e'} />
              {[-16, 0, 16].map((x) => (
                <path key={x} d={`M${x} -2 q-5 -10 0 -16 q5 6 0 16`} fill={greenhouseOn ? '#35d2a0' : '#6b7899'} />
              ))}
              <text y="24" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">GREENHOUSE</text>
            </g>
            <path d="M234 50 H276" stroke="#35d9e8" strokeWidth="2.5" className={greenhouseOn ? 'flow-stream' : undefined} markerEnd={`url(#arrow-${id})`} />
            {/* Output: Food */}
            <g transform="translate(310 50)">
              <circle r="22" fill="#15352d" stroke={greenhouseOn && cycle !== 5 ? '#35d2a0' : '#ffc76b'} strokeWidth="1.8" />
              <path d="M0 10 V-2 M0 2 C-10 0 -10 -12 0 -12 C10 -12 10 0 0 2 Z" fill={greenhouseOn && cycle !== 5 ? '#35d2a0' : '#7e8ba8'} />
              <text y="34" textAnchor="middle" fill={greenhouseOn && cycle !== 5 ? '#35d2a0' : '#ffc76b'} fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                +{!greenhouseOn || cycle === 5 ? 0 : 12} FOOD
              </text>
            </g>
          </g>
        )}

        {id === 'shelter' && (
          <g>
            {/* Input: Sun + Particle Warning */}
            <g transform="translate(52 50)">
              <circle r="14" fill="#ffc76b" fillOpacity="0.28" />
              <circle r="8" fill="#ffc76b" />
              <path d="M12 -10 Q22 -2 18 8 M16 -14 Q28 -2 24 12" fill="none" stroke="#ff727e" strokeWidth="2" strokeDasharray="3 3" className="solar-wave" />
              <text y="34" textAnchor="middle" fill="#ffc76b" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">PARTICLES</text>
            </g>
            <path d="M84 50 H124" stroke="#ffc76b" strokeWidth="2.5" className="flow-stream" markerEnd={`url(#arrow-${id})`} />
            {/* Object: Thick Regolith Shield Bunker */}
            <g transform="translate(180 68)">
              <path d="M-44 0 q8 -42 44 -44 q36 2 44 44 z" fill="#545e78" stroke="#35d2a0" strokeWidth="2.2" />
              <rect x="-12" y="-22" width="24" height="22" rx="3" fill="#111a35" stroke="#ffc76b" strokeWidth="1.8" />
              <text y="18" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">REGOLITH WALL</text>
            </g>
            <path d="M236 50 H276" stroke="#35d2a0" strokeWidth="2.5" className="flow-stream" markerEnd={`url(#arrow-${id})`} />
            {/* Output: Crew Protected */}
            <g transform="translate(310 50)">
              <circle r="22" fill="#15352d" stroke="#35d2a0" strokeWidth="1.8" />
              <path d="M0 -13 L11 -8 V1 C11 8 0 13 0 13 C0 13 -11 8 -11 1 V-8 Z" fill="#35d2a0" fillOpacity="0.28" stroke="#35d2a0" strokeWidth="1.8" />
              <circle cx="0" cy="-1" r="4" fill="#f5f7ff" />
              <text y="34" textAnchor="middle" fill="#35d2a0" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">SHIELD LV{shieldingLevel}</text>
            </g>
          </g>
        )}

        {id === 'comms' && (
          <g>
            {/* Moon on Left */}
            <g transform="translate(52 50)">
              <circle r="20" fill="#2a3454" stroke="#9fb4dc" strokeWidth="1.6" />
              <circle cx="-6" cy="-5" r="4" fill="#445074" />
              <circle cx="7" cy="4" r="3" fill="#445074" />
              <path d="M12 -14 a8 5 0 0 0 12 8" fill="none" stroke={commsOn ? '#35d9e8' : '#6b7899'} strokeWidth="2" />
              <text y="34" textAnchor="middle" fill="#f5f7ff" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">MOON</text>
            </g>

            {/* Light-Speed Track between Moon and Earth */}
            <line x1="82" y1="50" x2="278" y2="50" stroke={commsOn ? '#35d9e8' : '#4a5574'} strokeWidth="2" strokeDasharray="5 5" />
            <text x="180" y="34" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">
              {commsStage === 'out'
                ? 'MOON → EARTH (~1.3s)'
                : commsStage === 'back'
                  ? 'EARTH → MOON (~2.6s)'
                  : commsStage === 'done'
                    ? 'ROUND-TRIP COMPLETE (~2.6s)'
                    : '384,400 km · ~1.3s ONE-WAY'}
            </text>

            {/* Animated Signal Dot */}
            {commsStage === 'out' && (
              <g className="comms-ping-out">
                <circle cx="88" cy="50" r="6" fill="#35d9e8" />
              </g>
            )}
            {commsStage === 'back' && (
              <g className="comms-ping-back">
                <circle cx="272" cy="50" r="6" fill="#35d2a0" />
              </g>
            )}
            {commsStage === 'done' && (
              <circle cx="180" cy="50" r="5" fill="#35d2a0" />
            )}

            {/* Earth on Right */}
            <g transform="translate(308 50)">
              <circle r="22" fill="#2357b8" stroke="#7fd3ff" strokeWidth="1.6" />
              <path d="M-8 -10 q10 4 6 12 q-8 4 -10 -4 z M4 2 q8 -3 10 5 q-5 6 -10 -5 z" fill="#35d2a0" fillOpacity="0.85" />
              <text y="34" textAnchor="middle" fill="#7fd3ff" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">EARTH</text>
            </g>
          </g>
        )}
      </svg>

      {/* Slow vs Normal vs Fast visual strip for Habitat */}
      {id === 'habitat' && (
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]" aria-label="Air speed comparison: Slow saves power with -4 net air, Normal balances +2 net air, Fast uses high power for +8 net air">
          {(['eco', 'standard', 'boost'] as const).map((mKey) => {
            const m = MODES[mKey];
            const active = mode === mKey;
            const kidName = mKey === 'eco' ? 'Slow' : mKey === 'boost' ? 'Fast' : 'Normal';
            return (
              <div
                key={mKey}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-2 py-1 font-mono',
                  active ? 'border-aqua bg-aqua/15 text-ink' : 'border-dim/15 bg-hull/60 text-dim',
                )}
              >
                <span className="font-sans font-bold">{detailsMode ? m.label : kidName}</span>
                <span className={cn('inline-flex items-center gap-0.5', m.net >= 0 ? 'text-ok' : 'text-warn')}>
                  {m.net > 0 ? `+${m.net}` : m.net}
                  <Wind className="h-3 w-3" aria-hidden />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Radiation simplified disclaimer chip */}
      {id === 'shelter' && (
        <p className="mt-2 text-[11px] text-warn">
          Simplified training model — does not predict real lunar radiation doses.
        </p>
      )}

      {/* Comms interactive Moon-to-Earth Ping Button (disabled when Comm OFF; zero resource cost) */}
      {id === 'comms' && onSendEarth && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dim/20 bg-hull/70 p-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink" aria-live="polite" data-testid="text-comms-ping-status">
              {!commsOn
                ? 'Switch Communications ON to send a test ping.'
                : commsStage === 'idle'
                  ? 'Avg ~1.3s one-way · ~2.6s round-trip (real delay varies).'
                  : commsStage === 'out'
                    ? 'Sending ping to Earth… (~1.3s light travel)'
                    : commsStage === 'back'
                      ? 'Earth reply returning… (~2.6s round-trip)'
                      : 'Reply arrived! Light is fast, but not instant.'}
            </p>
            <p className="text-[11px] text-dim">
              Illustrative demo only (0 Power, 0 Science). Comm ON applies -4 Power / +5 Science when a cycle commits.
            </p>
          </div>
          <button
            type="button"
            disabled={!commsOn || busyComms}
            onClick={onSendEarth}
            className={cn(btn.primary, 'min-h-[40px] px-3 py-1.5 text-xs')}
            data-testid="button-scene-send-earth"
          >
            <Radio className="h-3.5 w-3.5" /> Send to Earth
          </button>
        </div>
      )}

      {id !== 'comms' && id !== 'shelter' && (
        <p className="mt-2 text-xs text-dim">
          {detailsMode ? meta.alt : meta.caption}
        </p>
      )}
    </div>
  );
}

export interface CycleCauseEffectProps {
  record: Review;
  failed?: boolean;
  onSpeak?: () => void;
}

function getCauseEffectMeta(record: Review, failed: boolean) {
  if (failed) {
    return {
      title: 'Supply Ran Out',
      causeLabel: 'Used > Saved',
      effectLabel: 'Needs Revision',
      takeaway: record.lesson,
      alt: `Cause and effect diagram: Base supplies ran out before Cycle ${record.cycle} finished.`,
      kind: 'failed' as const,
    };
  }
  switch (record.cycle) {
    case 1:
      return {
        title: 'Air System + Power → Breathable Air',
        causeLabel: `Air Unit (-${MODES[record.decision.mode].power} Pwr)`,
        effectLabel: `${record.delta.air >= 0 ? '+' : ''}${record.delta.air} Air`,
        takeaway: record.lesson,
        alt: `Cause and effect: Habitat air unit with power produced breathable air (${record.delta.air >= 0 ? '+' : ''}${record.delta.air} net air).`,
        kind: 'air' as const,
      };
    case 2:
      return {
        title: record.decision.event === 'battery' ? 'Solar Panel + Battery → Electricity' : 'Low Sun → Limited Electricity',
        causeLabel: record.decision.event === 'battery' ? 'Sun + Battery' : 'Low Polar Sun',
        effectLabel: `${record.delta.power >= 0 ? '+' : ''}${record.delta.power} Power`,
        takeaway: record.lesson,
        alt: `Cause and effect: Solar panels${record.decision.event === 'battery' ? ' and backup battery' : ''} supplied electricity (net power ${record.delta.power}).`,
        kind: 'power' as const,
      };
    case 3:
      return {
        title: record.decision.recycler ? 'Water Recycler + Power → Clean Water' : 'Recycler OFF → Stored Water Used',
        causeLabel: record.decision.recycler ? 'Recycler + Power' : 'Recycler OFF',
        effectLabel: `${record.delta.water >= 0 ? '+' : ''}${record.delta.water} Water`,
        takeaway: record.lesson,
        alt: `Cause and effect: Water recycler used power to clean water (net water ${record.delta.water}).`,
        kind: 'water' as const,
      };
    case 4:
      return {
        title: 'Shield / Shelter → Crew Protection',
        causeLabel: record.decision.event === 'shield' ? 'Regolith + Kit' : record.decision.event === 'shelter' ? 'Crew in Shelter' : 'Outside Work',
        effectLabel: `${record.delta.safety} Safety`,
        takeaway: record.lesson,
        alt: `Cause and effect: Shielding and shelter choice affected crew safety (${record.delta.safety}).`,
        kind: 'safety' as const,
      };
    default:
      return {
        title: record.decision.greenhouse && record.decision.event === 'repair'
          ? 'Greenhouse + Water + Power → Food'
          : 'Greenhouse Fault → Food Saved/Used',
        causeLabel: record.decision.greenhouse ? 'Plants + Water + Pwr' : 'Plants OFF',
        effectLabel: `${record.delta.food >= 0 ? '+' : ''}${record.delta.food} Food`,
        takeaway: record.lesson,
        alt: `Cause and effect: Greenhouse with water and power produced food (net food ${record.delta.food}).`,
        kind: 'food' as const,
      };
  }
}

export function CycleCauseEffectVisual({ record, failed = false, onSpeak }: CycleCauseEffectProps) {
  const info = getCauseEffectMeta(record, failed);

  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        failed ? 'border-bad/45 bg-bad/10' : 'border-aqua/35 bg-deep/75',
      )}
      data-testid="visual-cycle-takeaway"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-display text-sm font-bold text-aqua">{info.title}</p>
        <button
          type="button"
          onClick={onSpeak ?? (() => speakText(info.takeaway, true))}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-dim/25 bg-plate text-aqua hover:border-aqua"
          aria-label="Listen to cause and effect takeaway"
          data-testid="button-speak-takeaway"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <svg viewBox="0 0 360 88" className="h-[88px] w-full rounded-xl border border-dim/15 bg-[#080d1f]" role="img" aria-label={info.alt}>
        <defs>
          <marker id="ce-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={failed ? '#ff727e' : '#35d2a0'} />
          </marker>
        </defs>

        {/* Left Cause Box (icon centered on top, label centered below — zero overlap) */}
        <rect x="12" y="10" width="144" height="68" rx="12" fill="#192647" stroke={failed ? '#ff727e' : '#4f8cff'} strokeWidth="1.6" />
        <g transform="translate(84 32)">
          {info.kind === 'air' && (
            <>
              <rect x="-22" y="-10" width="24" height="16" rx="8" fill="#c9d1e6" />
              <path d="M12 -11 L6 -1 H12 L10 8 L18 -2 H12 Z" fill="#ffc76b" />
            </>
          )}
          {info.kind === 'power' && (
            <>
              <rect x="-18" y="-12" width="14" height="20" rx="2" fill="#1f4594" stroke="#ffc76b" strokeWidth="1.4" />
              <rect x="4" y="-10" width="12" height="18" rx="3" fill="#173832" stroke="#35d2a0" strokeWidth="1.4" />
            </>
          )}
          {info.kind === 'water' && (
            <>
              <rect x="-18" y="-12" width="14" height="20" rx="4" fill="#9fb4dc" />
              <path d="M10 -11 L4 -1 H10 L8 8 L16 -2 H10 Z" fill="#ffc76b" />
            </>
          )}
          {info.kind === 'safety' && (
            <path d="M0 -13 L12 -7 V2 C12 9 0 14 0 14 C0 14 -12 9 -12 2 V-7 Z" fill="#545e78" stroke="#35d2a0" strokeWidth="2" />
          )}
          {info.kind === 'food' && (
            <>
              <path d="M-20 6 v-8 a12 10 0 0 1 24 0 v8 z" fill="#35d2a0" fillOpacity="0.3" stroke="#35d2a0" strokeWidth="1.6" />
              <path d="M14 -10 C17 -5 18 -2 18 0 A4 4 0 0 1 10 0 C10 -2 11 -5 14 -10 Z" fill="#35d9e8" />
            </>
          )}
          {info.kind === 'failed' && (
            <path d="M0 -12 L13 10 H-13 Z" fill="#ff727e" />
          )}
        </g>
        <text x="84" y="64" textAnchor="middle" fill="#f5f7ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
          {info.causeLabel}
        </text>

        {/* Animated Arrow */}
        <path
          d="M162 44 H198"
          stroke={failed ? '#ff727e' : '#35d2a0'}
          strokeWidth="3"
          className="flow-stream"
          markerEnd="url(#ce-arrow)"
        />

        {/* Right Effect Box (icon centered on top, label centered below) */}
        <rect x="204" y="10" width="144" height="68" rx="12" fill={failed ? '#2c1622' : '#13312f'} stroke={failed ? '#ff727e' : '#35d2a0'} strokeWidth="1.6" />
        <g transform="translate(276 32)">
          {info.kind === 'air' && (
            <>
              <circle cx="0" cy="-2" r="10" fill="#143238" stroke="#35d2a0" strokeWidth="1.6" />
              <circle cx="-1" cy="-3" r="4.5" fill="#f5f7ff" />
              <rect x="-4" y="-5" width="7" height="3.5" rx="1.5" fill="#35d9e8" />
            </>
          )}
          {info.kind === 'power' && (
            <path d="M2 -12 L-7 1 H0 L-2 12 L8 -2 H1 Z" fill="#ffc76b" />
          )}
          {info.kind === 'water' && (
            <path d="M0 -12 C6 -3 8 2 8 6 A8 8 0 0 1 -8 6 C-8 2 -6 -3 0 -12 Z" fill="#35d9e8" />
          )}
          {info.kind === 'safety' && (
            <path d="M0 -12 L10 -7 V1 C10 7 0 12 0 12 C0 12 -10 7 -10 1 V-7 Z" fill="#35d2a0" fillOpacity="0.28" stroke="#35d2a0" strokeWidth="1.8" />
          )}
          {info.kind === 'food' && (
            <path d="M0 9 V-2 M0 2 C-10 0 -10 -11 0 -11 C10 -11 10 0 0 2 Z" fill="#35d2a0" />
          )}
          {info.kind === 'failed' && (
            <circle r="10" fill="none" stroke="#ff727e" strokeWidth="2" />
          )}
        </g>
        <text x="276" y="64" textAnchor="middle" fill={failed ? '#ff727e' : '#35d2a0'} fontSize="11.5" fontFamily="JetBrains Mono" fontWeight="700">
          {info.effectLabel}
        </text>
      </svg>

      <p className="mt-2 text-xs font-medium text-ink" data-testid="text-reaction-lesson">
        {info.takeaway}
      </p>
    </div>
  );
}

/**
 * Compact 3.5s on-scene visual takeaway echo (can be dismissed early by tapping).
 */
export function CycleTakeawayToast({ record, onDismiss }: { record: Review; onDismiss: () => void }) {
  const info = getCauseEffectMeta(record, false);
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label={`Cycle ${record.cycle} takeaway: ${info.title}. Tap to dismiss.`}
      data-testid="toast-cycle-takeaway"
      className="pointer-events-auto flex items-center gap-2 rounded-xl border border-ok/45 bg-hull/95 px-3 py-2 text-left shadow-xl transition hover:border-aqua"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ok/15 text-ok">
        {info.kind === 'air' && <Wind className="h-4 w-4" />}
        {info.kind === 'power' && <Sun className="h-4 w-4" />}
        {info.kind === 'water' && <Droplets className="h-4 w-4" />}
        {info.kind === 'safety' && <Shield className="h-4 w-4" />}
        {info.kind === 'food' && <Sprout className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-bold text-ok">{info.causeLabel} → {info.effectLabel}</p>
        <p className="truncate text-[11px] text-dim">{info.title}</p>
      </div>
    </button>
  );
}

export { BatteryCharging, Radio, Zap };
