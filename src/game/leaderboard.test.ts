import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSurvivalTime, loadLeaderboard, saveLeaderboardEntry } from './leaderboard';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

test('formatSurvivalTime formats minutes and seconds cleanly', () => {
  assert.equal(formatSurvivalTime(0), '00:00');
  assert.equal(formatSurvivalTime(9), '00:09');
  assert.equal(formatSurvivalTime(75), '01:15');
  assert.equal(formatSurvivalTime(135), '02:15');
});

test('saveLeaderboardEntry ranks longest survival time first and persists', () => {
  const store = memoryStorage();
  const initial = loadLeaderboard(store);
  assert.ok(initial.length >= 3);

  const res = saveLeaderboardEntry(
    {
      playerName: '  Captain   Zoe  ',
      astronautId: 'maya',
      survivalSeconds: 210,
      solsSurvived: 11,
      miniGamesWon: 9,
      firstFailedStation: 'Sun Power',
      causeSummary: 'Solar flare drained power.',
    },
    store,
  );

  assert.equal(res.rank, 1);
  assert.equal(res.added.playerName, 'Captain Zoe');
  const reloaded = loadLeaderboard(store);
  assert.equal(reloaded[0].playerName, 'Captain Zoe');
  assert.equal(reloaded[0].survivalSeconds, 210);
});

test('saveLeaderboardEntry rejects blank player names', () => {
  const store = memoryStorage();
  assert.throws(
    () =>
      saveLeaderboardEntry(
        {
          playerName: '   ',
          astronautId: 'zara',
          survivalSeconds: 45,
          solsSurvived: 3,
          miniGamesWon: 2,
          firstFailedStation: 'Water',
          causeSummary: 'Water drained.',
        },
        store,
      ),
    /astronaut name/i,
  );
});
