import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';
import { NavBadgeService } from './nav-badge.service';

/**
 * Cuántos registros tiene cada colección, para los contadores del menú. Se pide una página
 * de un solo registro y el total sale de la cabecera `X-Total-Count`: no se descarga la
 * colección entera para contarla.
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
          const { total } = await firstValueFrom(this.api.getList(`/${collection}`, { page: 1, limit: 1 }));
          this.badges.set(collection, total);
        } catch {
          // Es un dato de fondo: sin él, la sección se queda sin contador. Si la API
          // no responde ya lo dice el estado de la conexión, al pie del menú, y no
          // hace falta un aviso por cada colección.
        }
      }),
    );
  }
}
