import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, THEMES, toAppearance } from './appearance';

describe('apparence', () => {
  it('cinq ambiances, Classique par défaut', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['classique', 'nuit', 'zen', 'epure', 'energie']);
    expect(toAppearance(null)).toEqual(DEFAULT_APPEARANCE);
  });
  it('lit les valeurs du profil et ignore les valeurs inconnues', () => {
    expect(
      toAppearance({ ui_theme: 'nuit', ui_text_size: 'grand', ui_density: 'compacte' }),
    ).toEqual({ theme: 'nuit', textSize: 'grand', density: 'compacte' });
    expect(toAppearance({ ui_theme: 'fluo', ui_text_size: 'enorme', ui_density: 1 })).toEqual(
      DEFAULT_APPEARANCE,
    );
  });
});
