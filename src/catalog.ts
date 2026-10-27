import type { Exercise, MuscleGroup } from './types';

export const LAST_IMAGE_INDEX = 57;
export const canonicalExerciseId = (id: string): string => id === 'supported-row' ? 'chest-supported-row' : id;
export const muscleLabels: Record<MuscleGroup, string> = {
  chest: 'Peito', back: 'Costas', biceps: 'Bíceps', triceps: 'Tríceps',
  shoulders: 'Ombros', legs: 'Pernas', abs: 'Abdômen', other: 'Outro',
};
const groups: Record<MuscleGroup, string[]> = {
  chest: ['bench-press', 'incline-machine', 'articulated-chest-press', 'pec-deck', 'incline-dumbbell', 'crossover'],
  back: ['pullup', 'cable-row', 'chest-supported-row', 'straight-arm-pulldown', 'front-lever', 'lat-pulldown', 'supported-row'],
  biceps: ['preacher-curl', 'hammer-curl', 'rope-curl', 'incline-curl', 'cable-curl'],
  triceps: ['rope-pushdown', 'overhead-extension', 'bar-pushdown', 'parallel-bar-dips'],
  shoulders: ['shoulder-press', 'lateral-raise', 'reverse-fly'],
  legs: ['leg-press', 'leg-extension', 'leg-curl', 'romanian-deadlift', 'calf-raise'],
  abs: ['hanging-knee-raise', 'decline-situp', 'military-situp', 'l-sit'], other: [],
};
export function getMuscle(exercise: { id?: string; exerciseId?: string; muscle?: MuscleGroup }): MuscleGroup {
  if (exercise.muscle) return exercise.muscle;
  const id = exercise.id ?? exercise.exerciseId;
  return (Object.keys(groups) as MuscleGroup[]).find(group => id && groups[group].includes(id)) ?? 'other';
}
export const imageNames: Record<number, string> = {
  0: 'Supino reto', 1: 'Supino na máquina (anterior)', 2: 'Peck deck', 3: 'Tríceps corda',
  4: 'Tríceps francês na polia', 5: 'Halter / personalizado', 6: 'Barra fixa (anterior)',
  7: 'Remada baixa', 8: 'Remada articulada (anterior)', 9: 'Pulldown', 10: 'Rosca Scott',
  11: 'Rosca martelo (anterior)', 12: 'Leg press', 13: 'Extensora', 14: 'Flexora',
  15: 'Stiff', 16: 'Panturrilha', 17: 'Elevação de joelhos', 18: 'Desenvolvimento',
  19: 'Elevação lateral', 20: 'Crucifixo inverso', 21: 'Supino com halteres',
  22: 'Crossover', 23: 'Tríceps barra', 24: 'Front lever', 25: 'L-sit', 26: 'Pulley',
  27: 'Remada com apoio', 28: 'Rosca inclinada', 29: 'Rosca na polia',
  30: 'Supino inclinado com barra', 31: 'Remada Hammer', 32: 'Rosca corda no crossover',
  33: 'Supino articulado na máquina',
  34: 'Abdominal no banco declinado', 35: 'Abdominal militar (TAF)',
  36: 'Dips livres nas paralelas',
  37: 'Remada curvada com barra', 38: 'Rosca Scott na máquina',
  39: 'Rosca alternada com halteres', 40: 'Hack linear', 41: 'Passada (walking lunges)',
  42: 'Agachamento isométrico', 43: 'Panturrilha no leg press 45°', 44: 'Agachamento búlgaro',
  45: 'Flexão de braços', 46: 'Supino vertical no aparelho', 47: 'Desenvolvimento com halteres',
  48: 'Elevação frontal com halteres', 49: 'Elevação de pernas na barra fixa',
  50: 'Abdominal oblíquo unilateral', 51: 'Prancha lateral', 52: 'Abdominal supra com anilha',
  53: 'Abdominal supra com pernas a 90°', 54: 'Prancha frontal', 55: 'Abdominal supra no cabo',
  56: 'Mesa flexora (banco flexor)', 57: 'Rosca direta com barra reta na polia',
};
export function snapshotExercise(log: { exerciseId: string; name: string; image: number; target: string; kind: Exercise['kind']; done: boolean[]; muscle?: MuscleGroup }): Exercise {
  return { id: log.exerciseId, name: log.name, image: log.image, target: log.target, kind: log.kind, sets: log.done.length, rest: 90, muscle: getMuscle(log) };
}
