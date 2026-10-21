import Dexie, { type Table } from 'dexie';
import { createInitialState } from './data';
import { validateState } from './domain';
import type { AppState } from './types';
import { migrateState } from './migrations';

export class TrackerDatabase extends Dexie {
  state!: Table<{ id: string; value: AppState }, string>;
  constructor(name = 'gym-tracker') {
    super(name);
    this.version(1).stores({ state: 'id' });
  }
}
export const database = new TrackerDatabase();
export async function loadState(db = database): Promise<AppState> {
  const record = await db.state.get('main');
  if (!record) return createInitialState();
  if (!validateState(record.value)) throw new Error('Os dados salvos não puderam ser lidos. Restaure um backup para continuar.');
  const migrated = migrateState(record.value);
  if (JSON.stringify(migrated) !== JSON.stringify(record.value)) await saveState(migrated, db);
  return migrated;
}
export async function saveState(state: AppState, db = database): Promise<void> {
  await db.state.put({ id: 'main', value: state });
}
