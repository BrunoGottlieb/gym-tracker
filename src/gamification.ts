import { canonicalExerciseId } from './catalog';
import { localDateKey, sessionsThisWeek } from './calendar';
import type { AppState, ExerciseLog, RoutinePlan, Session } from './types';

export const XP_PER_SET = 10;
export const EXTRA_SET_BONUS = 5;
export const WORKOUT_XP = 50;
export const LEVEL_XP = 500;
export const auraRewards = [
  { id: 'blue', name: 'Brilho azul', level: 1, color: '#91B3FF' },
  { id: 'amber', name: 'Brilho âmbar', level: 2, color: '#FFC26B' },
  { id: 'violet', name: 'Brilho violeta', level: 3, color: '#CE9EFF' },
  { id: 'mint', name: 'Brilho menta', level: 5, color: '#86EBC6' },
  { id: 'gold', name: 'Brilho dourado', level: 10, color: '#FFDA61' },
] as const;
export type RewardAura = typeof auraRewards[number]['id'];

export function exerciseXP(log: ExerciseLog) {
  const sets = log.done.filter(Boolean).length;
  // Older records have no reliable snapshot of the planned routine.
  const extra = log.done.filter((done, index) => done && index >= (log.plannedSets ?? log.done.length)).length;
  return { sets, extra, xp: sets * XP_PER_SET + extra * EXTRA_SET_BONUS };
}
export function sessionXP(session: Session, finalized = session.finishedAt !== undefined) {
  const entries = session.exercises.map(exerciseXP);
  const sets = entries.reduce((sum, e) => sum + e.sets, 0);
  const extra = entries.reduce((sum, e) => sum + e.extra, 0);
  return { sets, extra, xp: entries.reduce((sum, e) => sum + e.xp, 0) + (finalized && sets ? WORKOUT_XP : 0) };
}
export function personalXP(history: Session[], person: RoutinePlan) {
  const seen = new Set<string>();
  return history.reduce((sum, session) => {
    if (seen.has(session.id) || session.finishedAt === undefined || (session.person ?? 'original') !== person) return sum;
    seen.add(session.id);
    return sum + sessionXP(session).xp;
  }, 0);
}
export function levelProgress(xp: number) {
  return { level: Math.floor(xp / LEVEL_XP) + 1, current: xp % LEVEL_XP, remaining: LEVEL_XP - xp % LEVEL_XP };
}
export function weeklyGoal(state: AppState, now = Date.now()) {
  const person = state.selectedPlan ?? 'original';
  const target = state.preferences.weeklyGoals?.[person] ?? Math.max(1, new Set(state.workouts.filter(w => !w.optional).map(w => w.day)).size);
  const days = new Set(sessionsThisWeek(state.history, now, person).map(s => localDateKey(s.finishedAt!)));
  return { target, done: days.size, reached: days.size >= target };
}
export function equippedAura(state: AppState) {
  const person = state.selectedPlan ?? 'original';
  const level = levelProgress(personalXP(state.history, person)).level;
  return auraRewards.find(reward => reward.id === state.preferences.rewardAuras?.[person] && reward.level <= level) ?? auraRewards[0];
}

export interface PersonalRecord { name: string; value: number; previous: number; unit: 'kg' | 's'; assistance: boolean }
function longestHold(log: ExerciseLog) {
  return Math.max(0, ...log.done.flatMap((done, i) => {
    if (!done) return [];
    if (log.secondsBySide) {
      const left = log.secondsBySide.left[i], right = log.secondsBySide.right[i];
      if (left != null && right != null) return [Math.min(left, right)];
    }
    return log.seconds?.[i] ?? [];
  }));
}
export function personalRecords(session: Session, history: Session[]): PersonalRecord[] {
  const prior = history.filter(s => s.id !== session.id && s.finishedAt !== undefined && s.finishedAt <= (session.finishedAt ?? Infinity) && (s.person ?? 'original') === (session.person ?? 'original'));
  return session.exercises.flatMap(log => {
    if (!log.done.some(Boolean)) return [];
    const id = canonicalExerciseId(log.exerciseId);
    const logs = prior.flatMap(s => s.exercises.filter(e => canonicalExerciseId(e.exerciseId) === id && e.kind === log.kind && e.done.some(Boolean)));
    if (!logs.length) return [];
    const assistance = id === 'assisted-pullup';
    const value = log.kind === 'seconds' ? longestHold(log) : log.weight;
    const previous = log.kind === 'seconds' ? Math.max(...logs.map(longestHold)) : assistance ? Math.min(...logs.map(e => e.weight)) : Math.max(...logs.map(e => e.weight));
    if (log.kind === 'seconds' && !previous) return [];
    return (assistance ? value < previous : value > previous) ? [{ name: log.name, value, previous, unit: log.kind === 'seconds' ? 's' as const : 'kg' as const, assistance }] : [];
  });
}

export interface WorkoutResult {
  session: Session;
  xp: ReturnType<typeof sessionXP>;
  levelBefore: number;
  levelAfter: number;
  records: PersonalRecord[];
  goalReached: boolean;
}
export function workoutResult(before: AppState, after: AppState, session: Session, now = Date.now()): WorkoutResult {
  const person = session.person ?? 'original';
  return {
    session, xp: sessionXP(session),
    levelBefore: levelProgress(personalXP(before.history, person)).level,
    levelAfter: levelProgress(personalXP(after.history, person)).level,
    records: personalRecords(session, before.history),
    goalReached: !weeklyGoal(before, now).reached && weeklyGoal(after, now).reached,
  };
}
