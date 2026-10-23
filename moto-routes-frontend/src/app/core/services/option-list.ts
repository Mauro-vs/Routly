import { signal } from '@angular/core';

import { ErrorHandlerService } from './error-handler.service';

/**
 * Opciones de un select de formulario que vienen de la API, por ejemplo los roles
 * activos para el rol de un usuario. Se piden cada vez que se abre el formulario:
 * puede haber opciones nuevas o alguna se ha desactivado.
 *
 *   readonly roleOptions = new OptionList(() => this.roles.getActives(), this.errors);
 */
export class OptionList<T> {
  private readonly _items = signal<T[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** Ya han llegado: hasta entonces no se sabe si una opción actual está inactiva. */
  readonly loaded = this._loaded.asReadonly();

  constructor(
    private readonly fetch: () => Promise<T[]>,
    private readonly errors: ErrorHandlerService,
  ) {}

  async load(): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    try {
      this._items.set(await this.fetch());
      this._loaded.set(true);
    } catch (error) {
      this.errors.handle(error);
    } finally {
      this._loading.set(false);
    }
  }
}
