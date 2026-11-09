import { Dices, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useAuth, useCurrentUser } from '@/features/auth/AuthProvider';
import { AVATAR_LABEL, AVATAR_OPTIONS, defaultAvatar, parseAvatar, randomAvatar, type AvatarConfig, type AvatarPart } from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/cn';
import { toUserMessage } from '@/shared/lib/errors';
import { fullName } from '@/shared/lib/format';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import { AvatarArt } from '@/shared/ui/avatar-art';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { useQueryClient } from '@tanstack/react-query';

const GROUPS: { id: string; label: string; parts: AvatarPart[] }[] = [
  { id: 'visage', label: 'Visage', parts: ['skin', 'eyes', 'mouth'] },
  { id: 'cheveux', label: 'Cheveux', parts: ['hair', 'hairColor'] },
  { id: 'style', label: 'Style', parts: ['accessory', 'shirt', 'bg'] },
];
const COLOR_PARTS: AvatarPart[] = ['skin', 'hairColor', 'shirt', 'bg'];

/** Création de son avatar : aperçu en grand, choix en vignettes, tirage au hasard. */
export function AvatarEditor() {
  const { profile } = useCurrentUser();
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  const saved = parseAvatar(profile.avatar);
  const [config, setConfig] = useState<AvatarConfig>(saved ?? defaultAvatar(fullName(profile)));
  const [group, setGroup] = useState('visage');
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(0);
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);

  const set = (part: AvatarPart, value: number) => setConfig((c) => ({ ...c, [part]: value }));
  const save = async (value: AvatarConfig | null) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('set_my_avatar', { p_avatar: value });
      if (error) throw error;
      await refreshProfile();
      await qc.invalidateQueries({ queryKey: qk.people });
      toast.success(value ? 'Avatar enregistré' : 'Avatar retiré : vos initiales reviennent');
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Mon avatar" description="Composez votre personnage : il remplace vos initiales partout dans l’application.">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-3 md:w-52">
          <div key={spin} className="animate-pop-in">
            <AvatarArt config={config} className="size-40 drop-shadow-md" title={`Avatar de ${fullName(profile)}`} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setConfig(randomAvatar());
                setSpin((s) => s + 1);
              }}
            >
              <Dices aria-hidden />
              Surprends-moi
            </Button>
            {saved && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save(null)}>
                <RotateCcw aria-hidden />
                Initiales
              </Button>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
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
                      onClick={() => set(part, i)}
                      className={cn(
                        'rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        active ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-line',
                      )}
                    >
                      {color ? (
                        <span className="block size-9 rounded-full" style={{ background: option }} />
                      ) : (
                        <AvatarArt config={{ ...config, [part]: i }} className="size-12" />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <Button variant="primary" className="self-start" disabled={!dirty || busy} onClick={() => void save(config)}>
            Enregistrer mon avatar
          </Button>
        </div>
      </div>
    </Panel>
  );
}
