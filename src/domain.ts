import type { AppState, RestTimer, Session, Workout } from './types';
import { canonicalExerciseId, getMuscle, LAST_IMAGE_INDEX, muscleLabels } from './catalog';
import { migrateState } from './migrations';

export const MAX_SESSION_SETS = 100;

export function toggleSeriesCompletion(done: boolean[], index: number): boolean[] {
  if (!Number.isInteger(index) || index < 0 || index >= done.length) return done;
  return done[index] ? done.map((value, i) => i === index ? false : value) : done.map((value, i) => i <= index || value);
}

export function removeSessionSet(state: AppState, exerciseId: string): AppState {
  if (!state.active) return state;
  const log = state.active.exercises.find(e => e.exerciseId === exerciseId);
  if (!log || log.done.length <= 1) return state;
  const index = log.done.lastIndexOf(false);
  if (index < 0) return state;
  return { ...state, active: { ...state.active, exercises: state.active.exercises.map(e => e.exerciseId === exerciseId ? { ...e, done: e.done.filter((_, i) => i !== index) } : e) } };
}

export function addSessionSet(state: AppState, exerciseId: string): AppState {
  if (!state.active) return state;
  const log = state.active.exercises.find(e => e.exerciseId === exerciseId);
  if (!log || log.done.length >= MAX_SESSION_SETS) return state;
  return { ...state, active: { ...state.active, exercises: state.active.exercises.map(e => e.exerciseId === exerciseId ? { ...e, done: [...e.done, false] } : e) } };
}

export function createSession(workout: Workout, weights: Record<string, number>, now = Date.now()): Session {
  return {
    id: crypto.randomUUID(), workoutId: workout.id, workoutName: workout.name, startedAt: now,
    exercises: workout.exercises.map(e => { const id = canonicalExerciseId(e.id); return { exerciseId: e.id, name: e.name, image: e.image, target: e.target, kind: e.kind, muscle: getMuscle(e), ...(e.instructions ? { instructions: e.instructions } : {}), weight: Object.hasOwn(weights, id) && Number.isFinite(weights[id]) ? weights[id] : 0, done: Array(e.sets).fill(false) }; }),
  };
}
export function getProgress(session: Session) {
  const sets = session.exercises.flatMap(e => e.done);
  return { done: sets.filter(Boolean).length, total: sets.length };
}
/** Called only after starting a workout, or after the user confirms replacing a session. */
export function beginWorkout(state: AppState, workout: Workout, firstSet?: { exerciseId: string; index: number }, now = Date.now()): AppState {
  const active = createSession(workout, state.weights, now);
  const exercise = workout.exercises.find(e => e.id === firstSet?.exerciseId);
  const log = active.exercises.find(e => e.exerciseId === firstSet?.exerciseId);
  const marked = !!(firstSet && log && Number.isInteger(firstSet.index) && firstSet.index >= 0 && firstSet.index < log.done.length);
  if (marked) log!.done = toggleSeriesCompletion(log!.done, firstSet!.index);
  const timer = marked && exercise && state.preferences.autoRest
    ? { duration: exercise.rest, remaining: exercise.rest, endAt: now + exercise.rest * 1000, started: true, exercise: exercise.name }
    : { ...state.timer, started: false, endAt: null, remaining: state.timer.duration };
  return { ...state, active, timer };
}
export function timerSeconds(timer: RestTimer, now = Date.now()): number {
  return timer.endAt === null ? timer.remaining : Math.min(timer.remaining, Math.max(0, Math.ceil((timer.endAt - now) / 1000)));
}
export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
export function finishSession(state: AppState, now = Date.now()): AppState {
  if (!state.active || !getProgress(state.active).done) return state;
  return { ...state, history: [{ ...state.active, finishedAt: now }, ...state.history], active: null, timer: { ...state.timer, started: false, endAt: null, remaining: state.timer.duration } };
}

