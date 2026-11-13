import { MAX_AVATAR_LEVEL, defaultAvatars, unlockedAvatar, validAvatar, validAvatarProfiles, type AvatarConfig } from './avatars';
import type { RoutinePlan } from './types';

export const AVATAR_SANDBOX_KEY = 'gym-tracker.avatar-sandbox.v1';
export interface AvatarSandbox { enabled: boolean; avatars: Partial<Record<RoutinePlan, AvatarConfig>> }
type LocalStore = Pick<Storage, 'getItem' | 'setItem'>;

export function readAvatarSandbox(storage: LocalStore, desktop: boolean): AvatarSandbox {
  try {
    const saved = JSON.parse(storage.getItem(AVATAR_SANDBOX_KEY) ?? 'null');
    if (saved && typeof saved.enabled === 'boolean' && saved.avatars && validAvatarProfiles(saved.avatars))
      return { enabled: saved.enabled, avatars: saved.avatars };
  } catch { /* A blocked or malformed local preference must not prevent training. */ }
  return { enabled: desktop, avatars: {} };
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
