// Lightweight Web Audio API sound effects for kid-friendly tactile feedback.
// Zero external audio files; gracefully no-ops if AudioContext is unavailable.

const SFX_PREF_KEY = 'astroborneo-sfx-enabled';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    try {
      ctx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function loadSfxPref(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(SFX_PREF_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function saveSfxPref(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SFX_PREF_KEY, enabled ? '1' : '0');
    }
  } catch {
    /* optional preference */
  }
}

export type SfxKind = 'tap' | 'on' | 'off' | 'launch' | 'good' | 'oops' | 'win';

function tone(
  ac: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  peak = 0.12,
  endFreq?: number,
) {
  const now = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
  }
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSfx(kind: SfxKind): void {
  if (!loadSfxPref()) return;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) {
    return;
  }
  const ac = getCtx();
  if (!ac) return;

  try {
    switch (kind) {
      case 'tap':
        tone(ac, 520, 0, 0.07, 'sine', 0.09, 640);
        break;
      case 'on':
        tone(ac, 440, 0, 0.09, 'triangle', 0.11);
        tone(ac, 660, 0.06, 0.12, 'triangle', 0.11);
        break;
      case 'off':
        tone(ac, 420, 0, 0.09, 'triangle', 0.09);
        tone(ac, 300, 0.06, 0.12, 'triangle', 0.08);
        break;
      case 'launch':
        tone(ac, 240, 0, 0.18, 'triangle', 0.12, 620);
        tone(ac, 523.25, 0.12, 0.18, 'sine', 0.11);
        break;
      case 'good':
        tone(ac, 523.25, 0, 0.1, 'triangle', 0.11);
        tone(ac, 659.25, 0.08, 0.1, 'triangle', 0.11);
        tone(ac, 783.99, 0.16, 0.18, 'triangle', 0.12);
        break;
      case 'oops':
        tone(ac, 330, 0, 0.14, 'sine', 0.1, 240);
        break;
      case 'win':
        tone(ac, 523.25, 0, 0.12, 'triangle', 0.12);
        tone(ac, 659.25, 0.1, 0.12, 'triangle', 0.12);
        tone(ac, 783.99, 0.2, 0.12, 'triangle', 0.12);
        tone(ac, 1046.5, 0.3, 0.3, 'triangle', 0.14);
        break;
    }
  } catch {
    /* ignore audio synthesis failures */
  }
}
