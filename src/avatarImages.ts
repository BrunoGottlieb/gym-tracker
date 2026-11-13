import type { AvatarConfig, EquipmentSlot } from './avatars';

export interface AvatarLayer { id: string; file: string; className: string }
export const avatarAsset = (file: string) => `${import.meta.env.BASE_URL}avatars/layered-v1/${file}.png`;

// Frame the actual piece independently of card dimensions and the full-figure padding.
const equipmentFrames: Record<string, [number, number, number, number]> = {
  headband: [437, 255, 396, 171], visor: [422, 240, 421, 184], cap: [420, 141, 437, 269],
  headphones: [373, 128, 510, 390], 'top-hat': [399, 51, 465, 353], crown: [403, 117, 444, 288],
  sunglasses: [512, 370, 384, 148], 'star-glasses': [501, 323, 336, 175],
  eyepatch: [476, 333, 361, 178], monocle: [789, 387, 146, 244],
  moustache: [605, 384, 151, 74], handlebar: [566, 390, 215, 88],
  'shirt-mint': [477, 510, 318, 314], hoodie: [345, 474, 556, 392],
  'skull-tee': [372, 508, 511, 342], 'leather-jacket': [345, 497, 566, 353],
  wristbands: [399, 687, 463, 129], watch: [746, 733, 146, 177], medal: [542, 546, 215, 260],
};
export const equipmentViewBox = (file: string) => equipmentFrames[file]?.join(' ') ?? '0 0 1254 1254';

const clothing = new Set(['hoodie', 'skull-tee', 'leather-jacket']);
const wristbands = new Set(['wristbands', 'goldbands']);

/** All saved choices share one registered square canvas. No model renderer is needed. */
export function avatarLayers(avatar: AvatarConfig): AvatarLayer[] {
  const layers: AvatarLayer[] = [];
  const hasBack = ['long', 'bob', 'ponytail'].includes(avatar.hair);
  const hairClass = `hair-tone-${avatar.hairColor}${['cap', 'top-hat', 'crown'].includes(avatar.head) ? ' under-cap' : ''}`;
  if (hasBack) layers.push({ id: 'hair-back', file: `hair-${avatar.hair}`, className: `avatar-hair-back ${hairClass}` });
  layers.push({ id: 'base', file: avatar.skin === 'peach' ? 'base' : `base-${avatar.skin}`, className: 'avatar-base-layer' });
  if (avatar.shirt !== 'blue') layers.push({ id: 'shirt', file: clothing.has(avatar.shirt) ? avatar.shirt : 'shirt-mint', className: `avatar-shirt-layer shirt-tone-${avatar.shirt}` });
  if (avatar.hair !== 'bald') layers.push({ id: 'hair-front', file: `hair-${avatar.hair}`, className: `avatar-hair-front ${hairClass}${hasBack ? ' has-back-layer' : ''}` });
  if (avatar.extra !== 'none') layers.push({ id: 'extra', file: wristbands.has(avatar.extra) ? 'wristbands' : avatar.extra, className: `avatar-extra-layer extra-tone-${avatar.extra}` });
  if (avatar.facialHair && avatar.facialHair !== 'none') layers.push({ id: 'facialHair', file: avatar.facialHair, className: `avatar-facial-hair-layer hair-tone-${avatar.hairColor}` });
  if (avatar.face && avatar.face !== 'none') layers.push({ id: 'face', file: avatar.face, className: `avatar-face-layer face-${avatar.face}` });
  if (avatar.head !== 'none') layers.push({ id: 'head', file: avatar.head, className: `avatar-head-layer head-${avatar.head}` });
  return layers;
}

export function equipmentImage(slot: EquipmentSlot, id: string): { file: string; className: string } | null {
  if (id === 'none') return null;
  if (slot === 'shirt') return { file: clothing.has(id) ? id : 'shirt-mint', className: `sample-shirt sample-${id} shirt-tone-${id}` };
  if (slot === 'extra') return { file: wristbands.has(id) ? 'wristbands' : id, className: `sample-extra sample-${id} extra-tone-${id}` };
  if (slot === 'face') return { file: id, className: `sample-face sample-${id}` };
  if (slot === 'facialHair') return { file: id, className: 'sample-moustache' };
  return { file: id, className: `sample-head sample-${id}` };
}
