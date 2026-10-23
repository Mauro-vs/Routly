import { Injectable, inject } from '@angular/core';

import { ApiService } from './api.service';
import { NavBadgeService } from './nav-badge.service';

/**
 * Cuántos registros tiene cada colección, para los contadores del menú. La API no
 * tiene un endpoint de totales: se pide cada listado y se cuenta. Con los datos de
 * este panel son unas decenas de registros por colección.
 *
 * Después, cada store mantiene su contador al día cuando carga su listado.
 */
@Injectable({ providedIn: 'root' })
export class CollectionCountsService {
  private readonly api = inject(ApiService);
  private readonly badges = inject(NavBadgeService);

  /** `collections` son rutas de la API sin la barra: `routes`, `users`... */
  async load(collections: readonly string[]): Promise<void> {
    await Promise.all(
      collections.map(async (collection) => {
        try {
          const items = await this.api.get<unknown[]>(`/${collection}`);
          this.badges.set(collection, items.length);
        } catch {
          // Es un dato de fondo: sin él, la sección se queda sin contador. Si la API
          // no responde ya lo dice el estado de la conexión, al pie del menú, y no
          // hace falta un aviso por cada colección.
        }
      }),
    );
  }
}
