import { describe, expect, it } from 'vitest';
import { AVATAR_SANDBOX_KEY, changeSandboxAvatar, readAvatarSandbox, saveAvatarSandbox } from './avatarSandbox';
import { avatarEquipment, defaultAvatars, profileAvatar, type EquipmentSlot } from './avatars';
import { createInitialState } from './data';
import { profileBackup } from './CloudBackup';

function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
describe('device-local avatar sandbox', () => {
  it('defaults to enabled on a desktop and disabled on a touch device, respecting explicit local choice', () => {
    const local = storage(), otherPhone = storage();
    expect(readAvatarSandbox(local, true).enabled).toBe(true);
    expect(readAvatarSandbox(otherPhone, false).enabled).toBe(false);
    saveAvatarSandbox(local, { enabled: false, avatars: {} });
    expect(readAvatarSandbox(local, true).enabled).toBe(false);
    local.setItem(AVATAR_SANDBOX_KEY, '{broken');
    expect(readAvatarSandbox(local, false)).toEqual({ enabled: false, avatars: {} });
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
    const local = storage(); saveAvatarSandbox(local, nick);
    expect(readAvatarSandbox(local, false)).toEqual(nick);
  });
});
