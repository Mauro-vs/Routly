export type EntityStatus = 'active' | 'inactive' | 'deleted';

/**
 * Campos que la API añade a todos los recursos.
 * `status` es la fuente de verdad en el servidor; `isActive` se deriva de él.
 * Las lecturas pueden ir por `slug`; las escrituras van siempre por `_id`.
 */
export interface BaseEntity {
  _id: string;
  slug: string;
  status: EntityStatus;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
