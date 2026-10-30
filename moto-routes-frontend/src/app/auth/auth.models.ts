import { RoleSummary } from '../core/models/role.model';
import { User } from '../core/models/user.model';

/** Los dos niveles de acceso: `admin` es ADMIN, y cualquier otro rol (rider, host...), USER. */
export type AccessRole = 'ADMIN' | 'USER';

/** Clave del rol de administrador en la API. Los roles pueden ser más que los tres base. */
export const ADMIN_ROLE = 'admin';

/** Usuario con sesión iniciada: lo que devuelven el login, el registro y `/auth/me`. */
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

/** Respuesta del login, del registro y del cambio de contraseña. */
export interface AuthResponse {
  token: string;
  tokenType: string;
  /** Segundos de vida del token. */
  expiresIn: number;
  user: AuthUser;
}

/** Lo que se guarda en `localStorage`. El usuario no: se pide a la API al arrancar. */
export interface Session {
  token: string;
  /** Cuándo caduca el token, en milisegundos desde 1970. */
  expiresAt: number;
}
