import { AVATAR_SANDBOX_DEVICE_KEY, AVATAR_SANDBOX_LOCAL_HASH } from './avatarSandbox';

export const REAL_DATABASE_NAME = 'gym-tracker';
export const SANDBOX_DATABASE_NAME = 'gym-tracker-sandbox';
export function usesAppSandbox(storage: Pick<Storage, 'getItem'>, hash = '') {
  try { return storage.getItem(AVATAR_SANDBOX_DEVICE_KEY) === '1' || hash === AVATAR_SANDBOX_LOCAL_HASH; }
  catch { return hash === AVATAR_SANDBOX_LOCAL_HASH; }
}
// Freeze the storage/network boundary for this page lifetime. Activating the
// private device marker on an already open real page requires a full reload.
export const APP_SANDBOX = (() => {
  if (typeof window === 'undefined') return false;
  try { return usesAppSandbox(window.localStorage, window.location.hash); }
  catch { return window.location.hash === AVATAR_SANDBOX_LOCAL_HASH; }
})();
export const APP_DATABASE_NAME = APP_SANDBOX ? SANDBOX_DATABASE_NAME : REAL_DATABASE_NAME;

export function cloudFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (APP_SANDBOX) return Promise.reject(new Error('Sandbox: nenhuma conexão com a nuvem.'));
  return fetch(input, init);
}
