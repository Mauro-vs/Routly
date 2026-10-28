import { ROLES } from "../models/role.model.js";
import { forbidden, notFound, unauthorized } from "../utils/errors.js";
import { authenticate } from "./authenticate.js";

/**
 * RBAC: deja pasar solo a los roles indicados. Va siempre después de authenticate.
 * Sin sesión, 401; con sesión pero otro rol, 403.
 *
 * Uso: router.post("/", authenticate, authorizeRoles("host", "admin"), ...)
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const isAdmin = authorizeRoles(ROLES.ADMIN);

// Las dos combinaciones que usan los routers (Express acepta un array de middlewares)
export const adminOnly = [authenticate, isAdmin];
export const hostOrAdmin = [authenticate, authorizeRoles(ROLES.HOST, ROLES.ADMIN)];

/**
 * ABAC en la ruta, para cuando es más limpio que en el service: carga el recurso y lo
 * comprueba con un helper de utils/access.js. Si no existe, 404; si no se cumple, 403.
 *
 * Uso: router.get("/:userId", authenticate,
 *        authorizeOwnership((req) => userRepository.findById(req.params.userId), canAccessUserResource, "User"), ...)
 */
export function authorizeOwnership(loadResource, check, resource = "Resource") {
  return async (req, res, next) => {
    try {
      if (!req.user) throw unauthorized();
      const document = await loadResource(req);
      if (!document) throw notFound(resource);
      if (!check(req.user, document)) throw forbidden();
      next();
    } catch (error) {
      next(error);
    }
  };
}
