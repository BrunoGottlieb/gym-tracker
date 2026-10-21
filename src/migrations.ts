import { getMuscle } from './catalog';
import type { AppState, Exercise, ExerciseLog } from './types';
import { articulatedChestPress, declineSitup, militarySitup, parallelBarDips } from './data';

const replacements: Record<string, { previous: string[]; patch: Partial<Exercise> }> = {
  'incline-machine': { previous: ['Supino inclinado na máquina'], patch: { name: 'Supino inclinado com barra', image: 30 } },
  pullup: { previous: ['Barra fixa pronada'], patch: { id: 'lat-pulldown', name: 'Puxada alta (pulley)', image: 26, target: '8–12' } },
  'chest-supported-row': { previous: ['Remada articulada com apoio para peito'], patch: { name: 'Remada Hammer com apoio para peito', image: 31 } },
  'supported-row': { previous: ['Remada com apoio para peito', 'Remada Hammer com apoio para peito'], patch: { id: 'chest-supported-row', name: 'Remada Hammer com apoio para peito', image: 31 } },
  'hammer-curl': { previous: ['Rosca martelo com halteres'], patch: { id: 'rope-curl', name: 'Rosca corda no crossover', image: 32 } },
  'lat-pulldown': { previous: ['Puxada alta na polia'], patch: { name: 'Puxada alta (pulley)' } },
};

