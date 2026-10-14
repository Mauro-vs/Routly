import { inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';

import { NotificationService } from '../services/notification.service';

/** Lo implementan las páginas de formulario que quieren avisar antes de salir. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Marca una navegación que no debe pedir confirmación, por ejemplo la vuelta al
 * listado cuando el registro que se estaba editando ya no existe:
 * `router.navigateByUrl(url, { info: FORCED_NAVIGATION })`.
 */
export const FORCED_NAVIGATION = { forced: true } as const;

/** Pide confirmación al salir de un formulario con cambios sin guardar. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  const notifications = inject(NotificationService);
  const forced = inject(Router).getCurrentNavigation()?.extras.info === FORCED_NAVIGATION;
  if (forced || !component.hasUnsavedChanges()) return true;

  return notifications.confirm({
    title: '¿Salir sin guardar?',
    text: 'Perderás los cambios que no hayas guardado.',
    confirmText: 'Salir sin guardar',
    cancelText: 'Seguir editando',
    danger: true,
  });
};
