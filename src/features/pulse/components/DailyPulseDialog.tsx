import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { usePulses } from '../queries';
import { PulseCheckin } from './PulseCheckin';

const key = (userId: string, day: string) => `connect-team:pouls-propose:${userId}:${day}`;
const readSeen = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const markSeen = (k: string) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    // stockage indisponible (navigation privée) : la fenêtre pourra réapparaître, sans gravité
  }
};

/**
 * À la première ouverture de la journée (jour ouvré), le collaborateur qui n'a pas encore donné
 * son pouls le voit s'afficher en fenêtre. Une seule proposition par jour, refermable d'un geste.
 */
export function DailyPulseDialog() {
  const { profile, isManager } = useCurrentUser();
  const pulses = usePulses();
  const [open, setOpen] = useState(false);
  const today = todayIso();
  const k = key(profile.id, today);
  const day = new Date().getDay();
  const workday = day !== 0 && day !== 6;
  const done = (pulses.data ?? []).some((p) => p.collaborator_id === profile.id && p.day === today);
  const shown = useRef(false);
  // Pas pendant le parcours de bienvenue : le pouls sera proposé juste après.
  const onboarding = useLocation().pathname === '/bienvenue';

  useEffect(() => {
    if (isManager || onboarding || !workday || !pulses.data || done || shown.current || readSeen(k))
      return;
    shown.current = true;
    const t = window.setTimeout(() => {
      setOpen(true);
      markSeen(k);
    }, 700);
    return () => window.clearTimeout(t);
  }, [isManager, onboarding, workday, pulses.data, done, k]);

  // Pouls enregistré : on laisse voir la série une seconde, puis on referme.
  useEffect(() => {
    if (!open || !done) return;
    const t = window.setTimeout(() => setOpen(false), 1600);
    return () => window.clearTimeout(t);
  }, [open, done]);

  if (isManager) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        size="lg"
        title={`Bonjour ${profile.first_name} !`}
        description="Avant de commencer : votre pouls du jour, en 10 secondes."
        footer={
          !done && (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Plus tard
            </Button>
          )
        }
      >
        <PulseCheckin />
      </DialogContent>
    </Dialog>
  );
}
