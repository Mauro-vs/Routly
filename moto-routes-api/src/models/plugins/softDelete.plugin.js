// Todas las consultas de Query que llevan filtro. Las de lectura y escritura que no
// estén aquí verían también los eliminados.
const QUERIES_TO_FILTER = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndReplace",
  "findOneAndDelete",
  "countDocuments",
  "distinct",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
];

/**
 * Soft delete reutilizable para cualquier modelo.
 *
 * - Añade `deletedAt` (null = no eliminado). Es lo único que marca un documento como
 *   eliminado: su status se conserva para restaurarlo como estaba.
 * - Middleware de consultas: excluye automáticamente los eliminados, salvo que
 *   la consulta filtre por `deletedAt` explícitamente o pida incluirlos con
 *   `.setOptions({ withDeleted: true })`.
 * - `Model.softDeleteById(id, deletedAt?)`: marca el documento como eliminado en vez de borrarlo.
 *   El deletedAt se puede dar: las cascadas usan el mismo valor que su dueño.
 * - `Model.restoreById(id, fields)`: restaura un documento eliminado (`deletedAt` a null).
 *
 * No cubre `aggregate` ni `estimatedDocumentCount`: un pipeline tiene que empezar con
 * `{ $match: { deletedAt: null } }`, y el recuento estimado no admite filtro.
 */
export function softDeletePlugin(schema) {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.pre(QUERIES_TO_FILTER, function () {
    if (this.getOptions().withDeleted) return;
    if (this.getFilter().deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  });

  schema.statics.softDeleteById = function (id, deletedAt = new Date()) {
    return this.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt },
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
