import type { AstronautId } from './astronauts';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  astronautId: AstronautId;
  survivalSeconds: number;
  solsSurvived: number;
  miniGamesWon: number;
  firstFailedStation: string;
  causeSummary: string;
  createdAt: string;
  isDefaultRival?: boolean;
}

const LEADERBOARD_KEY = 'astroborneo.leaderboard.v1';
const MAX_LEADERBOARD_ENTRIES = 25;

export const DEFAULT_RIVAL_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'rival-nova',
    playerName: 'Cadet Nova',
    astronautId: 'zara',
    survivalSeconds: 135,
    solsSurvived: 5,
    miniGamesWon: 7,
    firstFailedStation: 'Sun Power',
    causeSummary: 'Sun Power dimmed during a solar storm',
    createdAt: '2025-01-10T10:00:00.000Z',
    isDefaultRival: true,
  },
  {
    id: 'rival-orion',
    playerName: 'Cadet Orion',
    astronautId: 'leo',
    survivalSeconds: 98,
    solsSurvived: 4,
    miniGamesWon: 5,
    firstFailedStation: 'Water',
    causeSummary: 'Water clogged and dried out Plant Food',
    createdAt: '2025-01-09T10:00:00.000Z',
    isDefaultRival: true,
  },
  {
    id: 'rival-luna',
    playerName: 'Cadet Luna',
    astronautId: 'maya',
    survivalSeconds: 64,
    solsSurvived: 3,
    miniGamesWon: 3,
    firstFailedStation: 'Shield',
    causeSummary: 'Meteor shower broke unpatched Shield dome',
    createdAt: '2025-01-08T10:00:00.000Z',
    isDefaultRival: true,
  },
];

export function formatSurvivalTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function normalizePlayerName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, 18);
}

export function rankLeaderboardEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.survivalSeconds !== a.survivalSeconds) return b.survivalSeconds - a.survivalSeconds;
      if (b.miniGamesWon !== a.miniGamesWon) return b.miniGamesWon - a.miniGamesWon;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}

function isValidEntry(raw: unknown): raw is LeaderboardEntry {
  if (!raw || typeof raw !== 'object') return false;
  const e = raw as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.playerName === 'string' &&
    typeof e.astronautId === 'string' &&
    typeof e.survivalSeconds === 'number' &&
    Number.isFinite(e.survivalSeconds) &&
    typeof e.solsSurvived === 'number' &&
    typeof e.miniGamesWon === 'number' &&
    typeof e.firstFailedStation === 'string' &&
    typeof e.causeSummary === 'string' &&
    typeof e.createdAt === 'string'
  );
}

export function loadLeaderboard(storage?: Pick<Storage, 'getItem'>): LeaderboardEntry[] {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!store) return rankLeaderboardEntries(DEFAULT_RIVAL_ENTRIES);
    const raw = store.getItem(LEADERBOARD_KEY);
    if (!raw) return rankLeaderboardEntries(DEFAULT_RIVAL_ENTRIES);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return rankLeaderboardEntries(DEFAULT_RIVAL_ENTRIES);
    const valid = parsed.filter(isValidEntry);
    if (valid.length === 0) return rankLeaderboardEntries(DEFAULT_RIVAL_ENTRIES);
    return rankLeaderboardEntries(valid);
  } catch {
    return rankLeaderboardEntries(DEFAULT_RIVAL_ENTRIES);
  }
}

export function saveLeaderboardEntry(
  input: Omit<LeaderboardEntry, 'id' | 'createdAt' | 'playerName'> & { playerName: string },
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): { entries: LeaderboardEntry[]; added: LeaderboardEntry; rank: number } {
  const cleanedName = normalizePlayerName(input.playerName);
  if (!cleanedName) {
    throw new Error('Please type your astronaut name first!');
  }

  const entry: LeaderboardEntry = {
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    playerName: cleanedName,
    astronautId: input.astronautId,
    survivalSeconds: Math.max(1, Math.round(input.survivalSeconds)),
    solsSurvived: Math.max(1, Math.round(input.solsSurvived)),
    miniGamesWon: Math.max(0, Math.round(input.miniGamesWon)),
    firstFailedStation: input.firstFailedStation,
    causeSummary: input.causeSummary,
    createdAt: new Date().toISOString(),
    isDefaultRival: false,
  };

  const existing = loadLeaderboard(storage);
  const ranked = rankLeaderboardEntries([...existing, entry]);
  const rank = ranked.findIndex((item) => item.id === entry.id) + 1;

  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (store) {
      store.setItem(LEADERBOARD_KEY, JSON.stringify(ranked));
    }
  } catch {
    /* persist best-effort */
  }

  return { entries: ranked, added: entry, rank: rank > 0 ? rank : ranked.length };
}
