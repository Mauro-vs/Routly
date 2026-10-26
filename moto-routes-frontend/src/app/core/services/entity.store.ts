import { computed, effect, inject, signal } from '@angular/core';

import { CollectionLabels, agree, capitalize, statusWord } from '../../shared/utils/labels';
import { ApiError } from '../models/api-error.model';
import { BaseRecord, EntityStatus } from '../models/entity.model';
import { ErrorHandlerService } from './error-handler.service';
import { NavBadgeService } from './nav-badge.service';
import { NotificationService } from './notification.service';

/** El filtro por estado de los listados. Es el único que ofrece la API. */
export type StatusFilter = 'all' | 'active' | 'inactive';

/** Llamadas a la API que necesita un store. Las implementa el servicio de cada entidad. */
export interface EntityApi<T extends BaseRecord, TPayload> {
  getAll(): Promise<T[]>;
  /** Solo los activos (`true`) o solo los inactivos (`false`). */
  getByActive(isActive: boolean): Promise<T[]>;
  /** La papelera: solo los eliminados, del más reciente al más antiguo. */
  getDeleted(): Promise<T[]>;
  getById(id: string): Promise<T>;
  /** Solo las entidades con slug (todas menos las imágenes). */
  getBySlug?(slug: string): Promise<T>;
  create(payload: TPayload): Promise<T>;
  update(id: string, payload: Partial<TPayload>): Promise<T>;
  setActive(id: string, isActive: boolean): Promise<T>;
  remove(id: string): Promise<void>;
  restore(id: string, isActive: boolean): Promise<T>;
}

