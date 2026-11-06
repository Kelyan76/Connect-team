import { useEffect, useRef } from 'react';

/** Vrai si l'utilisateur est en train de saisir du texte (on ne déclenche pas de raccourci). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Raccourci clavier global. `combo` : « mod+k » (Cmd sur macOS, Ctrl ailleurs), « n », « escape ».
 * Les raccourcis à une lettre sont ignorés pendant la saisie et quand une fenêtre modale est ouverte.
 */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needsMod = parts.includes('mod');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return;
      const mod = e.metaKey || e.ctrlKey;
      if (needsMod !== mod || e.altKey) return;
      if (!needsMod) {
        if (isTypingTarget(e.target)) return;
        if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      }
      e.preventDefault();
      ref.current(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo, enabled]);
}
