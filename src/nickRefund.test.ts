import { describe, expect, it } from 'vitest';
import { avatarWallet, defaultAvatars, walletBalance } from './avatars';
import { createInitialState } from './data';
import { migrateState } from './migrations';
import { createBackup, parseBackup } from './domain';

describe('authorized Nick cowboy refund', () => {
  function purchased(price = 135) {
    const state = createInitialState();
    state.avatars = { ...state.avatars, sheet: { ...defaultAvatars.sheet, head: 'cowboy-hat' } };
    state.avatarChangedAt = { ...state.avatarChangedAt, sheet: 1795226235325 };
    state.avatarWallets!.sheet = { awards: { earned: 500 }, purchases: { 'head:cowboy-hat': price, 'face:scar': 15 }, gifts: [] };
    return state;
  }
  it.each([135, 200])('returns the actual %i coin debit once, preserving all training and other wallets', price => {
    const before = purchased(price), after = migrateState(before);
    expect(walletBalance(avatarWallet(after, 'sheet')) - walletBalance(avatarWallet(before, 'sheet'))).toBe(price);
    expect(after.avatars!.sheet!.head).toBe('none');
    expect(after.avatarWallets!.sheet!.purchases).toEqual({ 'face:scar': 15 });
    expect(after.history).toEqual(before.history);
    expect(after.workouts).toEqual(before.workouts);
    expect(after.avatarWallets!.original).toEqual(before.avatarWallets!.original);
    expect(after.avatarWallets!.ivan).toEqual(before.avatarWallets!.ivan);
    expect(migrateState(after)).toEqual(after);
    expect(parseBackup(createBackup(after))).toEqual(after);
    const rebought = structuredClone(after);
    rebought.avatarWallets!.sheet!.purchases['head:cowboy-hat'] = 135;
    expect(migrateState(rebought)).toEqual(rebought);
  });
  it('leaves later purchases and unrelated profiles untouched', () => {
    const state = purchased();
    state.avatarChangedAt!.sheet = 1795226235327;
    expect(migrateState(state)).toEqual(state);
    const fresh = createInitialState();
    expect(migrateState(fresh)).toEqual(fresh);
  });
});