/** El mismo orden que usa la API en sus listados: del más reciente al más antiguo. */
function newestFirst<T extends BaseRecord>(items: T[]): T[] {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Resultado de una escritura: o los datos guardados, o el error ya normalizado. */
export type StoreResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Estado y operaciones comunes a cualquier entidad del panel, con signals.
 *
 * Para una entidad nueva basta con heredar y declarar `api`, `listPath`, `labels` y
 * `displayName`:
 *
 *   @Injectable({ providedIn: 'root' })
 *   export class RoutesStore extends EntityStore<Route, RoutePayload> {
 *     protected readonly api = inject(RoutesService);
 *     protected readonly listPath = '/routes';
 *     readonly labels: CollectionLabels = { singular: 'ruta', plural: 'rutas', gender: 'f' };
 *     displayName(route: Route): string { return route.title; }
 *   }
 *
 * Ningún método lanza: cada llamada va en su try/catch y los fallos pasan por
 * ErrorHandlerService, que decide qué aviso mostrar. Las lecturas dejan el error en
 * `error`; las escrituras lo devuelven en el resultado para que el formulario pueda
 * pintarlo junto a los campos.
 *
 * Mientras el listado está cargado, publica su total en el menú (NavBadgeService),
 * con el id de la sección: `listPath` sin la barra.
 */
export abstract class EntityStore<T extends BaseRecord, TPayload> {
  protected abstract readonly api: EntityApi<T, TPayload>;
  /** Ruta del listado. Se vuelve a ella cuando un registro no existe. */
  protected abstract readonly listPath: string;
  /** Texto del aviso cuando un registro no existe. */
  protected readonly notFoundMessage: string | undefined = undefined;
  /** Cómo se nombra la colección en los textos: avisos, botones, estados vacíos. */
  abstract readonly labels: CollectionLabels;

  /** Nombre de un registro en los avisos y en los nombres accesibles: el título, el nombre... */
  abstract displayName(entity: T): string;

  private readonly errors = inject(ErrorHandlerService);
  private readonly notifications = inject(NotificationService);

  private readonly _items = signal<T[]>([]);
  private readonly _selected = signal<T | null>(null);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private readonly _busyIds = signal<ReadonlySet<string>>(new Set());
  private readonly _deleted = signal<T[]>([]);
  private readonly _deletedLoading = signal(false);
  private readonly _deletedLoaded = signal(false);
  private readonly _deletedError = signal<ApiError | null>(null);
  private lookups = 0;

  readonly items = this._items.asReadonly();
  /** Registro abierto en el formulario. Lo rellena `getBySlug`. */
  readonly selected = this._selected.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** Ya hubo al menos una carga correcta del listado. */
  readonly loaded = this._loaded.asReadonly();
  readonly saving = this._saving.asReadonly();
  /** Error de la última lectura (`load` o `getBySlug`). */
  readonly error = this._error.asReadonly();

  readonly total = computed(() => this._items().length);
  readonly activeCount = computed(() => this._items().filter((item) => item.isActive).length);
  readonly inactiveCount = computed(() => this.total() - this.activeCount());

  /** Papelera: registros eliminados que todavía se pueden restaurar. */
  readonly deleted = this._deleted.asReadonly();
  readonly deletedLoading = this._deletedLoading.asReadonly();
  readonly deletedLoaded = this._deletedLoaded.asReadonly();
  readonly deletedError = this._deletedError.asReadonly();
  readonly deletedCount = computed(() => this._deleted().length);

  /** Filtro por estado del listado. Se conserva al volver del detalle o del formulario. */
  readonly status = signal<StatusFilter>('all');
  /** Los registros que pasan el filtro por estado, en el orden de la API. */
  readonly visible = computed(() => {
    const status = this.status();
    if (status === 'all') return this._items();
    const isActive = status === 'active';
    return this._items().filter((item) => item.isActive === isActive);
  });

  private readonly badges = inject(NavBadgeService);

  constructor() {
    effect(() => {
      if (this._loaded()) this.badges.set(this.navId(), this.total());
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

  /** Hay un cambio de estado o un borrado en curso para ese registro. */
  isBusy(id: string): boolean {
    return this._busyIds().has(id);
  }

  async load(): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      this._items.set(await this.api.getAll());
      this._loaded.set(true);
    } catch (error) {
      this._error.set(this.errors.handle(error));
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Vuelve a pedir solo los activos o solo los inactivos y pone al día esa parte del
   * listado, sin tocar el resto. Lo usa el filtro por estado: lo que ya hay en memoria
   * se ve al instante y esta llamada lo confirma con el servidor.
   */
  async refreshByActive(isActive: boolean): Promise<void> {
    // Sin una primera carga no hay nada que poner al día, y un cambio de estado en
    // curso no debe pisarse con datos que salieron antes de terminarlo.
    if (!this._loaded() || this._busyIds().size > 0) return;

    try {
      const fresh = await this.api.getByActive(isActive);
      const freshIds = new Set(fresh.map((item) => item._id));
      const others = this._items().filter(
        (item) => item.isActive !== isActive && !freshIds.has(item._id),
      );
      this._items.set(newestFirst([...others, ...fresh]));
    } catch (error) {
      this.errors.handle(error);
    }
  }

  /** Abre un registro por su slug. Si no existe, avisa, vuelve al listado y da null. */
  async getBySlug(slug: string): Promise<T | null> {
    const { getBySlug } = this.api;
    if (!getBySlug) throw new Error('This entity has no slug');
    return this.select(() => getBySlug.call(this.api, slug));
  }

  /** Lo mismo por su `_id`, para las colecciones sin slug (las imágenes). */
  getOne(id: string): Promise<T | null> {
    return this.select(() => this.api.getById(id));
  }

  /**
   * Vuelve a pedir el registro abierto sin vaciarlo antes, por ejemplo cuando la
   * galería cambia su imagen principal. Si falla, se queda lo que había.
   */
  async refreshSelected(): Promise<void> {
    const current = this._selected();
    if (!current) return;
    try {
      this.replace(await this.api.getById(current._id));
    } catch {
      // Es una puesta al día de fondo: lo que se ve sigue siendo válido.
    }
  }

  /** Abre un registro (lo deja en `selected`) con la llamada que se le pase. */
  private async select(load: () => Promise<T>): Promise<T | null> {
    const lookup = ++this.lookups;

    this._loading.set(true);
    this._error.set(null);
    this._selected.set(null);
    try {
      const entity = await load();
      // Si mientras tanto se pidió otro registro, este ya no interesa.
      if (lookup !== this.lookups) return null;
      this._selected.set(entity);
      return entity;
    } catch (error) {
      if (lookup !== this.lookups) return null;
      const apiError = this.errors.handle(error, {
        notFoundRedirect: this.listPath,
        notFoundMessage: this.notFoundMessage,
      });
      this._error.set(apiError);
      return null;
    } finally {
      if (lookup === this.lookups) this._loading.set(false);
    }
  }

  clearSelected(): void {
    this.lookups++;
    this._selected.set(null);
    this._error.set(null);
    this._loading.set(false);
  }

  async create(payload: TPayload): Promise<StoreResult<T>> {
    this._saving.set(true);
    try {
      const created = await this.api.create(payload);
      // Sin el listado cargado (se entró directo al formulario), el contador suma igual.
      if (!this._loaded()) this.badges.adjust(this.navId(), 1);
      this._items.update((items) => [created, ...items]);
      return { ok: true, data: created };
    } catch (error) {
      return { ok: false, error: this.errors.handle(error, { inline: true }) };
    } finally {
      this._saving.set(false);
    }
  }

  async update(id: string, payload: Partial<TPayload>): Promise<StoreResult<T>> {
    this._saving.set(true);
    try {
      const updated = await this.api.update(id, payload);
      this.replace(updated);
      return { ok: true, data: updated };
    } catch (error) {
      return {
        ok: false,
        error: this.errors.handle(error, {
          inline: true,
          notFoundRedirect: this.listPath,
          notFoundMessage: this.notFoundMessage,
        }),
      };
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Actualización optimista: el estado activo cambia al instante en la interfaz y
   * después se confirma con la API. Si la API falla, el registro vuelve a como
   * estaba y ErrorHandlerService muestra el error.
   */
  async setActive(entity: T, isActive: boolean): Promise<StoreResult<T>> {
    const id = entity._id;
    if (this.isBusy(id)) return { ok: true, data: entity };

    const status: EntityStatus = isActive ? 'active' : 'inactive';
    this.replace({ ...entity, isActive, status });
    this.markBusy(id, true);
    try {
      const saved = await this.api.setActive(id, isActive);
      this.replace(saved);
      return { ok: true, data: saved };
    } catch (error) {
      this.replace(entity);
      const apiError = this.errors.handle(error, { notFoundMessage: this.notFoundMessage });
      // El registro ya no existe en el servidor: se vuelve a pedir el listado.
      if (apiError.isNotFound) void this.load();
      // Si la API tardó o falló a medias, puede que sí aplicara el cambio: se comprueba.
      else if (apiError.type === 'timeout' || apiError.type === 'server') void this.resync(id);
      return { ok: false, error: apiError };
    } finally {
      this.markBusy(id, false);
    }
  }

  /** Borrado lógico. Devuelve el registro eliminado por si se quiere deshacer. */
  async remove(entity: T): Promise<StoreResult<T>> {
    const id = entity._id;
    this.markBusy(id, true);
    try {
      await this.api.remove(id);
      // Desde el detalle puede que el listado no esté cargado: el contador resta igual.
      if (!this._loaded()) this.badges.adjust(this.navId(), -1);
      this._items.update((items) => items.filter((item) => item._id !== id));
      if (this._selected()?._id === id) this._selected.set(null);
      // Pasa a la papelera, si ya se había cargado (si no, llegará con su primera carga).
      // La fecha exacta la pone el servidor; esta sirve hasta volver a pedirla.
      if (this._deletedLoaded()) {
        const trashed: T = {
          ...entity,
          isActive: false,
          status: 'deleted',
          deletedAt: new Date().toISOString(),
        };
        this._deleted.update((deleted) => [
          trashed,
          ...deleted.filter((item) => item._id !== id),
        ]);
      }
      return { ok: true, data: entity };
    } catch (error) {
      const apiError = this.errors.handle(error, { notFoundMessage: this.notFoundMessage });
      if (apiError.isNotFound) void this.load();
      return { ok: false, error: apiError };
    } finally {
      this.markBusy(id, false);
    }
  }

  /** Deshace un borrado recién hecho y deja el registro con el estado activo que tenía. */
  async restore(entity: T): Promise<StoreResult<T>> {
    try {
      const restored = await this.api.restore(entity._id, entity.isActive);
      if (!this._loaded()) this.badges.adjust(this.navId(), 1);
      this.putBack(restored);
      this._deleted.update((deleted) => deleted.filter((item) => item._id !== restored._id));
      return { ok: true, data: restored };
    } catch (error) {
      return { ok: false, error: this.errors.handle(error) };
    }
  }

  /** Pide la papelera a la API. */
  async loadDeleted(): Promise<void> {
    if (this._deletedLoading()) return;

    this._deletedLoading.set(true);
    this._deletedError.set(null);
    try {
      this._deleted.set(await this.api.getDeleted());
      this._deletedLoaded.set(true);
    } catch (error) {
      this._deletedError.set(this.errors.handle(error));
    } finally {
      this._deletedLoading.set(false);
    }
  }

  /**
   * Restaura un registro desde la papelera, activo o inactivo. Es optimista: sale
   * de la papelera al instante y, si la API falla, vuelve a su sitio y se avisa.
   */
  async restoreFromTrash(entity: T, isActive: boolean): Promise<StoreResult<T>> {
    const id = entity._id;
    if (this.isBusy(id)) return { ok: true, data: entity };

    const before = this._deleted();
    this._deleted.set(before.filter((item) => item._id !== id));
    this.markBusy(id, true);
    try {
      const restored = await this.api.restore(id, isActive);
      // Si el listado aún no se ha cargado, ya llegará con su primera carga; mientras
      // tanto, el contador del menú suma el restaurado.
      if (this._loaded()) this.putBack(restored);
      else this.badges.adjust(this.navId(), 1);
      return { ok: true, data: restored };
    } catch (error) {
      const apiError = this.errors.handle(error, { notFoundMessage: this.notFoundMessage });
      // 404: ya no existe. 409 "no está eliminado": alguien lo restauró antes. En los dos
      // casos la papelera que hay en memoria está anticuada y se vuelve a pedir. Si el 409
      // es por una referencia que sigue en la papelera, el registro vuelve a su sitio.
      if (apiError.isNotFound || (apiError.isConflict && !apiError.isMissingReference)) {
        void this.loadDeleted();
      } else {
        this._deleted.set(before);
      }
      return { ok: false, error: apiError };
    } finally {
      this.markBusy(id, false);
    }
  }

  /**
   * Pide confirmación y elimina el registro. Devuelve true si se ha eliminado.
   * Después ofrece deshacerlo durante unos segundos, sin hacer esperar a quien llama.
   */
  async confirmAndRemove(entity: T): Promise<boolean> {
    const confirmed = await this.notifications.confirm({
      title: `¿Eliminar «${this.displayName(entity)}»?`,
      text: 'Dejará de aparecer en el panel. Podrás deshacerlo justo después.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return false;

    const result = await this.remove(entity);
    if (!result.ok) return false;

    void this.offerUndo(entity);
    return true;
  }

  /** Restaura un registro desde la papelera y lo confirma con un aviso. */
  async restoreAndNotify(entity: T, isActive: boolean): Promise<void> {
    const result = await this.restoreFromTrash(entity, isActive);
    if (!result.ok) return;

    const { gender } = this.labels;
    const state = statusWord(isActive ? 'active' : 'inactive', gender);
    void this.notifications.success(
      isActive ? `${this.restoredText()} y ${state}.` : `${this.restoredText()} como ${state}.`,
    );
  }

  private async offerUndo(entity: T): Promise<void> {
    const { singular, gender } = this.labels;
    const undo = await this.notifications.undoable(
      `${capitalize(singular)} ${statusWord('deleted', gender)}.`,
    );
    if (!undo) return;

    const restored = await this.restore(entity);
    if (restored.ok) void this.notifications.success(`${this.restoredText()}.`);
  }

  /** "Ruta restaurada" o "Usuario restaurado". */
  private restoredText(): string {
    const { singular, gender } = this.labels;
    return `${capitalize(singular)} ${agree(gender, 'restaurada', 'restaurado')}`;
  }

  /** Id de la sección en el menú: la ruta del listado sin la barra. */
  private navId(): string {
    return this.listPath.slice(1);
  }

  /** Devuelve un registro restaurado al listado, en su sitio por fecha de creación. */
  private putBack(entity: T): void {
    this._items.update((items) =>
      newestFirst([entity, ...items.filter((item) => item._id !== entity._id)]),
    );
  }

  /**
   * Trae un registro por su `_id` y lo pone al día en el listado. Es una
   * comprobación de fondo: si tampoco responde, se queda lo que había y no se avisa
   * (el fallo original ya se ha mostrado).
   */
  private async resync(id: string): Promise<void> {
    try {
      this.replace(await this.api.getById(id));
    } catch {
      // Se mantiene el estado anterior.
    }
  }

  private replace(entity: T): void {
    this._items.update((items) =>
      items.map((item) => (item._id === entity._id ? entity : item)),
    );
    if (this._selected()?._id === entity._id) this._selected.set(entity);
  }

  private markBusy(id: string, busy: boolean): void {
    this._busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