export function editHistorySession(state: AppState, session: Session): AppState {
  const previous = state.history.find(record => record.id === session.id);
  if (!previous || session.workoutId !== previous.workoutId || !validSession(session) || session.finishedAt === undefined || !session.exercises.some(log => log.done.some(Boolean))) throw new Error('Confira os dados e as séries realizadas deste registro.');
  const saved = structuredClone(session);
  return { ...state, history: state.history.map(record => record.id === saved.id ? saved : record).sort((a, b) => b.finishedAt! - a.finishedAt!) };
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 160): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const number = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const integer = (value: unknown, max: number): value is number => number(value, max) && Number.isInteger(value);
function validSession(value: unknown): value is Session {
  return object(value) && text(value.id) && text(value.workoutId) && text(value.workoutName) && number(value.startedAt) && (value.finishedAt === undefined || (number(value.finishedAt) && value.finishedAt >= value.startedAt)) && Array.isArray(value.exercises) && value.exercises.length > 0 && value.exercises.length <= 100 && new Set(value.exercises.map(e => e?.exerciseId)).size === value.exercises.length && value.exercises.every(e => object(e) && text(e.exerciseId) && text(e.name) && integer(e.image, LAST_IMAGE_INDEX) && (e.instructions === undefined || (typeof e.instructions === 'string' && e.instructions.length <= 1000)) && (e.muscle === undefined || Object.hasOwn(muscleLabels, String(e.muscle))) && text(e.target, 30) && ['reps', 'seconds'].includes(String(e.kind)) && number(e.weight, 5000) && Array.isArray(e.done) && e.done.length >= 1 && e.done.length <= MAX_SESSION_SETS && e.done.every(d => typeof d === 'boolean'));
}
function validWorkouts(workouts: unknown): workouts is Workout[] {
  if (!Array.isArray(workouts) || !workouts.length || workouts.length > 30) return false;
  const workoutIds = new Set<string>();
  for (const w of workouts) {
    if (!object(w) || !text(w.id) || workoutIds.has(w.id) || !text(w.name) || !integer(w.day, 6) || !integer(w.image, LAST_IMAGE_INDEX) || !Array.isArray(w.exercises) || w.exercises.length < 1 || w.exercises.length > 100) return false;
    workoutIds.add(w.id);
    const ids = new Set<string>();
    for (const e of w.exercises) {
      if (!object(e) || !text(e.id) || ids.has(e.id) || !text(e.name) || !integer(e.sets, 12) || e.sets < 1 || !text(e.target, 30) || !['reps', 'seconds'].includes(String(e.kind)) || !integer(e.image, LAST_IMAGE_INDEX) || (e.muscle !== undefined && !Object.hasOwn(muscleLabels, String(e.muscle))) || (e.instructions !== undefined && (typeof e.instructions !== 'string' || e.instructions.length > 1000)) || !integer(e.rest, 600) || e.rest < 15) return false;
      ids.add(e.id);
    }
  }
  return true;
}
export function validateState(value: unknown): value is AppState {
  if (!object(value) || value.version !== 1 || !validWorkouts(value.workouts)) return false;
  if (value.selectedPlan !== undefined && !['original', 'sheet', 'ivan'].includes(String(value.selectedPlan))) return false;
  if (value.planSnapshots !== undefined && (!object(value.planSnapshots) || !Object.entries(value.planSnapshots).every(([key, workouts]) => ['original', 'sheet', 'ivan'].includes(key) && validWorkouts(workouts) && (key !== 'original' || workouts.every(w => w.exercises.every(e => e.sets === 3)))))) return false;
  if (!object(value.weights) || !Object.values(value.weights).every(v => number(v, 5000)) || (value.active !== null && !validSession(value.active))) return false;
  if (value.active) {
    const active = value.active as Session;
    const workout = (value.workouts as Workout[]).find(w => w.id === active.workoutId);
    if (!workout) return false;
    for (const log of active.exercises) {
      const current = workout.exercises.find(e => e.id === log.exerciseId);
      if (current && ((typeof value.routineRevision === 'number' && value.routineRevision >= 12) ? log.done.length < 1 : (typeof value.routineRevision === 'number' && value.routineRevision >= 11) ? log.done.length < current.sets : current.sets !== log.done.length)) return false;
    }
  }
  if (!Array.isArray(value.history) || value.history.length > 10000 || !value.history.every(s => validSession(s) && number(s.finishedAt))) return false;
  const p = value.preferences, t = value.timer;
  if (value.routineRevision !== undefined && !integer(value.routineRevision, 12)) return false;
  if (typeof value.routineRevision === 'number' && value.routineRevision >= 5 && !['sheet', 'ivan'].includes(String(value.selectedPlan)) && (value.workouts as Workout[]).some(w => w.exercises.some(e => e.sets !== 3))) return false;
  if (value.exerciseNotes !== undefined && (!object(value.exerciseNotes) || !Object.values(value.exerciseNotes).every(note => typeof note === 'string' && note.length <= 1000))) return false;
  return object(p) && typeof p.autoRest === 'boolean' && typeof p.sound === 'boolean' && integer(p.restDuration, 600) && p.restDuration >= 15 && object(t) && integer(t.duration, 600) && t.duration >= 15 && number(t.remaining, 3600) && (t.endAt === null || number(t.endAt)) && typeof t.exercise === 'string' && t.exercise.length <= 160 && typeof t.started === 'boolean';
}
export function parseBackup(content: string): AppState {
  let backup: unknown;
  try { backup = JSON.parse(content); } catch { throw new Error('O arquivo não contém um JSON válido.'); }
  if (!object(backup) || backup.format !== 'gym-tracker' || backup.version !== 1 || !validateState(backup.data)) throw new Error('Este backup é inválido ou pertence a outra versão do aplicativo.');
  return migrateState(backup.data);
}
export function createBackup(state: AppState): string {
  return JSON.stringify({ format: 'gym-tracker', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
}
