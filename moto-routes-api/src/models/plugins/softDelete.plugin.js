const QUERIES_TO_FILTER = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "countDocuments",
  "updateOne",
  "updateMany",
];

/**
 * Soft delete reutilizable para cualquier modelo.
 *
 * - Añade `deletedAt` (null = no eliminado).
 * - Middleware de consultas: excluye automáticamente los eliminados, salvo que
 *   la consulta filtre por `deletedAt` explícitamente o pida incluirlos con
 *   `.setOptions({ withDeleted: true })`.
 * - `Model.softDeleteById(id)`: marca el documento como eliminado en vez de borrarlo.
 * - `Model.restoreById(id, fields)`: restaura un documento eliminado (`deletedAt` a null).
 *
 * @param {object} options.deletedFields campos extra a fijar al eliminar (p.ej. status)
 */
export function softDeletePlugin(schema, { deletedFields = {} } = {}) {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.pre(QUERIES_TO_FILTER, function () {
    if (this.getOptions().withDeleted) return;
    if (this.getFilter().deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  });

  schema.statics.softDeleteById = function (id) {
    return this.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date(), ...deletedFields },
      { returnDocument: "after" }
    );
  };

  // Solo actúa sobre documentos eliminados. deletedAt va al final para que
  // restoredFields nunca pueda dejarlo con otro valor.
  schema.statics.restoreById = function (id, restoredFields = {}) {
    return this.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { ...restoredFields, deletedAt: null },
      { returnDocument: "after" }
    );
  };
}
