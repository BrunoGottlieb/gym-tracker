import { levelProgress, personalXP } from './gamification';
import type { AppState, RoutinePlan } from './types';

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
    { id: 'none', name: 'Sem acessório', level: 1, color: '#DCE3F4' },
    { id: 'headband', name: 'Faixa esportiva', level: 1, color: '#FF947D' },
    { id: 'visor', name: 'Viseira menta', level: 3, color: '#80DDBB' },
    { id: 'cap', name: 'Boné azul', level: 5, color: '#6085F5' },
    { id: 'headphones', name: 'Fones dourados', level: 10, color: '#F6C65F' },
    { id: 'top-hat', name: 'Cartola', level: 16, color: '#413252' },
    { id: 'crown', name: 'Coroa dourada', level: 24, color: '#EAC36A' },
  ],
  face: [
    { id: 'none', name: 'Sem acessório no rosto', level: 1, color: '#DCE3F4' },
    { id: 'sunglasses', name: 'Óculos escuros', level: 6, color: '#303747' },
    { id: 'eyepatch', name: 'Tapa-olho', level: 8, color: '#303747' },
    { id: 'star-glasses', name: 'Óculos de estrela', level: 14, color: '#F6C65F' },
    { id: 'monocle', name: 'Monóculo dourado', level: 17, color: '#EAC36A' },
  ],
  facialHair: [
    { id: 'none', name: 'Sem bigode', level: 1, color: '#DCE3F4' },
    { id: 'moustache', name: 'Bigode clássico', level: 4, color: '#4A3029' },
    { id: 'handlebar', name: 'Bigode de respeito', level: 12, color: '#4A3029' },
  ],
  shirt: [
    { id: 'blue', name: 'Regata azul', level: 1, color: '#5277EC' },
    { id: 'coral', name: 'Regata coral', level: 1, color: '#F5907D' },
    { id: 'mint', name: 'Regata menta', level: 1, color: '#7DCEB7' },
    { id: 'violet', name: 'Regata lavanda', level: 5, color: '#B6A0EA' },
    { id: 'gold', name: 'Regata dourada', level: 10, color: '#EAC36A' },
    { id: 'hoodie', name: 'Moletom lavanda', level: 9, color: '#A393D4' },
    { id: 'skull-tee', name: 'Camiseta de caveira', level: 12, color: '#303747' },
    { id: 'leather-jacket', name: 'Jaqueta de couro', level: 18, color: '#303747' },
  ],
  extra: [
    { id: 'none', name: 'Sem extra', level: 1, color: '#DCE3F4' },
    { id: 'wristbands', name: 'Munhequeiras menta', level: 2, color: '#80DDBB' },
    { id: 'goldbands', name: 'Munhequeiras douradas', level: 7, color: '#F6C65F' },
    { id: 'medal', name: 'Medalha de campeão', level: 6, color: '#EAC36A' },
    { id: 'watch', name: 'Relógio esportivo', level: 11, color: '#5377DC' },
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
  const level = levelProgress(personalXP(state.history, person)).level;
  return unlockedAvatar(state.avatars?.[person] ?? defaultAvatars[person], level);
}
export function updateAvatar(state: AppState, patch: Partial<AvatarConfig>): AppState {
  const person = state.selectedPlan ?? 'original';
  if (Object.keys(patch).some(key => !Object.hasOwn(defaultAvatars.original, key) && !Object.hasOwn(avatarEquipment, key))) return state;
  const avatar = { ...profileAvatar(state, person), ...patch };
  if (!validAvatar(avatar)) return state;
  const level = levelProgress(personalXP(state.history, person)).level;
  if (JSON.stringify(unlockedAvatar(avatar, level)) !== JSON.stringify(avatar)) return state;
  return { ...state, avatars: { ...state.avatars, [person]: avatar } };
}

export interface TeamProfile { person: RoutinePlan; avatar: AvatarConfig; xp: number; updatedAt?: string }
export function validTeamProfile(value: unknown): value is TeamProfile {
  return record(value) && typeof value.person === 'string' && Object.hasOwn(defaultAvatars, value.person) && validAvatar(value.avatar) && typeof value.xp === 'number' && Number.isSafeInteger(value.xp) && value.xp >= 0 && (value.updatedAt === undefined || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))));
}
