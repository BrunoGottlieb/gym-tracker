import { createServer } from '../node_modules/vite/dist/node/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
try {
  const { createInitialState } = await server.ssrLoadModule('/src/data.ts');
  const { createSession, createBackup } = await server.ssrLoadModule('/src/domain.ts');
  const { selectRoutinePlan } = await server.ssrLoadModule('/src/routinePlans.ts');
  const { personalXP, XP_FRESH_START } = await server.ssrLoadModule('/src/gamification.ts');
  const { sharedExerciseMotionId } = await server.ssrLoadModule('/src/motionCatalog.ts');
  const fixtures = {};
  for (const person of ['original', 'sheet', 'ivan']) {
    const state = selectRoutinePlan(createInitialState(), person);
    state.weights = { 'bench-press': 60, 'leg-curl': 35 }; state.exerciseNotes = { 'leg-curl': 'Banco 3' };
    state.history = Array.from({ length: 8 }, (_, i) => {
      const finishedAt = XP_FRESH_START - (i + 1) * 86400000;
      const session = createSession(state.workouts[0], state.weights, finishedAt - 3600000);
      session.exercises.forEach(log => log.done.fill(true));
      return { ...session, id: `old-${person}-${i}`, person, finishedAt };
    });
    fixtures[person] = { state, payload: createBackup(state), xp: personalXP(state.history, person),
      motions: Object.fromEntries(state.workouts.map(workout => [workout.id, workout.exercises.map(e => sharedExerciseMotionId(e.id, e.image) ?? null)])) };
  }
  mkdirSync('artifacts/avatar-sandbox', { recursive: true });
  writeFileSync('artifacts/avatar-sandbox/fixtures.json', JSON.stringify(fixtures));
} finally { await server.close(); }
