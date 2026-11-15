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

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#302b63');
      grad.addColorStop(1, '#58508d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const starShiftY = Math.max(0, p - 0.32) * 260;
      for (let i = 0; i < 64; i++) {
        const sx = (i * 157) % w;
        const sy = (i * 89 + starShiftY * (1 + (i % 3) * 0.3)) % (h - 30);
        ctx.fillStyle = `rgba(255, 249, 224, ${0.4 + (i % 4) * 0.14})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 2) + 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      const earthScale = 1 + Math.max(0, p - 0.38) * 2.1;
      const earthX = w * 0.78 - Math.max(0, p - 0.45) * 140;
      const earthY = h * 0.24 + Math.max(0, p - 0.45) * 30;
      const earthR = 36 * earthScale;

      const glow = ctx.createRadialGradient(earthX, earthY, earthR * 0.4, earthX, earthY, earthR * 1.9);
      glow.addColorStop(0, 'rgba(168, 227, 250, 0.42)');
      glow.addColorStop(1, 'rgba(168, 227, 250, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4890f5';
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#76dbae';
      ctx.beginPath();
      ctx.ellipse(earthX - earthR * 0.25, earthY - earthR * 0.1, earthR * 0.35, earthR * 0.22, -0.4, 0, Math.PI * 2);
      ctx.ellipse(earthX + earthR * 0.28, earthY + earthR * 0.2, earthR * 0.28, earthR * 0.16, 0.3, 0, Math.PI * 2);
      ctx.fill();

      const moonDrop = Math.max(0, p - 0.3) * 320;
      ctx.save();
      ctx.translate(0, moonDrop);

      ctx.fillStyle = '#8b7eae';
      ctx.beginPath();
      ctx.moveTo(0, h - 105);
      ctx.quadraticCurveTo(w * 0.35, h - 135, w * 0.72, h - 110);
      ctx.lineTo(w, h - 118);
      ctx.lineTo(w, h + 150);
      ctx.lineTo(0, h + 150);
      ctx.closePath();
      ctx.fill();

      const flash = Math.sin(p * 32) > 0 ? 0.95 : 0.35;
      const stationXs = [120, 230, 350, 470, 580];
      for (const bx of stationXs) {
        ctx.fillStyle = '#5a5280';
        ctx.fillRect(bx - 26, h - 138, 52, 28);
        ctx.fillStyle = `rgba(255, 123, 138, ${flash})`;
        ctx.beginPath();
        ctx.arc(bx, h - 144, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#d7d1eb';
      ctx.fillRect(670, h - 114, 96, 12);

      if (p < 0.28) {
        const boardT = p / 0.28;
        const p1X = 590 + boardT * 116;
        const p2X = 550 + boardT * 155;
        for (const [ax, trim] of [
          [p1X, playerProfile.trimColor],
          [p2X, npcProfile.trimColor],
        ] as const) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ax, h - 125 + Math.sin(boardT * 18) * 3, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = trim;
          ctx.fillRect(ax - 5, h - 120, 10, 10);
        }
      }
      ctx.restore();

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

      if (p >= 0.26) {
        const flameLen = 28 + Math.random() * 24;
        ctx.fillStyle = '#ffe184';
        ctx.beginPath();
        ctx.moveTo(-12, 30);
        ctx.lineTo(0, 30 + flameLen);
        ctx.lineTo(12, 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff8ca2';
        ctx.beginPath();
        ctx.moveTo(-7, 30);
        ctx.lineTo(0, 30 + flameLen * 0.65);
        ctx.lineTo(7, 30);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.quadraticCurveTo(18, -14, 16, 26);
      ctx.lineTo(-16, 26);
      ctx.quadraticCurveTo(-18, -14, 0, -44);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ff8ca2';
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

      ctx.fillStyle = '#a8e3fa';
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#181f4d]/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Returning to Earth evacuation animation"
      data-testid="evacuation-sequence"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border-[6px] border-white bg-[#fffefa] text-[#344270] shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-[#eaeeff] bg-[#f3f5ff] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Rocket className="h-5 w-5 text-[#d98a1c]" />
            <span className="font-display text-lg font-extrabold text-[#222a5b]">
              EMERGENCY RETURN TO EARTH
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#ffe7a1] to-[#ffca6b] px-3.5 py-1.5 font-display text-xs font-extrabold text-[#364272] shadow-[0_3px_0_#e7a959] hover:brightness-105"
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
          className="block aspect-[15/7] w-full bg-[#302b63]"
        />

        <div className="flex flex-col gap-1.5 bg-[#fffefa] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base font-extrabold text-[#222a5b]" data-testid="evacuation-stage-text">
            {stageLabel}
          </p>
          {failureReport && (
            <span className="font-mono text-xs font-extrabold text-[#c43a51]">
              {isCrewUnsafe ? `Crew safety reached 0%` : `${failureReport.firstFailedLabel} failed first`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
