import type { AppState, Exercise, Workout } from './types';
import { getMuscle } from './catalog';

const exercise = (id: string, name: string, sets: number, target: string, image: number, kind: Exercise['kind'] = 'reps'): Exercise => ({ id, name, sets, target, image, kind, rest: 90, muscle: getMuscle({ id }) });
export const articulatedChestPress = exercise('articulated-chest-press', 'Supino articulado na máquina', 3, '8–12', 33);
export const declineSitup = exercise('decline-situp', 'Abdominal no banco declinado', 3, '10–15', 34);
export const militarySitup = exercise('military-situp', 'Abdominal militar (TAF)', 3, '10–15', 35);
export const parallelBarDips = exercise('parallel-bar-dips', 'Dips livres nas paralelas', 3, '6–10', 36);

export const hipAbduction = { ...exercise('hip-abduction', 'Cadeira abdutora', 3, '12–20', 64), muscle: 'legs' as const };
export const ropeCurl = exercise('rope-curl', 'Rosca corda no crossover', 3, '10–15', 32);

export const preacherCurl = exercise('preacher-curl', 'Rosca Scott', 3, '8–12', 10);

export const horizontalLegPress = exercise('horizontal-leg-press', 'Leg press horizontal com banco móvel', 3, '8–12', 65);
export const leverSquat = exercise('lever-squat', 'Agachamento no squat articulado', 3, '8–12', 66);

export const legacyWorkouts: Workout[] = [
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
    { ...preacherCurl },
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
  { id: 'e', name: 'Costas + bíceps', day: 5, image: 10, exercises: [
    exercise('lat-pulldown', 'Puxada alta (pulley)', 3, '8–12', 26),
    exercise('chest-supported-row', 'Remada Hammer com apoio para peito', 3, '8–12', 31),
    exercise('cable-row', 'Remada baixa na polia', 3, '8–12', 7),
    exercise('straight-arm-pulldown', 'Pulldown com braços estendidos', 3, '10–15', 9),
    { ...preacherCurl },
    exercise('cable-curl', 'Rosca bíceps na polia', 3, '10–15', 29),
  ] },
];

export const optionalHomeWorkout: Workout = {
  id: 'home', name: 'Em casa', day: 6, image: 24, optional: true, exercises: [
    {...exercise('tuck-front-lever','Tuck front lever',3,'5–10',24,'seconds'),muscle:'back',instructions:'Prática técnica: joelhos recolhidos, posição controlada e sem ir até perder a postura. Opcional; ajuste conforme a recuperação das costas.'},
    {...exercise('hanging-leg-raise','Elevação de pernas na barra fixa',3,'6–12',49),muscle:'abs',instructions:'Sem balanço. Se necessário, faça com os joelhos flexionados.'},
  ],
};

export const initialWorkouts: Workout[] = [
  { id: 'a', name: 'Peito + tríceps', day: 1, image: 0, exercises: [
    exercise('bench-press','Supino reto com barra',3,'6–10',0),
    exercise('incline-dumbbell','Supino inclinado com halteres',3,'8–12',21),
    exercise('pec-deck','Peck deck (voador)',3,'10–15',2),
    {...parallelBarDips,sets:3,target:'6–12'},
    exercise('rope-pushdown','Tríceps na polia com corda',3,'10–15',3),
    exercise('bar-pushdown','Tríceps na polia com barra',3,'10–15',23),
  ] },
  { id: 'b', name: 'Costas, bíceps + ombros', day: 2, image: 68, exercises: [
    {...exercise('assisted-pullup','Barra fixa assistida',3,'6–10',68),instructions:'Registre o contrapeso de assistência. Menos kg de assistência = maior dificuldade.'},
    exercise('chest-supported-row','Remada Hammer com apoio para peito',3,'8–12',31),
    {...preacherCurl,sets:3},
    exercise('rope-curl','Rosca corda no crossover',3,'10–15',32),
    exercise('lateral-raise','Elevação lateral com halteres',3,'12–20',19),
    exercise('face-pull','Face-pull na polia com corda',3,'12–20',67),
  ] },
  { id: 'c', name: 'Pernas', day: 3, image: 66, exercises: [
    {...leverSquat,sets:3,target:'8–12'},
    exercise('leg-press','Leg press 45°',3,'10–15',12),
    exercise('leg-extension','Cadeira extensora',3,'10–15',13),
    exercise('leg-curl','Cadeira flexora sentada',3,'10–15',14),
    {...exercise('lying-leg-curl','Mesa flexora deitada',3,'10–15',56),muscle:'legs'},
    {...hipAbduction},
    exercise('calf-raise','Panturrilha na máquina',4,'10–20',16),
  ] },
  { id: 'd', name: 'Peito, tríceps + abdômen', day: 4, image: 21, exercises: [
    exercise('incline-dumbbell','Supino inclinado com halteres',3,'8–12',21),
    exercise('crossover','Crucifixo no crossover',3,'10–15',22),
    {...parallelBarDips,sets:3,target:'6–12'},
    exercise('rope-pushdown','Tríceps na polia com corda',3,'10–15',3),
    {...militarySitup,sets:3,target:'10–20'},
    {...declineSitup},
    {...exercise('front-plank','Prancha frontal',3,'30–60',54,'seconds'),muscle:'abs'},
  ] },
  { id: 'e', name: 'Costas, bíceps + ombros', day: 5, image: 10, exercises: [
    {...exercise('assisted-pullup','Barra fixa assistida',3,'6–10',68),instructions:'Registre o contrapeso de assistência. Menos kg de assistência = maior dificuldade.'},
    exercise('cable-row','Remada baixa na polia',3,'8–12',7),
    {...preacherCurl,sets:3},
    exercise('cable-curl','Rosca bíceps na polia com barra',3,'10–15',29),
    {...ropeCurl},
    {...exercise('cable-lateral-raise','Elevação lateral unilateral na polia',3,'12–20',59),muscle:'shoulders'},
    exercise('face-pull','Face-pull na polia com corda',3,'12–20',67),
  ] },
  optionalHomeWorkout,
];

export function createLegacyState(): AppState {
  return { ...createInitialState(), brunoPlanRevision: undefined, brunoHomeRevision: undefined, brunoSeriesRevision: undefined, brunoAdditionsRevision: undefined, workouts: structuredClone(legacyWorkouts) };
}

export function createInitialState(): AppState {
  return {
    version: 1, brunoAdditionsRevision: 1, brunoSeriesRevision: 1, brunoHomeRevision: 1, brunoPlanRevision: 1, routineRevision: 12, brunoFridayRevision: 1, exerciseNotes: {}, workouts: structuredClone(initialWorkouts), weights: {}, active: null, history: [],
    timer: { duration: 90, remaining: 90, endAt: null, exercise: '', started: false },
    preferences: { autoRest: false, sound: false, restDuration: 90 },
  };
}
