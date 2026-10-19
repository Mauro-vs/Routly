import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { DELETED_FIELDS } from "./status.js";

// Comparación en español sin distinguir mayúsculas ni tildes: "Montaña" = "montana"
export const CATEGORY_COLLATION = Object.freeze({ locale: "es", strength: 1 });

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

categorySchema.plugin(statusPlugin);
categorySchema.plugin(slugPlugin, { source: (doc) => doc.name, fields: ["name"] });
categorySchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

categorySchema.index({ name: 1 }, { unique: true, collation: CATEGORY_COLLATION });

export const Category = mongoose.model("Category", categorySchema);
