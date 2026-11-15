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
      // Storybook pastel indigo room background
      ctx.fillStyle = '#5a568a';
      ctx.fillRect(x, 0, w, h);

      // Console / plant / tank prop
      ctx.fillStyle = '#3f3d68';
      ctx.fillRect(x + 7, h - 30, 18, 18);
      ctx.fillStyle = '#a8e3fa';
      ctx.fillRect(x + 10, h - 27, 12, 6);

      ctx.fillStyle = '#3f3d68';
      ctx.fillRect(x + w - 25, h - 28, 17, 16);
      ctx.fillStyle = mate.targetResource === 'food' ? '#76dbae' : '#ffe184';
      ctx.beginPath();
      ctx.arc(x + w - 16.5, h - 32, 4 + Math.sin(nowSec * 4) * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Floor
      ctx.fillStyle = '#403c68';
      ctx.fillRect(x, h - 12, w, 12);

      const swing = mate.walksRight ? p : 1 - p;
      const ax = x + 22 + swing * (w - 44);
      const bob = Math.abs(Math.sin(nowSec * 8)) * 2;
      const ay = h - 13 - bob;

      // Body
      ctx.fillStyle = '#ffffff';
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
      ctx.fillStyle = '#a8e3fa';
      ctx.beginPath();
      ctx.roundRect(ax - 3.5, ay - 20.5, 7, 4, 1.5);
      ctx.fill();

      // Floating task emoji icon
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(RES_EMOJI[mate.targetResource], ax, ay - 26 - Math.sin(nowSec * 5) * 1.5);

      // Progress bar at top of pod
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x + 7, 4, w - 14, 3);
      ctx.fillStyle = '#ffe184';
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

      ctx.fillStyle = '#ffffff';
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
      className="pointer-events-auto w-[148px] shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-[#fffefa] text-[#344270] shadow-[0_10px_24px_-8px_rgba(20,24,62,0.42)] sm:w-[194px]"
      data-testid="crew-cam-pip"
    >
      <div className="flex items-center justify-between border-b border-[#e5eaf8] bg-[#f3f5ff] px-2 py-0.5">
        <div className="flex items-center gap-1">
          <Monitor className="h-3 w-3 text-[#4d62a8]" />
          <span className="font-display text-[9px] font-extrabold uppercase tracking-wide text-[#344270] sm:text-[9.5px]">
            Crew Cam (2)
          </span>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-[#49be8f]" aria-hidden />
      </div>

      <canvas
        ref={canvasRef}
        width={194}
        height={44}
        className="block w-full bg-[#5a568a]"
        aria-label="Small live monitor showing the other two astronauts working inside the Moon Base"
      />

      <div className="grid grid-cols-2 divide-x divide-[#e5eaf8] bg-[#fffefa] px-0.5 py-0.5 text-center">
        {crew.map((mate) => (
          <div key={mate.profile.id} className="px-1">
            <p className="truncate font-display text-[9px] font-extrabold text-[#222a5b] sm:text-[10px]">
              {mate.profile.shortName}
            </p>
            <p className="truncate font-mono text-[8px] font-extrabold text-[#5a6c9c] sm:text-[8.5px]">
              {mate.taskLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
