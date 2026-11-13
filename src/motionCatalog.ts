/** Existing two-frame demonstrations, shared by every profile and workout. */
export const animatedExercises: Record<string, number> = {
  'bench-press': 0, 'incline-dumbbell': 21, 'pec-deck': 2, 'parallel-bar-dips': 36,
  'rope-pushdown': 3, 'bar-pushdown': 23, 'front-plank': 54,
  'assisted-pullup': 68, 'chest-supported-row': 31, 'preacher-curl': 10,
  'rope-curl': 32, 'face-pull': 67, 'lever-squat': 66, 'leg-press': 12,
  'leg-extension': 13, 'leg-curl': 14, 'lying-leg-curl': 56, 'hip-abduction': 64,
  'calf-raise': 16, 'military-situp': 35, 'cable-curl': 29, 'cable-lateral-raise': 59,
  'shoulder-press': 18, 'tuck-front-lever': 24, 'hanging-leg-raise': 49,
  'decline-situp': 34, 'cable-row': 7, pushup: 45, 'incline-machine': 30,
  'vertical-chest-press': 46, crossover: 22, 'dumbbell-shoulder-press': 47,
  'front-raise': 48, 'lateral-raise': 19,
};
// Earlier catalog names depict the same movement. Preserve their distinct saved
// identities, loads and selected image numbers while reusing the demonstration.
const aliases: Record<string, { image: number; animation: string }> = {
  'machine-row': { image: 8, animation: 'chest-supported-row' },
  'supported-row': { image: 31, animation: 'chest-supported-row' },
  'machine-chest-press': { image: 1, animation: 'vertical-chest-press' },
  'straight-bar-cable-curl': { image: 57, animation: 'cable-curl' },
};
export function sharedExerciseMotionId(id: string | undefined, image: number) {
  if (!id) return undefined;
  if (animatedExercises[id] === image) return id;
  return aliases[id]?.image === image ? aliases[id].animation : undefined;
}
export function exerciseMotionId(_plan: string | undefined, _workout: string, id: string, image: number) {
  return sharedExerciseMotionId(id, image);
}
export function exerciseIllustrationUrl(id: string | undefined, image: number) {
  const animation = sharedExerciseMotionId(id, image);
  return `${import.meta.env.BASE_URL}images/${animation ? `motion/${animation}-1` : `exercise-${image}`}.webp`;
}
const croppedCovers = new Set(['bench-press', 'assisted-pullup', 'lever-squat', 'incline-dumbbell', 'preacher-curl', 'tuck-front-lever', 'dumbbell-shoulder-press']);
export function workoutCoverUrl(_plan: string | undefined, _workout: string, image: number) {
  const animation = Object.keys(animatedExercises).find(id => animatedExercises[id] === image)
    ?? Object.values(aliases).find(entry => entry.image === image)?.animation;
  return `${import.meta.env.BASE_URL}images/${animation ? croppedCovers.has(animation) ? `motion/covers/${animation}` : `motion/${animation}-1` : `exercise-${image}`}.webp`;
}
