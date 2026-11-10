/**
 * Avatar personnalisé : un petit personnage « pâte à modeler » composé par chacun.
 * La configuration est un objet de petits entiers, enregistré dans profiles.avatar.
 */

export const AVATAR_OPTIONS = {
  skin: ['#FFE0C7', '#F5C6A0', '#E0A47A', '#C68252', '#9A5B34', '#6B3E22'],
  hair: ['Aucune', 'Courte', 'Mèche', 'Longue', 'Chignon', 'Bouclée'],
  hairColor: ['#2B1D14', '#5A3825', '#A0662E', '#E2B04A', '#C9442E', '#8A8F9C', '#5B6CF0'],
  eyes: ['Ronds', 'Rieurs', 'Points', 'Clin d’œil'],
  mouth: ['Sourire', 'Grand sourire', 'Neutre', 'Étonné'],
  accessory: ['Aucun', 'Lunettes', 'Casque audio', 'Bonnet'],
  shirt: ['#4F46E5', '#0D9488', '#F97316', '#E11D48', '#0EA5E9', '#334155'],
  bg: ['#C7D2FE', '#BBF7D0', '#FDE68A', '#FBCFE8', '#BAE6FD', '#DDD6FE'],
} as const;

export type AvatarPart = keyof typeof AVATAR_OPTIONS;
export type AvatarConfig = Record<AvatarPart, number>;

export const AVATAR_PARTS = Object.keys(AVATAR_OPTIONS) as AvatarPart[];

export const AVATAR_LABEL: Record<AvatarPart, string> = {
  skin: 'Teint',
  hair: 'Coiffure',
  hairColor: 'Couleur des cheveux',
  eyes: 'Yeux',
  mouth: 'Bouche',
  accessory: 'Accessoire',
  shirt: 'Haut',
  bg: 'Fond',
};

/** Configuration valide, ou null (champ absent ou abîmé : on affiche alors les initiales). */
export function parseAvatar(value: unknown): AvatarConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const out = {} as AvatarConfig;
  for (const part of AVATAR_PARTS) {
    const v = raw[part];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= AVATAR_OPTIONS[part].length) return null;
    out[part] = v;
  }
  return out;
}

/** Proposition de départ, stable pour une même personne (calculée depuis son nom). */
export function defaultAvatar(seed: string): AvatarConfig {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const pick = (part: AvatarPart, salt: number) => Math.abs((h ^ (salt * 2654435761)) | 0) % AVATAR_OPTIONS[part].length;
  return { skin: pick('skin', 1), hair: 1 + (pick('hair', 2) % 5), hairColor: pick('hairColor', 3) % 6, eyes: pick('eyes', 4), mouth: pick('mouth', 5) % 2, accessory: 0, shirt: pick('shirt', 6), bg: pick('bg', 7) };
}

/** Tirage au hasard pour le bouton « Surprends-moi ». */
export function randomAvatar(random: () => number = Math.random): AvatarConfig {
  const out = {} as AvatarConfig;
  for (const part of AVATAR_PARTS) out[part] = Math.floor(random() * AVATAR_OPTIONS[part].length);
  return out;
}

/** Expression de l'avatar selon l'humeur du jour (1 à 5) : rieur, souriant, neutre, ou la moue (bouche 4, hors choix). */
export function moodFace(mood: number): { eyes: number; mouth: number } {
  if (mood >= 5) return { eyes: 1, mouth: 1 };
  if (mood === 4) return { eyes: 0, mouth: 0 };
  if (mood === 3) return { eyes: 0, mouth: 2 };
  return { eyes: 2, mouth: 4 };
}

// ─── Personnages 3D prêts à l'emploi ────────────────────────────────────
// Portraits rendus en 3D (public/avatars/<personnage>-<expression>.webp), chacun avec plusieurs
// expressions : l'avatar reprend celle qui correspond à l'humeur du jour.

export const PRESETS = {
  alex: { label: 'Alex', faces: ['sourire', 'joie', 'reflexion', 'calme', 'bravo', 'salut'], moods: { 1: 'reflexion', 2: 'reflexion', 3: 'calme', 4: 'sourire', 5: 'bravo' } },
  theo: { label: 'Théo', faces: ['sourire', 'joie', 'reflexion', 'calme', 'bravo'], moods: { 1: 'reflexion', 2: 'reflexion', 3: 'calme', 4: 'sourire', 5: 'bravo' } },
  lea: { label: 'Léa', faces: ['sourire', 'joie', 'reflexion', 'rire'], moods: { 1: 'reflexion', 2: 'reflexion', 3: 'sourire', 4: 'joie', 5: 'rire' } },
  noah: { label: 'Noah', faces: ['sourire', 'lunettes', 'joie', 'rire'], moods: { 1: 'lunettes', 2: 'lunettes', 3: 'sourire', 4: 'joie', 5: 'rire' } },
  jade: { label: 'Jade', faces: ['sourire', 'joie', 'surprise', 'calme'], moods: { 1: 'surprise', 2: 'surprise', 3: 'sourire', 4: 'calme', 5: 'joie' } },
} as const satisfies Record<string, { label: string; faces: readonly string[]; moods: Record<1 | 2 | 3 | 4 | 5, string> }>;

export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

/** Avatar enregistré : un personnage 3D, ou un personnage composé (configuration). */
export type StoredAvatar = { kind: 'preset'; id: PresetId } | { kind: 'custom'; config: AvatarConfig };

export function parseStoredAvatar(value: unknown): StoredAvatar | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const preset = (value as Record<string, unknown>).preset;
    if (typeof preset === 'string') return preset in PRESETS ? { kind: 'preset', id: preset as PresetId } : null;
  }
  const config = parseAvatar(value);
  return config ? { kind: 'custom', config } : null;
}

/** Expression du personnage 3D : celle de l'humeur du jour, sinon son sourire. */
export function presetFace(id: PresetId, mood?: number): string {
  if (mood && mood >= 1 && mood <= 5) return PRESETS[id].moods[mood as 1 | 2 | 3 | 4 | 5];
  return 'sourire';
}

export const presetSrc = (id: PresetId, face: string) => `${import.meta.env.BASE_URL}avatars/${id}-${face}.webp`;

/** Avatar proposé tant que la personne n'en a pas choisi : un personnage 3D, stable pour elle. */
export function defaultStoredAvatar(seed: string): StoredAvatar {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return { kind: 'preset', id: PRESET_IDS[Math.abs(h) % PRESET_IDS.length] };
}
