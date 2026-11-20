import { RoleSummary } from '../core/models/role.model';
import { User } from '../core/models/user.model';

/** Los dos niveles de acceso: `admin` es ADMIN, y cualquier otro rol (rider, host...), USER. */
export type AccessRole = 'ADMIN' | 'USER';

/** Clave del rol de administrador en la API. Los roles pueden ser más que los tres base. */
export const ADMIN_ROLE = 'admin';

/**
 * Usuario con sesión iniciada: el de `/api/profile/me`, con su rol y su perfil. El servicio de
 * auth solo devuelve lo mínimo (SessionResponse), así que tras el login se pide a la API.
 */
export interface AuthUser extends Omit<User, 'role'> {
  role: RoleSummary;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Respuesta del servicio de auth al login, al registro, al refresh y al cambio de contraseña.
 * Deja además dos cookies httpOnly: `routly_session` (el token de acceso, 15 min) y
 * `routly_refresh` (para renovarlo, solo viaja a /auth). El `token` del body (para Swagger y
 * Postman, solo fuera de producción) se ignora y no se guarda.
 */
export interface SessionResponse {
  token?: string;
  tokenType: string;
  /** Segundos de vida del token de acceso. */
  expiresIn: number;
  /** Segundos que se puede renovar la sesión sin volver a entrar. */
  refreshExpiresIn: number;
  user: { id: string; name: string; email: string; role: string };
}

/**
 * Lo que se guarda en `localStorage`: hasta cuándo se puede renovar la sesión y de quién es,
 * para avisar a tiempo y enterarse de los cambios de otras pestañas. Ni los tokens, que viven
 * en las cookies, ni el usuario, que se pide a la API al arrancar.
 */
export interface Session {
  /** Cuándo deja de poder renovarse la sesión, en milisegundos desde 1970. */
  expiresAt: number;
  /** El usuario de la sesión: si otra pestaña solo la renueva, este no cambia. */
  userId: string;
}
