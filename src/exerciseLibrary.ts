import { articulatedChestPress, initialWorkouts } from './data';
import { canonicalExerciseId, muscleLabels } from './catalog';
import type { Exercise, MuscleGroup } from './types';

export interface ExercisePreset extends Exercise { aliases?: string[] }
const preset = (id: string, name: string, image: number, muscle: MuscleGroup, aliases: string[] = [], target = '8–12', kind: Exercise['kind'] = 'reps'): ExercisePreset =>
  ({ id, name, image, muscle, aliases, target, kind, sets: 3, rest: 90 });
const additions: ExercisePreset[] = [
  { ...articulatedChestPress },
  preset('pullup', 'Barra fixa', 6, 'back', ['Puxada na barra fixa'], '6–10'),
  preset('bent-over-row', 'Remada curvada com barra', 37, 'back'),
  preset('machine-preacher-curl', 'Rosca Scott na máquina', 38, 'biceps', ['Rosca Scott no aparelho']),
  preset('alternating-curl', 'Rosca alternada com halteres', 39, 'biceps'),
  preset('linear-hack-squat', 'Hack linear', 40, 'legs', ['Agachamento hack']),
  preset('walking-lunge', 'Passada (walking lunges)', 41, 'legs', ['Avanço', 'Walking lunges'], '10 cada lado'),
  preset('wall-sit', 'Agachamento isométrico', 42, 'legs', ['Wall sit'], '30–45', 'seconds'),
  preset('leg-press-calf-raise', 'Panturrilha no leg press 45°', 43, 'legs', [], '12–20'),
  preset('bulgarian-split-squat', 'Agachamento búlgaro', 44, 'legs', [], '8–12 cada lado'),
  preset('pushup', 'Flexão de braços', 45, 'chest', ['Apoio', 'Push-up'], '8–15'),
  preset('vertical-chest-press', 'Supino vertical no aparelho', 46, 'chest'),
  preset('dumbbell-shoulder-press', 'Desenvolvimento com halteres', 47, 'shoulders'),
  preset('front-raise', 'Elevação frontal com halteres', 48, 'shoulders', [], '10–15'),
  preset('hanging-leg-raise', 'Elevação de pernas na barra fixa', 49, 'abs', ['Abdominal elevação de perna na barra fixa'], '10–15'),
  preset('oblique-crunch', 'Abdominal oblíquo unilateral', 50, 'abs', [], '10–15 cada lado'),
  preset('side-plank', 'Prancha lateral', 51, 'abs', [], '20–40', 'seconds'),
  preset('weighted-crunch', 'Abdominal supra com anilha', 52, 'abs', [], '10–15'),
  preset('legs-up-crunch', 'Abdominal supra com pernas a 90°', 53, 'abs', [], '10–15'),
  preset('front-plank', 'Prancha frontal', 54, 'abs', ['Plank'], '30–45', 'seconds'),
  preset('cable-crunch', 'Abdominal supra no cabo', 55, 'abs', ['Abdominal na polia'], '10–15'),
  preset('lying-leg-curl', 'Mesa flexora (banco flexor)', 56, 'legs', ['Flexora deitada'], '10–15'),
  preset('straight-bar-cable-curl', 'Rosca direta com barra reta na polia', 57, 'biceps', ['Rosca direta com barra reta no crossover', 'Cross over']),
];
const aliases: Record<string, string[]> = {
  'pec-deck': ['Pectoral fly', 'Voador', 'Peck deck'],
  'lat-pulldown': ['Pulley frente', 'Puxada na frente'],
  'chest-supported-row': ['Remada no aparelho', 'Remada articulada Hammer'],
  'leg-extension': ['Banco extensor'],
  'bar-pushdown': ['Tríceps pulley', 'Tríceps crossover'],
  'overhead-extension': ['Tríceps francês com corda', 'Tríceps acima da cabeça'],
};
const byId = new Map<string, ExercisePreset>();
for (const exercise of [...initialWorkouts.flatMap(workout => workout.exercises), ...additions]) {
  const id = canonicalExerciseId(exercise.id);
  byId.set(id, { ...exercise, id, aliases: [...(aliases[id] ?? []), ...((exercise as ExercisePreset).aliases ?? [])] });
}
export const exerciseLibrary = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export function searchExercises(query: string): ExercisePreset[] {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return exerciseLibrary.filter(exercise => {
    const text = normalize([exercise.name, muscleLabels[exercise.muscle ?? 'other'], ...(exercise.aliases ?? [])].join(' '));
    return terms.every(term => text.includes(term));
  });
}
/** Copy only workout fields so a selection never modifies the shared catalog. */
export function copyPreset(preset: ExercisePreset): Exercise {
  const { id, name, image, muscle, target, kind, sets, rest } = preset;
  return { id, name, image, muscle, target, kind, sets, rest };
}
