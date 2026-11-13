import { Injectable, inject, signal } from '@angular/core';

import { SessionResetService } from './session-reset.service';

/**
 * Última miga de la barra superior cuando depende de los datos, por ejemplo el
 * título de la ruta que se está editando. Las migas fijas salen del menú y de
 * `data.crumb` en la definición de cada ruta.
 *
 * El layout la vacía en cada navegación, así una página no hereda la de la anterior.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly _current = signal<string | null>(null);

  readonly current = this._current.asReadonly();

  constructor() {
    inject(SessionResetService).register(() => this.clear());
  }

  set(label: string): void {
    this._current.set(label);
  }

  clear(): void {
    this._current.set(null);
  }
}
