import { BaseEntity } from './entity.model';

/** Tipo de ruta: costa, montaña, puertos... */
export interface Category extends BaseEntity {
  name: string;
  description?: string;
}

/** Lo que trae una ruta de su categoría (`populate`). */
export type CategorySummary = Pick<Category, '_id' | 'name' | 'slug'>;

export interface CategoryPayload {
  name: string;
  description?: string | null;
}

export const CATEGORY_LIMITS = {
  name: 60,
  description: 300,
} as const;
