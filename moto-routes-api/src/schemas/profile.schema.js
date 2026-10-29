import { z } from "zod";
import { EXPERIENCE_LEVELS, PHONE_PATTERN, PROFILE_LIMITS as LIMITS } from "../models/profile.model.js";
import { cannotChange, clearable } from "./common.schema.js";

// El perfil no tiene endpoints de crear ni eliminar: llega dentro del usuario (profile)
// en POST/PATCH /api/users y en PATCH /api/profile/... Todos los campos son opcionales.

// Formato internacional (E.164): "+34600111222"
const phone = z.string().trim().max(LIMITS.phoneMax).regex(PHONE_PATTERN);

// Hace `years` años, a las 00:00 UTC de hoy
function yearsAgo(years) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

// Solo el día ("1990-05-17"): sin hora ni zona, se guarda a las 00:00 UTC
const birthDate = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => date <= yearsAgo(LIMITS.minAge), {
    message: `birthDate must be at least ${LIMITS.minAge} years ago`,
  })
  .refine((date) => date >= new Date("1900-01-01T00:00:00.000Z"), {
    message: "birthDate must be after 1900-01-01",
  });

const profileFields = z.strictObject({
  bio: z.string().trim().max(LIMITS.bioMax).optional(),
  phone: phone.optional(),
  city: z.string().trim().max(LIMITS.cityMax).optional(),
  birthDate: birthDate.optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  // Se envía entero: nombre y teléfono
  emergencyContact: z
    .strictObject({
      name: z.string().trim().min(1).max(LIMITS.contactNameMax),
      phone,
    })
    .optional(),
});

export const createProfileSchema = profileFields;

// Cualquier campo se vacía enviando null
export const updateProfileSchema = profileFields.extend({
  ...clearable(profileFields, ...Object.keys(profileFields.shape)),
  ...cannotChange("_id", "userId", "updatedBy", "deletedAt"),
});
