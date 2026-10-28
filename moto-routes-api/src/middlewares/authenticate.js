import { userRepository } from "../repositories/user.repository.js";
import { unauthorized } from "../utils/errors.js";
import { verifyToken } from "../utils/jwt.js";

// "Bearer <token>": el esquema sin distinguir mayúsculas (RFC 6750) y un solo token
const BEARER = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*)$/i;

/**
 * Exige sesión. Lee Authorization: Bearer <token>, comprueba la firma y la caducidad
 * (verifyToken) y que el usuario siga existiendo: no eliminado, activo y con el mismo
 * tokenVersion. Deja en req.user { id, email, role, name }, con el rol leído de la base
 * de datos: un cambio de rol se aplica en la siguiente petición, sin esperar al token.
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
    const user = await userRepository.findAuthById(payload.sub);

    if (!user || !user.isActive || !user.role || user.tokenVersion !== payload.tv) {
      throw unauthorized("TOKEN_INVALID");
    }

    req.user = { id: String(user._id), email: user.email, role: user.role.name, name: user.name };
    next();
  } catch (error) {
    next(error);
  }
}
