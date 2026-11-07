/**
 * Empêche le zoom de la page : pincement (iOS ignore user-scalable=no),
 * pincement du pavé tactile / Ctrl + molette et raccourcis clavier sur ordinateur.
 */
export function disablePageZoom(): void {
  const prevent = (e: Event) => e.preventDefault();
  // Safari iOS : gestes de pincement.
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  // Pincement à deux doigts (navigateurs tactiles).
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  // Double tap : géré en CSS (touch-action: manipulation), sans bloquer les clics rapides.
  // Ordinateur : pincement du pavé tactile et Ctrl + molette.
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false },
  );
  // Ordinateur : Ctrl/Cmd + « + », « - », « 0 ».
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });
}
