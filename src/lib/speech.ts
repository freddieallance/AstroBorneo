const SOUND_KEY = 'astroborneo-read-aloud';
const VOICE_STYLE_KEY = 'astroborneo-voice-style';
const REDUCED_MOTION_KEY = 'lunalab-reduced-motion';
const DETAILS_MODE_KEY = 'lunalab-details-mode';
const LEGACY_PREFS_KEY = 'lunalab.preferences.v1';

export type CuteVoiceStyle = 'bubbly' | 'sweet' | 'peppy';

export const CUTE_VOICE_STYLES: ReadonlyArray<{
  id: CuteVoiceStyle;
  label: string;
  hint: string;
}> = [
  { id: 'bubbly', label: 'Bubbly', hint: 'Bright & cheerful' },
  { id: 'sweet', label: 'Sweet', hint: 'Soft storybook' },
  { id: 'peppy', label: 'Peppy', hint: 'Lively sidekick' },
];

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

export interface SpeechSegment {
  text: string;
  pitch: number;
  rate: number;
}

const CHILD_OR_BRIGHT_HINTS = ['ana', 'maisie', 'child', 'kid', 'libby'];

const CUTE_TOP_VOICES = [
  'ana',
  'maisie',
  'aria',
  'jenny',
  'ava',
  'chloe',
  'samantha',
  'zoe',
  'allison',
  'karen',
  'tessa',
  'fiona',
  'moira',
  'emma',
  'olivia',
  'sara',
  'libby',
  'sonia',
  'clara',
  'natasha',
  'heera',
  'raveena',
];

const CUTE_GOOD_VOICES = [
  'google uk english female',
  'google us english',
  'microsoft zira',
  'zira',
  'susan',
  'hazel',
  'catherine',
  'victoria',
  'kate',
  'serena',
  'siri',
  'female',
  'girl',
  'natural',
  'neural',
  'enhanced',
  'premium',
];

const AVOID_VOICE_HINTS = [
  'male',
  'david',
  'mark',
  'george',
  'daniel',
  'alex',
  'fred',
  'ryan',
  'guy',
  'andrew',
  'brian',
  'christopher',
  'eric',
  'roger',
  'steffan',
  'oliver',
  'arthur',
  'thomas',
  'lee',
  'rishi',
  'aaron',
  'espeak',
  'mbrola',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'junior',
  'organ',
  'trinoids',
  'whisper',
  'zarvox',
  'albert',
  'ralph',
];

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesListenerBound = false;

function ensureVoicesListener(): void {
  if (voicesListenerBound || !isSpeechSupported()) return;
  voicesListenerBound = true;
  try {
    const refresh = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) cachedVoices = list;
    };
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
  } catch {
    /* ignore browser voiceschanged quirks */
  }
}

function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  ensureVoicesListener();
  try {
    const live = window.speechSynthesis.getVoices();
    if (live.length > 0) {
      cachedVoices = live;
      return live;
    }
  } catch {
    /* fallback to cached */
  }
  return cachedVoices;
}

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

export function loadVoiceStylePref(): CuteVoiceStyle {
  try {
    if (typeof localStorage === 'undefined') return 'bubbly';
    const raw = localStorage.getItem(VOICE_STYLE_KEY);
    if (raw === 'bubbly' || raw === 'sweet' || raw === 'peppy') return raw;
    return 'bubbly';
  } catch {
    return 'bubbly';
  }
}

export function saveVoiceStylePref(style: CuteVoiceStyle): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOICE_STYLE_KEY, style);
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

export function scoreVoiceForCuteness(voice: VoiceLike): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  let score = 0;

  if (lang.startsWith('en-us') || lang.startsWith('en-gb') || lang.startsWith('en-au') || lang.startsWith('en-ca')) {
    score += 40;
  } else if (lang.startsWith('en')) {
    score += 25;
  } else {
    score -= 200;
  }

  for (let i = 0; i < CUTE_TOP_VOICES.length; i++) {
    const token = CUTE_TOP_VOICES[i];
    if (name.includes(token)) {
      // Earlier names in list get slightly higher tie-breaker preference (child/natural voices first)
      score += 130 - i;
      break;
    }
  }

  for (const hint of CUTE_GOOD_VOICES) {
    if (name.includes(hint)) {
      score += 45;
    }
  }

  for (const bad of AVOID_VOICE_HINTS) {
    // Match whole word or token to avoid false positives (e.g. 'female' contains 'male')
    const re = new RegExp(`(?:^|[^a-z])${bad}(?:$|[^a-z])`, 'i');
    if (re.test(name)) {
      score -= 140;
    }
  }

  if (voice.localService === false && (name.includes('natural') || name.includes('online') || name.includes('google'))) {
    score += 12;
  }

  return score;
}

