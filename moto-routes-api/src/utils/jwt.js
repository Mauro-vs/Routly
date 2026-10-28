import jwt from "jsonwebtoken";
import { loadAuthConfig } from "../config/auth.js";
import { unauthorized } from "./errors.js";
import { OBJECT_ID_PATTERN } from "./objectId.js";

// El algoritmo es fijo: verifyToken no acepta ningún otro (ni "none")
const ALGORITHM = "HS256";

/**
 * Firma el token de un usuario. La caducidad es la exp estándar (JWT_EXPIRES_IN).
 * Payload: sub (id), email, role (su name) y tv (tokenVersion: si cambia en la base de
 * datos, los tokens anteriores dejan de servir).
 *
 * @param role el name del rol ("admin", "host", "rider"), no el documento
 */
export function createToken({ _id, email, role, tokenVersion = 0 }) {
  if (typeof role !== "string") throw new Error("createToken needs the role name");
  const { secret, expiresIn } = loadAuthConfig();
  return jwt.sign({ sub: String(_id), email, role, tv: tokenVersion }, secret, {
    algorithm: ALGORITHM,
    expiresIn,
  });
}

// Lo que tiene que traer un token nuestro: si falta algo, no es válido
const isValidPayload = (payload) =>
  OBJECT_ID_PATTERN.test(payload?.sub) &&
  typeof payload.role === "string" &&
  Number.isInteger(payload.tv);

/**
 * Comprueba la firma y la caducidad y devuelve el payload. Si falta, está caducado o
 * no es válido, lanza un 401. Que el usuario siga existiendo lo comprueba authenticate.
 */
export function verifyToken(token) {
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, loadAuthConfig().secret, { algorithms: [ALGORITHM] });
  } catch (error) {
    throw unauthorized(error instanceof jwt.TokenExpiredError ? "TOKEN_EXPIRED" : "TOKEN_INVALID");
  }

  if (!isValidPayload(payload)) throw unauthorized("TOKEN_INVALID");
  return payload;
}

/** Segundos de vida de un token recién firmado: para el expiresIn de la respuesta del login. */
export function tokenLifetime(token) {
  const { iat, exp } = jwt.decode(token);
  return exp - iat;
}
