const SOUND_KEY = 'astroborneo-read-aloud';
const REDUCED_MOTION_KEY = 'lunalab-reduced-motion';
const DETAILS_MODE_KEY = 'lunalab-details-mode';
const LEGACY_PREFS_KEY = 'lunalab.preferences.v1';

function readLegacyPref(field: 'sound' | 'readAloud' | 'reducedMotion' | 'detailsMode'): boolean | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LEGACY_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const v = parsed?.[field];
    return typeof v === 'boolean' ? v : null;
  } catch {
    return null;
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function loadSoundPref(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const direct = localStorage.getItem(SOUND_KEY);
    if (direct !== null) return direct === '1';
    const legacyKey = localStorage.getItem('lunalab-read-aloud');
    if (legacyKey !== null) return legacyKey === '1';
    return readLegacyPref('readAloud') ?? readLegacyPref('sound') ?? false;
  } catch {
    return false;
  }
}

export function saveSoundPref(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
    }
  } catch {
    /* optional preference */
  }
}

export function loadReducedMotionPref(): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(REDUCED_MOTION_KEY) !== null) {
      return localStorage.getItem(REDUCED_MOTION_KEY) === '1';
    }
    const legacy = readLegacyPref('reducedMotion');
    if (legacy !== null) return legacy;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function saveReducedMotionPref(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(REDUCED_MOTION_KEY, enabled ? '1' : '0');
    }
  } catch {
    /* optional preference */
  }
}

export function loadDetailsModePref(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const direct = localStorage.getItem(DETAILS_MODE_KEY);
    if (direct !== null) return direct === '1';
    return readLegacyPref('detailsMode') ?? false;
  } catch {
    return false;
  }
}

export function saveDetailsModePref(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DETAILS_MODE_KEY, enabled ? '1' : '0');
    }
  } catch {
    /* optional preference */
  }
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore speech errors */
  }
}

export function speakText(text: string, force = false): void {
  if (!isSpeechSupported()) return;
  if (!force && !loadSoundPref()) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.96;
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
  } catch {
    /* gracefully degrade when speechSynthesis is blocked */
  }
}
