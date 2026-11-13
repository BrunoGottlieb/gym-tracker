import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usesAppSandbox, REAL_DATABASE_NAME, SANDBOX_DATABASE_NAME } from './appSandbox';
import { AVATAR_SANDBOX_DEVICE_KEY, AVATAR_SANDBOX_LOCAL_HASH } from './avatarSandbox';
import { readRealSandboxSeed, resetSandboxState, TrackerDatabase } from './storage';
import { createLegacyState } from './data';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('private PC app sandbox', () => {
  it('activates only for the authorized browser or private activation link, independent of the avatar preview toggle', () => {
    const storage = { getItem: (key: string) => key === AVATAR_SANDBOX_DEVICE_KEY ? '1' : null };
    expect(usesAppSandbox(storage)).toBe(true);
    expect(usesAppSandbox({ getItem: () => null })).toBe(false);
    expect(usesAppSandbox({ getItem: () => null }, AVATAR_SANDBOX_LOCAL_HASH)).toBe(true);
    expect(usesAppSandbox({ getItem: () => { throw Error('blocked'); } })).toBe(false);
    expect(usesAppSandbox({ getItem: () => { throw Error('blocked'); } }, AVATAR_SANDBOX_LOCAL_HASH)).toBe(true);
  });
  it('does not create a real database on a new sandbox installation', async () => {
    const factory = new IDBFactory();
    const state = await readRealSandboxSeed(factory);
    expect(state.history).toEqual([]);
    expect(await factory.databases()).toEqual([]);
  });
  it('copies/migrates real data only in memory, without upgrading or changing the source database', async () => {
    const factory = new IDBFactory(), original = createLegacyState();
    delete original.avatarWallets; original.weights['bench-press'] = 42;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = factory.open(REAL_DATABASE_NAME, 1);
      q.onupgradeneeded = () => q.result.createObjectStore('state', { keyPath: 'id' });
      q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error);
    });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put({ id: 'main', value: original }); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    const copied = await readRealSandboxSeed(factory);
    expect(copied.avatarWallets).toBeDefined(); expect(copied.weights['bench-press']).toBe(42);
    copied.weights['bench-press'] = 999;
    const stored = await new Promise<{ value: unknown }>(resolve => { const q = db.transaction('state', 'readonly').objectStore('state').get('main'); q.onsuccess = () => resolve(q.result); });
    expect(stored.value).toEqual(original); expect(db.version).toBe(1); db.close();
  });
  it('refuses to reset a real database', async () => {
    const db = new TrackerDatabase(REAL_DATABASE_NAME);
    await expect(resetSandboxState(db)).rejects.toThrow('banco separado');
    db.close();
  });
  it('selects a separate database and rejects every cloud request before calling fetch', async () => {
    vi.resetModules();
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('window', { localStorage: { getItem: () => '1' }, location: { hash: '' } });
    const runtime = await import('./appSandbox');
    expect(runtime.APP_SANDBOX).toBe(true); expect(runtime.APP_DATABASE_NAME).toBe(SANDBOX_DATABASE_NAME);
    for (const method of ['GET', 'POST']) await expect(runtime.cloudFetch('https://example.com/api/backups', { method })).rejects.toThrow('nenhuma conexão');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
