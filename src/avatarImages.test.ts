import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { avatarLayers, equipmentImage } from './avatarImages';
import { avatarEquipment, defaultAvatars, hairColors, hairstyles, skinTones, updateAvatar, type EquipmentSlot } from './avatars';
import { createInitialState } from './data';

const exists = (file: string) => existsSync(fileURLToPath(new URL(`../public/avatars/layered-v1/${file}.png`, import.meta.url)));

describe('the adopted image avatar library', () => {
  it('puts crown undersides and headphone arches behind the scalp/hair, retaining only their front details above it', () => {
    for (const head of ['crown', 'headphones'] as const) for (const hair of ['bald', 'wavy', 'afro', 'long'] as const) {
      const layers = avatarLayers({ ...defaultAvatars.original, head, hair });
      expect(layers[0].id).toBe('head-back');
      expect(layers[0].file).toBe(head);
      expect(layers.findIndex(layer => layer.id === 'base')).toBeGreaterThan(0);
      const front = layers.find(layer => layer.id === 'head')!;
      expect(front.mask).toBe(`${head}-front`);
      expect(front.file).toBe(layers[0].file);
      expect(layers.indexOf(front)).toBeGreaterThan(layers.findIndex(layer => layer.id === 'hair-front'));
      expect(layers.find(layer => layer.id === 'hair-front')?.className ?? '').not.toContain('under-cap');
    }
  });
  it('uses the front-only tie in both the avatar and catalog without changing the saved equipment id', () => {
    const avatar = { ...defaultAvatars.original, extra: 'necktie' as const };
    expect(avatarLayers(avatar).find(layer => layer.id === 'extra')?.file).toBe('necktie-front-v2');
    expect(equipmentImage('extra', 'necktie')?.file).toBe('necktie-front-v2');
    expect(avatar.extra).toBe('necktie');
  });
  it('provides real image layers for every existing hairstyle and skin tone, including bald', () => {
    for (const hair of hairstyles) for (const skin of skinTones) {
      const layers = avatarLayers({ ...defaultAvatars.original, hair: hair.id, skin: skin.id });
      expect(layers.some(layer => layer.id === 'base')).toBe(true);
      expect(layers.every(layer => exists(layer.file))).toBe(true);
      expect(layers.some(layer => layer.id.startsWith('hair'))).toBe(hair.id !== 'bald');
    }
  });
  it('has matching images for all equipment without generating a file for every color combination', () => {
    for (const slot of Object.keys(avatarEquipment) as EquipmentSlot[]) for (const item of avatarEquipment[slot]) {
      const avatar = { ...defaultAvatars.original, [slot]: item.id };
      expect(avatarLayers(avatar).every(layer => exists(layer.file))).toBe(true);
      const thumbnail = equipmentImage(slot, item.id);
      expect(thumbnail ? exists(thumbnail.file) : item.id === 'none').toBe(true);
    }
    for (const color of hairColors) expect(avatarLayers({ ...defaultAvatars.original, hairColor: color.id }).every(layer => exists(layer.file))).toBe(true);
  });
  it('composites long hair behind the body and in front of the scalp, leaving the garment underneath accessories', () => {
    const layers = avatarLayers({ ...defaultAvatars.original, hair: 'long', shirt: 'mint', extra: 'wristbands', head: 'visor' });
    expect(layers.map(layer => layer.id)).toEqual(['hair-back', 'base', 'shirt', 'hands', 'hair-front', 'extra', 'head']);
    expect(layers[0].file).toBe(layers[4].file);
  });
  it('layers combined clothes, watch, moustache, glasses and hat without replacing independent choices', () => {
    const layers = avatarLayers({ ...defaultAvatars.original, shirt: 'leather-jacket', extra: 'watch', facialHair: 'moustache', face: 'sunglasses', head: 'top-hat' });
    expect(layers.map(layer => layer.id)).toEqual(['base', 'shirt', 'hands', 'hair-front', 'extra', 'facialHair', 'face', 'head']);
    expect(layers.find(layer => layer.id === 'shirt')?.file).toBe('leather-jacket');
    expect(layers.find(layer => layer.id === 'extra')?.file).toBe('watch');
    expect(layers.find(layer => layer.id === 'hair-front')?.className).toContain('under-cap');
  });
  it('restores each skin’s actual hands above every garment while leaving the original blue top unchanged', () => {
    expect(avatarLayers(defaultAvatars.original).some(layer => layer.id === 'hands')).toBe(false);
    for (const skin of skinTones) for (const shirt of avatarEquipment.shirt.filter(item => item.id !== 'blue')) {
      const layers = avatarLayers({ ...defaultAvatars.original, skin: skin.id, shirt: shirt.id });
      const hands = layers.find(layer => layer.id === 'hands')!;
      expect(hands.mask).toBe('hands');
      expect(hands.file).toBe(skin.id === 'peach' ? 'base' : `base-${skin.id}`);
      expect(layers.indexOf(hands)).toBeGreaterThan(layers.findIndex(layer => layer.id === 'shirt'));
    }
  });
});

it.each(['original', 'sheet', 'ivan'] as const)('only personalizes the currently selected profile: %s', person => {
  const state = createInitialState(); state.selectedPlan = person;
  state.avatars = structuredClone(defaultAvatars);
  const before = structuredClone(state);
  const next = updateAvatar(state, { hair: 'long', hairColor: 'red' });
  expect(next.avatars?.[person]).toMatchObject({ hair: 'long', hairColor: 'red' });
  for (const other of ['original', 'sheet', 'ivan'] as const) if (other !== person) expect(next.avatars?.[other]).toEqual(before.avatars?.[other]);
  expect(next.history).toBe(state.history); expect(next.active).toBe(state.active); expect(next.workouts).toBe(state.workouts);
  expect(state).toEqual(before);
  expect(updateAvatar(state, { person: 'sheet', hair: 'bald' } as never)).toBe(state);
});
