import { z } from "zod";
import { USER_LIMITS as LIMITS } from "../models/user.model.js";
import { createUserSchema } from "./user.schema.js";

// Registro público: las mismas reglas que el alta de un usuario (contraseña incluida),
// sin roleId ni profile. Si llega roleId, 400 "roleId is not allowed": siempre es rider.
export const registerSchema = createUserSchema.pick({ name: true, email: true, password: true });

// En el login no se aplican las reglas de la contraseña: solo se compara con el hash,
// y un 400 diría más de lo que debe. Todo lo demás es el mismo 401.
export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(1).max(LIMITS.emailMax),
  password: z.string().min(1).max(128),
});
