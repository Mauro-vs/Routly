import { Injectable, inject } from '@angular/core';

import { Category, CategoryPayload } from '../../../core/models/category.model';
import { EntityStore } from '../../../core/services/entity.store';
import { CollectionLabels } from '../../../shared/utils/labels';
import { CategoriesService } from './categories.service';

/** Cómo se nombra la colección en los textos del panel. */
export const CATEGORY_LABELS: CollectionLabels = {
  singular: 'categoría',
  plural: 'categorías',
  gender: 'f',
};

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
  readonly labels = CATEGORY_LABELS;

  displayName(category: Category): string {
    return category.name;
  }

  /** Por nombre, sin distinguir mayúsculas ni tildes, como la API. */
  protected override compare(a: Category, b: Category): number {
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  }
}
