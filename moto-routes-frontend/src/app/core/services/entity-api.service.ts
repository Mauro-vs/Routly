import { inject } from '@angular/core';

import { BaseEntity, BaseRecord } from '../models/entity.model';
import { ApiService } from './api.service';
import { EntityApi } from './entity.store';

/**
 * Llamadas a los endpoints que tienen todas las colecciones de la API. El servicio de
 * cada entidad hereda de aquí y solo declara su ruta base (`path`); si tiene endpoints
 * propios, los añade.
 *
 * La API lee por `slug` o por `_id` pero escribe siempre por `_id`, y no tiene DELETE:
 * el borrado es lógico y va por PATCH.
 *
 *   GET   /<path>              getAll
 *   GET   /<path>/actives      getActives
 *   GET   /<path>/inactives    getInactives
 *   GET   /<path>/deleted      getDeleted
 *   GET   /<path>/:id          getById
 *   GET   /<path>/slug/:slug   getBySlug (EntityApiService)
 *   POST  /<path>              create
 *   PATCH /<path>/:id          update
 *   PATCH /<path>/:id/active   setActive
 *   PATCH /<path>/:id/delete   remove
 *   PATCH /<path>/:id/restore  restore
 */
export abstract class RecordApiService<T extends BaseRecord, TPayload>
  implements EntityApi<T, TPayload>
{
  protected readonly api = inject(ApiService);
  /** Ruta base del recurso en la API, por ejemplo `/routes`. */
  protected abstract readonly path: string;

  getAll(): Promise<T[]> {
    return this.api.get<T[]>(this.path);
  }

  getActives(): Promise<T[]> {
    return this.api.get<T[]>(`${this.path}/actives`);
  }

  getInactives(): Promise<T[]> {
    return this.api.get<T[]>(`${this.path}/inactives`);
  }

  getByActive(isActive: boolean): Promise<T[]> {
    return isActive ? this.getActives() : this.getInactives();
  }

  getDeleted(): Promise<T[]> {
    return this.api.get<T[]>(`${this.path}/deleted`);
  }

  getById(id: string): Promise<T> {
    return this.api.get<T>(`${this.path}/${id}`);
  }

  create(payload: TPayload): Promise<T> {
    return this.api.post<T>(this.path, payload);
  }

  update(id: string, payload: Partial<TPayload>): Promise<T> {
    return this.api.patch<T>(`${this.path}/${id}`, payload);
  }

  setActive(id: string, isActive: boolean): Promise<T> {
    return this.api.patch<T>(`${this.path}/${id}/active`, { isActive });
  }

  async remove(id: string): Promise<void> {
    await this.api.patch<null>(`${this.path}/${id}/delete`);
  }

  restore(id: string, isActive: boolean): Promise<T> {
    return this.api.patch<T>(`${this.path}/${id}/restore`, { isActive });
  }
}

/** Lo mismo para las entidades con página propia, que además se leen por `slug`. */
export abstract class EntityApiService<T extends BaseEntity, TPayload> extends RecordApiService<
  T,
  TPayload
> {
  getBySlug(slug: string): Promise<T> {
    return this.api.get<T>(`${this.path}/slug/${encodeURIComponent(slug)}`);
  }
}
