import { Check } from 'lucide-react';
import { useState } from 'react';
import {
  applyAppearance,
  THEMES,
  toAppearance,
  type Appearance,
  type UiTheme,
} from '@/app/appearance';
import { useAuth, useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { check } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import { Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { toast } from '@/shared/ui/toaster';

/** Mini-écran rendu avec les vraies couleurs, police et arrondis de l'ambiance. */
function Preview({ theme }: { theme: UiTheme }) {
  return (
    <div
      data-ui-preview={theme}
      className="flex h-28 flex-col gap-2 rounded bg-canvas p-2 font-sans text-fg"
      aria-hidden
    >
      <div className="flex items-center gap-2 rounded bg-gradient-to-br from-hero-from to-hero-to px-2 py-1.5 text-white">
        <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          Bonjour !
        </span>
      </div>
      <div className="flex gap-1">
        <span className="h-3 flex-1 rounded-full bg-mood-1" />
        <span className="h-3 flex-1 rounded-full bg-mood-3" />
        <span className="h-3 flex-1 rounded-full bg-mood-5" />
      </div>
      <div className="flex flex-1 gap-2">
        <span className="flex flex-1 items-center rounded border border-line bg-surface px-2 text-xs">
          Objectifs
        </span>
        <span className="flex items-center rounded bg-accent px-2 text-xs font-medium text-accent-fg">
          Ok
        </span>
      </div>
    </div>
  );
}

/**
 * Apparence de l'application, choisie par chacun : ambiance, taille du texte, densité.
 * Seul l'aspect change : menus, pages et fonctionnalités restent identiques.
 */
export function AppearancePanel() {
  const { profile } = useCurrentUser();
  const { refreshProfile } = useAuth();
  const [current, setCurrent] = useState<Appearance>(() => toAppearance(profile));
  const [saving, setSaving] = useState(false);

  const choose = async (patch: Partial<Appearance>) => {
    const next = { ...current, ...patch };
    setCurrent(next);
    applyAppearance(next);
    setSaving(true);
    try {
      check(
        await supabase.rpc('set_my_ui', {
          p_theme: next.theme,
          p_text_size: next.textSize,
          p_density: next.density,
        }),
        'Apparence',
      );
      await refreshProfile();
    } catch {
      toast.error(
        'Apparence appliquée sur cet appareil, mais pas enregistrée. Réessayez plus tard.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Apparence"
      description="Personnalisez l’application à votre goût : seul l’aspect change, toutes les fonctionnalités restent les mêmes."
    >
      <div className="flex flex-col gap-5">
        <div
          role="radiogroup"
          aria-label="Ambiance"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
        >
          {THEMES.map((t) => {
            const on = current.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={saving && !on}
                onClick={() => void choose({ theme: t.id })}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  on
                    ? 'border-accent ring-2 ring-accent/30'
                    : 'border-line hover:border-line-strong',
                )}
              >
                <Preview theme={t.id} />
                <span className="flex items-center justify-between gap-2 px-1">
                  <span className="text-sm font-medium">{t.label}</span>
                  {on && <Check className="size-4 text-accent" aria-hidden />}
                </span>
                <span className="px-1 text-xs text-fg-subtle">{t.description}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Taille du texte</span>
            <Segmented
              value={current.textSize}
              onValueChange={(v) => void choose({ textSize: v as Appearance['textSize'] })}
              aria-label="Taille du texte"
            >
              <SegmentedItem value="normal">Normale</SegmentedItem>
              <SegmentedItem value="grand">Grande</SegmentedItem>
            </Segmented>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Densité</span>
            <Segmented
              value={current.density}
              onValueChange={(v) => void choose({ density: v as Appearance['density'] })}
              aria-label="Densité"
            >
              <SegmentedItem value="aeree">Aérée</SegmentedItem>
              <SegmentedItem value="compacte">Compacte</SegmentedItem>
            </Segmented>
          </div>
        </div>
      </div>
    </Panel>
  );
}
