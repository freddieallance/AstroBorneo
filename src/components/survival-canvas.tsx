import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { ModuleId } from '@/content/mission';
import {
  clientPointToWorldPoint,
  distanceBetween,
  INTERACT_RADIUS,
  ROCKET_PAD_POS,
  STATION_ORDER,
  STATIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type SurvivalWorldState,
  type Vec2,
} from '@/game/survival-engine';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const POOL_SIZE = 72;

const STATION_PAD_COLORS: Record<ModuleId, { fill: string; emoji: string }> = {
  solar: { fill: '#ffcf79', emoji: '☀️' },
  habitat: { fill: '#a8dfff', emoji: '🏠' },
  recycler: { fill: '#9ad9ff', emoji: '💧' },
  greenhouse: { fill: '#a6e9b7', emoji: '🌱' },
  shelter: { fill: '#cbb7f8', emoji: '🛡️' },
  comms: { fill: '#ffc7d0', emoji: '📡' },
};

export function SurvivalCanvas({
  worldRef,
  paused = false,
  onWalkToPoint,
  onSelectStationOrWalk,
  onOpenNearbyStation,
}: {
  worldRef: React.MutableRefObject<SurvivalWorldState>;
  paused?: boolean;
  onWalkToPoint: (pt: Vec2) => void;
  onSelectStationOrWalk: (id: ModuleId) => void;
  onOpenNearbyStation: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-allocated zero-GC particle pool
    const pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#ffe9a6',
    }));
    let poolCursor = 0;
    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      color: string,
      size = 2.5,
      maxLife = 0.55,
    ) => {
      const p = pool[poolCursor];
      poolCursor = (poolCursor + 1) % POOL_SIZE;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.size = size;
      p.color = color;
    };

    let lastTime = performance.now();
    let stepTimer = 0;
    let sparkTimer = 0;
    let rafId = 0;

    const drawAstronaut = (
      x: number,
      y: number,
      facing: 1 | -1,
      walkPhase: number,
      moving: boolean,
      trimColor: string,
      visorColor: string,
      backpackColor: string,
      label: string,
      isWorking = false,
      crewHealth = 100,
      thoughtEmoji?: string,
    ) => {
      const bob = moving ? Math.abs(Math.sin(walkPhase)) * 3.5 : Math.sin(performance.now() * 0.004) * 1.1;
      const legSwing = moving ? Math.sin(walkPhase) * 4.5 : 0;

      ctx.save();
      ctx.translate(x, y);

      // Soft indigo shadow
      ctx.fillStyle = 'rgba(26, 20, 52, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 15, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -bob);

      // Legs
      ctx.fillStyle = '#dce6ff';
      ctx.beginPath();
      ctx.roundRect(-7 + legSwing * 0.5, -6, 5.5, 9, 2.5);
      ctx.roundRect(1.5 - legSwing * 0.5, -6, 5.5, 9, 2.5);
      ctx.fill();

      // Boots
      ctx.fillStyle = trimColor;
      ctx.beginPath();
      ctx.roundRect(-8 + legSwing * 0.5, 0, 7, 4, 2);
      ctx.roundRect(1 - legSwing * 0.5, 0, 7, 4, 2);
      ctx.fill();

      // Backpack
      ctx.fillStyle = backpackColor;
      ctx.beginPath();
      ctx.roundRect(facing === 1 ? -13 : 5, -24, 8, 15, 3);
      ctx.fill();

      // Torso
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#344270';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-9, -25, 18, 20, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = trimColor;
      ctx.beginPath();
      ctx.roundRect(-5, -20, 10, 6, 2.5);
      ctx.fill();

      // Wrench / arm when NPC working
      if (isWorking) {
        const swing = Math.sin(performance.now() * 0.018) * 0.45;
        ctx.save();
        ctx.translate(facing * 9, -16);
        ctx.rotate(swing);
        ctx.strokeStyle = '#ffcf79';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(facing * 10, -8);
        ctx.stroke();
        ctx.restore();
      }

      // Helmet
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -33, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy sky-aqua visor
      ctx.fillStyle = '#2d3b72';
      ctx.beginPath();
      ctx.roundRect(facing === 1 ? -4 : -9, -38, 13, 9, 4.5);
      ctx.fill();
      ctx.fillStyle = visorColor || '#a8e3fa';
      ctx.beginPath();
      ctx.roundRect(facing === 1 ? -2.5 : -7.5, -36.5, 10, 6, 3);
      ctx.fill();

      // Visor shine
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(facing === 1 ? -0.5 : -5.5, -34.5);
      ctx.lineTo(facing === 1 ? 3.5 : -1.5, -34.5);
      ctx.stroke();

      ctx.restore();

      // Thought bubble for NPC partner showing which station they are helping
      if (thoughtEmoji) {
        const tbY = -88 + Math.sin(performance.now() * 0.005) * 2;
        ctx.fillStyle = '#fff2d8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(16, tbY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8, tbY + 13, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(thoughtEmoji, 16, tbY + 1);
      }

      // Crisp white nameplate pill
      ctx.font = '800 11px "Outfit", sans-serif';
      const tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -62, tw, 17, 8.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#344270';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -53.5);

      // Crew healthbar above nameplate
      const hpRatio = Math.max(0, Math.min(1, crewHealth / 100));
      const hpBarW = 54;
      const hpBarH = 6.5;
      const hpColor = hpRatio >= 0.6 ? '#76dbae' : hpRatio >= 0.3 ? '#ffc56f' : '#ff7b8a';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = '#d3daf0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-hpBarW / 2 - 1, -73, hpBarW + 2, hpBarH + 2, 3.5);
      ctx.fill();
      ctx.stroke();
      if (hpRatio > 0) {
        ctx.fillStyle = hpColor;
        ctx.beginPath();
        ctx.roundRect(-hpBarW / 2, -72, Math.max(4, hpBarW * hpRatio), hpBarH, 2.5);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawStation = (
      w: SurvivalWorldState,
      id: ModuleId,
      nowSec: number,
      isNear: boolean,
      isPriorityTarget: boolean,
    ) => {
      const meta = STATIONS[id];
      const pad = STATION_PAD_COLORS[id];
      const st = w.stations[id];
      const { x, y } = meta.pos;
      const pct = Math.max(0, Math.min(100, Math.round(st.health)));
      const col = st.failed
        ? '#ff7b8a'
        : pct < 35
          ? '#ff7b8a'
          : pct < 65
            ? '#ffb547'
            : '#49be8f';

      ctx.save();
      ctx.translate(x, y);

      // Gold priority ring or aqua proximity ring
      if (isNear && !st.failed) {
        const pulse = 1 + Math.sin(nowSec * 6) * 0.05;
        ctx.strokeStyle = '#ffe16f';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.ellipse(0, 6, 86 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (isPriorityTarget && !st.failed) {
        const pulse = 1 + Math.sin(nowSec * 4.5) * 0.04;
        ctx.strokeStyle = 'rgba(255, 225, 111, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 6, 80 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Repair flash aura
      if (st.repairFlashSec > 0) {
        ctx.fillStyle = `rgba(118, 219, 174, ${Math.min(0.36, st.repairFlashSec * 0.3)})`;
        ctx.beginPath();
        ctx.ellipse(0, -24, 74, 50, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pastel circular storybook pad beneath each station
      ctx.fillStyle = 'rgba(25, 26, 56, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 70, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = st.failed ? '#c7becf' : pad.fill;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -2, 62, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = st.failed ? 0.45 : 1;

      // Distinct building art
      switch (id) {
        case 'solar': {
          for (const dx of [-42, -14, 14]) {
            ctx.fillStyle = '#dfe6fa';
            ctx.fillRect(dx + 10, -22, 4, 24);
            ctx.fillStyle = st.failed ? '#5e4b5f' : '#2f5ac7';
            ctx.strokeStyle = st.failed ? '#ff7b8a' : '#ffe184';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.roundRect(dx, -92, 24, 72, 4);
            ctx.fill();
            ctx.stroke();
          }
          break;
        }
        case 'greenhouse': {
          ctx.fillStyle = st.failed ? 'rgba(130, 82, 95, 0.35)' : 'rgba(166, 233, 183, 0.45)';
          ctx.strokeStyle = st.failed ? '#ff7b8a' : '#ffffff';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(-54, 0);
          ctx.lineTo(-54, -26);
          ctx.arc(0, -26, 54, Math.PI, 0, false);
          ctx.lineTo(54, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          for (const sx of [-28, 0, 28]) {
            ctx.fillStyle = st.failed ? '#7c6572' : '#40b87a';
            ctx.beginPath();
            ctx.ellipse(sx, -14, 6.5, 13, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'habitat': {
          ctx.fillStyle = '#eef2ff';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-70, -48, 140, 48, 22);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -48, 40, Math.PI, 0);
          ctx.fill();
          for (const wx of [-42, -14, 14, 42]) {
            ctx.fillStyle = st.failed ? '#ff7b8a' : '#70c8f5';
            ctx.beginPath();
            ctx.arc(wx, -24, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'recycler': {
          ctx.fillStyle = '#dcebff';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(-48, -56, 30, 56, 8);
          ctx.roundRect(-12, -44, 30, 44, 8);
          ctx.roundRect(24, -36, 26, 36, 7);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = st.failed ? '#ff7b8a' : '#53b7f2';
          ctx.beginPath();
          ctx.arc(-33, -34, 7.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shelter': {
          ctx.fillStyle = '#736f9c';
          ctx.strokeStyle = w.shieldBoostSec > 0 ? '#76dbae' : st.failed ? '#ff7b8a' : '#ffffff';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(-64, 0);
          ctx.quadraticCurveTo(-48, -68, 0, -70);
          ctx.quadraticCurveTo(48, -68, 64, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#36355c';
          ctx.fillRect(-13, -30, 26, 30);
          break;
        }
        case 'comms': {
          ctx.fillStyle = '#eef2ff';
          ctx.fillRect(-3, -82, 6, 82);
          ctx.strokeStyle = '#eef2ff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(0, -34);
          ctx.lineTo(18, 0);
          ctx.stroke();
          ctx.save();
          ctx.translate(0, -86);
          ctx.rotate(-0.48);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI, false);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = st.failed ? '#ff7b8a' : '#ff8ca2';
          ctx.beginPath();
          ctx.arc(0, -18, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
      }

      ctx.globalAlpha = 1;

      // Cracked X overlay when station FAILED
      if (st.failed) {
        ctx.strokeStyle = '#ff6b7c';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(-16, -54);
        ctx.lineTo(16, -22);
        ctx.moveTo(16, -54);
        ctx.lineTo(-16, -22);
        ctx.stroke();
      }

      // Crisp cream nameplate + health bar below building
      ctx.fillStyle = '#fffefa';
      ctx.strokeStyle = st.failed ? '#ff7b8a' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-62, 12, 124, 34, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#344270';
      ctx.font = '800 12.5px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(meta.label, 0, 15.5);

      if (st.failed) {
        ctx.fillStyle = '#e04f64';
        ctx.font = '800 10.5px "JetBrains Mono", monospace';
        ctx.fillText('OFFLINE', 0, 31.5);
      } else {
        ctx.fillStyle = '#e5eaf7';
        ctx.beginPath();
        ctx.roundRect(-48, 34, 68, 6, 3);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(-48, 34, (68 * pct) / 100, 6, 3);
        ctx.fill();

        ctx.fillStyle = col;
        ctx.font = '800 10.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${pct}%`, 52, 31);
      }

      // Floating prompt or bouncing gold `!` target beacon
      if (isNear && !st.failed && st.cooldownSec <= 0) {
        const bounce = Math.sin(nowSec * 7) * 4;
        ctx.fillStyle = '#ffe184';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-46, -124 + bounce, 92, 24, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#364272';
        ctx.font = '800 11.5px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OPEN [E]', 0, -112 + bounce);
      } else if (!st.failed && (isPriorityTarget || pct < 48)) {
        const bounce = Math.sin(nowSec * 5.2) * 5;
        ctx.fillStyle = pct < 35 ? '#ff7b8a' : '#ffe184';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -108 + bounce, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = pct < 35 ? '#ffffff' : '#5f4385';
        ctx.font = '900 15px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, -107 + bounce);
      }

      ctx.restore();
    };

    const drawEscapeRocket = () => {
      const { x, y } = ROCKET_PAD_POS;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#a89fc7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 4, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.quadraticCurveTo(13, -32, 12, -2);
      ctx.lineTo(-12, -2);
      ctx.quadraticCurveTo(-13, -32, 0, -56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff8ca2';
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.quadraticCurveTo(8, -42, 9, -34);
      ctx.lineTo(-9, -34);
      ctx.quadraticCurveTo(-8, -42, 0, -56);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.lineTo(-20, 2);
      ctx.lineTo(-10, -2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, -14);
      ctx.lineTo(20, 2);
      ctx.lineTo(10, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a8e3fa';
      ctx.beginPath();
      ctx.arc(0, -24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffefa';
      ctx.font = '800 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ESCAPE SHIP', 0, 20);
      ctx.restore();
    };

    let timeoutId = 0;
    const render = (now: number) => {
      if (pausedRef.current) {
        timeoutId = window.setTimeout(() => {
          lastTime = performance.now();
          rafId = requestAnimationFrame(render);
        }, 120);
        return;
      }
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const nowSec = now / 1000;
      const w = worldRef.current;

      // Lavender-dusk sky gradient from storybook Moon palette
      const sky = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      sky.addColorStop(0, '#594e86');
      sky.addColorStop(0.55, '#7e709e');
      sky.addColorStop(1, '#56628f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Gentle stars
      for (let i = 0; i < 42; i++) {
        const sx = (i * 173) % WORLD_WIDTH;
        const sy = (i * 97) % 210;
        ctx.fillStyle = `rgba(255, 249, 224, ${0.42 + (i % 5) * 0.1})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) * 0.55 + 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Warm sun glow on horizon
      const sunGrad = ctx.createRadialGradient(45, 230, 10, 45, 230, 250);
      sunGrad.addColorStop(0, w.stations.solar.failed ? 'rgba(255, 210, 130, 0.2)' : 'rgba(255, 230, 148, 0.45)');
      sunGrad.addColorStop(1, 'rgba(255, 230, 148, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, 380, 340);

      // Earth in center sky
      ctx.save();
      ctx.translate(495, 82 + Math.sin(nowSec * 0.8) * 3);
      ctx.fillStyle = '#4890f5';
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#76dbae';
      ctx.beginPath();
      ctx.ellipse(-9, -6, 10, 6.5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(9, 7, 8, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffefa';
      ctx.font = '800 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', 0, 41);
      ctx.restore();

      // Active storm waves
      if (w.storm.active) {
        ctx.fillStyle = 'rgba(255, 123, 138, 0.14)';
        ctx.fillRect(0, 0, WORLD_WIDTH, 280);
        ctx.strokeStyle =
          w.storm.kind === 'meteor_shower' ? 'rgba(255, 130, 146, 0.65)' : 'rgba(255, 224, 130, 0.65)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        for (let r = 0; r < 3; r++) {
          const offset = (nowSec * 90 + r * 40) % 120;
          ctx.beginPath();
          ctx.moveTo(40 + offset, 45 + r * 32);
          ctx.quadraticCurveTo(420, 22 + r * 32, 920 - offset, 64 + r * 32);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Lunar ridge silhouette + lavender regolith ground
      ctx.fillStyle = '#6c6293';
      ctx.beginPath();
      ctx.moveTo(0, 240);
      ctx.lineTo(130, 205);
      ctx.lineTo(260, 228);
      ctx.lineTo(390, 196);
      ctx.lineTo(540, 232);
      ctx.lineTo(710, 198);
      ctx.lineTo(860, 228);
      ctx.lineTo(1000, 208);
      ctx.lineTo(1000, 540);
      ctx.lineTo(0, 540);
      ctx.closePath();
      ctx.fill();

      const gGrad = ctx.createLinearGradient(0, 225, 0, WORLD_HEIGHT);
      gGrad.addColorStop(0, '#9689b8');
      gGrad.addColorStop(0.6, '#7a75a6');
      gGrad.addColorStop(1, '#5b6392');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.moveTo(0, 248);
      ctx.quadraticCurveTo(320, 224, 650, 248);
      ctx.quadraticCurveTo(860, 236, 1000, 250);
      ctx.lineTo(1000, WORLD_HEIGHT);
      ctx.lineTo(0, WORLD_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Soft storybook craters on lunar floor
      ctx.fillStyle = 'rgba(208, 195, 225, 0.35)';
      ctx.beginPath();
      ctx.ellipse(210, 488, 65, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(760, 495, 58, 15, 0, 0, Math.PI * 2);
      ctx.ellipse(495, 285, 42, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rounded moonbase walkways connecting Habitat hub
      const cables: [ModuleId, ModuleId][] = [
        ['solar', 'habitat'],
        ['greenhouse', 'habitat'],
        ['recycler', 'habitat'],
        ['shelter', 'habitat'],
        ['comms', 'shelter'],
      ];
      ctx.lineCap = 'round';
      for (const [a, b] of cables) {
        const failedCable = w.stations[a].failed || w.stations[b].failed;
        ctx.strokeStyle = failedCable ? 'rgba(255, 123, 138, 0.35)' : 'rgba(68, 72, 104, 0.72)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(STATIONS[a].pos.x, STATIONS[a].pos.y + 4);
        ctx.lineTo(STATIONS[b].pos.x, STATIONS[b].pos.y + 4);
        ctx.stroke();

        ctx.strokeStyle = failedCable ? 'rgba(255, 180, 190, 0.55)' : 'rgba(232, 236, 255, 0.65)';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(STATIONS[a].pos.x, STATIONS[a].pos.y + 4);
        ctx.lineTo(STATIONS[b].pos.x, STATIONS[b].pos.y + 4);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Click-to-walk target indicator
      if (w.player.target) {
        const pulseR = 10 + Math.sin(nowSec * 8) * 3;
        ctx.strokeStyle = '#ffe184';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(w.player.target.x, w.player.target.y, pulseR, pulseR * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Find the lowest-health ready station so we can highlight it with a gold beacon
      let priorityId: ModuleId | null = null;
      let lowestHp = 78;
      for (const id of STATION_ORDER) {
        const st = w.stations[id];
        if (!st.failed && st.cooldownSec <= 0 && st.health < lowestHp) {
          lowestHp = st.health;
          priorityId = id;
        }
      }

      drawEscapeRocket();
      for (const id of STATION_ORDER) {
        const near = distanceBetween(w.player, STATIONS[id].interactPos) <= INTERACT_RADIUS;
        drawStation(w, id, nowSec, near, id === priorityId);
      }

      // Particle spawn for walking footsteps & NPC wrench sparks
      stepTimer += rawDt;
      if (stepTimer > 0.14) {
        stepTimer = 0;
        if (Math.hypot(w.player.vx, w.player.vy) > 20) {
          spawnParticle(w.player.x, w.player.y + 2, -w.player.vx * 0.08, -14, 'rgba(255,244,216,0.65)', 2.4, 0.45);
        }
        if (Math.hypot(w.npc.vx, w.npc.vy) > 20) {
          spawnParticle(w.npc.x, w.npc.y + 2, -w.npc.vx * 0.08, -12, 'rgba(255,244,216,0.5)', 2.2, 0.4);
        }
      }
      sparkTimer += rawDt;
      if (w.npc.taskPhase === 'working' && sparkTimer > 0.16) {
        sparkTimer = 0;
        spawnParticle(
          w.npc.x + w.npc.facing * 12,
          w.npc.y - 20,
          (Math.random() - 0.5) * 45,
          -20 - Math.random() * 25,
          '#ffe184',
          2.6,
          0.4,
        );
      }

      for (const p of pool) {
        if (!p.active) continue;
        p.life -= rawDt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * rawDt;
        p.y += p.vy * rawDt;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const npcThought = STATION_PAD_COLORS[w.npc.targetStation].emoji;

      // Y-sort NPC & Player so foreground actor overlaps naturally
      const actors = [
        {
          y: w.npc.y,
          draw: () =>
            drawAstronaut(
              w.npc.x,
              w.npc.y,
              w.npc.facing,
              w.npc.walkPhase,
              Math.hypot(w.npc.vx, w.npc.vy) > 12,
              w.npc.profile.trimColor,
              w.npc.profile.visorColor,
              w.npc.profile.backpackColor,
              `${w.npc.profile.shortName} (NPC)`,
              w.npc.taskPhase === 'working',
              w.crewHealth,
              npcThought,
            ),
        },
        {
          y: w.player.y,
          draw: () =>
            drawAstronaut(
              w.player.x,
              w.player.y,
              w.player.facing,
              w.player.walkPhase,
              Math.hypot(w.player.vx, w.player.vy) > 12,
              w.playerProfile.trimColor,
              w.playerProfile.visorColor,
              w.playerProfile.backpackColor,
              `${w.playerProfile.shortName} (YOU)`,
              false,
              w.crewHealth,
            ),
        },
      ].sort((a, b) => a.y - b.y);

      for (const a of actors) a.draw();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [worldRef]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = clientPointToWorldPoint(e.clientX, e.clientY, canvas.getBoundingClientRect());
    if (!pt) return;
    const { x: worldX, y: worldY } = pt;

    for (const id of STATION_ORDER) {
      const stPos = STATIONS[id].pos;
      if (Math.abs(worldX - stPos.x) <= 72 && worldY >= stPos.y - 108 && worldY <= stPos.y + 46) {
        const w = worldRef.current;
        if (distanceBetween(w.player, STATIONS[id].interactPos) <= INTERACT_RADIUS) {
          onOpenNearbyStation();
        } else {
          onSelectStationOrWalk(id);
        }
        return;
      }
    }

    onWalkToPoint({ x: worldX, y: worldY });
  };

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#594e86]">
      <canvas
        ref={canvasRef}
        width={WORLD_WIDTH}
        height={WORLD_HEIGHT}
        onPointerDown={handlePointerDown}
        className="h-full w-full cursor-pointer object-contain touch-none"
        aria-label="Interactive Moon Base map. Walk with WASD or arrow keys, or click anywhere to move your astronaut."
        data-testid="survival-canvas"
      />
    </div>
  );
}
