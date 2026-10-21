import { canonicalExerciseId, getMuscle } from './catalog';
import type { AppState, MuscleGroup } from './types';

export interface ExerciseEntry { id: string; name: string; image: number; muscle: MuscleGroup; archived: boolean }
export interface LoadPoint { sessionId: string; at: number; weight: number; completed: number; total: number }

export function exerciseEntries(state: AppState): ExerciseEntry[] {
  const entries = new Map<string, ExerciseEntry>();
  for (const w of state.workouts) for (const e of w.exercises) { const id = canonicalExerciseId(e.id); if (!entries.has(id)) entries.set(id, { id, name: e.name, image: e.image, muscle: getMuscle(e), archived: false }); }
  for (const session of [...(state.active ? [state.active] : []), ...state.history]) for (const e of session.exercises) {
    const id = canonicalExerciseId(e.exerciseId);
    if (!entries.has(id)) entries.set(id, { id, name: e.name, image: e.image, muscle: getMuscle(e), archived: true });
  }
  return [...entries.values()];
}
export function loadPoints(state: AppState, exerciseId: string): LoadPoint[] {
  return state.history.flatMap(s => {
    const e = s.exercises.find(log => canonicalExerciseId(log.exerciseId) === canonicalExerciseId(exerciseId));
    if (!e?.done.some(Boolean) || s.finishedAt === undefined) return [];
    return [{ sessionId: s.id, at: s.finishedAt, weight: e.weight, completed: e.done.filter(Boolean).length, total: e.done.length }];
  }).sort((a, b) => a.at - b.at || a.sessionId.localeCompare(b.sessionId));
}
export function currentLoad(state: AppState, exerciseId: string): number {
  const key = canonicalExerciseId(exerciseId);
  const saved = state.weights[key];
  if (Object.hasOwn(state.weights, key) && Number.isFinite(saved)) return saved;
  return loadPoints(state, exerciseId).at(-1)?.weight ?? 0;
}
