/** El cliente con la sesión abierta, como lo da el servicio de auth (POST /auth/login y GET /auth/me). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** Nombre del rol en la API: 'rider' (cliente) o 'admin'. */
  role: string;
}

/** Lo que responde auth al abrir o renovar una sesión. Los tokens van en las cookies httpOnly. */
export interface SessionResponse {
  /** Segundos que dura el token de acceso (15 min). */
  expiresIn: number;
  /** Segundos que se puede renovar sin volver a entrar (7 días desde el último refresh). */
  refreshExpiresIn: number;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
}

/** Lo que se recuerda en localStorage: de quién es la sesión y hasta cuándo se puede renovar. */
export interface StoredSession {
  userId: string;
  expiresAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['email'] === 'string' &&
    typeof value['role'] === 'string'
  );
}

export function isSessionResponse(value: unknown): value is SessionResponse {
  return (
    isRecord(value) &&
    typeof value['refreshExpiresIn'] === 'number' &&
    value['refreshExpiresIn'] > 0 &&
    isAuthUser(value['user'])
  );
}
