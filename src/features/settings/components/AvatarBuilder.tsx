import { useState } from 'react';
import { AVATAR_LABEL, AVATAR_OPTIONS, type AvatarConfig, type AvatarPart } from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/cn';
import { AvatarArt } from '@/shared/ui/avatar-art';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';

const GROUPS: { id: string; label: string; parts: AvatarPart[] }[] = [
  { id: 'visage', label: 'Visage', parts: ['skin', 'eyes', 'mouth'] },
  { id: 'cheveux', label: 'Cheveux', parts: ['hair', 'hairColor'] },
  { id: 'style', label: 'Style', parts: ['accessory', 'shirt', 'bg'] },
];
const COLOR_PARTS: AvatarPart[] = ['skin', 'hairColor', 'shirt', 'bg'];

/** Composer son personnage pièce par pièce (teint, coiffure, yeux, bouche, accessoire, couleurs). */
export function AvatarBuilder({ config, onChange }: { config: AvatarConfig; onChange: (c: AvatarConfig) => void }) {
  const [group, setGroup] = useState('visage');
  return (
    <div className="flex flex-col gap-4">
      <Segmented value={group} onValueChange={setGroup} aria-label="Partie de l’avatar" className="self-start">
        {GROUPS.map((g) => (
          <SegmentedItem key={g.id} value={g.id}>
            {g.label}
          </SegmentedItem>
        ))}
      </Segmented>
      {GROUPS.find((g) => g.id === group)?.parts.map((part) => (
        <fieldset key={part} className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{AVATAR_LABEL[part]}</legend>
          <div className="flex flex-wrap gap-2">
            {AVATAR_OPTIONS[part].map((option, i) => {
              const active = config[part] === i;
              const color = COLOR_PARTS.includes(part);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  aria-label={color ? `${AVATAR_LABEL[part]} ${i + 1}` : option}
                  title={color ? undefined : option}
                  onClick={() => onChange({ ...config, [part]: i })}
                  className={cn(
                    'rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    active ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-line',
                  )}
                >
                  {color ? <span className="block size-9 rounded-full" style={{ background: option }} /> : <AvatarArt config={{ ...config, [part]: i }} className="size-12" />}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
