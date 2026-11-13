import { Injectable } from '@angular/core';

import { Category, CategoryPayload } from '../../../core/models/category.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/categories`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesService extends EntityApiService<Category, CategoryPayload> {
  protected readonly path = '/categories';
}
