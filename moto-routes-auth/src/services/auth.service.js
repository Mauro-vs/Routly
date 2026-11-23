import { randomUUID } from "node:crypto";
import { conflict, createError, fieldError, unauthorized } from "../utils/errors.js";
import { hashPassword, needsRehash, verifyPassword } from "../utils/passwd.js";
import { hashRefreshToken } from "./token.service.js";

const DEFAULT_ROLE = "rider";
// Si dos pestañas renuevan a la vez con el mismo refresh, la segunda llega con uno recién gastado.
// Durante estos segundos no se toma por un robo
export const REFRESH_GRACE_MS = 10_000;

// El mismo 401 si el correo no existe, la contraseña no coincide o la cuenta no puede entrar
const invalidCredentials = () => createError("Invalid email or password", 401);

// Hash de una contraseña que nadie tiene. Si el correo no existe se compara contra él, para que
// la respuesta tarde lo mismo y no delate qué correos están registrados
let dummyHash;
const getDummyHash = () => (dummyHash ??= hashPassword("routly-timing-dummy-0"));

// Puede entrar: no eliminado (eso lo filtra el repositorio), activo y con un rol activo
const canSignIn = (user) => Boolean(user?.isActive && user.role?.isActive);

/*
 * La lógica de la sesión. No sabe nada de Express ni de cookies: recibe datos y devuelve tokens.
 *
 * Una sesión = un token de acceso + un refresh. login y register abren una (familia nueva);
 * refresh la renueva con el siguiente refresh de la misma familia.
 */
export function createAuthService({ repositories, tokens, now = Date.now }) {
  const { users, roles, profiles, sessions, revokedTokens } = repositories;

  // Emite el par de tokens de una familia (nueva o la que se renueva)
  async function issue(user, familyId = randomUUID()) {
    const refresh = tokens.newRefreshToken();
    await sessions.create({
      familyId,
      userId: user._id,
      tokenHash: refresh.hash,
      tokenVersion: user.tokenVersion ?? 0,
      expiresAt: new Date(now() + tokens.refreshTtl * 1000),
    });
    const accessToken = await tokens.signAccess({
      userId: user._id,
      role: user.role.name,
      tokenVersion: user.tokenVersion ?? 0,
      sessionId: familyId,
    });
    return {
      accessToken,
      accessTtl: tokens.accessTtl,
      refreshToken: refresh.token,
      refreshTtl: tokens.refreshTtl,
      user: publicUser(user),
    };
  }

  // Cierra todas las sesiones de un usuario: los tokens de acceso por tokenVersion, los refresh revocados
  async function closeAllSessions(userId) {
    await users.bumpTokenVersion(userId);
    await sessions.revokeByUser(userId, new Date(now()));
  }

  const revokeFamily = (familyId) => sessions.revokeFamily(familyId, new Date(now()));

  return {
    // Siempre como rider: el esquema no acepta roleId
    async register({ name, email, password }) {
      if (await users.emailTaken(email)) throw conflict("A user with this email already exists");

      const role = await roles.findActiveByName(DEFAULT_ROLE);
      if (!role) throw new Error(`Default role "${DEFAULT_ROLE}" is missing`);

      const { _id } = await users.create({ name, email, passwordHash: await hashPassword(password), roleId: role._id });
      // Todo usuario tiene su perfil (vacío). Sin transacciones: si falla, se deshace el alta
      try {
        await profiles.createEmpty(_id);
      } catch (error) {
        await users.deleteCreated(_id);
        throw error;
      }
      return issue(await users.findAuthById(_id));
    },

    async login({ email, password }) {
      const user = await users.findForLogin(email);
      const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
      if (!user || !valid || !canSignIn(user)) throw invalidCredentials();

      // Parámetros de Argon2 de antes: se rehace el hash ahora que se tiene la contraseña
      if (needsRehash(user.passwordHash)) {
        await users.updatePasswordHash(user._id, await hashPassword(password));
      }
      return issue(user);
    },

    /**
     * Renueva la sesión: gasta el refresh y emite el siguiente de la familia. Cualquier fallo es el
     * mismo 401, y el cliente vuelve al login.
     *
     * Un refresh ya gastado fuera de la gracia es la señal de que alguien lo ha copiado: no se sabe
     * cuál de los dos es el usuario, así que se cierran todas sus sesiones (también los tokens de
     * acceso que ya tenga el atacante, por tokenVersion).
     */
    async refresh(refreshToken) {
      if (!refreshToken) throw unauthorized();
      const hash = hashRefreshToken(refreshToken);
      const current = new Date(now());

      let session = await sessions.consume(hash, current);
      if (!session) {
        const spent = await sessions.findByHash(hash);
        // No existe, ha caducado o ya se cerró (logout...): sin más, 401
        if (!spent || spent.status !== "used" || spent.expiresAt <= current) throw unauthorized("TOKEN_INVALID");
        if (current - spent.usedAt > REFRESH_GRACE_MS) {
          await closeAllSessions(spent.userId);
          throw unauthorized("TOKEN_INVALID");
        }
        session = spent;
      }

      // El usuario puede haber cambiado desde el login: desactivado, rol quitado, contraseña nueva...
      const user = await users.findAuthById(String(session.userId));
      if (!canSignIn(user) || user.tokenVersion !== session.tokenVersion) {
        await revokeFamily(session.familyId);
        throw unauthorized("TOKEN_INVALID");
      }
      return issue(user, session.familyId);
    },

    /**
     * Cierra esta sesión. Vale con el refresh, con el token de acceso o con los dos: así se puede
     * salir aunque el de acceso ya haya caducado. Nunca falla (cerrar dos veces no es un error).
     */
    async logout({ refreshToken, access }) {
      if (refreshToken) {
        const session = await sessions.findByHash(hashRefreshToken(refreshToken));
        if (session) await revokeFamily(session.familyId);
      }
      if (access) {
        await revokeFamily(access.sid);
        await revokedTokens.revoke({ jti: access.jti, userId: access.sub, expiresAt: new Date(access.exp * 1000) });
      }
    },

    async logoutAll(actor) {
      await closeAllSessions(actor.id);
    },

    // El propio usuario, con su contraseña actual. Cierra todas sus sesiones y abre una nueva
    async changePassword(actor, { currentPassword, newPassword }) {
      const stored = await users.findPasswordHash(actor.id);
      if (!stored || !(await verifyPassword(stored.passwordHash, currentPassword))) {
        throw fieldError("currentPassword", "currentPassword is incorrect");
      }
      await users.updatePasswordHash(actor.id, await hashPassword(newPassword));
      await closeAllSessions(actor.id);
      return issue(await users.findAuthById(actor.id));
    },

    /**
     * El usuario de un token de acceso ya verificado, si sigue pudiendo entrar: no está en la lista
     * negra, sigue activo, con un rol activo y el mismo tokenVersion. Si no, 401.
     */
    async authenticate(payload) {
      const [user, revoked] = await Promise.all([users.findAuthById(payload.sub), revokedTokens.isRevoked(payload.jti)]);
      if (revoked || !canSignIn(user) || user.tokenVersion !== payload.tv) throw unauthorized("TOKEN_INVALID");
      return publicUser(user);
    },
  };
}

// Lo que se puede devolver de un usuario: nunca el hash ni el tokenVersion
export function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role.name };
}
