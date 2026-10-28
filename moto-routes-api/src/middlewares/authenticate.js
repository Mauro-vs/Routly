import { revokedTokenRepository } from "../repositories/revokedToken.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { unauthorized } from "../utils/errors.js";
import { verifyToken } from "../utils/jwt.js";

// "Bearer <token>": el esquema sin distinguir mayúsculas (RFC 6750) y un solo token
const BEARER = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*)$/i;

/**
 * Exige sesión. Lee Authorization: Bearer <token>, comprueba la firma y la caducidad
 * (verifyToken), que el token no se haya cerrado con un logout (lista negra) y que el
 * usuario siga existiendo: no eliminado, activo, con un rol activo y el mismo tokenVersion.
 *
 * Deja en req.user { id, email, role, name }, con el rol leído de la base de datos: un
 * cambio de rol se aplica en la siguiente petición, sin esperar al token. Y en req.auth
 * { jti, expiresAt }: lo que necesita el logout para cerrar esta sesión.
 *
 * Cualquier fallo es el mismo 401 "Authentication required" (utils/errors.js).
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) throw unauthorized();

    const match = BEARER.exec(header.trim());
    if (!match) throw unauthorized("TOKEN_INVALID");

    const payload = verifyToken(match[1]);
    const [user, revoked] = await Promise.all([
      userRepository.findAuthById(payload.sub),
      revokedTokenRepository.isRevoked(payload.jti),
    ]);

    if (revoked || !user || !user.isActive || !user.role?.isActive || user.tokenVersion !== payload.tv) {
      throw unauthorized("TOKEN_INVALID");
    }

    req.user = { id: String(user._id), email: user.email, role: user.role.name, name: user.name };
    req.auth = { jti: payload.jti, expiresAt: new Date(payload.exp * 1000) };
    next();
  } catch (error) {
    next(error);
  }
}
