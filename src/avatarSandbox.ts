import { MAX_AVATAR_LEVEL, defaultAvatars, unlockedAvatar, validAvatar, validAvatarProfiles, type AvatarConfig } from './avatars';
import type { RoutinePlan } from './types';

export const AVATAR_SANDBOX_KEY = 'gym-tracker.avatar-sandbox.v1';
export const AVATAR_SANDBOX_DEVICE_KEY = 'gym-tracker.avatar-sandbox.private-device.v1';
// Developer-only local activation. There is no link to it in the public UI.
export const AVATAR_SANDBOX_LOCAL_HASH = '#avatar-sandbox-local';
export interface AvatarSandbox { enabled: boolean; avatars: Partial<Record<RoutinePlan, AvatarConfig>> }
type LocalStore = Pick<Storage, 'getItem' | 'setItem'>;

export function canUseAvatarSandbox(storage: LocalStore): boolean {
  try { return storage.getItem(AVATAR_SANDBOX_DEVICE_KEY) === '1'; } catch { return false; }
}
export function readAvatarSandbox(storage: LocalStore): AvatarSandbox {
  try {
    const saved = JSON.parse(storage.getItem(AVATAR_SANDBOX_KEY) ?? 'null');
    if (saved && typeof saved.enabled === 'boolean' && saved.avatars && validAvatarProfiles(saved.avatars))
      return { enabled: canUseAvatarSandbox(storage) && saved.enabled, avatars: saved.avatars };
  } catch { /* A blocked or malformed local preference must not prevent training. */ }
  return { enabled: false, avatars: {} };
}
export function authorizeLocalAvatarSandbox(storage: LocalStore): AvatarSandbox {
  try {
    storage.setItem(AVATAR_SANDBOX_DEVICE_KEY, '1');
    const sandbox = { ...readAvatarSandbox(storage), enabled: true };
    saveAvatarSandbox(storage, sandbox);
    return sandbox;
  } catch { return { enabled: false, avatars: {} }; }
}
export function saveAvatarSandbox(storage: LocalStore, sandbox: AvatarSandbox) {
  try { storage.setItem(AVATAR_SANDBOX_KEY, JSON.stringify(sandbox)); } catch { /* Preview still works for this visit. */ }
}
export function changeSandboxAvatar(sandbox: AvatarSandbox, person: RoutinePlan, fallback: AvatarConfig, patch: Partial<AvatarConfig>): AvatarSandbox {
  const allowed = [...Object.keys(defaultAvatars.original), 'face', 'facialHair'];
  if (!sandbox.enabled || Object.keys(patch).some(key => !allowed.includes(key))) return sandbox;
  const avatar = { ...(sandbox.avatars[person] ?? fallback), ...patch };
  if (!validAvatar(avatar)) return sandbox;
  return { ...sandbox, avatars: { ...sandbox.avatars, [person]: unlockedAvatar(avatar, MAX_AVATAR_LEVEL) } };
}
