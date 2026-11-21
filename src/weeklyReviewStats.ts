import { avatarWallet } from './avatars';
import { localDateKey } from './calendar';
import { COIN_XP } from './avatars';
import { personalRecords, personalXP, sessionCoinXP, xpStartAt } from './gamification';
import { weeklyMuscleVolume, muscleOrder } from './trainingStats';
import type { AppState } from './types';

export function weekStart(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date.getTime();
}
export function shiftWeek(timestamp: number, weeks: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + weeks * 7);
  return date.getTime();
}
export function weeklyReview(state: AppState, selected: number, now: number) {
  const person = state.selectedPlan ?? 'original', start = weekStart(selected), end = shiftWeek(start, 1);
  const seen = new Set<string>();
  const sessions = state.history.filter(session => {
    if (seen.has(session.id) || (session.person ?? 'original') !== person || session.finishedAt === undefined || session.finishedAt < start || session.finishedAt >= end || session.finishedAt > now || !session.exercises.some(e => e.done.some(Boolean))) return false;
    seen.add(session.id); return true;
  }).sort((a, b) => b.finishedAt! - a.finishedAt!);
  const target = state.preferences.weeklyGoals?.[person] ?? Math.max(1, new Set(state.workouts.filter(w => !w.optional).map(w => w.day)).size);
  const wallet = avatarWallet(state, person);
  const volume = weeklyMuscleVolume([], sessions, person, Math.min(now, end - 1));
  const calendar = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start); date.setDate(date.getDate() + i);
    const key = localDateKey(date), entries = sessions.filter(s => localDateKey(s.finishedAt!) === key);
    return { key, label: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][i], number: date.getDate(), sessions: entries, sets: entries.reduce((n, s) => n + s.exercises.reduce((sum, e) => sum + e.done.filter(Boolean).length, 0), 0) };
  });
  const records = new Map<string, ReturnType<typeof personalRecords>[number]>();
  for (const session of sessions) for (const record of personalRecords(session, state.history)) {
    const key = `${record.name}-${record.unit}`, old = records.get(key);
    if (!old || (record.assistance ? record.value < old.value : record.value > old.value)) records.set(key, record);
  }
  return { start, end, sessions, calendar, target, volume, records: [...records.values()],
    days: new Set(sessions.map(s => localDateKey(s.finishedAt!))).size,
    sets: muscleOrder.reduce((n, group) => n + volume[group].completedSets, 0),
    minutes: Math.round(sessions.reduce((n, s) => n + Math.max(0, s.finishedAt! - s.startedAt), 0) / 60000),
    xp: personalXP(sessions, person),
    coins: sessions.reduce((sum, session) => sum + (wallet.awards[session.id] ?? (session.finishedAt! >= xpStartAt(person) ? Math.floor(sessionCoinXP(session) / COIN_XP) : 0)), 0),
  };
}
