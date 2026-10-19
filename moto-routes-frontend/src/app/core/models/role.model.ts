import { BaseEntity } from './entity.model';

/** Tipo de usuario. Los roles base (admin, host, rider) no se pueden desactivar ni eliminar. */
export interface Role extends BaseEntity {
  /** Clave que usa el código: `admin`, `host`, `rider`... */
  name: string;
  /** Nombre visible: "Administrador". */
  label: string;
  description?: string;
  isSystem: boolean;
}

/** Lo que trae un usuario de su rol (`populate`). */
export type RoleSummary = Pick<Role, '_id' | 'name' | 'label'>;

/** Cuerpo de `POST /api/roles`. `isSystem` no se puede enviar. */
export interface RolePayload {
  name: string;
  label: string;
  description?: string;
}

export const ROLE_LIMITS = {
  name: 30,
  label: 50,
  description: 200,
} as const;
