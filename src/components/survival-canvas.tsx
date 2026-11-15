import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { ModuleId } from '@/content/mission';
import {
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
      color: '#abb8d5',
    }));
    let poolCursor = 0;
    const spawnParticle = (x: number, y: number, vx: number, vy: number, color: string, size = 2.5, maxLife = 0.55) => {
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
    ) => {
      const bob = moving ? Math.abs(Math.sin(walkPhase)) * 3.5 : Math.sin(performance.now() * 0.004) * 1;
      const legSwing = moving ? Math.sin(walkPhase) * 4.5 : 0;

      ctx.save();
      ctx.translate(x, y);

      // Ground shadow
      ctx.fillStyle = 'rgba(5, 9, 24, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -bob);

      // Legs
      ctx.fillStyle = '#b4c2df';
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
      ctx.fillStyle = '#f5f7ff';
      ctx.beginPath();
      ctx.roundRect(-9, -25, 18, 20, 6);
      ctx.fill();
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
        ctx.strokeStyle = '#ffc76b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(facing * 10, -8);
        ctx.stroke();
        ctx.restore();
      }

      // Helmet
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -33, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor
      ctx.fillStyle = '#0f1938';
      ctx.beginPath();
      ctx.roundRect(facing === 1 ? -4 : -9, -38, 13, 9, 4.5);
      ctx.fill();
      ctx.fillStyle = visorColor;
      ctx.beginPath();
      ctx.roundRect(facing === 1 ? -2.5 : -7.5, -36.5, 10, 6, 3);
      ctx.fill();

      // Visor glare
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(facing === 1 ? -0.5 : -5.5, -34.5);
      ctx.lineTo(facing === 1 ? 3.5 : -1.5, -34.5);
      ctx.stroke();

      ctx.restore();

      // Floating nameplate above actor
      ctx.font = '700 11px "Outfit", sans-serif';
      const tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(8, 13, 31, 0.88)';
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, -62, tw, 17, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f5f7ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -53.5);

      // Astronaut Healthbar above nameplate
      const hpRatio = Math.max(0, Math.min(1, crewHealth / 100));
      const hpBarW = 54;
      const hpBarH = 6.5;
      const hpColor = hpRatio >= 0.6 ? '#35d2a0' : hpRatio >= 0.3 ? '#ffc76b' : '#ff727e';
      ctx.fillStyle = 'rgba(8, 13, 31, 0.92)';
      ctx.strokeStyle = 'rgba(180, 194, 223, 0.45)';
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

    const drawStation = (w: SurvivalWorldState, id: ModuleId, nowSec: number, isNear: boolean) => {
      const meta = STATIONS[id];
      const st = w.stations[id];
      const { x, y } = meta.pos;
      const pct = Math.max(0, Math.min(100, Math.round(st.health)));
      const col = st.failed
        ? '#ff727e'
        : pct < 35
          ? '#ff727e'
          : pct < 65
            ? '#ffc76b'
            : '#35d2a0';

      ctx.save();
      ctx.translate(x, y);

      // Proximity highlight ring
      if (isNear && !st.failed) {
        const pulse = 1 + Math.sin(nowSec * 6) * 0.05;
        ctx.strokeStyle = '#35d9e8';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 6, 84 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Repair flash aura
      if (st.repairFlashSec > 0) {
        ctx.fillStyle = `rgba(53, 210, 160, ${Math.min(0.28, st.repairFlashSec * 0.25)})`;
        ctx.beginPath();
        ctx.ellipse(0, -24, 72, 48, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Base shadow
      ctx.fillStyle = 'rgba(8, 13, 31, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 68, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = st.failed ? 0.45 : 1;

      // Distinct building art
      switch (id) {
        case 'solar': {
          for (const dx of [-42, -14, 14]) {
            ctx.fillStyle = '#6b7899';
            ctx.fillRect(dx + 10, -22, 4, 24);
            ctx.fillStyle = st.failed ? '#2b2435' : '#1f4594';
            ctx.strokeStyle = st.failed ? '#ff727e' : '#ffc76b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(dx, -92, 24, 72, 3);
            ctx.fill();
            ctx.stroke();
          }
          break;
        }
        case 'greenhouse': {
          ctx.fillStyle = st.failed ? 'rgba(110, 58, 74, 0.25)' : 'rgba(53, 210, 160, 0.22)';
          ctx.strokeStyle = st.failed ? '#ff727e' : '#35d2a0';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-54, 0);
          ctx.lineTo(-54, -26);
          ctx.arc(0, -26, 54, Math.PI, 0, false);
          ctx.lineTo(54, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          for (const sx of [-28, 0, 28]) {
            ctx.fillStyle = st.failed ? '#7c6572' : '#35d2a0';
            ctx.beginPath();
            ctx.ellipse(sx, -14, 6, 12, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'habitat': {
          ctx.fillStyle = '#c9d1e6';
          ctx.beginPath();
          ctx.roundRect(-70, -48, 140, 48, 22);
          ctx.fill();
          ctx.fillStyle = '#dfe5f5';
          ctx.beginPath();
          ctx.arc(0, -48, 40, Math.PI, 0);
          ctx.fill();
          for (const wx of [-42, -14, 14, 42]) {
            ctx.fillStyle = st.failed ? '#ff727e' : '#35d9e8';
            ctx.beginPath();
            ctx.arc(wx, -24, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'recycler': {
          ctx.fillStyle = '#8fa7d4';
          ctx.beginPath();
          ctx.roundRect(-48, -56, 30, 56, 8);
          ctx.roundRect(-12, -44, 30, 44, 8);
          ctx.roundRect(24, -36, 26, 36, 7);
          ctx.fill();
          ctx.fillStyle = st.failed ? '#ff727e' : '#35d9e8';
          ctx.beginPath();
          ctx.arc(-33, -34, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shelter': {
          ctx.fillStyle = '#545e78';
          ctx.strokeStyle = w.shieldBoostSec > 0 ? '#35d2a0' : st.failed ? '#ff727e' : '#ffc76b';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(-64, 0);
          ctx.quadraticCurveTo(-48, -68, 0, -70);
          ctx.quadraticCurveTo(48, -68, 64, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#111a35';
          ctx.fillRect(-13, -30, 26, 30);
          break;
        }
        case 'comms': {
          ctx.fillStyle = '#9fb4dc';
          ctx.fillRect(-3, -82, 6, 82);
          ctx.strokeStyle = '#9fb4dc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(0, -34);
          ctx.lineTo(18, 0);
          ctx.stroke();
          ctx.save();
          ctx.translate(0, -86);
          ctx.rotate(-0.48);
          ctx.fillStyle = '#dfe5f5';
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI, false);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = st.failed ? '#ff727e' : '#35d9e8';
          ctx.beginPath();
          ctx.arc(0, -18, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
      }

      ctx.globalAlpha = 1;

      // Cracked X overlay when station FAILED
      if (st.failed) {
        ctx.strokeStyle = '#ff727e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-16, -54);
        ctx.lineTo(16, -22);
        ctx.moveTo(16, -54);
        ctx.lineTo(-16, -22);
        ctx.stroke();
      }

      // Health bar + Station label pill below building
      ctx.fillStyle = 'rgba(12, 20, 44, 0.94)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-62, 12, 124, 34, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f5f7ff';
      ctx.font = '700 12.5px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(meta.label, 0, 16);

      if (st.failed) {
        ctx.fillStyle = '#ff727e';
        ctx.font = '800 10.5px "JetBrains Mono", monospace';
        ctx.fillText('FAILED', 0, 32);
      } else {
        // Health bar track
        ctx.fillStyle = '#1b284d';
        ctx.beginPath();
        ctx.roundRect(-48, 34, 68, 6, 3);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(-48, 34, (68 * pct) / 100, 6, 3);
        ctx.fill();

        ctx.fillStyle = col;
        ctx.font = '700 10.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${pct}%`, 52, 31);
      }

      // Floating "PRESS E / TAP!" prompt when near & ready
      if (isNear && !st.failed && st.cooldownSec <= 0) {
        const bounce = Math.sin(nowSec * 7) * 4;
        ctx.fillStyle = '#ffc76b';
        ctx.beginPath();
        ctx.roundRect(-44, -124 + bounce, 88, 22, 10);
        ctx.fill();
        ctx.fillStyle = '#080d1f';
        ctx.font = '800 11px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OPEN [E]', 0, -113 + bounce);
      } else if (!st.failed && pct < 45) {
        const pulseA = 0.65 + Math.sin(nowSec * 8) * 0.35;
        ctx.fillStyle = `rgba(255, 114, 126, ${pulseA})`;
        ctx.beginPath();
        ctx.arc(0, -104, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#080d1f';
        ctx.font = '800 14px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, -103);
      }

      ctx.restore();
    };

    const drawEscapeRocket = () => {
      const { x, y } = ROCKET_PAD_POS;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#334066';
      ctx.beginPath();
      ctx.ellipse(0, 4, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5f7ff';
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.quadraticCurveTo(13, -32, 12, -2);
      ctx.lineTo(-12, -2);
      ctx.quadraticCurveTo(-13, -32, 0, -56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff727e';
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
      ctx.fillStyle = '#35d9e8';
      ctx.beginPath();
      ctx.arc(0, -24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#abb8d5';
      ctx.font = '700 10px "JetBrains Mono", monospace';
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

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      sky.addColorStop(0, '#070b1b');
      sky.addColorStop(0.55, '#111a35');
      sky.addColorStop(1, '#18203d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Stars
      for (let i = 0; i < 58; i++) {
        const sx = (i * 173) % WORLD_WIDTH;
        const sy = (i * 97) % 230;
        ctx.fillStyle = `rgba(245, 247, 255, ${0.32 + (i % 5) * 0.14})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) * 0.45 + 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Low Sun Glow
      const sunGrad = ctx.createRadialGradient(45, 240, 10, 45, 240, 260);
      sunGrad.addColorStop(0, w.stations.solar.failed ? 'rgba(255, 199, 107, 0.15)' : 'rgba(255, 199, 107, 0.42)');
      sunGrad.addColorStop(1, 'rgba(255, 199, 107, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, 400, 360);

      // Earth in Center Sky
      ctx.save();
      ctx.translate(495, 84 + Math.sin(nowSec * 0.8) * 3);
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#35d2a0';
      ctx.beginPath();
      ctx.ellipse(-9, -6, 11, 7, -0.3, 0, Math.PI * 2);
      ctx.ellipse(10, 7, 9, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#abb8d5';
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', 0, 43);
      ctx.restore();

      // Active storm waves
      if (w.storm.active) {
        ctx.fillStyle = 'rgba(255, 114, 126, 0.08)';
        ctx.fillRect(0, 0, WORLD_WIDTH, 280);
        ctx.strokeStyle = w.storm.kind === 'meteor_shower' ? 'rgba(255, 114, 126, 0.45)' : 'rgba(255, 199, 107, 0.4)';
        ctx.lineWidth = 2.5;
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

      // Crater ridges & lunar terrain
      ctx.fillStyle = '#222a47';
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

      const gGrad = ctx.createLinearGradient(0, 230, 0, WORLD_HEIGHT);
      gGrad.addColorStop(0, '#364163');
      gGrad.addColorStop(1, '#192241');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.moveTo(0, 250);
      ctx.quadraticCurveTo(320, 224, 650, 248);
      ctx.quadraticCurveTo(860, 236, 1000, 250);
      ctx.lineTo(1000, WORLD_HEIGHT);
      ctx.lineTo(0, WORLD_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Power/Water paths connecting Habitat hub
      const cables: [ModuleId, ModuleId][] = [
        ['solar', 'habitat'],
        ['greenhouse', 'habitat'],
        ['recycler', 'habitat'],
        ['shelter', 'habitat'],
        ['comms', 'shelter'],
      ];
      for (const [a, b] of cables) {
        const failedCable = w.stations[a].failed || w.stations[b].failed;
        ctx.strokeStyle = failedCable ? 'rgba(255, 114, 126, 0.25)' : 'rgba(53, 217, 232, 0.45)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.moveTo(STATIONS[a].pos.x, STATIONS[a].pos.y);
        ctx.lineTo(STATIONS[b].pos.x, STATIONS[b].pos.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Click-to-walk target indicator
      if (w.player.target) {
        const pulseR = 10 + Math.sin(nowSec * 8) * 3;
        ctx.strokeStyle = '#35d9e8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(w.player.target.x, w.player.target.y, pulseR, pulseR * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Escape Rocket & 6 Stations
      drawEscapeRocket();
      for (const id of STATION_ORDER) {
        const near = distanceBetween(w.player, STATIONS[id].interactPos) <= INTERACT_RADIUS;
        drawStation(w, id, nowSec, near);
      }

      // Particle spawn for walking footsteps & NPC wrench sparks
      stepTimer += rawDt;
      if (stepTimer > 0.14) {
        stepTimer = 0;
        if (Math.hypot(w.player.vx, w.player.vy) > 20) {
          spawnParticle(w.player.x, w.player.y + 2, -w.player.vx * 0.08, -14, 'rgba(171,184,213,0.6)', 2.4, 0.45);
        }
        if (Math.hypot(w.npc.vx, w.npc.vy) > 20) {
          spawnParticle(w.npc.x, w.npc.y + 2, -w.npc.vx * 0.08, -12, 'rgba(171,184,213,0.45)', 2.2, 0.4);
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
          '#ffc76b',
          2.6,
          0.4,
        );
      }

      // Update & draw pooled particles
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
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const worldX = ((e.clientX - rect.left) / rect.width) * WORLD_WIDTH;
    const worldY = ((e.clientY - rect.top) / rect.height) * WORLD_HEIGHT;

    // Check if player tapped/clicked on a station building directly
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
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#070b1b]">
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
