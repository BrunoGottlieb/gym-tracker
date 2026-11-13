import { auraRewards } from './gamification';
import { awardWorkoutCoins, validAvatarProfiles, validAvatarWallets } from './avatars';
import { isCelebrationTheme } from './celebrationThemes';
import type { AppState, Exercise, ExerciseLog, HoldSide, RestTimer, Session, Workout } from './types';
import { canonicalExerciseId, getMuscle, LAST_IMAGE_INDEX, muscleLabels } from './catalog';
import { migrateState } from './migrations';
import { validAssessment } from './assessments';

export const MAX_SESSION_SETS = 100;

export const holdSides = ['left', 'right'] as const;
export const holdSideLabels = { left: 'Esquerdo', right: 'Direito' };

export function usesHoldSides(log: Pick<ExerciseLog, 'kind' | 'exerciseId'>) {
  return log.kind === 'seconds' && ['side-plank', 'oblique-crunch'].includes(log.exerciseId);
}

export function resizeHoldTimes(log: ExerciseLog, indices: number[]): Partial<ExerciseLog> {
  const select = (values: (number | null)[]) => indices.map(index => values[index] ?? null);
  return {
    ...(log.seconds ? { seconds: select(log.seconds) } : {}),
    ...(log.secondsBySide ? { secondsBySide: {
      left: select(log.secondsBySide.left), right: select(log.secondsBySide.right),
    } } : {}),
  };
}

export function hasRecordedHold(log: ExerciseLog) {
  return !!log.seconds?.some(value => value !== null) ||
    holdSides.some(side => log.secondsBySide?.[side].some(value => value !== null));
}

function validHoldSides(log: Record<string, unknown>) {
  if (log.holdSide !== undefined && (log.kind !== 'seconds' || !number(log.holdStartedAt) || !holdSides.some(side => side === log.holdSide))) return false;
  const times = log.secondsBySide;
  if (times === undefined) return true;
  const done = log.done;
  return log.kind === 'seconds' && Array.isArray(done) && object(times) && holdSides.every(side => {
    const values = times[side];
    return Array.isArray(values) && values.length === done.length && values.every(value => value === null || integer(value, 86400));
  });
}

export function toggleSeriesCompletion(done: boolean[], index: number): boolean[] {
  if (!Number.isInteger(index) || index < 0 || index >= done.length) return done;
  return done[index] ? done.map((value, i) => i === index ? false : value) : done.map((value, i) => i <= index || value);
}

export function removeSessionSet(state: AppState, exerciseId: string): AppState {
  if (!state.active) return state;
  const log = state.active.exercises.find(e => e.exerciseId === exerciseId);
  if (!log || log.holdStartedAt || log.done.length <= 1) return state;
  const index = log.done.lastIndexOf(false);
  if (index < 0) return state;
  const indices = log.done.map((_, i) => i).filter(i => i !== index);
  const updated = { ...log, plannedSets: log.plannedSets ?? log.done.length, done: indices.map(i => log.done[i]), ...resizeHoldTimes(log, indices) };
  return { ...state, active: { ...state.active, exercises: state.active.exercises.map(e => e === log ? updated : e) } };
}

export function addSessionSet(state: AppState, exerciseId: string): AppState {
  if (!state.active) return state;
  const log = state.active.exercises.find(e => e.exerciseId === exerciseId);
  if (!log || log.done.length >= MAX_SESSION_SETS) return state;
  const indices = [...log.done.map((_, i) => i), log.done.length];
  const updated = { ...log, plannedSets: log.plannedSets ?? log.done.length, done: [...log.done, false], ...resizeHoldTimes(log, indices) };
  return { ...state, active: { ...state.active, exercises: state.active.exercises.map(e => e === log ? updated : e) } };
}

