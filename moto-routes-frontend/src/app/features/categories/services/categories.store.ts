import { Injectable, inject } from '@angular/core';

import { Category, CategoryPayload } from '../../../core/models/category.model';
import { EntityStore } from '../../../core/services/entity.store';
import { CategoriesService } from './categories.service';

/**
 * Estado de las categorías con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesStore extends EntityStore<Category, CategoryPayload> {
  protected readonly api = inject(CategoriesService);
  protected readonly listPath = '/categories';
  protected override readonly notFoundMessage = 'Esa categoría ya no existe.';
}
