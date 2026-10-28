import { revokedTokenRepository } from "../repositories/revokedToken.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { createError } from "../utils/errors.js";
import { createToken, tokenLifetime } from "../utils/jwt.js";
import { hashPassword, needsRehash, verifyPassword } from "../utils/passwd.js";
import { userService } from "./user.service.js";

// El mismo 401 si el correo no existe, la contraseña no coincide o la cuenta no puede
// entrar: no se dice cuál de las tres
const invalidCredentials = () => createError("Invalid email or password", 401);

// Hash de una contraseña que nadie tiene. Si el correo no existe se compara contra él,
// para que la respuesta tarde lo mismo y no delate qué correos están registrados
let dummyHash;
const getDummyHash = () => (dummyHash ??= hashPassword("routly-timing-dummy-0"));

/*
 * Auth no tiene modelo propio: trabaja sobre User. El registro pasa por
 * userService.create (que crea también el perfil) y la sesión es un JWT (utils/jwt.js).
 */
export const authService = {
  // Lo que devuelven el login, el registro y el cambio de contraseña
  async session(userId) {
    const [user, auth] = await Promise.all([
      userService.getById(userId),
      userRepository.findAuthById(userId),
    ]);
    const token = createToken({ ...user, role: user.role.name, tokenVersion: auth.tokenVersion });
    return { token, tokenType: "Bearer", expiresIn: tokenLifetime(token), user };
  },

  // Siempre como rider: el esquema no acepta roleId
  async register(data) {
    const user = await userService.create(data);
    return authService.session(user._id);
  },

  async login({ email, password }) {
    const user = await userRepository.findForLogin(email);
    const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);

    // Los eliminados ya no llegan (plugin softDelete); los inactivos o sin un rol activo, no entran
    if (!user || !valid || !user.isActive || !user.role?.isActive) throw invalidCredentials();

    // Parámetros de Argon2 de antes: se rehace el hash ahora que se tiene la contraseña
    if (needsRehash(user.passwordHash)) {
      await userRepository.updateById(user._id, { passwordHash: await hashPassword(password) });
    }
    return authService.session(user._id);
  },

  async me(actor) {
    return userService.getById(actor.id);
  },

  // Cierra esta sesión: su token pasa a la lista negra hasta que caduca. Las demás siguen
  async logout(actor, auth) {
    await revokedTokenRepository.revoke({ jti: auth.jti, userId: actor.id, expiresAt: auth.expiresAt });
  },

  // Cierra todas las sesiones del usuario, también esta: sube tokenVersion
  async logoutAll(actor) {
    await userRepository.revokeTokens(actor.id);
  },
};
