import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/host.schema.js).
export const HOST_LIMITS = Object.freeze({ nameMin: 2, nameMax: 100, biographyMax: 1000 });

// Perfil público de un anfitrión. La cuenta está en users.
const hostSchema = new mongoose.Schema(
  {
    // Un usuario tiene como mucho un perfil de anfitrión
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: HOST_LIMITS.nameMin,
      maxlength: HOST_LIMITS.nameMax,
    },
    biography: { type: String, trim: true, maxlength: HOST_LIMITS.biographyMax },
  },
  { timestamps: true }
);

hostSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

hostSchema.plugin(statusPlugin);
hostSchema.plugin(slugPlugin, { source: (doc) => doc.name, fields: ["name"] });
hostSchema.plugin(softDeletePlugin);

export const Host = mongoose.model("Host", hostSchema);
