import { useEffect, useState } from 'react';
import { AVATAR_SANDBOX_KEY, changeSandboxAvatar, readAvatarSandbox, saveAvatarSandbox, type AvatarSandbox } from './avatarSandbox';
import { profileAvatar, type AvatarConfig } from './avatars';
import type { AppState } from './types';

export function useAvatarSandbox(state: AppState | null) {
  const [sandbox, setSandbox] = useState<AvatarSandbox>(() => {
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    try { return readAvatarSandbox(window.localStorage, desktop); } catch { return { enabled: desktop, avatars: {} }; }
  });
  useEffect(() => { try { saveAvatarSandbox(window.localStorage, sandbox); } catch { /* Optional local storage. */ } }, [sandbox]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === AVATAR_SANDBOX_KEY && event.storageArea === localStorage) setSandbox(readAvatarSandbox(localStorage, false));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const person = state?.selectedPlan ?? 'original';
  const realAvatar = state ? profileAvatar(state) : null;
  return {
    enabled: sandbox.enabled,
    avatar: sandbox.enabled ? sandbox.avatars[person] ?? realAvatar : realAvatar,
    toggle: (enabled: boolean) => setSandbox(previous => ({ ...previous, enabled })),
    change: (patch: Partial<AvatarConfig>) => { if (realAvatar) setSandbox(previous => changeSandboxAvatar(previous, person, realAvatar, patch)); },
    reset: () => setSandbox(previous => {
      const avatars = { ...previous.avatars }; delete avatars[person]; return { ...previous, avatars };
    }),
  };
}
