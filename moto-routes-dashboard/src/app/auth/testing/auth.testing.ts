import { AuthUser, SessionResponse } from '../auth.models';

/** Un token con la forma de los de auth. Por defecto, caduca dentro de una hora. */
export function fakeToken(expiresInSeconds = 3600, role = 'admin'): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'RS256' })}.${encode({ sub: '1', role, exp })}.firma`;
}

export function fakeUser(role = 'admin'): AuthUser {
  return {
    _id: '1',
    name: 'Ana',
    email: 'ana@routly.dev',
    roleId: 'r1',
    role: { _id: 'r1', name: role, label: role },
    slug: 'ana',
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** La respuesta de auth al login, al registro, al refresh y al cambio de contraseña. */
export function fakeSession(role = 'admin', refreshExpiresIn = 7 * 24 * 3600): SessionResponse {
  return {
    token: fakeToken(900, role),
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn,
    user: { id: '1', name: 'Ana', email: 'ana@routly.dev', role },
  };
}

/** La sesión tal como la guarda AuthStore en localStorage. */
export function savedSession(expiresInMs = 3600_000, userId = '1'): string {
  return JSON.stringify({ expiresAt: Date.now() + expiresInMs, userId });
}
