import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { BaseEntity } from '../models/entity.model';
import { ApiService } from '../services/api.service';
import { ErrorHandlerService } from '../services/error-handler.service';

/**
 * `/<colección>/id/:id`: lleva al detalle de un registro del que solo se conoce el `_id`.
 * Algunas relaciones llegan sin slug (el rol de un usuario, el usuario de un anfitrión, el
 * dueño de una imagen): se pide el registro por su id y se cambia la navegación por la de su
 * detalle. Si no existe, avisa y lleva al listado.
 */
export const recordByIdGuard: CanActivateFn = async (route) => {
  const api = inject(ApiService);
  const errors = inject(ErrorHandlerService);
  const router = inject(Router);
  // La colección es el primer tramo de la URL: `routes`, `users`...
  const listPath = `/${route.pathFromRoot.flatMap((item) => item.url.map((segment) => segment.path)).at(0)}`;

  try {
    const record = await api.get<BaseEntity>(`${listPath}/${encodeURIComponent(route.paramMap.get('id') ?? '')}`);
    return router.createUrlTree([listPath, record.slug]);
  } catch (error) {
    errors.handle(error);
    return router.createUrlTree([listPath]);
  }
};
