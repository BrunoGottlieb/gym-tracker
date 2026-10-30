import type { AppState, Exercise, Workout } from './types';
import { getMuscle } from './catalog';

const exercise = (id: string, name: string, sets: number, target: string, image: number, kind: Exercise['kind'] = 'reps'): Exercise => ({ id, name, sets, target, image, kind, rest: 90, muscle: getMuscle({ id }) });
export const articulatedChestPress = exercise('articulated-chest-press', 'Supino articulado na máquina', 3, '8–12', 33);
export const declineSitup = exercise('decline-situp', 'Abdominal no banco declinado', 3, '10–15', 34);
export const militarySitup = exercise('military-situp', 'Abdominal militar (TAF)', 3, '10–15', 35);
export const parallelBarDips = exercise('parallel-bar-dips', 'Dips livres nas paralelas', 3, '6–10', 36);

export const horizontalLegPress = exercise('horizontal-leg-press', 'Leg press horizontal com banco móvel', 3, '8–12', 65);
export const leverSquat = exercise('lever-squat', 'Agachamento no squat articulado', 3, '8–12', 66);

export const initialWorkouts: Workout[] = [
  { id: 'a', name: 'Peito + tríceps', day: 1, image: 0, exercises: [
    exercise('bench-press', 'Supino reto com barra', 3, '6–10', 0),
    exercise('incline-machine', 'Supino inclinado com barra', 3, '8–12', 30),
    exercise('pec-deck', 'Peck deck (voador)', 3, '10–15', 2),
    { ...parallelBarDips },
    exercise('rope-pushdown', 'Tríceps na polia com corda', 3, '10–15', 3),
    exercise('overhead-extension', 'Tríceps francês na polia', 3, '10–15', 4),
  ] },
  { id: 'b', name: 'Costas + bíceps', day: 2, image: 26, exercises: [
    exercise('lat-pulldown', 'Puxada alta (pulley)', 3, '8–12', 26),
    exercise('cable-row', 'Remada baixa na polia', 3, '8–12', 7),
    exercise('chest-supported-row', 'Remada Hammer com apoio para peito', 3, '8–12', 31),
    exercise('straight-arm-pulldown', 'Pulldown com braços estendidos', 3, '10–15', 9),
    exercise('preacher-curl', 'Rosca Scott', 3, '8–12', 10),
    exercise('rope-curl', 'Rosca corda no crossover', 3, '10–12', 32),
  ] },
  { id: 'c', name: 'Pernas', day: 3, image: 12, exercises: [
    exercise('leg-press', 'Leg press 45°', 3, '8–12', 12),
    exercise('leg-extension', 'Cadeira extensora', 3, '10–15', 13),
    exercise('leg-curl', 'Cadeira flexora', 3, '10–15', 14),
    exercise('calf-raise', 'Panturrilha sentado na máquina', 3, '12–20', 16),
    { ...horizontalLegPress },
    { ...leverSquat },
  ] },
  { id: 'd', name: 'Ombros, peito + tríceps', day: 4, image: 36, exercises: [
    exercise('lateral-raise', 'Elevação lateral com halteres', 3, '10–15', 19),
    exercise('reverse-fly', 'Crucifixo inverso na máquina', 3, '12–15', 20),
    exercise('incline-dumbbell', 'Supino inclinado com halteres', 3, '8–12', 21),
    exercise('crossover', 'Crucifixo no crossover', 3, '10–15', 22),
    { ...parallelBarDips },
    exercise('bar-pushdown', 'Tríceps na polia com barra', 3, '10–15', 23),
  ] },
  { id: 'e', name: 'Costas + bíceps', day: 5, image: 36, exercises: [
    exercise('lat-pulldown', 'Puxada alta (pulley)', 3, '8–12', 26),
    exercise('chest-supported-row', 'Remada Hammer com apoio para peito', 3, '8–12', 31),
    exercise('cable-row', 'Remada baixa na polia', 3, '8–12', 7),
    exercise('straight-arm-pulldown', 'Pulldown com braços estendidos', 3, '10–15', 9),
    exercise('incline-curl', 'Rosca inclinada com halteres', 3, '8–12', 28),
    exercise('cable-curl', 'Rosca bíceps na polia', 3, '10–15', 29),
  ] },
];

export function createInitialState(): AppState {
  return {
    version: 1, routineRevision: 12, exerciseNotes: {}, workouts: structuredClone(initialWorkouts), weights: {}, active: null, history: [],
    timer: { duration: 90, remaining: 90, endAt: null, exercise: '', started: false },
    preferences: { autoRest: false, sound: false, restDuration: 90 },
  };
}
