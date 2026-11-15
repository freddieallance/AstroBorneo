import { useEffect, useRef } from 'react';
import { FastForward, Rocket } from 'lucide-react';
import type { AstronautProfile } from '@/game/astronauts';
import { EVAC_ANIMATION_SEC, type FailureReport } from '@/game/survival-engine';
import { playSfx } from '@/lib/sfx';

export function EvacuationSequence({
  playerProfile,
  npcProfile,
  elapsedEvacSec,
  failureReport,
  onSkip,
}: {
  playerProfile: AstronautProfile;
  npcProfile: AstronautProfile;
  elapsedEvacSec: number;
  failureReport: FailureReport | null;
  onSkip: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0);
  progressRef.current = Math.min(1, elapsedEvacSec / EVAC_ANIMATION_SEC);

  useEffect(() => {
    playSfx('launch');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const draw = () => {
      const p = progressRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Sky gradient shifts from Moon surface view to deep space Earth approach
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#050918');
      grad.addColorStop(1, '#121b3b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Parallax stars
      const starShiftY = Math.max(0, p - 0.32) * 260;
      for (let i = 0; i < 68; i++) {
        const sx = (i * 157) % w;
        const sy = ((i * 89 + starShiftY * (1 + (i % 3) * 0.3)) % (h - 30));
        ctx.fillStyle = `rgba(245, 247, 255, ${0.35 + (i % 4) * 0.16})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 2) + 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Earth grows as rocket approaches!
      const earthScale = 1 + Math.max(0, p - 0.38) * 2.1;
      const earthX = w * 0.78 - Math.max(0, p - 0.45) * 140;
      const earthY = h * 0.24 + Math.max(0, p - 0.45) * 30;
      const earthR = 36 * earthScale;

      const glow = ctx.createRadialGradient(earthX, earthY, earthR * 0.4, earthX, earthY, earthR * 1.9);
      glow.addColorStop(0, 'rgba(79, 140, 255, 0.35)');
      glow.addColorStop(1, 'rgba(79, 140, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#35d2a0';
      ctx.beginPath();
      ctx.ellipse(earthX - earthR * 0.25, earthY - earthR * 0.1, earthR * 0.35, earthR * 0.22, -0.4, 0, Math.PI * 2);
      ctx.ellipse(earthX + earthR * 0.28, earthY + earthR * 0.2, earthR * 0.28, earthR * 0.16, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Moon surface drops down during liftoff
      const moonDrop = Math.max(0, p - 0.3) * 320;
      ctx.save();
      ctx.translate(0, moonDrop);

      ctx.fillStyle = '#263052';
      ctx.beginPath();
      ctx.moveTo(0, h - 105);
      ctx.quadraticCurveTo(w * 0.35, h - 135, w * 0.72, h - 110);
      ctx.lineTo(w, h - 118);
      ctx.lineTo(w, h + 150);
      ctx.lineTo(0, h + 150);
      ctx.closePath();
      ctx.fill();

      // Failed base silhouettes flashing red beacons
      const flash = Math.sin(p * 32) > 0 ? 0.95 : 0.35;
      const stationXs = [120, 230, 350, 470, 580];
      for (const bx of stationXs) {
        ctx.fillStyle = '#19223f';
        ctx.fillRect(bx - 26, h - 138, 52, 28);
        ctx.fillStyle = `rgba(255, 114, 126, ${flash})`;
        ctx.beginPath();
        ctx.arc(bx, h - 144, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Launchpad
      ctx.fillStyle = '#4f5d84';
      ctx.fillRect(670, h - 114, 96, 12);

      // Boarding astronauts during Stage 1 (p < 0.28)
      if (p < 0.28) {
        const boardT = p / 0.28;
        const p1X = 590 + boardT * 116;
        const p2X = 550 + boardT * 155;
        for (const [ax, trim] of [
          [p1X, playerProfile.trimColor],
          [p2X, npcProfile.trimColor],
        ] as const) {
          ctx.fillStyle = '#f5f7ff';
          ctx.beginPath();
          ctx.arc(ax, h - 125 + Math.sin(boardT * 18) * 3, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = trim;
          ctx.fillRect(ax - 5, h - 120, 10, 10);
        }
      }
      ctx.restore();

      // Escape Rocket trajectory: sits on pad -> blasts up & arcs toward Earth
      let rx = 718;
      let ry = h - 154;
      let rot = 0;
      if (p >= 0.3) {
        const flyT = (p - 0.3) / 0.7;
        const ease = flyT * flyT * (3 - 2 * flyT);
        rx = 718 + (earthX - 718) * ease * 0.85;
        ry = h - 154 - ease * (h - 154 - earthY - 35);
        rot = -0.32 * Math.min(1, flyT * 1.6);
      }

      const shakeX = p >= 0.25 && p < 0.55 ? (Math.random() - 0.5) * 6 : 0;
      const shakeY = p >= 0.25 && p < 0.55 ? (Math.random() - 0.5) * 6 : 0;

      ctx.save();
      ctx.translate(rx + shakeX, ry + shakeY);
      ctx.rotate(rot);

      // Exhaust flames after p >= 0.26
      if (p >= 0.26) {
        const flameLen = 28 + Math.random() * 24;
        ctx.fillStyle = '#ffc76b';
        ctx.beginPath();
        ctx.moveTo(-12, 30);
        ctx.lineTo(0, 30 + flameLen);
        ctx.lineTo(12, 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff727e';
        ctx.beginPath();
        ctx.moveTo(-7, 30);
        ctx.lineTo(0, 30 + flameLen * 0.65);
        ctx.lineTo(7, 30);
        ctx.closePath();
        ctx.fill();
      }

      // Rocket hull
      ctx.fillStyle = '#f5f7ff';
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.quadraticCurveTo(18, -14, 16, 26);
      ctx.lineTo(-16, 26);
      ctx.quadraticCurveTo(-18, -14, 0, -44);
      ctx.closePath();
      ctx.fill();

      // Nose & Fins
      ctx.fillStyle = '#ff727e';
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.quadraticCurveTo(11, -28, 12, -18);
      ctx.lineTo(-12, -18);
      ctx.quadraticCurveTo(-11, -28, 0, -44);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-16, 10);
      ctx.lineTo(-27, 30);
      ctx.lineTo(-14, 26);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(16, 10);
      ctx.lineTo(27, 30);
      ctx.lineTo(14, 26);
      ctx.closePath();
      ctx.fill();

      // Window showing astronaut visor
      ctx.fillStyle = playerProfile.visorColor;
      ctx.beginPath();
      ctx.arc(0, -3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [playerProfile, npcProfile]);

  const isCrewUnsafe = failureReport?.evacReason === 'crew_unsafe';

  const stageLabel =
    elapsedEvacSec < 1.3
      ? isCrewUnsafe
        ? 'Base unsafe! Crew boarding Escape Rocket...'
        : 'All stations failed! Crew boarding Escape Rocket...'
      : elapsedEvacSec < 2.8
        ? '3... 2... 1... LIFTOFF FROM THE MOON!'
        : 'Flying safely back home to Earth!';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-deep/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Returning to Earth evacuation animation"
      data-testid="evacuation-sequence"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-warn/60 bg-hull shadow-2xl">
        <div className="flex items-center justify-between border-b border-dim/20 bg-deep/85 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Rocket className="h-5 w-5 text-warn" />
            <span className="font-display text-lg font-extrabold text-warn">
              EMERGENCY RETURN TO EARTH
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-dim/30 bg-plate px-3 py-1.5 font-display text-xs font-bold text-ink hover:border-aqua"
            data-testid="button-skip-evac"
          >
            <span>See Results</span>
            <FastForward className="h-4 w-4" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={900}
          height={420}
          className="block aspect-[15/7] w-full bg-[#050918]"
        />

        <div className="flex flex-col gap-1.5 bg-deep/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base font-extrabold text-ink" data-testid="evacuation-stage-text">
            {stageLabel}
          </p>
          {failureReport && (
            <span className="font-mono text-xs font-bold text-bad">
              {isCrewUnsafe
                ? `Crew safety reached 0%`
                : `${failureReport.firstFailedLabel} failed first`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
