import { describe, expect, it } from 'vitest';
import { copyPreset, exerciseLibrary, searchExercises } from './exerciseLibrary';
import { createInitialState, initialWorkouts } from './data';
import { createBackup, createSession, parseBackup } from './domain';
import { LAST_IMAGE_INDEX } from './catalog';

describe('predefined exercise catalog', () => {
  it('contains complete, distinct presets in Portuguese alphabetical order', () => {
    expect(exerciseLibrary.map(e => e.name)).toEqual(exerciseLibrary.map(e => e.name).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
    expect(new Set(exerciseLibrary.map(e => e.id)).size).toBe(exerciseLibrary.length);
    for (const exercise of exerciseLibrary) {
      expect(exercise.name.length).toBeGreaterThan(0);
      expect(exercise.sets).toBe(3);
      expect(exercise.muscle).not.toBe('other');
      expect(exercise.image).toBeLessThanOrEqual(LAST_IMAGE_INDEX);
      expect(exercise.target.length).toBeGreaterThan(0);
      expect(exercise.rest).toBeGreaterThanOrEqual(15);
    }
    expect(exerciseLibrary.filter(e => e.image >= 37)).toHaveLength(21);
  });
  it('searches aliases, accents, multiple words and muscle names', () => {
    expect(searchExercises('BULGARO').map(e => e.id)).toEqual(['bulgarian-split-squat']);
    expect(searchExercises('banco extensor').map(e => e.id)).toEqual(['leg-extension']);
    expect(searchExercises('pectoral fly').map(e => e.id)).toEqual(['pec-deck']);
    expect(searchExercises('scott maquina').map(e => e.id)).toEqual(['machine-preacher-curl']);
    expect(searchExercises('abdomen').every(e => e.muscle === 'abs')).toBe(true);
    expect(searchExercises('zzzzzz')).toEqual([]);
  });
  it('does not change the routine or mutate presets when a selection is edited', () => {
    const original = structuredClone(initialWorkouts);
    const selected = searchExercises('bulgaro')[0];
    const copy = copyPreset(selected);
    copy.name = 'Personalizado';
    expect(selected.name).toBe('Agachamento búlgaro');
    expect(copy).not.toHaveProperty('aliases');
    expect(createInitialState().workouts).toEqual(original);
    expect(createInitialState().workouts.map(w => w.exercises.length)).toEqual([6, 6, 6, 6, 6]);
  });
  it('keeps loads distinct for new variants and accepts them in backups', () => {
    const state = createInitialState();
    const variant = copyPreset(searchExercises('scott maquina')[0]);
    state.workouts[0].exercises[0] = variant;
    state.workouts[0].exercises.push(copyPreset(searchExercises('reta polia')[0]));
    state.weights['preacher-curl'] = 30;
    state.weights['machine-preacher-curl'] = 15;
    expect(createSession(state.workouts[0], state.weights).exercises[0].weight).toBe(15);
    expect(parseBackup(createBackup(state))).toEqual(state);
  });
});
