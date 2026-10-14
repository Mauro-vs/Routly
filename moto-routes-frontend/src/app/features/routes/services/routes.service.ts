import { Injectable, inject } from '@angular/core';

import { Route, RoutePayload } from '../../../core/models/route.model';
import { ApiService } from '../../../core/services/api.service';
import { EntityApi } from '../../../core/services/entity.store';

/**
 * Llamadas a `/api/routes`: un método por cada endpoint de la API.
 * La API lee por `slug` o por `_id` pero escribe siempre por `_id`, y no tiene
 * DELETE: el borrado es lógico y va por PATCH.
 *
 *   GET   /routes              getAll
 *   GET   /routes/actives      getActives
 *   GET   /routes/inactives    getInactives
 *   GET   /routes/deleted      getDeleted
 *   GET   /routes/:id          getById
 *   GET   /routes/slug/:slug   getBySlug
 *   POST  /routes              create
 *   PATCH /routes/:id          update
 *   PATCH /routes/:id/active   setActive
 *   PATCH /routes/:id/delete   remove
 *   PATCH /routes/:id/restore  restore
 */
@Injectable({ providedIn: 'root' })
export class RoutesService implements EntityApi<Route, RoutePayload> {
  private readonly api = inject(ApiService);

  getAll(): Promise<Route[]> {
    return this.api.get<Route[]>('/routes');
  }

  getActives(): Promise<Route[]> {
    return this.api.get<Route[]>('/routes/actives');
  }

  getInactives(): Promise<Route[]> {
    return this.api.get<Route[]>('/routes/inactives');
  }

  getByActive(isActive: boolean): Promise<Route[]> {
    return isActive ? this.getActives() : this.getInactives();
  }

  getDeleted(): Promise<Route[]> {
    return this.api.get<Route[]>('/routes/deleted');
  }

  getById(id: string): Promise<Route> {
    return this.api.get<Route>(`/routes/${id}`);
  }

  getBySlug(slug: string): Promise<Route> {
    return this.api.get<Route>(`/routes/slug/${encodeURIComponent(slug)}`);
  }

  create(payload: RoutePayload): Promise<Route> {
    return this.api.post<Route>('/routes', payload);
  }

  update(id: string, payload: Partial<RoutePayload>): Promise<Route> {
    return this.api.patch<Route>(`/routes/${id}`, payload);
  }

  setActive(id: string, isActive: boolean): Promise<Route> {
    return this.api.patch<Route>(`/routes/${id}/active`, { isActive });
  }

  async remove(id: string): Promise<void> {
    await this.api.patch<null>(`/routes/${id}/delete`);
  }

  restore(id: string, isActive: boolean): Promise<Route> {
    return this.api.patch<Route>(`/routes/${id}/restore`, { isActive });
  }
}