export function pickCuteVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  if (!voices.length) return null;
  let best: T | null = null;
  let bestScore = -Infinity;

  for (const v of voices) {
    const s = scoreVoiceForCuteness(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  // Only return non-English voice if nothing English exists, and prefer best overall
  if (best && !best.lang.toLowerCase().startsWith('en')) {
    const english = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (english) return english;
  }

  return best;
}

export function getCuteSpeechTuning(
  voice: Pick<VoiceLike, 'name' | 'lang'> | null | undefined,
  style: CuteVoiceStyle = 'bubbly',
): { pitch: number; rate: number; volume: number } {
  const name = voice?.name.toLowerCase() ?? '';
  const isAlreadyChild = CHILD_OR_BRIGHT_HINTS.some((h) => name.includes(h));
  const isNeural = name.includes('natural') || name.includes('neural') || name.includes('online') || name.includes('enhanced') || name.includes('premium');

  let pitch = isAlreadyChild ? 1.1 : isNeural ? 1.2 : 1.3;
  let rate = 1.03;

  if (style === 'sweet') {
    pitch -= 0.06;
    rate = 0.97;
  } else if (style === 'peppy') {
    pitch += 0.09;
    rate = 1.08;
  }

  return {
    pitch: Math.max(0.8, Math.min(1.65, Number(pitch.toFixed(2)))),
    rate: Math.max(0.85, Math.min(1.2, Number(rate.toFixed(2)))),
    volume: 0.96,
  };
}

export function formatCuteSpeechText(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/·|•/g, ', ')
    .replace(/->|→/g, ' to ')
    .replace(/\bCO2\b/gi, 'carbon dioxide')
    .replace(/\bH2O\b/gi, 'water')
    .replace(/\bO2\b/gi, 'oxygen')
    .replace(/\bkWh\b/gi, 'power units')
    .replace(/\+(\d+)\s*%/g, 'plus $1 percent')
    .replace(/-(\d+)\s*%/g, 'minus $1 percent')
    .replace(/(\d+)\s*%/g, '$1 percent')
    .replace(/\s*\/\s*/g, ' or ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareCuteSpeechSegments(text: string, basePitch: number, baseRate: number): SpeechSegment[] {
  const cleaned = formatCuteSpeechText(text);
  if (!cleaned) return [];

  const rawParts = cleaned.match(/[^.!?]+[.!?]*/g) ?? [cleaned];
  const segments: SpeechSegment[] = [];

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const endsExclaim = trimmed.endsWith('!');
    const endsQuestion = trimmed.endsWith('?');

    const segPitch = Math.max(
      0.8,
      Math.min(1.75, Number((basePitch + (endsQuestion ? 0.08 : endsExclaim ? 0.05 : 0)).toFixed(2))),
    );
    const segRate = Math.max(
      0.85,
      Math.min(1.22, Number((baseRate + (endsExclaim ? 0.02 : 0)).toFixed(2))),
    );

    segments.push({
      text: trimmed,
      pitch: segPitch,
      rate: segRate,
    });
  }

  return segments;
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore speech errors */
  }
}

export function speakText(
  text: string,
  force = false,
  options?: { style?: CuteVoiceStyle },
): void {
  if (!isSpeechSupported()) return;
  if (!force && !loadSoundPref()) return;
  try {
    window.speechSynthesis.cancel();
    const voices = getAvailableVoices();
    const chosenVoice = pickCuteVoice(voices);
    const style = options?.style ?? loadVoiceStylePref();
    const tuning = getCuteSpeechTuning(chosenVoice, style);
    const segments = prepareCuteSpeechSegments(text, tuning.pitch, tuning.rate);

    for (const seg of segments) {
      const utter = new SpeechSynthesisUtterance(seg.text);
      if (chosenVoice) {
        utter.voice = chosenVoice;
        utter.lang = chosenVoice.lang || 'en-US';
      } else {
        utter.lang = 'en-US';
      }
      utter.pitch = seg.pitch;
      utter.rate = seg.rate;
      utter.volume = tuning.volume;
      window.speechSynthesis.speak(utter);
    }
  } catch {
    /* gracefully degrade when speechSynthesis is blocked */
  }
}

// Pre-warm voice discovery when module loads in browser
if (typeof window !== 'undefined') {
  ensureVoicesListener();
}
