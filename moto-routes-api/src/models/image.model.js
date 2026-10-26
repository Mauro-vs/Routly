import mongoose from "mongoose";
import { IMAGE_OWNER_TYPES } from "./imageOwners.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { integer } from "./validators.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/image.schema.js).
export const IMAGE_LIMITS = Object.freeze({ urlMax: 2048, altMax: 200 });

// Imágenes de cualquier colección. Solo se guarda la URL: no hay subida de archivos.
// No tiene slug: se identifica por su _id y se pide siempre a través de su dueño.
const imageSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: IMAGE_OWNER_TYPES, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: IMAGE_LIMITS.urlMax,
      match: /^https:\/\//i,
    },
    alt: { type: String, trim: true, maxlength: IMAGE_LIMITS.altMax },
    position: { type: Number, min: 0, default: 0, validate: integer },
    // Imagen principal: portada de una ruta, foto de perfil de un usuario...
    isCover: { type: Boolean, default: false },
  },
  { timestamps: true }
);

imageSchema.plugin(statusPlugin);
imageSchema.plugin(softDeletePlugin);

imageSchema.index({ ownerType: 1, ownerId: 1, position: 1 });
// Como mucho una imagen principal por dueño
imageSchema.index(
  { ownerType: 1, ownerId: 1 },
  { unique: true, partialFilterExpression: { isCover: true } }
);

export const Image = mongoose.model("Image", imageSchema);
