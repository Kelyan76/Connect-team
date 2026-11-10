import { describe, expect, it } from 'vitest';
import { AVATAR_OPTIONS, defaultAvatar, parseAvatar, randomAvatar } from './avatar';

describe('avatar personnalisé', () => {
  it('accepte une configuration complète et valide', () => {
    const c = { skin: 1, hair: 2, hairColor: 0, eyes: 1, mouth: 0, accessory: 1, shirt: 3, bg: 4 };
    expect(parseAvatar(c)).toEqual(c);
  });

  it('rejette une configuration incomplète ou hors limites', () => {
    expect(parseAvatar(null)).toBeNull();
    expect(parseAvatar({ skin: 1 })).toBeNull();
    expect(parseAvatar({ skin: 99, hair: 0, hairColor: 0, eyes: 0, mouth: 0, accessory: 0, shirt: 0, bg: 0 })).toBeNull();
  });

  it('la proposition de départ est stable et valide', () => {
    expect(defaultAvatar('Hugo Lambert')).toEqual(defaultAvatar('Hugo Lambert'));
    expect(parseAvatar(defaultAvatar('Inès Moreau'))).not.toBeNull();
  });

  it('le tirage au hasard reste dans les choix proposés', () => {
    const c = randomAvatar(() => 0.999);
    expect(c.hairColor).toBe(AVATAR_OPTIONS.hairColor.length - 1);
    expect(parseAvatar(c)).not.toBeNull();
  });
});

describe('personnages 3D', () => {
  it('reconnaît un personnage et refuse un inconnu', async () => {
    const { parseStoredAvatar } = await import('./avatar');
    expect(parseStoredAvatar({ preset: 'lea' })).toEqual({ kind: 'preset', id: 'lea' });
    expect(parseStoredAvatar({ preset: 'inconnu' })).toBeNull();
    expect(parseStoredAvatar({ skin: 1, hair: 2, hairColor: 0, eyes: 1, mouth: 0, accessory: 1, shirt: 3, bg: 4 })?.kind).toBe('custom');
  });

  it('chaque humeur a une expression existante pour chaque personnage', async () => {
    const { PRESETS, PRESET_IDS, presetFace } = await import('./avatar');
    for (const id of PRESET_IDS) {
      for (const mood of [1, 2, 3, 4, 5]) expect(PRESETS[id].faces).toContain(presetFace(id, mood));
      expect(presetFace(id)).toBe('sourire');
    }
  });
});
