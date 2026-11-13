import { useEffect, useState } from 'react';
import { AVATAR_SANDBOX_DEVICE_KEY, AVATAR_SANDBOX_KEY, AVATAR_SANDBOX_LOCAL_HASH, authorizeLocalAvatarSandbox, canUseAvatarSandbox, changeSandboxAura, changeSandboxAvatar, readAvatarSandbox, saveAvatarSandbox, type AvatarSandbox } from './avatarSandbox';
import { profileAvatar, type AvatarConfig } from './avatars';
import type { AppState } from './types';
import { auraRewards, type RewardAura } from './gamification';

export function useAvatarSandbox(state: AppState | null) {
  const [available, setAvailable] = useState(() => { try { return canUseAvatarSandbox(window.localStorage); } catch { return false; } });
  const [sandbox, setSandbox] = useState<AvatarSandbox>(() => {
    try { return readAvatarSandbox(window.localStorage); } catch { return { enabled: false, avatars: {} }; }
  });
  useEffect(() => { try { saveAvatarSandbox(window.localStorage, sandbox); } catch { /* Optional local storage. */ } }, [sandbox]);
  useEffect(() => {
    const activate = () => {
      if (window.location.hash !== AVATAR_SANDBOX_LOCAL_HASH) return;
      try {
        const next = authorizeLocalAvatarSandbox(window.localStorage);
        setAvailable(canUseAvatarSandbox(window.localStorage)); setSandbox(next);
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      } catch { /* A blocked local preference must not affect training. */ }
    };
    const sync = (event: StorageEvent) => {
      if ((event.key === AVATAR_SANDBOX_KEY || event.key === AVATAR_SANDBOX_DEVICE_KEY) && event.storageArea === localStorage) {
        setAvailable(canUseAvatarSandbox(localStorage)); setSandbox(readAvatarSandbox(localStorage));
      }
    };
    activate(); window.addEventListener('hashchange', activate);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('hashchange', activate); };
  }, []);
  const person = state?.selectedPlan ?? 'original';
  const realAvatar = state ? profileAvatar(state) : null;
  return {
    available,
    enabled: sandbox.enabled,
    avatar: sandbox.enabled ? sandbox.avatars[person] ?? realAvatar : realAvatar,
    aura: sandbox.enabled ? auraRewards.find(reward => reward.id === sandbox.auras?.[person]) : undefined,
    changeAura: (aura: RewardAura) => setSandbox(previous => changeSandboxAura(previous, person, aura)),
    toggle: (enabled: boolean) => { if (available) setSandbox(previous => ({ ...previous, enabled })); },
    change: (patch: Partial<AvatarConfig>) => { if (realAvatar) setSandbox(previous => changeSandboxAvatar(previous, person, realAvatar, patch)); },
    reset: () => setSandbox(previous => {
      const avatars = { ...previous.avatars }; delete avatars[person]; return { ...previous, avatars };
    }),
  };
}
