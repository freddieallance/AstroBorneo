import type { EventChoice } from '@/game/engine';

export interface EventHeroProps {
  cycle: number;
  previewChoice: EventChoice | null;
  recyclerOn: boolean;
  greenhouseOn: boolean;
  backupCharges: number;
  shieldingLevel: number;
  shieldingKits: number;
  powerCost: number;
  solar: number;
}

export function EventHeroIllustration({
  cycle,
  previewChoice,
  recyclerOn,
  greenhouseOn,
  backupCharges,
  shieldingLevel,
  shieldingKits,
  powerCost,
  solar,
}: EventHeroProps) {
  return (
    <svg
      viewBox="0 0 420 132"
      className="h-24 w-full shrink-0 rounded-2xl border border-[#dfe5fa] bg-[#52497e] sm:h-36"
      aria-hidden
      data-testid={`illustration-event-c${cycle}`}
    >
      <defs>
        <linearGradient id="evSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#52497e" />
          <stop offset="1" stopColor="#72669f" />
        </linearGradient>
      </defs>

      <rect width="420" height="132" fill="url(#evSky)" />
      {/* Stars */}
      {[
        [28, 18], [92, 12], [164, 22], [238, 14], [312, 20], [382, 15],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 1.2 : 0.9} fill="#fffefa" opacity="0.7" />
      ))}
      {/* Lunar horizon */}
      <path d="M0 104 Q110 92 210 102 T420 98 V132 H0 Z" fill="#a296be" />
      <path d="M0 112 Q210 102 420 112 V132 H0 Z" fill="#cfc6e2" />

      {/* C1: BASE READY — Habitat, Greenhouse, Solar, Water Tanks gently pulsing */}
      {cycle === 1 && (
        <g>
          {/* Bright low polar sun */}
          <circle cx="42" cy="48" r="22" fill="#ffc76b" fillOpacity="0.22" className="pulse-soft" />
          <circle cx="42" cy="48" r="12" fill="#ffc76b" fillOpacity="0.9" />

          {/* Solar panels */}
          <g transform="translate(82 110)">
            <ellipse cx="0" cy="2" rx="28" ry="6" fill="#4f8cff" fillOpacity="0.2" className="pulse-soft" />
            {[-18, 0, 18].map((x) => (
              <rect key={x} x={x - 6} y="-46" width="12" height="40" rx="2" fill="#1f4594" stroke="#4f8cff" strokeWidth="1.5" />
            ))}
          </g>

          {/* Greenhouse */}
          <g transform="translate(166 110)">
            <ellipse cx="0" cy="2" rx="30" ry="6" fill="#35d2a0" fillOpacity="0.2" className="pulse-soft" />
            <path d="M-24 0 v-14 a24 18 0 0 1 48 0 v14 z" fill="#35d2a0" fillOpacity={greenhouseOn ? 0.25 : 0.1} stroke={greenhouseOn ? '#35d2a0' : '#6b7899'} strokeWidth="1.8" />
            {[-10, 0, 10].map((x) => (
              <path key={x} d={`M${x} -3 q-4 -8 0 -13 q4 5 0 13`} fill={greenhouseOn ? '#35d2a0' : '#6b7899'} />
            ))}
          </g>

          {/* Habitat */}
          <g transform="translate(258 110)">
            <ellipse cx="0" cy="2" rx="38" ry="7" fill="#35d9e8" fillOpacity="0.2" className="pulse-soft" />
            <rect x="-32" y="-26" width="64" height="26" rx="13" fill="#c9d1e6" />
            <path d="M-18 -26 a18 16 0 0 1 36 0" fill="#dfe5f5" />
            {[-16, 0, 16].map((x) => (
              <circle key={x} cx={x} cy="-13" r="3.2" fill="#35d9e8" />
            ))}
          </g>

          {/* Water Tanks */}
          <g transform="translate(342 110)">
            <ellipse cx="0" cy="2" rx="28" ry="6" fill="#35d9e8" fillOpacity="0.2" className="pulse-soft" />
            <rect x="-20" y="-32" width="14" height="32" rx="4" fill="#9fb4dc" />
            <rect x="-2" y="-24" width="14" height="24" rx="4" fill="#8aa2cf" />
            <path d="M-6 -16 H-2" stroke={recyclerOn ? '#35d9e8' : '#6b7899'} strokeWidth="3" />
          </g>

          {/* Power budget visual gauge at top right */}
          <g transform="translate(292 18)">
            <rect x="0" y="0" width="114" height="24" rx="8" fill="#111a35" stroke="#4f8cff" strokeOpacity="0.5" />
            <text x="10" y="15.5" fill="#35d2a0" fontSize="10.5" fontFamily="JetBrains Mono" fontWeight="700">+{solar}⚡</text>
            <text x="58" y="15.5" fill={powerCost > solar ? '#ffc76b' : '#abb8d5'} fontSize="10.5" fontFamily="JetBrains Mono" fontWeight="700">-{powerCost}⚡</text>
          </g>
        </g>
      )}

      {/* C2: LOW SUN — Dimmed solar array + large battery icon */}
      {cycle === 2 && (
        <g>
          {/* Low shadowed sun */}
          <circle cx="48" cy="84" r="18" fill="#ffc76b" fillOpacity="0.18" />
          <circle cx="48" cy="84" r="9" fill="#ffc76b" fillOpacity="0.5" />
          <path d="M0 104 L115 70 L170 112 H0 Z" fill="#080d1f" fillOpacity="0.58" />

          {/* Dimmed solar panels */}
          <g transform="translate(128 110)">
            {[-26, -2, 22].map((x) => (
              <g key={x}>
                <rect x={x + 5} y="-14" width="3" height="14" fill="#6b7899" />
                <rect x={x} y="-66" width="16" height="52" rx="2" fill="#162244" stroke="#ffc76b" strokeOpacity="0.7" strokeWidth="1.4" />
              </g>
            ))}
            <path d="M-32 -66 L42 -14 V0 H-32 Z" fill="#080d1f" fillOpacity="0.42" />
            <rect x="-24" y="-88" width="60" height="18" rx="6" fill="#192647" stroke="#ffc76b" strokeOpacity="0.65" />
            <text x="6" y="-76" textAnchor="middle" fill="#ffc76b" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">+8 ⚡ SUN</text>
          </g>

          {/* Arrow from solar/battery */}
          <path
            d="M196 72 H242"
            stroke={previewChoice === 'battery' ? '#35d2a0' : '#4f8cff'}
            strokeWidth="3"
            strokeDasharray="5 5"
            className={previewChoice === 'battery' ? 'flow-stream' : undefined}
          />

          {/* Large Battery Icon */}
          <g transform="translate(298 68)">
            {previewChoice === 'battery' && (
              <circle cx="0" cy="0" r="46" fill="#35d2a0" fillOpacity="0.14" className="pulse-soft" />
            )}
            <rect x="-28" y="-34" width="56" height="68" rx="10" fill={previewChoice === 'battery' ? '#173c36' : '#192647'} stroke={previewChoice === 'battery' ? '#35d2a0' : previewChoice === 'save' ? '#4f8cff' : '#ffc76b'} strokeWidth="2.8" />
            <rect x="-12" y="-42" width="24" height="8" rx="3" fill="#abb8d5" />
            {/* Lightning bolt inside battery */}
            <path
              d="M3 -20 L-10 2 H0 L-4 20 L11 -3 H1 Z"
              fill={previewChoice === 'battery' ? '#35d2a0' : previewChoice === 'save' ? '#7e8ba8' : '#ffc76b'}
            />
            <rect x="38" y="-12" width="68" height="24" rx="8" fill="#111a35" stroke="#35d9e8" strokeOpacity="0.5" />
            <text x="72" y="4" textAnchor="middle" fill="#f5f7ff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">
              {previewChoice === 'battery' ? '+20 ⚡' : `×${backupCharges} LEFT`}
            </text>
          </g>
        </g>
      )}

      {/* C3: RECYCLER FAULT — Yellow wrench & reduced flow (never claim a leak) */}
      {cycle === 3 && (
        <g>
          <g transform="translate(185 110)" opacity={recyclerOn ? 1 : 0.45}>
            {/* Three cylindrical tanks */}
            <rect x="-86" y="-66" width="38" height="66" rx="10" fill="#9fb4dc" />
            <rect x="-32" y="-52" width="38" height="52" rx="10" fill="#8aa2cf" />
            <rect x="22" y="-42" width="34" height="42" rx="8" fill="#9fb4dc" />

            {/* Pipe connectors */}
            <path
              d="M-48 -34 H-32 M6 -24 H22"
              stroke={!recyclerOn ? '#6b7899' : previewChoice === 'repair' ? '#35d9e8' : '#ffc76b'}
              strokeWidth="5"
              strokeLinecap="round"
              className={recyclerOn && previewChoice === 'repair' ? 'flow-stream' : undefined}
            />

            {/* Flow indicator */}
            {recyclerOn && previewChoice === 'repair' && (
              <g>
                <path d="M72 -26 C77 -19 79 -15 79 -12 A7 7 0 0 1 65 -12 C65 -15 67 -19 72 -26 Z" fill="#35d9e8" />
                <text x="108" y="-14" fill="#35d2a0" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">+12 💧</text>
              </g>
            )}
            {recyclerOn && previewChoice !== 'repair' && (
              <g>
                <path d="M72 -26 C75 -21 76 -18 76 -16 A4 4 0 0 1 68 -16 C68 -18 69 -21 72 -26 Z" fill="#ffc76b" className="trickle-drop" />
                <text x="108" y="-14" fill="#ffc76b" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">+4 💧</text>
              </g>
            )}
            {!recyclerOn && (
              <text x="102" y="-14" fill="#7e8ba8" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">OFF (0 💧)</text>
            )}

            {/* Yellow wrench badge on clogged filter */}
            {previewChoice !== 'repair' && (
              <g transform="translate(-13 -70)">
                <circle r="15" fill="#111a35" stroke="#ffc76b" strokeWidth="2.4" />
                <path
                  d="M-5 5 L5 -5 M2.5 -7 A3.5 3.5 0 0 1 7 -2.5 L4 -2 L2 -4 Z"
                  stroke="#ffc76b"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            )}
          </g>
        </g>
      )}

      {/* C4: SPACE STORM — Gentle solar-energy sky effect + shelter & regolith protective glow */}
      {cycle === 4 && (
        <g>
          {/* Gentle stylized solar-energy arcs in sky (not a radiation meter) */}
          <g className="solar-wave">
            <path d="M18 28 Q110 8 210 30 T402 22" fill="none" stroke="#ffc76b" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="8 8" />
            <path d="M36 46 Q140 28 245 48 T395 38" fill="none" stroke="#ff727e" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 10" />
          </g>

          {/* Thick regolith radiation shelter bunker */}
          <g transform="translate(210 112)">
            {(previewChoice === 'shield' || previewChoice === 'shelter' || shieldingLevel >= 2) && (
              <path
                d="M-76 0 q10 -68 76 -70 q66 2 76 70"
                fill="none"
                stroke={previewChoice === 'shield' ? '#35d2a0' : '#35d9e8'}
                strokeWidth="3.5"
                strokeOpacity="0.65"
                className="pulse-soft"
              />
            )}
            <path d="M-66 0 q8 -58 66 -60 q58 2 66 60 z" fill="#545e78" stroke={previewChoice === 'shield' ? '#35d2a0' : '#ffc76b'} strokeWidth="2.2" />
            {[
              [-44, -14], [-32, -32], [-18, -42], [18, -42], [34, -30], [44, -12], [-38, -6], [38, -6],
            ].map(([rx, ry], idx) => (
              <circle key={idx} cx={rx} cy={ry} r={idx % 2 === 0 ? 1.5 : 1.1} fill="#8b94ad" fillOpacity="0.5" />
            ))}
            <rect x="-14" y="-26" width="28" height="26" rx="4" fill="#111a35" stroke={previewChoice === 'shelter' ? '#35d9e8' : '#ffc76b'} strokeWidth="2" />

            {/* Protective shield emblem */}
            <path
              d="M0 -48 L8 -44 V-38 C8 -34 0 -31 0 -31 C0 -31 -8 -34 -8 -38 V-44 Z"
              fill={previewChoice === 'shield' || shieldingLevel >= 2 ? '#35d2a0' : previewChoice === 'shelter' ? '#35d9e8' : '#ffc76b'}
            />

            {/* Crew icons: safely inside during Shelter, outside with caution when Keep Working */}
            {previewChoice === 'shelter' ? (
              <g transform="translate(0 -10)">
                <circle cx="-5" cy="-4" r="3" fill="#35d9e8" />
                <circle cx="5" cy="-4" r="3" fill="#35d9e8" />
              </g>
            ) : (
              <g transform="translate(92 -6)">
                <circle cx="0" cy="-14" r="4.5" fill="#f5f7ff" />
                <rect x="-3.5" y="-9" width="7" height="9" rx="2.5" fill="#e6ecf8" />
                {previewChoice === 'continue' && (
                  <circle cx="14" cy="-14" r="6" fill="#ffc76b" />
                )}
              </g>
            )}

            {/* Status chip */}
            <g transform="translate(-186 -74)">
              <rect x="0" y="0" width="96" height="22" rx="7" fill="#111a35" stroke="#35d2a0" strokeOpacity="0.45" />
              <text x="48" y="14.5" textAnchor="middle" fill="#f5f7ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                SHIELD LV{previewChoice === 'shield' && shieldingKits > 0 ? shieldingLevel + 1 : shieldingLevel}
              </text>
            </g>
          </g>
        </g>
      )}

      {/* C5: PLANTS NEED HELP — Dimmed greenhouse + warning symbol */}
      {cycle === 5 && (
        <g>
          <g transform="translate(210 112)" opacity={previewChoice === 'off' || !greenhouseOn ? 0.45 : 1}>
            {previewChoice === 'repair' && greenhouseOn && (
              <ellipse cx="0" cy="-26" rx="74" ry="38" fill="#35d2a0" fillOpacity="0.16" />
            )}
            <path
              d="M-68 0 v-28 a68 42 0 0 1 136 0 v28 z"
              fill={previewChoice === 'repair' && greenhouseOn ? '#35d2a0' : previewChoice === 'off' ? '#2c344d' : '#4a3d58'}
              fillOpacity="0.28"
              stroke={previewChoice === 'repair' && greenhouseOn ? '#35d2a0' : previewChoice === 'off' ? '#6b7899' : '#ffc76b'}
              strokeWidth="2.4"
            />
            {/* Grow light bar */}
            <rect
              x="-52"
              y="-54"
              width="104"
              height="5"
              rx="2.5"
              className={previewChoice !== 'repair' && previewChoice !== 'off' && greenhouseOn ? 'lamp-blink' : undefined}
              fill={previewChoice === 'repair' && greenhouseOn ? '#ff9ad5' : previewChoice === 'off' ? '#4a5574' : '#ff727e'}
            />
            {/* Plants inside */}
            {[-34, -12, 12, 34].map((x) => (
              <path
                key={x}
                d={`M${x} -4 q-7 -15 0 -24 q7 9 0 24`}
                fill={previewChoice === 'repair' && greenhouseOn ? '#35d2a0' : '#7e8ba8'}
              />
            ))}
            {/* Warning triangle when unfixed */}
            {previewChoice !== 'repair' && previewChoice !== 'off' && (
              <g transform="translate(0 -76)">
                <path d="M0 -13 L12 9 H-12 Z" fill="#ffc76b" stroke="#111a35" strokeWidth="1.5" />
                <rect x="-1.2" y="-5" width="2.4" height="7" rx="1" fill="#111a35" />
                <circle cx="0" cy="5" r="1.4" fill="#111a35" />
              </g>
            )}
            {/* Power OFF symbol */}
            {previewChoice === 'off' && (
              <g transform="translate(0 -26)">
                <circle r="14" fill="#111a35" stroke="#ff727e" strokeWidth="2.2" />
                <path d="M0 -7 V0 M-5 -4 A6.5 6.5 0 1 0 5 -4" stroke="#ff727e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              </g>
            )}
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * Distinct animated mini-illustrations for each choice card so emerging/non-readers
 * can immediately distinguish Wait vs Keep Running vs Turn Off without confusion.
 */
export function ChoicePictogram({
  cycle,
  value,
  active,
}: {
  cycle: number;
  value: EventChoice;
  active: boolean;
}) {
  return (
    <svg viewBox="0 0 72 44" className="h-11 w-16 shrink-0 rounded-xl border border-dim/20 bg-deep/85" aria-hidden>
      {/* C2: Use Battery vs Save Battery */}
      {cycle === 2 && value === 'battery' && (
        <g transform="translate(36 22)">
          <rect x="-12" y="-13" width="24" height="26" rx="4" fill="#173832" stroke="#35d2a0" strokeWidth="2" />
          <rect x="-5" y="-17" width="10" height="4" rx="1" fill="#35d2a0" />
          <path d="M1 -8 L-5 1 H1 L-1 9 L6 -1 H0 Z" fill="#35d2a0" className={active ? 'pulse-soft' : undefined} />
        </g>
      )}
      {cycle === 2 && value === 'save' && (
        <g transform="translate(36 22)">
          <rect x="-12" y="-12" width="24" height="24" rx="5" fill="#192647" stroke="#4f8cff" strokeWidth="2" />
          <path d="M-5 -2 V-6 A5 5 0 0 1 5 -6 V-2" fill="none" stroke="#abb8d5" strokeWidth="2" />
          <rect x="-7" y="-2" width="14" height="10" rx="2" fill="#ffc76b" />
        </g>
      )}

      {/* C3: Fix vs Wait (slow yellow drip + hourglass) */}
      {cycle === 3 && value === 'repair' && (
        <g transform="translate(36 22)">
          <path d="M-14 8 L-2 -4 M-4 -7 A4.5 4.5 0 0 1 2 -1 L-1.5 -0.5 L-3.5 -2.5 Z" stroke="#35d9e8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M14 -10 C19 -3 21 1 21 4 A7 7 0 0 1 7 4 C7 1 9 -3 14 -10 Z" fill="#35d9e8" className={active ? 'pulse-soft' : undefined} />
        </g>
      )}
      {cycle === 3 && value === 'skip' && (
        <g transform="translate(36 22)">
          {/* Hourglass + single slow yellow trickle drop */}
          <path d="M-16 -12 H-2 M-16 12 H-2 M-15 -12 L-9 0 L-15 12 M-3 -12 L-9 0 L-3 12" stroke="#ffc76b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M14 -6 C17 -1 18 2 18 4 A4 4 0 0 1 10 4 C10 2 11 -1 14 -6 Z" fill="#ffc76b" className="trickle-drop" />
        </g>
      )}

      {/* C4: Shield vs Shelter vs Keep Working */}
      {cycle === 4 && value === 'shield' && (
        <g transform="translate(36 22)">
          <path d="M0 -15 L13 -9 V1 C13 9 0 15 0 15 C0 15 -13 9 -13 1 V-9 Z" fill="#173832" stroke="#35d2a0" strokeWidth="2.2" />
          <path d="M0 -7 V7 M-6 0 H6" stroke="#35d2a0" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {cycle === 4 && value === 'shelter' && (
        <g transform="translate(36 26)">
          <path d="M-22 6 q4 -24 22 -25 q18 1 22 25 z" fill="#545e78" stroke="#35d9e8" strokeWidth="2" />
          <circle cx="-5" cy="-3" r="3" fill="#35d9e8" />
          <circle cx="5" cy="-3" r="3" fill="#35d9e8" />
        </g>
      )}
      {cycle === 4 && value === 'continue' && (
        <g transform="translate(36 22)">
          <circle cx="-6" cy="-6" r="4.5" fill="#f5f7ff" />
          <rect x="-10" y="0" width="8" height="10" rx="2.5" fill="#abb8d5" />
          <path d="M10 -8 L16 2 H4 Z" fill="#ffc76b" />
        </g>
      )}

      {/* C5: Fix vs Keep Running (spinning gear + droplet) vs Turn Off (power breaker OFF) */}
      {cycle === 5 && value === 'repair' && (
        <g transform="translate(36 22)">
          <path d="M-16 8 L-4 -4 M-6 -7 A4.5 4.5 0 0 1 0 -1 L-3.5 -0.5 L-5.5 -2.5 Z" stroke="#35d2a0" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M12 10 q-6 -12 0 -20 q6 8 0 20" fill="#35d2a0" className={active ? 'pulse-soft' : undefined} />
        </g>
      )}
      {cycle === 5 && value === 'continue' && (
        <g transform="translate(36 22)">
          {/* Spinning fan/gear + flowing water drop (clearly running, 0 food) */}
          <g transform="translate(-10 0)" className="spin-slow">
            <circle r="8" fill="none" stroke="#ffc76b" strokeWidth="2.2" strokeDasharray="4 3" />
            <circle r="2.5" fill="#ffc76b" />
          </g>
          <path d="M13 -8 C17 -2 18 1 18 3.5 A5 5 0 0 1 8 3.5 C8 1 9 -2 13 -8 Z" fill="#35d9e8" />
        </g>
      )}
      {cycle === 5 && value === 'off' && (
        <g transform="translate(36 22)">
          {/* Unmistakable OFF power switch */}
          <circle r="13" fill="#2c1622" stroke="#ff727e" strokeWidth="2.2" />
          <path d="M0 -7 V0 M-5 -3.5 A6.5 6.5 0 1 0 5 -3.5" stroke="#ff727e" strokeWidth="2.3" strokeLinecap="round" fill="none" />
        </g>
      )}
    </svg>
  );
}
