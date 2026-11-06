import { useEffect, useRef } from 'react';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'] as const;

/** Appelle `onIdle` après `ms` millisecondes sans aucune activité de l'utilisateur. */
export function useIdle(ms: number, onIdle: () => void, enabled = true): void {
  const callback = useRef(onIdle);
  callback.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    // Vérification périodique : robuste à la mise en veille de l'onglet ou de l'ordinateur.
    const timer = window.setInterval(() => {
      if (Date.now() - last >= ms) callback.current();
    }, 15_000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [ms, enabled]);
}
