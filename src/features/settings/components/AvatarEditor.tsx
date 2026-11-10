import { useQueryClient } from '@tanstack/react-query';
import { Dices, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useAuth, useCurrentUser } from '@/features/auth/AuthProvider';
import {
  defaultAvatar,
  defaultStoredAvatar,
  parseStoredAvatar,
  PRESET_IDS,
  PRESETS,
  presetSrc,
  randomAvatar,
  type StoredAvatar,
} from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/cn';
import { toUserMessage } from '@/shared/lib/errors';
import { fullName } from '@/shared/lib/format';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import { AvatarFigure } from '@/shared/ui/avatar-figure';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { AvatarBuilder } from './AvatarBuilder';

const toJson = (a: StoredAvatar) => (a.kind === 'preset' ? { preset: a.id } : a.config);

/** Mon avatar : un personnage 3D qui réagit à mon humeur, ou un personnage que je compose. */
export function AvatarEditor() {
  const { profile } = useCurrentUser();
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  const saved = parseStoredAvatar(profile.avatar);
  const [draft, setDraft] = useState<StoredAvatar>(saved ?? defaultStoredAvatar(fullName(profile)));
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(0);
  const dirty = !saved || JSON.stringify(toJson(draft)) !== JSON.stringify(toJson(saved));

  const save = async (value: StoredAvatar | null) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('set_my_avatar', { p_avatar: value ? toJson(value) : null });
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

  const mode = draft.kind;
  return (
    <Panel title="Mon avatar" description="Il remplace vos initiales partout, et prend l’expression de votre humeur du jour.">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-3 md:w-52">
          <div key={spin} className="animate-pop-in">
            <AvatarFigure avatar={draft} className="size-40 shadow-md ring-4 ring-surface" title={`Avatar de ${fullName(profile)}`} />
          </div>
          {draft.kind === 'preset' && (
            <div className="flex gap-1" aria-label="Ses expressions selon l’humeur">
              {[1, 3, 4, 5].map((m) => (
                <AvatarFigure key={m} avatar={draft} mood={m} className="size-9 ring-1 ring-line" />
              ))}
            </div>
          )}
          {saved && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save(null)}>
              <RotateCcw aria-hidden />
              Revenir aux initiales
            </Button>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Segmented
            value={mode}
            onValueChange={(v) => setDraft(v === 'preset' ? defaultStoredAvatar(fullName(profile)) : { kind: 'custom', config: defaultAvatar(fullName(profile)) })}
            aria-label="Type d’avatar"
            className="self-start"
          >
            <SegmentedItem value="preset">Personnage 3D</SegmentedItem>
            <SegmentedItem value="custom">Je compose le mien</SegmentedItem>
          </Segmented>
          {draft.kind === 'preset' ? (
            <div className="flex flex-wrap gap-3">
              {PRESET_IDS.map((id) => {
                const active = draft.id === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setDraft({ kind: 'preset', id });
                      setSpin((s) => s + 1);
                    }}
                    className="flex flex-col items-center gap-1 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <img
                      src={presetSrc(id, 'sourire')}
                      alt=""
                      className={cn('size-20 rounded-full object-cover transition-transform hover:scale-105', active ? 'ring-4 ring-accent' : 'ring-1 ring-line')}
                    />
                    <span className={cn('text-sm', active ? 'font-semibold text-accent' : 'text-fg-muted')}>{PRESETS[id].label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <AvatarBuilder config={draft.config} onChange={(config) => setDraft({ kind: 'custom', config })} />
              <Button
                size="sm"
                className="self-start"
                onClick={() => {
                  setDraft({ kind: 'custom', config: randomAvatar() });
                  setSpin((s) => s + 1);
                }}
              >
                <Dices aria-hidden />
                Surprends-moi
              </Button>
            </>
          )}
          <Button variant="primary" className="self-start" disabled={!dirty || busy} onClick={() => void save(draft)}>
            Enregistrer mon avatar
          </Button>
        </div>
      </div>
    </Panel>
  );
}
