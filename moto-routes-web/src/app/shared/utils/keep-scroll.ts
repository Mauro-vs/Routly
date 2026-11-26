import { ViewportScroller } from '@angular/common';
import { NavigationExtras, Router, Scroll } from '@angular/router';

/**
 * Cambia la URL sin mover la página. La web sube arriba en cada navegación
 * (withInMemoryScrolling), que está bien al cambiar de página pero no al filtrar una lista que
 * está a media página (las opiniones). El router avisa con un evento Scroll justo después de
 * subir: ahí se vuelve a donde estaba.
 */
export function navigateKeepingScroll(
  router: Router,
  scroller: ViewportScroller,
  commands: unknown[],
  extras: NavigationExtras,
): Promise<boolean> {
  const position = scroller.getScrollPosition();
  const subscription = router.events.subscribe((event) => {
    if (!(event instanceof Scroll)) return;
    scroller.scrollToPosition(position, { behavior: 'instant' });
    subscription.unsubscribe();
  });
  // Si la navegación se cancela no llega el Scroll: no hay que quedarse escuchando
  setTimeout(() => subscription.unsubscribe(), 2000);
  return router.navigate(commands, extras);
}
