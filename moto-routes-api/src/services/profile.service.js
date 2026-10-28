import { profileRepository } from "../repositories/profile.repository.js";
import { userRepository } from "../repositories/user.repository.js";

/**
 * Los datos del perfil. Solo lo usa userService, que es el dueño del perfil: ningún
 * controller llama aquí. Así todo lo que le pasa a un perfil (crearlo, cambiarlo,
 * eliminarlo, restaurarlo) pasa por un único sitio y queda en el usuario.
 *
 * @param actorId quién hace el cambio (updatedBy): el propio usuario o un admin
 */
export const profileService = {
  async createFor(userId, data = {}, actorId = userId) {
    return profileRepository.create({ ...data, userId, updatedBy: actorId });
  },

  async update(userId, data, actorId) {
    return profileRepository.updateByUserId(userId, { ...data, updatedBy: actorId });
  },

  async removeFor(userId, deletedAt) {
    await profileRepository.softDeleteByUserId(userId, deletedAt);
  },

  async restoreFor(userId) {
    await profileRepository.restoreByUserId(userId);
  },

  /**
   * Crea un perfil vacío a cada usuario que no lo tenga (también a los eliminados, con su
   * deletedAt) y devuelve cuáles. Lo usa la reparación de npm run check:integrity -- --fix.
   */
  async createMissing() {
    const withProfile = await profileRepository.findUserIds();
    const missing = await userRepository.findWithoutIds(withProfile);

    for (const user of missing) {
      await profileRepository.create({ userId: user._id, deletedAt: user.deletedAt ?? null });
    }
    return missing.map(({ _id, email }) => ({ _id, email }));
  },
};
