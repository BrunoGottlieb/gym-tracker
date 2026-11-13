import { describe, expect, it } from 'vitest';
import { AVATAR_SANDBOX_KEY, authorizeLocalAvatarSandbox, canUseAvatarSandbox, changeSandboxAura, changeSandboxAvatar, readAvatarSandbox, saveAvatarSandbox } from './avatarSandbox';
import { avatarEquipment, defaultAvatars, profileAvatar, type EquipmentSlot } from './avatars';
import { createInitialState } from './data';
import { profileBackup } from './CloudBackup';
import { auraRewards, equippedAura } from './gamification';

function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
describe('device-local avatar sandbox', () => {
  it('previews every celebration glow locally without modifying level locks or backups, and keeps profiles separate', () => {
    const state = createInitialState(), local = storage();
    const backup = JSON.stringify(JSON.parse(profileBackup(state)).data);
    let sandbox = authorizeLocalAvatarSandbox(local);
    for (const reward of auraRewards) {
      sandbox = changeSandboxAura(sandbox, 'original', reward.id);
      expect(sandbox.auras?.original).toBe(reward.id);
      expect(equippedAura(state).id).toBe('blue');
    }
    sandbox = changeSandboxAura(sandbox, 'sheet', 'violet');
    expect(sandbox.auras).toEqual({ original: 'gold', sheet: 'violet' });
    saveAvatarSandbox(local, sandbox); expect(readAvatarSandbox(local)).toEqual(sandbox);
    expect(JSON.stringify(JSON.parse(profileBackup(state)).data)).toBe(backup);
    const off = { ...sandbox, enabled: false };
    expect(changeSandboxAura(off, 'original', 'mint')).toBe(off);
    expect(changeSandboxAura(sandbox, 'original', 'fake' as never)).toBe(sandbox);
  });
  it('stays unavailable without an explicit device grant, including old automatic desktop preferences', () => {
    const local = storage(), otherPhone = storage();
    expect(readAvatarSandbox(local).enabled).toBe(false);
    saveAvatarSandbox(local, { enabled: true, avatars: { original: defaultAvatars.original } });
    expect(readAvatarSandbox(local).enabled).toBe(false);
    expect(canUseAvatarSandbox(local)).toBe(false);
    expect(authorizeLocalAvatarSandbox(local).enabled).toBe(true);
    expect(canUseAvatarSandbox(local)).toBe(true);
    expect(readAvatarSandbox(otherPhone).enabled).toBe(false);
    expect(canUseAvatarSandbox(otherPhone)).toBe(false);
    saveAvatarSandbox(local, { enabled: false, avatars: {} });
    expect(readAvatarSandbox(local).enabled).toBe(false);
    local.setItem(AVATAR_SANDBOX_KEY, '{broken');
    expect(readAvatarSandbox(local)).toEqual({ enabled: false, avatars: {} });
  });
  it('previews every item at level one without changing the real avatar, XP, training or backup', () => {
    const state = createInitialState();
    const before = JSON.stringify(JSON.parse(profileBackup(state)).data);
    const real = profileAvatar(state);
    for (const slot of Object.keys(avatarEquipment) as EquipmentSlot[]) for (const item of avatarEquipment[slot]) {
      const sandbox = changeSandboxAvatar({ enabled: true, avatars: {} }, 'original', real, { [slot]: item.id });
      expect(sandbox.avatars.original?.[slot]).toBe(item.id);
    }
    expect(profileAvatar(state)).toEqual(defaultAvatars.original);
    expect(JSON.stringify(JSON.parse(profileBackup(state)).data)).toBe(before);
    expect(state.avatars).toBeUndefined();
  });
  it('retains independent local looks per profile and never accepts a foreign owner in a patch', () => {
    const original = { enabled: true, avatars: {} };
    const bruno = changeSandboxAvatar(original, 'original', defaultAvatars.original, { head: 'crown', shirt: 'leather-jacket' });
    const nick = changeSandboxAvatar(bruno, 'sheet', defaultAvatars.sheet, { face: 'star-glasses' });
    expect(nick.avatars.original).toEqual(bruno.avatars.original);
    expect(nick.avatars.sheet?.face).toBe('star-glasses');
    expect(changeSandboxAvatar(nick, 'original', defaultAvatars.original, { person: 'sheet' } as never)).toBe(nick);
    expect(changeSandboxAvatar(nick, 'original', defaultAvatars.original, { head: 'fake' } as never)).toBe(nick);
    const off = { ...nick, enabled: false };
    expect(changeSandboxAvatar(off, 'original', defaultAvatars.original, { head: 'crown' })).toBe(off);
    const local = storage(); authorizeLocalAvatarSandbox(local); saveAvatarSandbox(local, nick);
    expect(readAvatarSandbox(local)).toEqual(nick);
  });
});
