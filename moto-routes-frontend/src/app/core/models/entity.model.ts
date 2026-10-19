export type EntityStatus = 'active' | 'inactive' | 'deleted';

/**
 * Campos que la API añade a todos los registros.
 * `status` es la fuente de verdad en el servidor; `isActive` se deriva de él.
 * Las escrituras van siempre por `_id`.
 */
export interface BaseRecord {
  _id: string;
  status: EntityStatus;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Registro con página propia: además se puede leer por su `slug`.
 * Son todos menos las imágenes.
 */
export interface BaseEntity extends BaseRecord {
  slug: string;
}
