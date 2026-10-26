import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

// Comparación en español sin distinguir mayúsculas ni tildes: "Montaña" = "montana"
// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/category.schema.js).
export const CATEGORY_LIMITS = Object.freeze({ nameMin: 2, nameMax: 60, descriptionMax: 300 });

export const CATEGORY_COLLATION = Object.freeze({ locale: "es", strength: 1 });

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: CATEGORY_LIMITS.nameMin,
      maxlength: CATEGORY_LIMITS.nameMax,
    },
    description: { type: String, trim: true, maxlength: CATEGORY_LIMITS.descriptionMax },
  },
  { timestamps: true }
);

categorySchema.plugin(statusPlugin);
categorySchema.plugin(slugPlugin, { source: (doc) => doc.name, fields: ["name"] });
categorySchema.plugin(softDeletePlugin);

categorySchema.index({ name: 1 }, { unique: true, collation: CATEGORY_COLLATION });

export const Category = mongoose.model("Category", categorySchema);
