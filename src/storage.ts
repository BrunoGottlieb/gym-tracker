import Dexie, { type Table } from 'dexie';
import { createInitialState } from './data';
import { validateState } from './domain';
import type { AppState } from './types';
import { migrateState } from './migrations';
import { APP_DATABASE_NAME, REAL_DATABASE_NAME, SANDBOX_DATABASE_NAME } from './appSandbox';

export class TrackerDatabase extends Dexie {
  state!: Table<{ id: string; value: AppState }, string>;
  sync!: Table<{ id: string; value: unknown }, string>;
  constructor(name = 'gym-tracker') {
    super(name);
    this.version(1).stores({ state: 'id' });
    this.version(2).stores({ state: 'id', sync: 'id' });
  }
}
export const database = new TrackerDatabase(APP_DATABASE_NAME);

/** Read the existing real DB without creating, upgrading or migrating it. */
export async function readRealSandboxSeed(factory: IDBFactory = indexedDB): Promise<AppState> {
  const stored = await new Promise<unknown>((resolve, reject) => {
    const request = factory.open(REAL_DATABASE_NAME);
    request.onupgradeneeded = () => { request.transaction?.abort(); };
    request.onerror = () => { if (request.error?.name === 'AbortError') resolve(null); else reject(request.error); };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('state')) { db.close(); resolve(null); return; }
      const tx = db.transaction('state', 'readonly');
      const row = tx.objectStore('state').get('main');
      row.onsuccess = () => resolve(row.result?.value ?? null);
      row.onerror = () => reject(row.error);
      tx.oncomplete = tx.onabort = () => db.close();
    };
  });
  if (stored === null) return createInitialState();
  if (!validateState(stored)) throw new Error('Não foi possível copiar os dados reais para o sandbox. Os dados originais foram preservados.');
  return migrateState(structuredClone(stored));
}

export async function resetSandboxState(db = database): Promise<AppState> {
  if (db.name !== SANDBOX_DATABASE_NAME) throw new Error('Reiniciar testes exige o banco separado do sandbox.');
  const seed = await readRealSandboxSeed();
  await db.transaction('rw', db.state, db.sync, async () => {
    await db.state.put({ id: 'main', value: seed });
    await db.sync.clear();
  });
  return seed;
}
export async function loadState(db = database): Promise<AppState> {
  const record = await db.state.get('main');
  if (!record) return db.name === SANDBOX_DATABASE_NAME ? resetSandboxState(db) : createInitialState();
  if (!validateState(record.value)) throw new Error('Os dados salvos não puderam ser lidos. Restaure um backup para continuar.');
  const migrated = migrateState(record.value);
  if (JSON.stringify(migrated) !== JSON.stringify(record.value)) await saveState(migrated, db);
  return migrated;
}
export async function saveState(state: AppState, db = database): Promise<void> {
  await db.state.put({ id: 'main', value: state });
}
