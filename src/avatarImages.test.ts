import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { avatarLayers, equipmentImage } from './avatarImages';
import { avatarEquipment, defaultAvatars, hairColors, hairstyles, skinTones, updateAvatar } from './avatars';
import { createInitialState } from './data';

const exists = (file: string) => existsSync(fileURLToPath(new URL(`../public/avatars/layered-v1/${file}.png`, import.meta.url)));

describe('the adopted image avatar library', () => {
  it('provides real image layers for every existing hairstyle and skin tone, including bald', () => {
    for (const hair of hairstyles) for (const skin of skinTones) {
      const layers = avatarLayers({ ...defaultAvatars.original, hair: hair.id, skin: skin.id });
      expect(layers.some(layer => layer.id === 'base')).toBe(true);
      expect(layers.every(layer => exists(layer.file))).toBe(true);
      expect(layers.some(layer => layer.id.startsWith('hair'))).toBe(hair.id !== 'bald');
    }
  });
  it('has matching images for all equipment without generating a file for every color combination', () => {
    for (const slot of ['head', 'shirt', 'extra'] as const) for (const item of avatarEquipment[slot]) {
      const avatar = { ...defaultAvatars.original, [slot]: item.id };
      expect(avatarLayers(avatar).every(layer => exists(layer.file))).toBe(true);
      const thumbnail = equipmentImage(slot, item.id);
      expect(thumbnail ? exists(thumbnail.file) : item.id === 'none').toBe(true);
    }
    for (const color of hairColors) expect(avatarLayers({ ...defaultAvatars.original, hairColor: color.id }).every(layer => exists(layer.file))).toBe(true);
  });
  it('composites long hair behind the body and in front of the scalp, leaving the garment underneath accessories', () => {
    const layers = avatarLayers({ ...defaultAvatars.original, hair: 'long', shirt: 'mint', extra: 'wristbands', head: 'visor' });
    expect(layers.map(layer => layer.id)).toEqual(['hair-back', 'base', 'shirt', 'hair-front', 'extra', 'head']);
    expect(layers[0].file).toBe(layers[3].file);
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
