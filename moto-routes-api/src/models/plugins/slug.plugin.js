import { buildSlug } from "../../utils/slugify.js";

/**
 * Añade `slug` (único) y lo regenera cuando cambian los campos de los que sale.
 *
 * @param {(values: object) => string} options.source texto del slug a partir del documento o del update
 * @param {string[]} options.fields campos de los que depende: si cambia alguno, se regenera
 *
 * Uso: schema.plugin(slugPlugin, { source: (doc) => doc.title, fields: ["title"] })
 */
export function slugPlugin(schema, { source, fields }) {
  schema.add({
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  });

  schema.pre("validate", function () {
    if (!this.slug || fields.some((field) => this.isModified(field))) {
      this.slug = buildSlug(source(this), this._id);
    }
  });

  // En los PATCH el update solo trae los campos que cambian; el _id está en el filtro
  schema.pre("findOneAndUpdate", function () {
    const update = this.getUpdate() ?? {};
    const values = { ...update, ...update.$set };
    const id = this.getFilter()._id;

    if (id && fields.some((field) => values[field] !== undefined)) {
      this.set("slug", buildSlug(source(values), id));
    }
  });
}
