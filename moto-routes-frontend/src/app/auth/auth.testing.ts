import { AuthUser } from './auth.models';

/** Un token con la forma de los de la API. Por defecto, caduca dentro de una hora. */
export function fakeToken(expiresInSeconds = 3600, role = 'admin'): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS256' })}.${encode({ sub: '1', role, exp })}.firma`;
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
