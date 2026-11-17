/**
 * Apparence choisie par chacun (Mon profil › Apparence) : ambiance, taille du texte, densité.
 * Purement visuel : les variables CSS de tokens.css changent, jamais les fonctionnalités.
 */
export type UiTheme = 'classique' | 'nuit' | 'zen' | 'epure' | 'energie';
export type UiTextSize = 'normal' | 'grand';
export type UiDensity = 'aeree' | 'compacte';

export interface Appearance {
  theme: UiTheme;
  textSize: UiTextSize;
  density: UiDensity;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'classique',
  textSize: 'normal',
  density: 'aeree',
};

export const THEMES: { id: UiTheme; label: string; description: string }[] = [
  {
    id: 'classique',
    label: 'Classique',
    description: 'Indigo, menu bleu nuit, cartes blanches arrondies.',
  },
  {
    id: 'nuit',
    label: 'Nuit',
    description: 'Fond sombre et accent cyan : repose les yeux le soir.',
  },
  {
    id: 'zen',
    label: 'Zen',
    description: 'Sable et vert sauge, formes très douces, police ronde.',
  },
  {
    id: 'epure',
    label: 'Épuré',
    description: 'Noir et blanc façon magazine, titres en serif, angles nets.',
  },
  {
    id: 'energie',
    label: 'Énergie',
    description: 'Corail, jaune et violet, grosses formes, police affirmée.',
  },
];

const isTheme = (v: unknown): v is UiTheme => THEMES.some((t) => t.id === v);

/** Lecture tolérante (valeur inconnue → valeur par défaut). */
export function toAppearance(
  v: { ui_theme?: unknown; ui_text_size?: unknown; ui_density?: unknown } | null | undefined,
): Appearance {
  return {
    theme: isTheme(v?.ui_theme) ? v.ui_theme : DEFAULT_APPEARANCE.theme,
    textSize: v?.ui_text_size === 'grand' ? 'grand' : 'normal',
    density: v?.ui_density === 'compacte' ? 'compacte' : 'aeree',
  };
}

const CACHE = 'connect-team:apparence';

/** Applique l'apparence sur <html> et la garde sur l'appareil (pas de flash au prochain démarrage). */
export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  if (a.theme === 'classique') delete root.dataset.ui;
  else root.dataset.ui = a.theme;
  if (a.textSize === 'grand') root.dataset.text = 'grand';
  else delete root.dataset.text;
  if (a.density === 'compacte') root.dataset.density = 'compacte';
  else delete root.dataset.density;
  try {
    localStorage.setItem(
      CACHE,
      JSON.stringify({ ui_theme: a.theme, ui_text_size: a.textSize, ui_density: a.density }),
    );
  } catch {
    // stockage indisponible : appliqué pour cette visite seulement
  }
}

export function cachedAppearance(): Appearance {
  try {
    return toAppearance(
      JSON.parse(localStorage.getItem(CACHE) ?? 'null') as Record<string, unknown> | null,
    );
  } catch {
    return DEFAULT_APPEARANCE;
  }
}
