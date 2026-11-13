import { describe, expect, it } from 'vitest';
import { createInitialState } from './data';
import { beginWorkout, createBackup, finishSession, parseBackup, validateState } from './domain';
import { canReplaceEmptyCloudSeed, profileBackup, restoreProfile } from './CloudBackup';
import { avatarEquipment, defaultAvatars, hairColors, hairstyles, profileAvatar, skinTones, unlockedAvatar, updateAvatar, validAvatar, validTeamProfile, type EquipmentSlot } from './avatars';
import { profileFromBackup, teamMembers } from './useTeamProfiles';
import type { RoutinePlan } from './types';

function withXP(person: RoutinePlan = 'original') {
  const state = createInitialState(); state.selectedPlan = person;
  let next = beginWorkout(state, state.workouts[0]);
  next.active!.exercises.forEach(log => { log.done.fill(true); });
  next = finishSession(next);
  const seed = next.history[0];
  next.history = Array.from({ length: 60 }, (_, i) => ({ ...structuredClone(seed), id: `avatar-test-${i}` }));
  return next;
}
describe('avatar personalization', () => {
  it('unlocks the gold top at 6, skull T-shirt at 9 and hoodie at 12', () => {
    for (const [shirt, level] of [['gold', 6], ['skull-tee', 9], ['hoodie', 12]] as const) {
      const avatar = { ...defaultAvatars.original, shirt };
      expect(unlockedAvatar(avatar, level - 1).shirt).toBe('blue');
      expect(unlockedAvatar(avatar, level).shirt).toBe(shirt);
    }
  });
  it('keeps old data valid and supplies distinct free starter characters', () => {
    const state = createInitialState(); expect(validateState(state)).toBe(true);
    for (const person of ['original', 'sheet', 'ivan'] as const) expect(profileAvatar(state, person)).toEqual(defaultAvatars[person]);
    expect(new Set(Object.values(defaultAvatars).map(a => JSON.stringify(a))).size).toBe(3);
  });
  it('offers all twelve haircuts and every hair/skin color for free at level one', () => {
    const state = createInitialState();
    expect(hairstyles).toHaveLength(12);
    for (const hair of hairstyles) {
      const next = updateAvatar(state, { hair: hair.id });
      expect(next.avatars?.original?.hair).toBe(hair.id); expect(validateState(next)).toBe(true);
    }
    for (const color of hairColors) expect(updateAvatar(state, { hairColor: color.id }).avatars?.original?.hairColor).toBe(color.id);
    for (const skin of skinTones) expect(updateAvatar(state, { skin: skin.id }).avatars?.original?.skin).toBe(skin.id);
    expect(state.avatars).toBeUndefined();
  });
  it('enforces level requirements for every item and leaves other profiles intact', () => {
    const initial = createInitialState(), advanced = withXP();
    initial.avatars = { sheet: defaultAvatars.sheet };
    for (const slot of Object.keys(avatarEquipment) as EquipmentSlot[]) for (const item of avatarEquipment[slot]) {
      const next = updateAvatar(initial, { [slot]: item.id });
      if (item.level > 1) expect(next).toBe(initial);
      else expect(next.avatars?.original?.[slot]).toBe(item.id);
      expect(updateAvatar(advanced, { [slot]: item.id }).avatars?.original?.[slot]).toBe(item.id);
    }
    expect(updateAvatar(initial, { head: 'headband' }).avatars?.sheet).toEqual(defaultAvatars.sheet);
  });
  it('does not display locked items restored without enough XP, while retaining freely chosen hair', () => {
    const avatar = { ...defaultAvatars.original, hair: 'long' as const, head: 'headphones' as const, shirt: 'gold' as const, extra: 'goldbands' as const };
    expect(unlockedAvatar(avatar, 1)).toEqual({ ...avatar, head: 'none', shirt: 'blue', extra: 'none' });
    expect(unlockedAvatar(avatar, 10)).toEqual(avatar);
  });
  it('rejects malformed avatar data without destroying saved training records', () => {
    const state = createInitialState();
    for (const avatars of [null, [], { stranger: defaultAvatars.original }, { original: { ...defaultAvatars.original, hair: 'invalid' } }, { original: {} }]) expect(validateState({ ...state, avatars })).toBe(false);
    expect(validAvatar({ ...defaultAvatars.original, extra: 'fake' })).toBe(false);
    expect(validAvatar({ ...defaultAvatars.original, face: 'fake' })).toBe(false);
    expect(validAvatar({ ...defaultAvatars.original, facialHair: null })).toBe(false);
    expect(updateAvatar(state, { hair: 'fake' } as never)).toBe(state);
  });
  it('keeps legacy avatars valid and independently gates combined accessories at their unlock boundaries', () => {
    expect(validAvatar(defaultAvatars.original)).toBe(true);
    const avatar = { ...defaultAvatars.original, face: 'monocle' as const, facialHair: 'handlebar' as const, head: 'top-hat' as const, shirt: 'leather-jacket' as const, extra: 'watch' as const };
    expect(unlockedAvatar(avatar, 11)).toMatchObject({ face: 'none', facialHair: 'none', head: 'none', shirt: 'blue', extra: 'watch' });
    expect(unlockedAvatar(avatar, 12)).toMatchObject({ facialHair: 'handlebar', face: 'none' });
    expect(unlockedAvatar(avatar, 16)).toMatchObject({ head: 'top-hat', face: 'none' });
    expect(unlockedAvatar(avatar, 17)).toMatchObject({ face: 'monocle', shirt: 'blue' });
    expect(unlockedAvatar(avatar, 18)).toEqual(avatar);
    expect(unlockedAvatar({ ...avatar, head: 'crown' }, 23).head).toBe('none');
    expect(unlockedAvatar({ ...avatar, head: 'crown' }, 24).head).toBe('crown');
  });
  it('round-trips appearance and XP through backups and restores only the selected avatar', () => {
    const remote = updateAvatar(withXP(), { hair: 'ponytail', hairColor: 'silver', head: 'headphones', face: 'star-glasses', facialHair: 'moustache', shirt: 'skull-tee', extra: 'watch' });
    remote.avatars!.sheet = { ...defaultAvatars.sheet, hair: 'bun' };
    const full = parseBackup(createBackup(remote)); expect(full.avatars).toEqual(remote.avatars);
    const cloud = profileBackup(remote); expect(JSON.parse(cloud).data.avatars).toEqual({ original: remote.avatars?.original });
    const local = createInitialState(); local.avatars = { sheet: { ...defaultAvatars.sheet, hair: 'afro' } };
    const restored = restoreProfile(local, cloud);
    expect(restored.avatars?.original).toEqual(remote.avatars?.original);
    expect(restored.avatars?.sheet?.hair).toBe('afro'); expect(validateState(restored)).toBe(true);
    expect(profileAvatar(restored).head).toBe('headphones');
  });
  it('protects an empty cloud history with a customized avatar from automatic seed replacement', () => {
    const seed = createInitialState(), custom = updateAvatar(seed, { hair: 'bun' });
    const training = withXP();
    expect(canReplaceEmptyCloudSeed(profileBackup(seed), profileBackup(custom))).toBe(true);
    expect(canReplaceEmptyCloudSeed(profileBackup(custom), profileBackup(training))).toBe(false);
  });
});
describe('shared team profiles', () => {
  it('derives actual teammate XP from their own cloud backup and validates the requested person', () => {
    const nick = updateAvatar(withXP('sheet'), { head: 'cap', hair: 'afro' });
    const payload = profileBackup(nick);
    const profile = profileFromBackup(payload, 'sheet', '2026-11-13T12:00:00Z');
    expect(profile.person).toBe('sheet'); expect(profile.xp).toBeGreaterThan(500);
    expect(profile.avatar).toMatchObject({ hair: 'afro', head: 'cap' });
    expect(validTeamProfile(profile)).toBe(true);
    expect(() => profileFromBackup(payload, 'original')).toThrow('Perfil diferente');
  });
  it('keeps the current user local, displays remote teammates and distinguishes unknown levels', () => {
    const local = updateAvatar(createInitialState(), { hair: 'long' });
    const remoteBruno = { person: 'original' as const, xp: 5000, avatar: defaultAvatars.original };
    const remoteNick = { person: 'sheet' as const, xp: 800, avatar: defaultAvatars.sheet };
    const members = teamMembers(local, [remoteBruno, remoteNick]);
    expect(members[0]).toMatchObject({ xp: 0, current: true, avatar: { hair: 'long' } });
    expect(members[1]).toMatchObject({ xp: 800, current: false, known: true });
    expect(members[2].known).toBe(false);
    expect(validTeamProfile({ ...remoteNick, xp: -1 })).toBe(false);
    expect(validTeamProfile({ ...remoteNick, person: 'unknown' })).toBe(false);
    expect(validTeamProfile({ ...remoteNick, updatedAt: 'bad' })).toBe(false);
  });
});
