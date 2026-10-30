import { BaseEntity } from './entity.model';
import { ImageSummary } from './image.model';
import { Profile, ProfilePayload } from './profile.model';
import { RoleSummary } from './role.model';

/** Cuenta de la plataforma. La API nunca devuelve la contraseña ni su hash. */
export interface User extends BaseEntity {
  name: string;
  email: string;
  roleId: string;
  role: RoleSummary | null;
  /** Foto de perfil. */
  coverImage?: ImageSummary | null;
  /** Sus datos extendidos: pertenecen al usuario y llegan siempre con él. */
  profile?: Profile | null;
}

/** Lo que trae un anfitrión de su usuario (`populate`). El email solo llega con token de admin. */
export type UserSummary = Pick<User, '_id' | 'name'> & Partial<Pick<User, 'email'>>;

/**
 * Cuerpo de `POST /api/users`. Sin `roleId`, la API asigna el rol rider.
 * `password` es obligatoria al crear; en el PATCH solo se envía para cambiarla.
 */
export interface UserPayload {
  name: string;
  email: string;
  password: string;
  roleId?: string;
  profile?: ProfilePayload;
}

export const USER_LIMITS = {
  name: 100,
  email: 254,
  passwordMin: 8,
  passwordMax: 128,
} as const;
