import { Profile } from "../models/profile.model.js";
import { toUpdate } from "../utils/update.js";

// Sin filtro de eliminados: el perfil se lee siempre a través de su usuario, que ya lo hace
export const profileRepository = {
  findByUserId(userId) {
    return Profile.findOne({ userId }).lean();
  },

  // Para la migración: los usuarios que ya tienen perfil
  findUserIds() {
    return Profile.distinct("userId");
  },

  create(data) {
    return Profile.create(data);
  },

  updateByUserId(userId, data) {
    return Profile.findOneAndUpdate({ userId }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  // Cascada con su usuario: se marca con el mismo deletedAt...
  softDeleteByUserId(userId, deletedAt) {
    return Profile.updateOne({ userId }, { deletedAt });
  },

  // Solo para deshacer el alta de un usuario que no ha llegado a usarse
  deleteByUserId(userId) {
    return Profile.deleteOne({ userId });
  },

  // ...y vuelve con él
  restoreByUserId(userId) {
    return Profile.updateOne({ userId }, { deletedAt: null });
  },
};
