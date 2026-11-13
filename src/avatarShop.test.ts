import { describe, expect, it } from 'vitest';
import { avatarEquipment, avatarWallet, buyAvatarOutfit, defaultAvatars, outfitCart, ownsEquipment, profileAvatar, walletBalance } from './avatars';
import { createInitialState } from './data';
import { addSessionSet, beginWorkout, createBackup, editHistorySession, finishSession, parseBackup, validateState } from './domain';
import { profileBackup, restoreProfile, canReplaceEmptyCloudSeed } from './CloudBackup';
import { personalXP, sessionXP, workoutResult, XP_FRESH_START } from './gamification';
import { migrateState } from './migrations';
import type { AppState } from './types';

const now = XP_FRESH_START + 100000;
function finish(state = createInitialState(), sets = 3) {
  let next = beginWorkout(state, state.workouts[0], undefined, now);
  if (sets > 3) next = addSessionSet(next, next.active!.exercises[0].exerciseId);
  next.active!.exercises[0].done.fill(true);
  return { before: next, after: finishSession(next, now + 60000) };
}
function funded() {
  const state = createInitialState();
  state.avatarWallets!.original = { awards: { earned: 500 }, purchases: {}, gifts: [] };
  return state;
}
describe('avatar coin shop', () => {
  it('awards coins only on finishing, includes extra-set XP, and never spends level XP', () => {
    const { before, after } = finish(undefined, 4);
    expect(walletBalance(avatarWallet(before))).toBe(0);
    expect(sessionXP(after.history[0]).xp).toBe(95);
    expect(walletBalance(avatarWallet(after))).toBe(9);
    expect(workoutResult(before, after, after.history[0]).coins).toBe(9);
    const paid = buyAvatarOutfit(after, { head: 'headband' });
    expect(walletBalance(avatarWallet(paid))).toBe(4);
    expect(personalXP(paid.history, 'original')).toBe(95);
    expect(finishSession(after)).toBe(after);
    const replay = finishSession({ ...after, active: before.active }, now + 60000);
    expect(walletBalance(avatarWallet(replay))).toBe(9);
  });
  it('purchases the full outfit atomically at level one and charges only newly owned items', () => {
    const initial = funded();
    const outfit = { head: 'headphones' as const, face: 'star-glasses' as const, shirt: 'skull-tee' as const, hair: 'long' as const };
    const cart = outfitCart(avatarWallet(initial), { ...defaultAvatars.original, ...outfit });
    expect(cart.reduce((a, item) => a + item.price, 0)).toBe(305);
    const next = buyAvatarOutfit(initial, outfit);
    expect(walletBalance(avatarWallet(next))).toBe(195);
    expect(profileAvatar(next)).toMatchObject(outfit);
    expect(personalXP(next.history, 'original')).toBe(0);
    expect(walletBalance(avatarWallet(buyAvatarOutfit(next, outfit)))).toBe(195);
    const removed = buyAvatarOutfit(next, { head: 'none', shirt: 'blue' });
    expect(walletBalance(avatarWallet(buyAvatarOutfit(removed, outfit)))).toBe(195);
    expect(initial.avatars).toBeUndefined();
  });
  it('rejects an unaffordable outfit without partially buying or changing free choices', () => {
    const state = finish().after;
    expect(buyAvatarOutfit(state, { hair: 'long', head: 'crown', extra: 'wristbands' })).toBe(state);
    expect(buyAvatarOutfit(state, { hair: 'bogus' } as never)).toBe(state);
    expect(buyAvatarOutfit(state, { person: 'sheet' } as never)).toBe(state);
    expect(buyAvatarOutfit(state, { head: 'headband' })).not.toBe(state);
  });
  it('keeps all hair, colors, skin and starter tops free, with prices capped around ten normal workouts', () => {
    const state = buyAvatarOutfit(createInitialState(), { hair: 'afro', hairColor: 'red', skin: 'deep', shirt: 'mint' });
    expect(walletBalance(avatarWallet(state))).toBe(0);
    expect(profileAvatar(state)).toMatchObject({ hair: 'afro', skin: 'deep', shirt: 'mint' });
    const prices = Object.values(avatarEquipment).flatMap(items => items.map(item => item.price));
    expect(Math.max(...prices)).toBe(260);
    expect(Math.min(...prices.filter(n => n > 0))).toBe(5);
    const complete = beginWorkout(createInitialState(), createInitialState().workouts[0], undefined, now);
    complete.active!.exercises.forEach(e => e.done.fill(true));
    expect(Math.ceil(260 / Math.floor(sessionXP(complete.active!, true).xp / 10))).toBe(10);
  });
  it('does not reclaim spent coins or award more when a historical workout changes or is deleted', () => {
    const { after } = finish();
    const paid = buyAvatarOutfit(after, { head: 'headband' });
    const edited = structuredClone(paid.history[0]); edited.exercises[0].done = [true, false, false];
    const next = editHistorySession(paid, edited);
    expect(walletBalance(avatarWallet(next))).toBe(3);
    expect(walletBalance(avatarWallet({ ...next, history: [] }))).toBe(3);
    expect(profileAvatar({ ...next, history: [] }).head).toBe('headband');
  });
  it('credits each legacy workout once, respects the XP reset, and preserves an already equipped legacy outfit', () => {
    const legacy = funded(); delete legacy.avatarWallets;
    const { after } = finish(legacy);
    const old: AppState = { ...after, avatarWallets: undefined, avatars: { original: { ...defaultAvatars.original, head: 'headband' } } };
    old.history.push({ ...structuredClone(old.history[0]), id: 'old-date', finishedAt: XP_FRESH_START - 1, startedAt: XP_FRESH_START - 60000 });
    const migrated = migrateState(old);
    expect(walletBalance(avatarWallet(migrated))).toBe(8);
    expect(profileAvatar(migrated).head).toBe('headband');
    expect(ownsEquipment(avatarWallet(migrated), 'head', 'headband')).toBe(true);
    expect(migrateState(migrated)).toEqual(migrated);
    expect(walletBalance(avatarWallet(migrateState({ ...migrated, history: [] })))).toBe(8);
  });
  it('keeps each profile wallet isolated and round-trips purchases and earnings through local/cloud backups', () => {
    const initial = funded();
    initial.avatarWallets!.sheet = { awards: { nick: 15 }, purchases: {}, gifts: [] };
    const paid = buyAvatarOutfit(initial, { head: 'crown' });
    expect(paid.avatarWallets!.sheet).toEqual(initial.avatarWallets!.sheet);
    expect(parseBackup(createBackup(paid))).toEqual(paid);
    const payload = profileBackup(paid);
    expect(Object.keys(JSON.parse(payload).data.avatarWallets)).toEqual(['original']);
    const restored = restoreProfile(initial, payload);
    expect(restored.avatarWallets!.original).toEqual(paid.avatarWallets!.original);
    expect(restored.avatarWallets!.sheet).toEqual(initial.avatarWallets!.sheet);
    expect(profileAvatar(restored).head).toBe('crown');
    expect(canReplaceEmptyCloudSeed(payload, profileBackup(initial))).toBe(false);
  });
  it('validates wallets and rejects negative balances or malformed purchases without damaging training data', () => {
    const state = funded();
    for (const wallet of [null, { awards: {}, purchases: {}, gifts: ['head:fake'] }, { awards: { a: -1 }, purchases: {}, gifts: [] }, { awards: { a: 1 }, purchases: { 'head:crown': 260 }, gifts: [] }, { awards: { a: 500 }, purchases: { 'head:fake': 2 }, gifts: [] }]) expect(validateState({ ...state, avatarWallets: { original: wallet } })).toBe(false);
    expect(validateState(buyAvatarOutfit(state, { head: 'crown' }))).toBe(true);
  });
});
