import { exerciseLibrary, copyPreset } from './exerciseLibrary';
import { initialWorkouts } from './data';
import type { AppState, Exercise, RoutinePlan, Workout } from './types';

export const planLabels: Record<RoutinePlan, string> = { original: 'Meu treino atual', sheet: 'Treino da folha' };
const pyramid = '12–10–8–6';
const drop = '10 + drop set';
function exercise(id: string, sets: number, target: string, instructions?: string): Exercise {
  const preset = exerciseLibrary.find(e => e.id === id);
  if (!preset) throw new Error(`Exercício ausente: ${id}`);
  return { ...copyPreset(preset), sets, target, rest: 45, ...(instructions ? { instructions } : {}) };
}
const bisetTriceps = 'Bi-set: tríceps corda + tríceps na polia com barra, em sequência.';
const bisetBiceps = 'Bi-set: rosca direta na polia + rosca corda, em sequência.';
const bisetLegs = 'Bi-set: passada + agachamento isométrico, em sequência.';
const bisetAbs = 'Bi-set: abdominal oblíquo unilateral + prancha lateral, em sequência.';
const trisetAbs = 'Tri-set: supra com anilha + supra com pernas a 90° + prancha frontal, em sequência.';
const maximum = 'MAX: máximo de repetições conforme a orientação da ficha.';

/** A transcription of the supplied sheet, not a migration of the original routine. */
export function createSheetWorkouts(): Workout[] {
  return [
    { id: 'a', name: 'Peito + tríceps', day: 1, image: 21, exercises: [
      exercise('incline-dumbbell', 4, pyramid), exercise('bench-press', 4, pyramid),
      exercise('pec-deck', 3, drop), exercise('articulated-chest-press', 4, pyramid),
      exercise('parallel-bar-dips', 4, 'MAX', maximum),
      exercise('rope-pushdown', 3, '8–12', bisetTriceps), exercise('bar-pushdown', 3, '8–12', bisetTriceps),
      exercise('overhead-extension', 3, drop),
    ] },
    { id: 'b', name: 'Costas + bíceps', day: 2, image: 31, exercises: [
      exercise('pullup', 4, 'MAX', maximum), exercise('lat-pulldown', 4, pyramid), exercise('bent-over-row', 4, pyramid),
      { id: 'machine-row', name: 'Remada no aparelho', sets: 3, target: drop, image: 8, muscle: 'back', kind: 'reps', rest: 45, instructions: 'A ficha não especifica o modelo do aparelho. Ajuste a ilustração na edição se necessário.' },
      exercise('chest-supported-row', 4, pyramid), exercise('machine-preacher-curl', 3, drop),
      exercise('straight-bar-cable-curl', 3, '8–12', bisetBiceps), exercise('rope-curl', 3, '8–12', bisetBiceps),
      exercise('alternating-curl', 4, pyramid),
    ] },
    { id: 'c', name: 'Pernas', day: 3, image: 40, exercises: [
      exercise('leg-extension', 3, drop), exercise('linear-hack-squat', 4, pyramid),
      exercise('walking-lunge', 3, '10 cada lado', bisetLegs),
      { ...exercise('wall-sit', 3, '45', bisetLegs), kind: 'seconds' },
      exercise('leg-press', 4, pyramid), exercise('leg-press-calf-raise', 4, '15'),
      exercise('lying-leg-curl', 3, drop), exercise('bulgarian-split-squat', 4, pyramid),
    ] },
    { id: 'd', name: 'Peito + ombros', day: 4, image: 47, exercises: [
      exercise('pushup', 4, 'MAX', maximum), exercise('incline-machine', 4, pyramid),
      exercise('vertical-chest-press', 3, drop), exercise('crossover', 3, drop),
      exercise('dumbbell-shoulder-press', 4, pyramid), exercise('front-raise', 4, pyramid), exercise('lateral-raise', 3, drop),
    ] },
    { id: 'e', name: 'Abdômen', day: 5, image: 49, exercises: [
      exercise('hanging-leg-raise', 4, 'MAX', maximum), exercise('decline-situp', 4, 'MAX', maximum),
      exercise('oblique-crunch', 3, 'MAX', bisetAbs), { ...exercise('side-plank', 3, 'MAX', bisetAbs), kind: 'seconds' },
      exercise('weighted-crunch', 3, '15–20', trisetAbs), exercise('legs-up-crunch', 3, 'MAX', trisetAbs),
      { ...exercise('front-plank', 3, '60', trisetAbs), kind: 'seconds' }, exercise('cable-crunch', 4, '8–12'),
    ] },
  ];
}

export function selectRoutinePlan(state: AppState, plan: RoutinePlan): AppState {
  const current = state.selectedPlan ?? 'original';
  if (current === plan || state.active) return state;
  const snapshots = { ...state.planSnapshots, [current]: structuredClone(state.workouts) };
  const workouts = structuredClone(snapshots[plan] ?? (plan === 'sheet' ? createSheetWorkouts() : initialWorkouts));
  return { ...state, selectedPlan: plan, planSnapshots: snapshots, workouts,
    timer: { ...state.timer, endAt: null, started: false, remaining: state.timer.duration } };
}
