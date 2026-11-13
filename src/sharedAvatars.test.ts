import { describe, expect, it } from 'vitest';
import { mergeSharedAvatars, sharedAvatarPayload, validSharedAvatar } from './useSharedAvatars';
import { buyAvatarOutfit, defaultAvatars } from './avatars';
import { createInitialState } from './data';
import { profileBackup, restoreProfile } from './CloudBackup';
import { validateState } from './domain';

describe('independent shared avatars', () => {
  it('does not upload an implicit default and marks only a saved current profile edit', () => {
    const state = createInitialState();
    expect(sharedAvatarPayload(state)).toBeNull();
    const edited = buyAvatarOutfit(state, { hair: 'long' });
    expect(sharedAvatarPayload(edited)).toMatchObject({ person: 'original', avatar: { hair: 'long' }, changedAt: edited.avatarChangedAt!.original, xp: 0 });
    expect(edited.avatarChangedAt!.original).toBeGreaterThan(0);
    expect(validateState(edited)).toBe(true);
    expect(validateState({ ...edited, avatarChangedAt: { fake: 1 } })).toBe(false);
    const legacy = { ...edited, avatarChangedAt: undefined };
    expect(sharedAvatarPayload(legacy)?.changedAt).toBe(0);
  });
  it('uses the latest direct appearance instead of an old whole-backup avatar', () => {
    const old = { person: 'sheet' as const, avatar: defaultAvatars.sheet, xp: 0, updatedAt: '2026-11-12T12:00:00Z' };
    const current = { ...old, changedAt: 1, xp: 800, avatar: { ...old.avatar, hair: 'long' as const }, updatedAt: '2026-11-13T12:00:00Z' };
    expect(mergeSharedAvatars([old], [current])).toEqual([current]);
    const delayedBackup = mergeSharedAvatars([{ ...old, xp: 900, updatedAt: '2026-11-14T12:00:00Z' }], [current])[0];
    expect(delayedBackup.avatar).toEqual(current.avatar);
    expect(delayedBackup.xp).toBe(900);
    expect(validSharedAvatar(current)).toBe(true);
    expect(validSharedAvatar({ ...current, changedAt: -1 })).toBe(false);
  });
  it('backs up edit timestamps per profile and restores them without replacing the other person', () => {
    const state = buyAvatarOutfit(createInitialState(), { hair: 'long' });
    state.avatarChangedAt!.sheet = 10;
    const payload = profileBackup(state);
    expect(Object.keys(JSON.parse(payload).data.avatarChangedAt)).toEqual(['original']);
    const local = createInitialState(); local.avatarChangedAt = { sheet: 20 };
    expect(restoreProfile(local, payload).avatarChangedAt).toEqual({ original: state.avatarChangedAt!.original, sheet: 20 });
  });
});
