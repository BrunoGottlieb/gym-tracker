import { levelProgress, personalXP, sessionXP, xpStartAt } from './gamification';
import type { AppState, RoutinePlan, Session } from './types';

export const hairstyles = [
  { id: 'wavy', name: 'Ondulado' }, { id: 'short', name: 'Curto' },
  { id: 'curly', name: 'Cacheado' }, { id: 'quiff', name: 'Topete' },
  { id: 'side-part', name: 'De lado' }, { id: 'buzz', name: 'Raspado' },
  { id: 'afro', name: 'Afro' }, { id: 'bob', name: 'Chanel' },
  { id: 'long', name: 'Comprido' }, { id: 'bun', name: 'Coque' },
  { id: 'ponytail', name: 'Rabo de cavalo' }, { id: 'bald', name: 'Sem cabelo' },
] as const;
export const hairColors = [
  { id: 'brown', name: 'Castanho', color: '#4A3029' }, { id: 'black', name: 'Preto', color: '#24232B' },
  { id: 'chestnut', name: 'Avelã', color: '#805137' }, { id: 'blond', name: 'Loiro', color: '#D9AC5B' },
  { id: 'red', name: 'Ruivo', color: '#B85D36' }, { id: 'silver', name: 'Prateado', color: '#A8ADBF' },
] as const;
export const skinTones = [
  { id: 'peach', name: 'Pele clara', color: '#F6C5A0' }, { id: 'warm', name: 'Pele dourada', color: '#DDA474' },
  { id: 'tan', name: 'Pele bronzeada', color: '#BE8059' }, { id: 'brown', name: 'Pele morena', color: '#9A6144' },
  { id: 'deep', name: 'Pele escura', color: '#714731' }, { id: 'rose', name: 'Pele rosada', color: '#E7B7A6' },
] as const;
export const avatarEquipment = {
  head: [
    { id: 'none', name: 'Sem acessório', level: 1, price: 0, color: '#DCE3F4' },
    { id: 'headband', name: 'Faixa esportiva', level: 1, price: 5, color: '#FF947D' },
    { id: 'visor', name: 'Viseira menta', level: 3, price: 20, color: '#80DDBB' },
    { id: 'cap', name: 'Boné azul', level: 5, price: 30, color: '#6085F5' },
    { id: 'headphones', name: 'Fones dourados', level: 10, price: 100, color: '#F6C65F' },
    { id: 'top-hat', name: 'Cartola', level: 16, price: 160, color: '#413252' },
    { id: 'crown', name: 'Coroa dourada', level: 24, price: 260, color: '#EAC36A' },
    { id: 'bunny-ears', name: 'Orelhas de coelho', level: 8, price: 65, color: '#F5D6DF' },
    { id: 'cowboy-hat', name: 'Chapéu de cowboy', level: 20, price: 200, color: '#B47A47' },
  ],
  face: [
    { id: 'none', name: 'Sem acessório no rosto', level: 1, price: 0, color: '#DCE3F4' },
    { id: 'sunglasses', name: 'Óculos escuros', level: 6, price: 40, color: '#303747' },
    { id: 'eyepatch', name: 'Tapa-olho', level: 8, price: 55, color: '#303747' },
    { id: 'star-glasses', name: 'Óculos de estrela', level: 14, price: 130, color: '#F6C65F' },
    { id: 'monocle', name: 'Monóculo dourado', level: 17, price: 170, color: '#EAC36A' },
    { id: 'scar', name: 'Cicatriz', level: 7, price: 35, color: '#B77E70' },
    { id: 'deal-with-it', name: 'Óculos Turn Down for What', level: 13, price: 110, color: '#303747' },
    { id: 'earrings', name: 'Brincos de argola', level: 5, price: 25, color: '#EAC36A' },
  ],
  facialHair: [
    { id: 'none', name: 'Sem bigode', level: 1, price: 0, color: '#DCE3F4' },
    { id: 'moustache', name: 'Bigode clássico', level: 4, price: 10, color: '#4A3029' },
    { id: 'handlebar', name: 'Bigode de respeito', level: 12, price: 80, color: '#4A3029' },
    { id: 'short-beard', name: 'Barba curta', level: 6, price: 30, color: '#4A3029' },
    { id: 'long-beard', name: 'Barba cheia', level: 15, price: 90, color: '#4A3029' },
  ],
  shirt: [
    { id: 'blue', name: 'Regata azul', level: 1, price: 0, color: '#5277EC' },
    { id: 'coral', name: 'Regata coral', level: 1, price: 0, color: '#F5907D' },
    { id: 'mint', name: 'Regata menta', level: 1, price: 0, color: '#7DCEB7' },
    { id: 'violet', name: 'Regata lavanda', level: 5, price: 25, color: '#B6A0EA' },
    { id: 'gold', name: 'Regata dourada', level: 6, price: 60, color: '#EAC36A' },
    { id: 'hoodie', name: 'Moletom lavanda', level: 12, price: 100, color: '#A393D4' },
    { id: 'skull-tee', name: 'Camiseta de caveira', level: 9, price: 75, color: '#303747' },
    { id: 'leather-jacket', name: 'Jaqueta de couro', level: 18, price: 180, color: '#303747' },
    { id: 'poncho', name: 'Poncho peruano', level: 21, price: 210, color: '#B65B44' },
  ],
  extra: [
    { id: 'none', name: 'Sem extra', level: 1, price: 0, color: '#DCE3F4' },
    { id: 'wristbands', name: 'Munhequeiras menta', level: 2, price: 5, color: '#80DDBB' },
    { id: 'goldbands', name: 'Munhequeiras douradas', level: 7, price: 45, color: '#F6C65F' },
    { id: 'medal', name: 'Medalha de campeão', level: 6, price: 50, color: '#EAC36A' },
    { id: 'watch', name: 'Relógio esportivo', level: 11, price: 85, color: '#5377DC' },
    { id: 'necktie', name: 'Gravata tradicional', level: 8, price: 35, color: '#304467' },
    { id: 'bow-tie', name: 'Gravata borboleta', level: 14, price: 70, color: '#EC796B' },
  ],
} as const;
export type EquipmentSlot = keyof typeof avatarEquipment;
export const MAX_AVATAR_LEVEL = Math.max(...Object.values(avatarEquipment).flatMap(items => items.map(item => item.level)));
export interface AvatarConfig {
  hair: typeof hairstyles[number]['id'];
  hairColor: typeof hairColors[number]['id'];
  skin: typeof skinTones[number]['id'];
  head: typeof avatarEquipment.head[number]['id'];
  face?: typeof avatarEquipment.face[number]['id'];
  facialHair?: typeof avatarEquipment.facialHair[number]['id'];
  shirt: typeof avatarEquipment.shirt[number]['id'];
  extra: typeof avatarEquipment.extra[number]['id'];
}
export const defaultAvatars: Record<RoutinePlan, AvatarConfig> = {
  original: { hair: 'wavy', hairColor: 'brown', skin: 'peach', head: 'none', shirt: 'blue', extra: 'none' },
  sheet: { hair: 'curly', hairColor: 'black', skin: 'brown', head: 'none', shirt: 'coral', extra: 'none' },
  ivan: { hair: 'short', hairColor: 'chestnut', skin: 'warm', head: 'none', shirt: 'mint', extra: 'none' },
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validAvatar(value: unknown): value is AvatarConfig {
  if (!record(value)) return false;
  return hairstyles.some(item => item.id === value.hair) && hairColors.some(item => item.id === value.hairColor) && skinTones.some(item => item.id === value.skin) &&
    (Object.keys(avatarEquipment) as EquipmentSlot[]).every(slot =>
      ((slot === 'face' || slot === 'facialHair') && value[slot] === undefined) || avatarEquipment[slot].some(item => item.id === value[slot]));
}
export function validAvatarProfiles(value: unknown) {
  return value === undefined || (record(value) && Object.entries(value).every(([person, avatar]) => Object.hasOwn(defaultAvatars, person) && validAvatar(avatar)));
}
export function unlockedAvatar(config: AvatarConfig, level: number): AvatarConfig {
  const avatar = { ...config };
  for (const slot of Object.keys(avatarEquipment) as EquipmentSlot[]) {
    const item = avatarEquipment[slot].find(item => item.id === (avatar[slot] ?? 'none'));
    if (!item || item.level > level) Object.assign(avatar, { [slot]: slot === 'shirt' ? 'blue' : 'none' });
  }
  return avatar;
}
export function profileAvatar(state: AppState, person = state.selectedPlan ?? 'original') {
  const avatar = { ...(state.avatars?.[person] ?? defaultAvatars[person]) };
  const wallet = avatarWallet(state, person);
  for (const slot of Object.keys(avatarEquipment) as EquipmentSlot[]) {
    if (!ownsEquipment(wallet, slot, avatar[slot] ?? 'none')) Object.assign(avatar, { [slot]: slot === 'shirt' ? 'blue' : 'none' });
  }
  return avatar;
}
export function updateAvatar(state: AppState, patch: Partial<AvatarConfig>): AppState {
  const person = state.selectedPlan ?? 'original';
  if (Object.keys(patch).some(key => !Object.hasOwn(defaultAvatars.original, key) && !Object.hasOwn(avatarEquipment, key))) return state;
  const avatar = { ...profileAvatar(state, person), ...patch };
  if (!validAvatar(avatar)) return state;
  const wallet = avatarWallet(state, person);
  if ((Object.keys(avatarEquipment) as EquipmentSlot[]).some(slot => !ownsEquipment(wallet, slot, avatar[slot] ?? 'none'))) return state;
  return { ...state, avatars: { ...state.avatars, [person]: avatar } };
}

export interface AvatarWallet {
  // Frozen awards keep history edits/deletions from minting or reclaiming coins.
  awards: Record<string, number>;
  purchases: Record<string, number>;
  gifts: string[];
}
export const COIN_XP = 10;
export const equipmentKey = (slot: EquipmentSlot, id: string) => `${slot}:${id}`;
export const equipmentItem = (slot: EquipmentSlot, id: string) => avatarEquipment[slot].find(item => item.id === id);
export function avatarWallet(state: AppState, person = state.selectedPlan ?? 'original'): AvatarWallet {
  if (state.avatarWallets?.[person]) return state.avatarWallets[person];
  const awards: Record<string, number> = {};
  for (const session of state.history) if ((session.person ?? 'original') === person && session.finishedAt !== undefined && session.finishedAt >= xpStartAt(person) && !Object.hasOwn(awards, session.id)) awards[session.id] = Math.floor(sessionXP(session).xp / COIN_XP);
  // Retain the outfit already legitimately equipped before the coin shop.
  const legacy = unlockedAvatar(state.avatars?.[person] ?? defaultAvatars[person], levelProgress(personalXP(state.history, person)).level);
  const gifts = (Object.keys(avatarEquipment) as EquipmentSlot[]).filter(slot => (equipmentItem(slot, legacy[slot] ?? 'none')?.price ?? 0) > 0).map(slot => equipmentKey(slot, legacy[slot]!));
  return { awards, purchases: {}, gifts };
}
export const walletBalance = (wallet: AvatarWallet) => Object.values(wallet.awards).reduce((a, b) => a + b, 0) - Object.values(wallet.purchases).reduce((a, b) => a + b, 0);
export function ownsEquipment(wallet: AvatarWallet, slot: EquipmentSlot, id: string) {
  const item = equipmentItem(slot, id), key = equipmentKey(slot, id);
  return !!item && (item.price === 0 || Object.hasOwn(wallet.purchases, key) || wallet.gifts.includes(key));
}
export function outfitCart(wallet: AvatarWallet, avatar: AvatarConfig) {
  return (Object.keys(avatarEquipment) as EquipmentSlot[]).flatMap(slot => {
    const item = equipmentItem(slot, avatar[slot] ?? 'none');
    return item && !ownsEquipment(wallet, slot, item.id) ? [{ ...item, slot, key: equipmentKey(slot, item.id) }] : [];
  });
}
export function buyAvatarOutfit(state: AppState, patch: Partial<AvatarConfig>): AppState {
  if (Object.keys(patch).some(key => !Object.hasOwn(defaultAvatars.original, key) && !Object.hasOwn(avatarEquipment, key))) return state;
  const person = state.selectedPlan ?? 'original';
  const avatar = { ...profileAvatar(state), ...patch };
  if (!validAvatar(avatar)) return state;
  const wallet = avatarWallet(state), cart = outfitCart(wallet, avatar);
  if (cart.reduce((sum, item) => sum + item.price, 0) > walletBalance(wallet)) return state;
  const purchases = { ...wallet.purchases, ...Object.fromEntries(cart.map(item => [item.key, item.price])) };
  return { ...state, avatars: { ...state.avatars, [person]: avatar }, avatarWallets: { ...state.avatarWallets, [person]: { ...wallet, purchases } } };
}
export function awardWorkoutCoins(state: AppState, session: Session): AppState['avatarWallets'] {
  const person = session.person ?? 'original', wallet = avatarWallet(state, person);
  const coins = session.finishedAt !== undefined && session.finishedAt >= xpStartAt(person) ? Math.floor(sessionXP(session).xp / COIN_XP) : 0;
  return { ...state.avatarWallets, [person]: { ...wallet, awards: { ...wallet.awards, [session.id]: wallet.awards[session.id] ?? coins } } };
}
export function validAvatarWallets(value: unknown) {
  const amount = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 100000000;
  const knownKey = (key: string) => (Object.keys(avatarEquipment) as EquipmentSlot[]).some(slot => avatarEquipment[slot].some(item => equipmentKey(slot, item.id) === key));
  return value === undefined || (record(value) && Object.entries(value).every(([person, wallet]) => Object.hasOwn(defaultAvatars, person) && record(wallet) && record(wallet.awards) && Object.keys(wallet.awards).length <= 10000 && Object.entries(wallet.awards).every(([id, n]) => id.length > 0 && id.length <= 160 && amount(n)) && record(wallet.purchases) && Object.entries(wallet.purchases).every(([key, n]) => knownKey(key) && amount(n)) && Array.isArray(wallet.gifts) && wallet.gifts.every(key => typeof key === 'string' && knownKey(key)) && new Set(wallet.gifts).size === wallet.gifts.length && walletBalance(wallet as unknown as AvatarWallet) >= 0));
}

export interface TeamProfile { person: RoutinePlan; avatar: AvatarConfig; xp: number; updatedAt?: string }
export function validTeamProfile(value: unknown): value is TeamProfile {
  return record(value) && typeof value.person === 'string' && Object.hasOwn(defaultAvatars, value.person) && validAvatar(value.avatar) && typeof value.xp === 'number' && Number.isSafeInteger(value.xp) && value.xp >= 0 && (value.updatedAt === undefined || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))));
}