/** Upgrade only known seed entries; custom names, stored loads and history remain intact. */
export function migrateState(original: AppState): AppState {
  const state = structuredClone(original);
  const weights = state.weights;
  for (const session of [...state.history].sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt))) {
    for (const log of session.exercises) if (!Object.hasOwn(weights, log.exerciseId) && log.done.some(Boolean) && log.weight > 0) weights[log.exerciseId] = log.weight;
  }
  for (const log of state.active?.exercises ?? []) if (!Object.hasOwn(weights, log.exerciseId) && log.weight > 0) weights[log.exerciseId] = log.weight;
  if ((state.routineRevision ?? 0) < 3) {
    if (!Object.hasOwn(weights, 'chest-supported-row') && Object.hasOwn(weights, 'supported-row')) weights['chest-supported-row'] = weights['supported-row'];
    for (const workout of state.workouts) {
      if (workout.id === 'b' && workout.image === 6) workout.image = 26;
      workout.exercises = workout.exercises.map(exercise => {
        const update = replacements[exercise.id];
        if (!update?.previous.includes(exercise.name)) return exercise;
        const newId = update.patch.id ?? exercise.id;
        if (newId !== exercise.id && workout.exercises.some(e => e.id === newId)) return exercise;
        return { ...exercise, ...update.patch, muscle: getMuscle({ id: newId }) };
      });
    }
    if (state.active) {
      state.active.exercises = state.active.exercises.map(log => {
        const update = replacements[log.exerciseId];
        if (!update?.previous.includes(log.name)) return log;
        // A completed series belongs to its original exercise. Keep that snapshot.
        if (update.patch.id && log.done.some(Boolean)) return log;
        const newId = update.patch.id ?? log.exerciseId;
        if (newId !== log.exerciseId && state.active!.exercises.some(e => e.exerciseId === newId)) return log;
        return { ...log, exerciseId: newId, name: update.patch.name ?? log.name, image: update.patch.image ?? log.image, target: update.patch.target ?? log.target, weight: newId === log.exerciseId ? log.weight : weights[newId] ?? 0, muscle: getMuscle({ id: newId }) } as ExerciseLog;
      });
    }
    state.routineRevision = 3;
  }
  for (const workout of state.workouts) for (const exercise of workout.exercises) exercise.muscle = getMuscle(exercise);
  state.exerciseNotes ??= {};
  if (state.exerciseNotes['supported-row'] && !state.exerciseNotes['chest-supported-row']) state.exerciseNotes['chest-supported-row'] = state.exerciseNotes['supported-row'];
  if ((state.routineRevision ?? 0) < 5) {
    // Normalize the current plan only. Finished-session snapshots retain their original series.
    for (const workout of state.workouts) for (const exercise of workout.exercises) exercise.sets = 3;
    if (state.active) for (const log of state.active.exercises) log.done = Array.from({ length: 3 }, (_, i) => log.done[i] ?? false);
    const chestWorkout = state.workouts.find(w => w.exercises.some(e => e.id === 'bench-press'));
    if (chestWorkout && !chestWorkout.exercises.some(e => e.id === articulatedChestPress.id)) {
      const incline = chestWorkout.exercises.findIndex(e => e.id === 'incline-machine');
      const index = (incline >= 0 ? incline : chestWorkout.exercises.findIndex(e => e.id === 'bench-press')) + 1;
      chestWorkout.exercises.splice(index, 0, { ...articulatedChestPress });
      if (state.active?.workoutId === chestWorkout.id && !state.active.exercises.some(e => e.exerciseId === articulatedChestPress.id)) {
        state.active.exercises.splice(Math.min(index, state.active.exercises.length), 0, {
          exerciseId: articulatedChestPress.id, name: articulatedChestPress.name, image: articulatedChestPress.image,
          target: articulatedChestPress.target, kind: articulatedChestPress.kind, muscle: 'chest',
          weight: weights[articulatedChestPress.id] ?? 0, done: [false, false, false],
        });
      }
    }
    state.routineRevision = 5;
  }
  if ((state.routineRevision ?? 0) < 6) {
    const legWorkout = state.workouts.find(w => w.exercises.some(e => e.id === 'leg-press'));
    if (legWorkout) {
      legWorkout.exercises = legWorkout.exercises.filter(e => !['romanian-deadlift', 'hanging-knee-raise'].includes(e.id));
      for (const exercise of [declineSitup, militarySitup]) if (!legWorkout.exercises.some(e => e.id === exercise.id)) legWorkout.exercises.push({ ...exercise });
      if (state.active?.workoutId === legWorkout.id) {
        state.active.exercises = state.active.exercises.filter(e => !['romanian-deadlift', 'hanging-knee-raise'].includes(e.exerciseId) || e.done.some(Boolean));
        for (const exercise of [declineSitup, militarySitup]) {
          if (!state.active.exercises.some(e => e.exerciseId === exercise.id)) state.active.exercises.push({ exerciseId: exercise.id, name: exercise.name, image: exercise.image, target: exercise.target, kind: exercise.kind, muscle: 'abs', weight: weights[exercise.id] ?? 0, done: [false, false, false] });
        }
      }
    }
    state.routineRevision = 6;
  }
  if ((state.routineRevision ?? 0) < 7) {
    const workout = state.workouts.find(w => w.id === 'd');
    if (workout) {
      workout.exercises = workout.exercises.filter(e => e.id !== 'shoulder-press');
      if (!workout.exercises.some(e => e.id === parallelBarDips.id)) workout.exercises.unshift({ ...parallelBarDips });
      if (workout.image === 18) workout.image = 36;
      if (state.active?.workoutId === workout.id) {
        state.active.exercises = state.active.exercises.filter(e => e.exerciseId !== 'shoulder-press' || e.done.some(Boolean));
        if (!state.active.exercises.some(e => e.exerciseId === parallelBarDips.id)) state.active.exercises.unshift({ exerciseId: parallelBarDips.id, name: parallelBarDips.name, image: parallelBarDips.image, target: parallelBarDips.target, kind: parallelBarDips.kind, muscle: 'triceps', weight: weights[parallelBarDips.id] ?? 0, done: [false, false, false] });
      }
    }
    state.routineRevision = 7;
  }
  if ((state.routineRevision ?? 0) < 8) {
    const workout = state.workouts.find(w => w.id === 'e');
    if (workout) {
      if (workout.name === 'Costas, bíceps + calistenia') workout.name = 'Costas + bíceps';
      if (workout.image === 24) workout.image = 31;
      workout.exercises = workout.exercises.filter(e => !['front-lever', 'l-sit'].includes(e.id));
      const source = state.workouts.find(w => w.id === 'b');
      const additions = ['cable-row', 'straight-arm-pulldown'].flatMap(id => { const exercise = source?.exercises.find(e => e.id === id); return exercise ? [{ ...exercise, sets: 3 }] : []; });
      for (const exercise of additions) if (!workout.exercises.some(e => e.id === exercise.id)) {
        const firstBiceps = workout.exercises.findIndex(e => getMuscle(e) === 'biceps');
        workout.exercises.splice(firstBiceps < 0 ? workout.exercises.length : firstBiceps, 0, exercise);
      }
      if (state.active?.workoutId === workout.id) {
        if (state.active.workoutName === 'Costas, bíceps + calistenia') state.active.workoutName = workout.name;
        state.active.exercises = state.active.exercises.filter(e => !['front-lever', 'l-sit'].includes(e.exerciseId) || e.done.some(Boolean));
        for (const exercise of additions) if (!state.active.exercises.some(e => e.exerciseId === exercise.id)) {
          const index = state.active.exercises.findIndex(e => getMuscle(e) === 'biceps');
          state.active.exercises.splice(index < 0 ? state.active.exercises.length : index, 0, { exerciseId: exercise.id, name: exercise.name, image: exercise.image, target: exercise.target, kind: exercise.kind, muscle: getMuscle(exercise), weight: weights[exercise.id] ?? 0, done: [false, false, false] });
        }
      }
    }
    state.routineRevision = 8;
  }
  if ((state.routineRevision ?? 0) < 9) {
    const friday = state.workouts.find(w => w.id === 'e');
    if (friday) friday.image = 36;
    const thursday = state.workouts.find(w => w.id === 'd');
    function groupTriceps<T>(entries: T[], id: (entry: T) => string): T[] {
      const dips = entries.find(e => id(e) === 'parallel-bar-dips');
      if (!dips || !entries.some(e => id(e) === 'bar-pushdown')) return entries;
      const result = entries.filter(e => id(e) !== 'parallel-bar-dips');
      result.splice(result.findIndex(e => id(e) === 'bar-pushdown'), 0, dips);
      return result;
    }
    if (thursday) thursday.exercises = groupTriceps(thursday.exercises, e => e.id);
    if (state.active?.workoutId === 'd') state.active.exercises = groupTriceps(state.active.exercises, e => e.exerciseId);
    state.routineRevision = 9;
  }
  if ((state.routineRevision ?? 0) < 10) {
    for (const workout of state.workouts) for (const exercise of workout.exercises) {
      if (exercise.id === 'overhead-extension' && exercise.name === 'Tríceps acima da cabeça na polia') exercise.name = 'Tríceps francês na polia';
    }
    if (state.active) for (const log of state.active.exercises) {
      if (log.exerciseId === 'overhead-extension' && log.name === 'Tríceps acima da cabeça na polia') log.name = 'Tríceps francês na polia';
    }
    const workout = state.workouts.find(w => w.id === 'a');
    if (workout?.exercises.some(e => e.id === articulatedChestPress.id)) {
      workout.exercises = workout.exercises.filter(e => e.id !== articulatedChestPress.id);
      if (!workout.exercises.some(e => e.id === parallelBarDips.id)) {
        const firstTriceps = workout.exercises.findIndex(e => getMuscle(e) === 'triceps');
        workout.exercises.splice(firstTriceps < 0 ? workout.exercises.length : firstTriceps, 0, { ...parallelBarDips });
      }
      if (state.active?.workoutId === workout.id) {
        state.active.exercises = state.active.exercises.filter(e => e.exerciseId !== articulatedChestPress.id || e.done.some(Boolean));
        if (!state.active.exercises.some(e => e.exerciseId === parallelBarDips.id)) {
          const firstTriceps = state.active.exercises.findIndex(e => getMuscle(e) === 'triceps');
          state.active.exercises.splice(firstTriceps < 0 ? state.active.exercises.length : firstTriceps, 0, {
            exerciseId: parallelBarDips.id, name: parallelBarDips.name, image: parallelBarDips.image,
            target: parallelBarDips.target, kind: parallelBarDips.kind, muscle: 'triceps',
            weight: weights[parallelBarDips.id] ?? 0, done: [false, false, false],
          });
        }
      }
    }
    state.routineRevision = 10;
  }
  return state;
}
