// Lightweight Web Audio API music & sound effects for kid-friendly tactile feedback.
// Zero external audio files; gracefully no-ops if AudioContext is unavailable.

const SFX_PREF_KEY = 'astroborneo-sfx-enabled';
const MUSIC_PREF_KEY = 'astroborneo-music-enabled';

const MELODY_FREQS = [
  659, 784, 880, 784,
  659, 587, 523, 659,
  784, 880, 784, 659,
  587, 523, 392, 523,
];
const MELODY_INTERVAL_MS = 280;

let ctx: AudioContext | null = null;
let musicTimer: number | null = null;
let musicStep = 0;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

export function loadMusicPref(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(MUSIC_PREF_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function saveMusicPref(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MUSIC_PREF_KEY, enabled ? '1' : '0');
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
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Crisp HTML-prototype musical chime: 760Hz on positive progress, 250Hz on mistake.
 */
export function playMusicalBeep(success = true): void {
  if (!loadSfxPref()) return;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) {
    return;
  }
  const ac = getCtx();
  if (!ac) return;
  try {
    tone(ac, success ? 760 : 250, 0, 0.12, 'sine', 0.045);
  } catch {
    /* ignore audio synthesis failures */
  }
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
        tone(ac, 760, 0, 0.09, 'sine', 0.045);
        break;
      case 'on':
        tone(ac, 659, 0, 0.09, 'sine', 0.055);
        tone(ac, 880, 0.06, 0.12, 'sine', 0.06);
        break;
      case 'off':
        tone(ac, 523, 0, 0.08, 'sine', 0.05);
        tone(ac, 392, 0.06, 0.11, 'sine', 0.045);
        break;
      case 'launch':
        tone(ac, 523, 0, 0.12, 'sine', 0.06);
        tone(ac, 659, 0.09, 0.12, 'sine', 0.06);
        tone(ac, 784, 0.18, 0.18, 'sine', 0.065);
        break;
      case 'good':
        tone(ac, 523.25, 0, 0.1, 'sine', 0.07);
        tone(ac, 659.25, 0.08, 0.1, 'sine', 0.07);
        tone(ac, 783.99, 0.16, 0.18, 'sine', 0.08);
        break;
      case 'oops':
        tone(ac, 250, 0, 0.14, 'sine', 0.055, 190);
        break;
      case 'win':
        tone(ac, 523.25, 0, 0.12, 'sine', 0.08);
        tone(ac, 659.25, 0.1, 0.12, 'sine', 0.08);
        tone(ac, 783.99, 0.2, 0.12, 'sine', 0.08);
        tone(ac, 1046.5, 0.3, 0.28, 'sine', 0.09);
        break;
    }
  } catch {
    /* ignore audio synthesis failures */
  }
}

export function stopBackgroundMusic(): void {
  if (musicTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function startBackgroundMusic(): void {
  if (typeof window === 'undefined' || musicTimer !== null) return;
  if (!loadMusicPref()) return;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const ac = getCtx();
  if (!ac) return;

  musicTimer = window.setInterval(() => {
    if (!loadMusicPref() || (typeof document !== 'undefined' && document.hidden)) {
      stopBackgroundMusic();
      return;
    }
    const active = getCtx();
    if (!active || active.state !== 'running') return;
    try {
      tone(active, MELODY_FREQS[musicStep % MELODY_FREQS.length], 0, 0.19, 'sine', 0.018);
      musicStep++;
    } catch {
      /* ignore */
    }
  }, MELODY_INTERVAL_MS);
}

/**
 * Ensures the gentle melody starts cleanly on first user interaction and pauses on hidden tabs.
 */
export function attachMusicLifecycle(shouldPlay: () => boolean): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const sync = () => {
    if (shouldPlay() && loadMusicPref() && !document.hidden) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  };

  const onFirstGesture = () => {
    const ac = getCtx();
    if (ac && ac.state === 'suspended') {
      ac.resume()
        .then(() => sync())
        .catch(() => {});
    } else {
      sync();
    }
  };

  const onVisibility = () => sync();

  sync();
  window.addEventListener('pointerdown', onFirstGesture, { passive: true });
  window.addEventListener('keydown', onFirstGesture, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('keydown', onFirstGesture);
    document.removeEventListener('visibilitychange', onVisibility);
    stopBackgroundMusic();
  };
}
