import { ArrowRight, Copy, RotateCcw, SendHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { SheetContent, Dialog } from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toaster';
import { askAiChat } from '../client';
import {
  actionLink,
  assistantContext,
  parseAssistantReply,
  SUGGESTIONS,
  trimHistory,
  type AssistantAction,
  type ChatMessage,
} from '../lib/assistant';
import { useAssistantData } from '../use-assistant-data';
import { RichText } from './RichText';

interface Turn extends ChatMessage {
  actions?: AssistantAction[];
}

/**
 * Assistant IA en discussion, ouvert depuis n'importe quelle page. Il connaît le résumé des données de suivi,
 * répond, rédige et propose des actions qui ouvrent le bon formulaire prérempli. La discussion n'est pas conservée.
 */
export function AssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { profile, isManager } = useCurrentUser();
  const role = isManager ? 'manager' : 'collaborateur';
  const { data, people } = useAssistantData();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next);
    setDraft('');
    setBusy(true);
    try {
      const reply = await askAiChat(
        assistantContext(role, profile.first_name, data),
        trimHistory(next.map(({ role: r, content }) => ({ role: r, content }))),
      );
      const parsed = parseAssistantReply(reply, role);
      setTurns((t) => [...t, { role: 'assistant', content: parsed.text, actions: parsed.actions }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'L’assistant n’a pas pu répondre.');
      setTurns((t) => t.slice(0, -1));
      setDraft(question);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copié');
    } catch {
      toast.error('Copie impossible sur ce navigateur.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Assistant Connect Team"
        description="Il propose, vous décidez. Seuls les prénoms et un résumé de suivi lui sont transmis."
        className="max-w-xl"
        bodyClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {turns.length === 0 ? (
              <div className="flex animate-page-in flex-col gap-4">
                <div className="flex items-start gap-3 rounded-lg border border-sec-reviews/20 bg-sec-reviews/5 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-sec-reviews text-white">
                    <Sparkles className="size-5" aria-hidden />
                  </span>
                  <p className="text-sm">
                    Bonjour {profile.first_name} ! Je peux{' '}
                    {isManager
                      ? 'vous dire qui voir en priorité, préparer un 1 à 1, rédiger un feedback ou un message, expliquer un outil du cours'
                      : 'vous aider à préparer votre 1 à 1, formuler une demande, organiser votre semaine'}
                    , et ouvrir le bon formulaire déjà rempli.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-fg-subtle">Pour commencer</span>
                  {SUGGESTIONS[role].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded border border-line bg-surface px-3 py-2 text-left text-sm transition-colors hover:border-sec-reviews/40 hover:bg-sec-reviews/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {turns.map((t, i) => (
                  <li
                    key={i}
                    className={cn(
                      'flex animate-page-in flex-col gap-2',
                      t.role === 'user' ? 'items-end' : 'items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[92%] rounded-lg px-4 py-3 text-sm',
                        t.role === 'user'
                          ? 'bg-accent text-white'
                          : 'border border-line bg-surface',
                      )}
                    >
                      {t.role === 'user' ? t.content : <RichText text={t.content} />}
                    </div>
                    {t.role === 'assistant' && (
                      <div className="flex flex-wrap gap-2">
                        {(t.actions ?? []).flatMap((a) => {
                          const link = actionLink(a, people, role);
                          return link
                            ? [
                                <Button key={link.to} asChild size="sm" variant="primary">
                                  <Link to={link.to} onClick={() => onOpenChange(false)}>
                                    {link.label}
                                    <ArrowRight aria-hidden />
                                  </Link>
                                </Button>,
                              ]
                            : [];
                        })}
                        <Button size="sm" variant="ghost" onClick={() => void copy(t.content)}>
                          <Copy aria-hidden />
                          Copier
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
                {busy && (
                  <li className="flex items-center gap-2 text-sm text-fg-muted" role="status">
                    <Sparkles
                      className="size-4 text-sec-reviews motion-safe:animate-pulse"
                      aria-hidden
                    />
                    L’assistant réfléchit…
                  </li>
                )}
              </ul>
            )}
            <div ref={end} />
          </div>
          <form
            className="flex items-end gap-2 border-t border-line bg-surface px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            {turns.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Nouvelle discussion"
                onClick={() => setTurns([])}
                disabled={busy}
              >
                <RotateCcw aria-hidden />
              </Button>
            )}
            <Textarea
              aria-label="Votre question"
              rows={1}
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder="Posez votre question…"
              className="max-h-32 min-h-10 flex-1 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              variant="primary"
              aria-label="Envoyer"
              disabled={busy || !draft.trim()}
            >
              <SendHorizontal aria-hidden />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Dialog>
  );
}