export function createSession(workout: Workout, weights: Record<string, number>, now = Date.now()): Session {
  return {
    id: crypto.randomUUID(), workoutId: workout.id, workoutName: workout.name, startedAt: now,
    exercises: workout.exercises.map(e => { const id = canonicalExerciseId(e.id); return { exerciseId: e.id, name: e.name, image: e.image, target: e.target, kind: e.kind, muscle: getMuscle(e), ...(e.instructions ? { instructions: e.instructions } : {}), plannedSets: e.sets, weight: Object.hasOwn(weights, id) && Number.isFinite(weights[id]) ? weights[id] : 0, done: Array(e.sets).fill(false) }; }),
  };
}
export function getProgress(session: Session) {
  const sets = session.exercises.flatMap(e => e.done);
  return { done: sets.filter(Boolean).length, total: sets.length };
}
/** Called only after starting a workout, or after the user confirms replacing a session. */
export function beginWorkout(state: AppState, workout: Workout, firstSet?: { exerciseId: string; index: number }, now = Date.now()): AppState {
  const active = { ...createSession(workout, state.weights, now), person: state.selectedPlan ?? 'original' };
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
export function finishSession(state: AppState, finishedAt = Date.now(), startedAt = state.active?.startedAt): AppState {
  const session = state.active;
  if (!session || !getProgress(session).done || !number(startedAt) || !number(finishedAt) || finishedAt < startedAt) return state;
  const record = { ...session, person: session.person ?? state.selectedPlan ?? 'original', startedAt, finishedAt };
  return {
    ...state,
    avatarWallets: awardWorkoutCoins(state, record),
    history: [record, ...state.history].sort((a, b) => b.finishedAt! - a.finishedAt!),
    active: null,
    timer: { ...state.timer, started: false, endAt: null, remaining: state.timer.duration },
  };
}

export function editHistorySession(state: AppState, session: Session): AppState {
  const previous = state.history.find(record => record.id === session.id);
  if (!previous || session.workoutId !== previous.workoutId || session.person !== previous.person || !validSession(session) || session.finishedAt === undefined || !session.exercises.some(log => log.done.some(Boolean))) throw new Error('Confira os dados e as séries realizadas deste registro.');
  const saved = structuredClone(session);
  return { ...state, history: state.history.map(record => record.id === saved.id ? saved : record).sort((a, b) => b.finishedAt! - a.finishedAt!) };
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 160): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const number = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const integer = (value: unknown, max: number): value is number => number(value, max) && Number.isInteger(value);
function validSession(value: unknown): value is Session {
  return object(value) && (value.person === undefined || ['original', 'sheet', 'ivan'].includes(String(value.person))) && text(value.id) && text(value.workoutId) && text(value.workoutName) && number(value.startedAt) && (value.finishedAt === undefined || (number(value.finishedAt) && value.finishedAt >= value.startedAt)) && Array.isArray(value.exercises) && value.exercises.length > 0 && value.exercises.length <= 100 && new Set(value.exercises.map(e => e?.exerciseId)).size === value.exercises.length && value.exercises.every(e => object(e) && (e.plannedSets === undefined || (integer(e.plannedSets, MAX_SESSION_SETS) && e.plannedSets >= 1)) && validHoldSides(e) && (e.extra === undefined || e.extra === true) && text(e.exerciseId) && text(e.name) && integer(e.image, LAST_IMAGE_INDEX) && (e.instructions === undefined || (typeof e.instructions === 'string' && e.instructions.length <= 1000)) && (e.muscle === undefined || Object.hasOwn(muscleLabels, String(e.muscle))) && text(e.target, 30) && ['reps', 'seconds'].includes(String(e.kind)) && (e.holdStartedAt === undefined || (e.kind === 'seconds' && number(e.holdStartedAt))) && (e.swappedFrom === undefined || text(e.swappedFrom)) && (e.seconds === undefined || (e.kind === 'seconds' && Array.isArray(e.seconds) && Array.isArray(e.done) && e.seconds.length === e.done.length && e.seconds.every(v => v === null || integer(v,86400)))) && number(e.weight, 5000) && Array.isArray(e.done) && e.done.length >= 1 && e.done.length <= MAX_SESSION_SETS && e.done.every(d => typeof d === 'boolean'));
}
function validWorkouts(workouts: unknown): workouts is Workout[] {
  if (!Array.isArray(workouts) || !workouts.length || workouts.length > 30) return false;
  const workoutIds = new Set<string>();
  for (const w of workouts) {
    if (!object(w) || (w.optional !== undefined && typeof w.optional !== 'boolean') || !text(w.id) || workoutIds.has(w.id) || !text(w.name) || !integer(w.day, 6) || !integer(w.image, LAST_IMAGE_INDEX) || !Array.isArray(w.exercises) || w.exercises.length < 1 || w.exercises.length > 100) return false;
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
  if (value.avatarChangedAt !== undefined && (!object(value.avatarChangedAt) || !Object.entries(value.avatarChangedAt).every(([person, at]) => ['original', 'sheet', 'ivan'].includes(person) && number(at)))) return false;
  if (value.assessments !== undefined && (!Array.isArray(value.assessments) || value.assessments.length > 1000 || !value.assessments.every(validAssessment) || new Set(value.assessments.map(a=>a.id)).size !== value.assessments.length)) return false;
  if (value.selectedPlan !== undefined && !['original', 'sheet', 'ivan'].includes(String(value.selectedPlan))) return false;
  if (value.planSnapshots !== undefined && (!object(value.planSnapshots) || !Object.entries(value.planSnapshots).every(([key, workouts]) => ['original', 'sheet', 'ivan'].includes(key) && validWorkouts(workouts) && (key !== 'original' || value.brunoPlanRevision === 1 || workouts.every(w => w.exercises.every(e => e.sets === 3)))))) return false;
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
  if (value.brunoShoulderPressRevision !== undefined && value.brunoShoulderPressRevision !== 1) return false;
  if (value.brunoPlankRevision !== undefined && value.brunoPlankRevision !== 1) return false;
  if (value.brunoAdditionsRevision !== undefined && value.brunoAdditionsRevision !== 1) return false;
  if (value.brunoSeriesRevision !== undefined && value.brunoSeriesRevision !== 1) return false;
  if (value.brunoHomeRevision !== undefined && value.brunoHomeRevision !== 1) return false;
  if (value.brunoPlanRevision !== undefined && value.brunoPlanRevision !== 1) return false;
  if (value.brunoFridayRevision !== undefined && value.brunoFridayRevision !== 1) return false;
  if (value.routineRevision !== undefined && !integer(value.routineRevision, 12)) return false;
  if (value.brunoPlanRevision !== 1 && typeof value.routineRevision === 'number' && value.routineRevision >= 5 && !['sheet', 'ivan'].includes(String(value.selectedPlan)) && (value.workouts as Workout[]).some(w => w.exercises.some(e => e.sets !== 3))) return false;
  if (value.exerciseNotes !== undefined && (!object(value.exerciseNotes) || !Object.values(value.exerciseNotes).every(note => typeof note === 'string' && note.length <= 1000))) return false;
  return validAvatarWallets(value.avatarWallets) && validAvatarProfiles(value.avatars) && object(p) && validGamificationPreferences(p) && (p.celebrationTheme === undefined || isCelebrationTheme(p.celebrationTheme)) && typeof p.autoRest === 'boolean' && typeof p.sound === 'boolean' && integer(p.restDuration, 600) && p.restDuration >= 15 && object(t) && integer(t.duration, 600) && t.duration >= 15 && number(t.remaining, 3600) && (t.endAt === null || number(t.endAt)) && typeof t.exercise === 'string' && t.exercise.length <= 160 && typeof t.started === 'boolean';
}
function validGamificationPreferences(p: Record<string, unknown>) {
  const profiles = ['original', 'sheet', 'ivan'];
  return (p.haptics === undefined || typeof p.haptics === 'boolean') &&
    (p.weeklyGoals === undefined || (object(p.weeklyGoals) && Object.entries(p.weeklyGoals).every(([person, goal]) => profiles.includes(person) && integer(goal, 7) && goal >= 1))) &&
    (p.rewardAuras === undefined || (object(p.rewardAuras) && Object.entries(p.rewardAuras).every(([person, aura]) => profiles.includes(person) && auraRewards.some(reward => reward.id === aura))));
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

export function recordHold(state: AppState, id: string, index: number, seconds: number, rest = state.preferences.restDuration, now = Date.now(), side?: HoldSide): AppState {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86400 || !Number.isInteger(index)) return state;
  const active = state.active;
  const log = active?.exercises.find(e => e.exerciseId === id);
  if (!active || !log || log.kind !== 'seconds' || index < 0 || index >= log.done.length) return state;
  if (side && !usesHoldSides(log)) return state;
  const updated = { ...log, holdStartedAt: undefined, holdSide: undefined };
  if (side) {
    const times = {
      left: [...(log.secondsBySide?.left ?? log.done.map(() => null))],
      right: [...(log.secondsBySide?.right ?? log.done.map(() => null))],
    };
    times[side][index] = seconds;
    updated.secondsBySide = times;
  } else {
    updated.seconds = [...(log.seconds ?? log.done.map(() => null))];
    updated.seconds[index] = seconds;
  }
  const complete = !side || holdSides.every(key => updated.secondsBySide?.[key][index] != null);
  updated.done = log.done.map((done, i) => done || i === index && complete);
  const timer = complete && !log.done[index] && state.preferences.autoRest
    ? { duration: rest, remaining: rest, endAt: now + rest * 1000, exercise: log.name, started: true }
    : state.timer;
  return { ...state, timer, active: { ...active, exercises: active.exercises.map(e => e === log ? updated : e) } };
}
export function swapSessionExercise(state: AppState, id: string, replacement: Exercise): AppState {
  const session = state.active, old = session?.exercises.find(e => e.exerciseId === id);
  if (!session || !old || old.done.some(Boolean) || old.holdStartedAt || hasRecordedHold(old) || session.exercises.some(e => e.exerciseId !== id && canonicalExerciseId(e.exerciseId) === canonicalExerciseId(replacement.id))) return state;
  const log = createSession({ id:'temporary', name:'temporary', day:0, image:0, exercises:[{...replacement,sets:old.done.length}] }, state.weights).exercises[0];
  return { ...state, active: { ...session, exercises: session.exercises.map(e => e.exerciseId === id ? {...log,plannedSets:old.plannedSets ?? old.done.length,extra:old.extra,swappedFrom:old.swappedFrom ?? old.name} : e) } };
}

export function addSessionExercise(state: AppState, workout: Workout, exercise: Exercise): AppState {
  if (state.active && state.active.workoutId !== workout.id) return state;
  const exercises = state.active?.exercises ?? workout.exercises.map(entry => ({ exerciseId: entry.id }));
  if (exercises.length >= 100 || exercises.some(entry => canonicalExerciseId(entry.exerciseId) === canonicalExerciseId(exercise.id))) return state;
  const next = state.active ? state : beginWorkout(state, workout);
  const log = createSession({ ...workout, exercises: [exercise] }, next.weights).exercises[0];
  const active = next.active!;
  return { ...next, active: { ...active, exercises: [...active.exercises, { ...log, extra: true }] } };
}
