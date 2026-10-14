import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { Route, RouteDifficulty, RoutePayload } from '../../../core/models/route.model';
import { EntityStore } from '../../../core/services/entity.store';
import { NavBadgeService } from '../../../core/services/nav-badge.service';
import { NotificationService } from '../../../core/services/notification.service';
import { matchesQuery } from '../../../shared/utils/text';
import { RoutesService } from './routes.service';

export type StatusFilter = 'all' | 'active' | 'inactive';
export type DifficultyFilter = RouteDifficulty | 'all';
export type RoutesView = 'cards' | 'table';

const VIEW_KEY = 'routly.routes.view';

function readView(): RoutesView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

/**
 * Estado de las rutas. La carga, la edición, el borrado y el cambio de estado
 * optimista vienen de EntityStore; aquí se añaden los filtros del listado, que se
 * conservan al volver del formulario, y el borrado con confirmación.
 */
@Injectable({ providedIn: 'root' })
export class RoutesStore extends EntityStore<Route, RoutePayload> {
  protected readonly api = inject(RoutesService);
  protected readonly listPath = '/routes';
  protected override readonly notFoundMessage = 'Esa ruta ya no existe.';

  private readonly notifications = inject(NotificationService);

  readonly search = signal('');
  readonly status = signal<StatusFilter>('all');
  readonly difficulty = signal<DifficultyFilter>('all');
  /** Tarjetas o lista. Se recuerda entre visitas. */
  readonly view = signal<RoutesView>(readView());

  readonly hasFilters = computed(
    () => this.search().trim() !== '' || this.status() !== 'all' || this.difficulty() !== 'all',
  );

  /** Rutas que pasan la búsqueda y los filtros, en el orden de la API (la más reciente primero). */
  readonly filtered = computed(() => {
    const search = this.search().trim();
    const status = this.status();
    const difficulty = this.difficulty();

    return this.items().filter((route) => {
      if (status !== 'all' && route.isActive !== (status === 'active')) return false;
      if (difficulty !== 'all' && route.difficulty !== difficulty) return false;
      if (!search) return true;
      return matchesQuery(`${route.title} ${route.startPoint} ${route.endPoint}`, search);
    });
  });

  constructor() {
    super();

    const badges = inject(NavBadgeService);
    effect(() => {
      if (this.loaded()) badges.set('routes', this.total());
    });
    effect(() => {
      if (this.deletedLoaded()) badges.set('routes-trash', this.deletedCount());
    });

    effect(() => {
      const view = this.view();
      try {
        localStorage.setItem(VIEW_KEY, view);
      } catch {
        // Sin acceso a localStorage la vista dura solo esta visita.
      }
    });
  }

  /**
   * Cambia el filtro por estado. Lo que hay en memoria se filtra al instante, y a la
   * vez se confirma con el endpoint de ese estado (`/actives`, `/inactives` o el
   * listado completo), por si algo ha cambiado en el servidor.
   */
  setStatus(status: StatusFilter): void {
    this.status.set(status);
    if (status === 'all') void this.load();
    else void this.refreshByActive(status === 'active');
  }

  clearFilters(): void {
    this.search.set('');
    this.difficulty.set('all');
    this.setStatus('all');
  }

  /**
   * Pide confirmación y elimina la ruta. Devuelve true si se ha eliminado.
   * Después ofrece deshacerlo durante unos segundos, sin hacer esperar a quien llama.
   */
  async confirmAndRemove(route: Route): Promise<boolean> {
    const confirmed = await this.notifications.confirm({
      title: `¿Eliminar «${route.title}»?`,
      text: 'Dejará de aparecer en el panel. Podrás deshacerlo justo después.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return false;

    const result = await this.remove(route);
    if (!result.ok) return false;

    void this.offerUndo(route);
    return true;
  }

  /** Restaura una ruta desde la papelera y lo confirma con un aviso. */
  async restoreAndNotify(route: Route, isActive: boolean): Promise<void> {
    const result = await this.restoreFromTrash(route, isActive);
    if (result.ok) {
      void this.notifications.success(
        isActive ? 'Ruta restaurada y activa.' : 'Ruta restaurada como inactiva.',
      );
    }
  }

  private async offerUndo(route: Route): Promise<void> {
    const undo = await this.notifications.undoable('Ruta eliminada.');
    if (!undo) return;

    const restored = await this.restore(route);
    if (restored.ok) void this.notifications.success('Ruta restaurada.');
  }
}
