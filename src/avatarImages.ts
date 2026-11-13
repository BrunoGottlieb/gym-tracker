import type { AvatarConfig, EquipmentSlot } from './avatars';

export interface AvatarLayer { id: string; file: string; className: string }
export const avatarAsset = (file: string) => `${import.meta.env.BASE_URL}avatars/layered-v1/${file}.png`;

/** All saved choices use the same registered 1280px canvas. No model renderer is needed. */
export function avatarLayers(avatar: AvatarConfig): AvatarLayer[] {
  const layers: AvatarLayer[] = [];
  const hasBack = ['long', 'bob', 'ponytail'].includes(avatar.hair);
  const hairClass = `hair-tone-${avatar.hairColor}${avatar.head === 'cap' ? ' under-cap' : ''}`;
  if (hasBack) layers.push({ id: 'hair-back', file: `hair-${avatar.hair}`, className: `avatar-hair-back ${hairClass}` });
  layers.push({ id: 'base', file: avatar.skin === 'peach' ? 'base' : `base-${avatar.skin}`, className: 'avatar-base-layer' });
  if (avatar.shirt !== 'blue') layers.push({ id: 'shirt', file: 'shirt-mint', className: `avatar-shirt-layer shirt-tone-${avatar.shirt}` });
  if (avatar.hair !== 'bald') layers.push({ id: 'hair-front', file: `hair-${avatar.hair}`, className: `avatar-hair-front ${hairClass}${hasBack ? ' has-back-layer' : ''}` });
  if (avatar.extra !== 'none') layers.push({ id: 'extra', file: 'wristbands', className: `avatar-extra-layer extra-tone-${avatar.extra}` });
  if (avatar.head !== 'none') layers.push({ id: 'head', file: avatar.head, className: `avatar-head-layer head-${avatar.head}` });
  return layers;
}

export function equipmentImage(slot: EquipmentSlot, id: string): { file: string; className: string } | null {
  if (id === 'none') return null;
  if (slot === 'shirt') return { file: 'shirt-mint', className: `sample-shirt shirt-tone-${id}` };
  if (slot === 'extra') return { file: 'wristbands', className: `sample-extra extra-tone-${id}` };
  return { file: id, className: `sample-head sample-${id}` };
}
