import mongoose from "mongoose";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/profile.schema.js).
// minAge: edad mínima para tener cuenta (fecha de nacimiento)
export const PROFILE_LIMITS = Object.freeze({
  bioMax: 500,
  phoneMax: 16,
  cityMax: 100,
  bikeModelMax: 100,
  contactNameMax: 100,
  minAge: 14,
});

export const EXPERIENCE_LEVELS = Object.freeze(["beginner", "intermediate", "advanced", "expert"]);

// Teléfono en formato internacional E.164: "+34600111222" (de 8 a 15 dígitos)
export const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: PROFILE_LIMITS.contactNameMax },
    phone: { type: String, required: true, trim: true, match: PHONE_PATTERN },
  },
  { _id: false }
);

/**
 * Datos extendidos de un usuario (User 1 → 1 Profile). El perfil depende del usuario y
 * el usuario no sabe nada del perfil. No tiene vida propia: lo crea, lo cambia, lo
 * elimina y lo restaura siempre userService, y por eso no lleva los plugins de estado
 * ni de soft delete. Su deletedAt es el del usuario. La foto es la coverImage del usuario.
 *
 * Todos los campos son opcionales: el perfil se crea vacío con el usuario.
 */
const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, immutable: true },
    bio: { type: String, trim: true, maxlength: PROFILE_LIMITS.bioMax },
    phone: { type: String, trim: true, match: PHONE_PATTERN },
    city: { type: String, trim: true, maxlength: PROFILE_LIMITS.cityMax },
    birthDate: { type: Date },
    bikeModel: { type: String, trim: true, maxlength: PROFILE_LIMITS.bikeModelMax },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS },
    emergencyContact: { type: emergencyContactSchema },
    // Quién hizo el último cambio: el propio usuario o un admin
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Lo pone userService al eliminar el usuario, con el mismo valor que el suyo
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Profile = mongoose.model("Profile", profileSchema);
