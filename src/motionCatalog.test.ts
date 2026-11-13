import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { animatedExercises, exerciseIllustrationUrl, exerciseMotionId, sharedExerciseMotionId, workoutCoverUrl } from './motionCatalog';
import { createIvanWorkouts, createSheetWorkouts } from './routinePlans';

const assetExists = (path: string) => existsSync(fileURLToPath(new URL(`../public/images/${path}`, import.meta.url)));
describe('shared updated exercise illustrations', () => {
  it('shares every existing animation across profiles and custom workout slots with both frames present', () => {
    for (const [id, image] of Object.entries(animatedExercises)) {
      for (const plan of [undefined, 'original', 'sheet', 'ivan']) expect(exerciseMotionId(plan, 'custom-workout', id, image)).toBe(id);
      expect(assetExists(`motion/${id}-1.webp`)).toBe(true);
      expect(assetExists(`motion/${id}-2.webp`)).toBe(true);
      expect(exerciseIllustrationUrl(id, image)).toContain(`/motion/${id}-1.webp`);
      expect(sharedExerciseMotionId(id, 999)).toBeUndefined();
    }
  });
  it('reuses the same movement for older names, without confusing distinct equipment or user-selected artwork', () => {
    expect(sharedExerciseMotionId('machine-row', 8)).toBe('chest-supported-row');
    expect(sharedExerciseMotionId('machine-chest-press', 1)).toBe('vertical-chest-press');
    expect(sharedExerciseMotionId('straight-bar-cable-curl', 57)).toBe('cable-curl');
    for (const [id, image] of [['machine-preacher-curl', 38], ['pullup', 6], ['side-plank', 51], ['lat-pulldown', 26], ['leg-curl', 5]] as const) expect(sharedExerciseMotionId(id, image)).toBeUndefined();
    expect(exerciseIllustrationUrl('leg-curl', 5)).toContain('/exercise-5.webp');
  });
  it('updates matching Nick and Ivan illustrations and covers without modifying any prescribed exercises or sets', () => {
    for (const [person, workouts] of [['sheet', createSheetWorkouts()], ['ivan', createIvanWorkouts()]] as const) {
      const before = structuredClone(workouts);
      let updated = 0;
      for (const workout of workouts) {
        const cover = workoutCoverUrl(person, workout.id, workout.image);
        expect(assetExists(cover.split('/images/')[1])).toBe(true);
        for (const exercise of workout.exercises) {
          if (exerciseMotionId(person, workout.id, exercise.id, exercise.image)) updated++;
        }
      }
      expect(updated).toBeGreaterThan(15);
      expect(workouts).toEqual(before);
    }
  });
});
