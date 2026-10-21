export type MuscleGroup = 'chest' | 'back' | 'biceps' | 'triceps' | 'shoulders' | 'legs' | 'abs' | 'other';
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  target: string;
  kind: 'reps' | 'seconds';
  image: number;
  rest: number;
  muscle?: MuscleGroup;
}
export interface Workout {
  id: string;
  name: string;
  day: number;
  image: number;
  exercises: Exercise[];
}
export interface ExerciseLog {
  exerciseId: string;
  name: string;
  image: number;
  target: string;
  kind: 'reps' | 'seconds';
  weight: number;
  done: boolean[];
  muscle?: MuscleGroup;
}
export interface Session {
  id: string;
  workoutId: string;
  workoutName: string;
  startedAt: number;
  finishedAt?: number;
  exercises: ExerciseLog[];
}
export interface RestTimer {
  duration: number;
  remaining: number;
  endAt: number | null;
  exercise: string;
  started: boolean;
}
export interface Preferences {
  autoRest: boolean;
  sound: boolean;
  restDuration: number;
}
export interface AppState {
  version: 1;
  workouts: Workout[];
  weights: Record<string, number>;
  active: Session | null;
  history: Session[];
  timer: RestTimer;
  preferences: Preferences;
  routineRevision?: number;
  exerciseNotes?: Record<string, string>;
}
