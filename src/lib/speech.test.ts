import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCuteSpeechText,
  getCuteSpeechTuning,
  loadVoiceStylePref,
  pickCuteVoice,
  prepareCuteSpeechSegments,
  saveVoiceStylePref,
  type VoiceLike,
} from './speech';

function installMockStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(k: string) {
      return store.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      store.set(k, v);
    },
    removeItem(k: string) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  } as unknown as Storage;
  return store;
}

test('pickCuteVoice prefers kid/bright female voices over male and novelty voices', () => {
  const voices: VoiceLike[] = [
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Microsoft David - English (United States)', lang: 'en-US' },
    { name: 'Alex', lang: 'en-US' },
    { name: 'Bubbles', lang: 'en-US' },
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Microsoft Ana Online (Natural) - English (United States)', lang: 'en-US', localService: false },
  ];

  const picked = pickCuteVoice(voices);
  assert.equal(picked?.name, 'Microsoft Ana Online (Natural) - English (United States)');

  const macVoices: VoiceLike[] = [
    { name: 'Daniel', lang: 'en-GB' },
    { name: 'Fred', lang: 'en-US' },
    { name: 'Samantha', lang: 'en-US' },
  ];
  assert.equal(pickCuteVoice(macVoices)?.name, 'Samantha');

  const googleVoices: VoiceLike[] = [
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Google UK English Female', lang: 'en-GB' },
  ];
  assert.equal(pickCuteVoice(googleVoices)?.name, 'Google UK English Female');
});

test('getCuteSpeechTuning keeps child voices natural and raises standard voices into a cute pitch', () => {
  const std = getCuteSpeechTuning({ name: 'Google US English', lang: 'en-US' }, 'bubbly');
  assert.equal(std.pitch, 1.3);
  assert.equal(std.rate, 1.03);

  const child = getCuteSpeechTuning({ name: 'Microsoft Ana Online (Natural)', lang: 'en-US' }, 'bubbly');
  assert.equal(child.pitch, 1.1);

  const sweet = getCuteSpeechTuning({ name: 'Samantha', lang: 'en-US' }, 'sweet');
  assert.ok(sweet.pitch < 1.3 && sweet.pitch >= 1.1);
  assert.ok(sweet.rate < 1.0);

  const peppy = getCuteSpeechTuning({ name: 'Google US English', lang: 'en-US' }, 'peppy');
  assert.ok(peppy.pitch > std.pitch);
  assert.ok(peppy.rate > std.rate);
});

test('formatCuteSpeechText and prepareCuteSpeechSegments normalize symbols and add cheerful cadence', () => {
  const formatted = formatCuteSpeechText('⚡ Solar Dome · +30% O2 → 95%!');
  assert.equal(formatted, 'Solar Dome , plus 30 percent oxygen to 95 percent!');

  const segments = prepareCuteSpeechSegments('Ready for launch! Can you help? Solar is online.', 1.28, 1.03);
  assert.equal(segments.length, 3);
  assert.ok(segments[0].pitch > 1.28); // exclamation cheer boost
  assert.ok(segments[1].pitch > segments[0].pitch); // question curiosity lift
  assert.equal(segments[2].pitch, 1.28); // calm statement base pitch
});

test('voice style preference persists safely and defaults to bubbly', () => {
  installMockStorage();
  assert.equal(loadVoiceStylePref(), 'bubbly');
  saveVoiceStylePref('sweet');
  assert.equal(loadVoiceStylePref(), 'sweet');
  saveVoiceStylePref('peppy');
  assert.equal(loadVoiceStylePref(), 'peppy');
});
