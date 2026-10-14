import { computed, inject, signal } from '@angular/core';

import { ApiError } from '../models/api-error.model';
import { BaseEntity, EntityStatus } from '../models/entity.model';
import { ErrorHandlerService } from './error-handler.service';

/** Llamadas a la API que necesita un store. Las implementa el servicio de cada entidad. */
export interface EntityApi<T extends BaseEntity, TPayload> {
  getAll(): Promise<T[]>;
  /** Solo los activos (`true`) o solo los inactivos (`false`). */
  getByActive(isActive: boolean): Promise<T[]>;
  /** La papelera: solo los eliminados, del más reciente al más antiguo. */
  getDeleted(): Promise<T[]>;
  getById(id: string): Promise<T>;
  getBySlug(slug: string): Promise<T>;
  create(payload: TPayload): Promise<T>;
  update(id: string, payload: Partial<TPayload>): Promise<T>;
  setActive(id: string, isActive: boolean): Promise<T>;
  remove(id: string): Promise<void>;
  restore(id: string, isActive: boolean): Promise<T>;
}

/** El mismo orden que usa la API en sus listados: del más reciente al más antiguo. */
function newestFirst<T extends BaseEntity>(items: T[]): T[] {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Resultado de una escritura: o los datos guardados, o el error ya normalizado. */
export type StoreResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Estado y operaciones comunes a cualquier entidad del panel, con signals.
 *
 * Para una entidad nueva basta con heredar y declarar `api` y `listPath`:
 *
 *   @Injectable({ providedIn: 'root' })
 *   export class RoutesStore extends EntityStore<Route, RoutePayload> {
 *     protected readonly api = inject(RoutesService);
 *     protected readonly listPath = '/routes';
 *   }
 *
 * Ningún método lanza: cada llamada va en su try/catch y los fallos pasan por
 * ErrorHandlerService, que decide qué aviso mostrar. Las lecturas dejan el error en
 * `error`; las escrituras lo devuelven en el resultado para que el formulario pueda
 * pintarlo junto a los campos.
 */
export abstract class EntityStore<T extends BaseEntity, TPayload> {
  protected abstract readonly api: EntityApi<T, TPayload>;
  /** Ruta del listado. Se vuelve a ella cuando un registro no existe. */
  protected abstract readonly listPath: string;
  /** Texto del aviso cuando un registro no existe. */
  protected readonly notFoundMessage: string | undefined = undefined;

  private readonly errors = inject(ErrorHandlerService);

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

  /** Trae un registro para editarlo. Si no existe, avisa, vuelve al listado y da null. */
  async getBySlug(slug: string): Promise<T | null> {
    const lookup = ++this.lookups;

    this._loading.set(true);
    this._error.set(null);
    this._selected.set(null);
    try {
      const entity = await this.api.getBySlug(slug);
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
      // Si el listado aún no se ha cargado, ya llegará con su primera carga.
      if (this._loaded()) this.putBack(restored);
      return { ok: true, data: restored };
    } catch (error) {
      const apiError = this.errors.handle(error, {
        notFoundMessage: this.notFoundMessage,
        conflictMessage: 'Ese registro ya estaba restaurado.',
      });
      // 404: ya no existe. 409: alguien lo restauró antes. En los dos casos la papelera
      // que hay en memoria está anticuada, así que se vuelve a pedir en vez de reponerlo.
      if (apiError.isNotFound || apiError.isConflict) void this.loadDeleted();
      else this._deleted.set(before);
      return { ok: false, error: apiError };
    } finally {
      this.markBusy(id, false);
    }
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
