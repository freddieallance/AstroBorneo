import { useEffect, useRef } from 'react';
import { Monitor } from 'lucide-react';
import type { SurvivalWorldState } from '@/game/survival-engine';

const RES_EMOJI = {
  power: '⚡',
  air: '💨',
  water: '💧',
  food: '🌱',
  safety: '🛡️',
} as const;

export function CrewCamPip({
  worldRef,
  indoorCrew,
  paused = false,
}: {
  worldRef: React.MutableRefObject<SurvivalWorldState>;
  indoorCrew?: SurvivalWorldState['indoorCrew'];
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let timeoutId = 0;

    const drawPod = (
      x: number,
      w: number,
      h: number,
      nowSec: number,
      mate: SurvivalWorldState['indoorCrew'][0],
    ) => {
      const p = mate.progress;
      // Room background
      ctx.fillStyle = '#0e1733';
      ctx.fillRect(x, 0, w, h);

      // Console / plant / tank prop on left & right
      ctx.fillStyle = '#1c2b54';
      ctx.fillRect(x + 7, h - 30, 18, 18);
      ctx.fillStyle = '#35d9e8';
      ctx.fillRect(x + 10, h - 27, 12, 6);

      ctx.fillStyle = '#1c2b54';
      ctx.fillRect(x + w - 25, h - 28, 17, 16);
      ctx.fillStyle = mate.targetResource === 'food' ? '#35d2a0' : '#ffc76b';
      ctx.beginPath();
      ctx.arc(x + w - 16.5, h - 32, 4 + Math.sin(nowSec * 4) * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Floor
      ctx.fillStyle = '#25355e';
      ctx.fillRect(x, h - 12, w, 12);

      // Animated indoor astronaut pacing & working between left/right consoles
      const swing = mate.walksRight ? p : 1 - p;
      const ax = x + 22 + swing * (w - 44);
      const bob = Math.abs(Math.sin(nowSec * 8)) * 2;
      const ay = h - 13 - bob;

      // Body
      ctx.fillStyle = '#f5f7ff';
      ctx.beginPath();
      ctx.roundRect(ax - 5, ay - 13, 10, 11, 3.5);
      ctx.fill();
      ctx.fillStyle = mate.profile.trimColor;
      ctx.fillRect(ax - 3, ay - 10, 6, 3.5);

      // Helmet
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = mate.profile.trimColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ax, ay - 18, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor
      ctx.fillStyle = mate.profile.visorColor;
      ctx.beginPath();
      ctx.roundRect(ax - 3.5, ay - 20.5, 7, 4, 1.5);
      ctx.fill();

      // Floating task emoji icon
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(RES_EMOJI[mate.targetResource], ax, ay - 26 - Math.sin(nowSec * 5) * 1.5);

      // Progress bar at top of pod
      ctx.fillStyle = '#192647';
      ctx.fillRect(x + 7, 4, w - 14, 3);
      ctx.fillStyle = mate.profile.trimColor;
      ctx.fillRect(x + 7, 4, (w - 14) * p, 3);
    };

    const draw = (now: number) => {
      if (pausedRef.current) {
        timeoutId = window.setTimeout(() => {
          rafId = requestAnimationFrame(draw);
        }, 180);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const nowSec = now / 1000;
      const world = worldRef.current;

      ctx.clearRect(0, 0, w, h);
      const half = Math.floor(w / 2) - 1;
      drawPod(0, half, h, nowSec, world.indoorCrew[0]);
      drawPod(half + 2, w - half - 2, h, nowSec, world.indoorCrew[1]);

      // Center divider
      ctx.fillStyle = '#35d9e8';
      ctx.fillRect(half, 0, 2, h);

      timeoutId = window.setTimeout(() => {
        rafId = requestAnimationFrame(draw);
      }, 65);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [worldRef]);

  const crew = indoorCrew ?? worldRef.current.indoorCrew;

  return (
    <div
      className="pointer-events-auto w-[166px] overflow-hidden rounded-xl border-2 border-aqua/50 bg-hull/95 shadow-2xl sm:w-[214px] sm:rounded-2xl"
      data-testid="crew-cam-pip"
    >
      <div className="flex items-center justify-between border-b border-dim/20 bg-deep/90 px-2 py-0.5 sm:px-2.5 sm:py-1">
        <div className="flex items-center gap-1">
          <Monitor className="h-3 w-3 text-aqua" />
          <span className="font-display text-[9px] font-extrabold uppercase tracking-wide text-aqua sm:text-[10px]">
            Crew Cam (2)
          </span>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
      </div>

      <canvas
        ref={canvasRef}
        width={214}
        height={58}
        className="block w-full bg-[#0e1733]"
        aria-label="Small live monitor showing the other two astronauts working inside the Moon Base"
      />

      <div className="grid grid-cols-2 divide-x divide-dim/20 bg-deep/90 px-0.5 py-0.5 text-center sm:py-1">
        {crew.map((mate) => (
          <div key={mate.profile.id} className="px-1">
            <p className="truncate font-display text-[9.5px] font-extrabold text-ink sm:text-[10.5px]">
              {mate.profile.shortName}
            </p>
            <p className="truncate font-mono text-[8.5px] font-bold sm:text-[9px]" style={{ color: mate.profile.trimColor }}>
              {mate.taskLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
