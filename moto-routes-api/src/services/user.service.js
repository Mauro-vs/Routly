import { ROLES } from "../models/role.model.js";
import { STATUS, restoredStatus, statusFromActive } from "../models/status.js";
import { hostRepository } from "../repositories/host.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { conflict, fieldError, notFound } from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/passwd.js";
import { imageService } from "./image.service.js";
import { profileService } from "./profile.service.js";
import {
  assertHasChanges,
  assertNotTaken,
  assertNoDependents,
  assertReference,
  assertRestorable,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";

const DEFAULT_ROLE = ROLES.RIDER;
const HOST_ROLE = ROLES.HOST;

// La contraseña nunca se guarda ni se devuelve: solo su hash, que el modelo oculta
async function withPasswordHash({ password, ...data }) {
  if (password === undefined) return data;
  return { ...data, passwordHash: await hashPassword(password) };
}

const hasValues = (data) => Object.values(data ?? {}).some((value) => value !== undefined);

// El actor es el propio usuario (un admin no puede quitarse el rol, desactivarse ni eliminarse)
const isSelf = (actor, id) => actor?.id != null && actor.id === String(id);

/**
 * 409 si el cambio deja la plataforma sin ningún admin activo: quitar el rol admin,
 * desactivar o eliminar al último que queda.
 */
async function assertAdminRemains(user) {
  if (!user.isActive) return;
  const role = await roleRepository.findById(user.roleId);
  if (role?.name !== ROLES.ADMIN) return;
  if ((await userRepository.countActiveByRole(user.roleId)) <= 1) {
    throw conflict("There must be at least one active admin");
  }
}

/*
 * userService es el dueño del perfil (Profile): lo crea con el usuario, recibe sus
 * cambios (data.profile), lo elimina y lo restaura con él. Nadie más llama a
 * profileService. Las respuestas de usuario llevan siempre su profile.
 *
 * actor: quien hace la petición (req.user), o SYSTEM_ACTOR en el seed.
 */
export const userService = {
  async list() {
    return imageService.attachCovers("user", await userRepository.findAll());
  },

  async listByActive(isActive) {
    return imageService.attachCovers("user", await userRepository.findAll({ isActive }));
  },

  async listDeleted() {
    return userRepository.findDeleted();
  },

  async getById(id) {
    const user = await findExisting(userRepository, id, "User");
    return imageService.attachCover("user", user);
  },

  async getBySlug(slug) {
    const user = await userRepository.findBySlug(slug);
    if (!user) throw notFound("User");
    return imageService.attachCover("user", user);
  },

  // Todo usuario nace con su perfil (vacío, o con data.profile). Si el perfil no se puede
  // crear, se deshace el alta: MongoDB en standalone no tiene transacciones.
  async create({ profile = {}, ...data }, actor) {
    assertNotTaken(
      await userRepository.findDuplicateByEmail(data.email),
      "A user with this email already exists"
    );

    // Sin roleId, el usuario es rider
    const role = data.roleId
      ? await assertReference(roleRepository, data.roleId, "roleId", "role")
      : await roleRepository.findByName(DEFAULT_ROLE);
    if (!role) throw new Error(`Default role "${DEFAULT_ROLE}" is missing`);

    const { _id } = await userRepository.create({
      ...(await withPasswordHash(data)),
      roleId: role._id,
    });

    try {
      await profileService.createFor(_id, profile, actor?.id ?? _id);
    } catch (error) {
      await userRepository.deleteCreatedById(_id);
      throw error;
    }
    return userService.getById(_id);
  },

  // data.profile (opcional) son los cambios del perfil; el resto, los del usuario
  async update(id, { profile, ...data }, actor) {
    const changesProfile = hasValues(profile);
    assertHasChanges({ ...data, profile: changesProfile ? profile : undefined });

    const user = await findCurrent(userRepository, id, "User");

    if (data.email !== undefined) {
      assertNotTaken(
        await userRepository.findDuplicateByEmail(data.email, id),
        "A user with this email already exists"
      );
    }

    if (data.roleId !== undefined && data.roleId !== String(user.roleId)) {
      if (isSelf(actor, id)) throw conflict("You cannot change your own role");
      const role = await assertReference(roleRepository, data.roleId, "roleId", "role");
      // Un anfitrión tiene que seguir teniendo el rol host mientras tenga perfil
      if (role.name !== HOST_ROLE && (await hostRepository.exists({ userId: id }))) {
        throw conflict("User has a host profile");
      }
      await assertAdminRemains(user);
    }

    if (data.status === STATUS.INACTIVE) {
      if (isSelf(actor, id)) throw conflict("You cannot deactivate your own account");
      await assertAdminRemains(user);
    }

    const changesUser = hasValues(data);
    if (changesUser) {
      ensureWritten(await userRepository.updateById(id, await withPasswordHash(data)), "User");
    }
    if (changesProfile) {
      await userService.updateProfile(id, profile, actor);
      // Un cambio del perfil también se ve en el usuario
      if (!changesUser) await userRepository.touch(id);
    }

    // Otra contraseña o desactivado: las sesiones abiertas se cierran
    if (data.password !== undefined || data.status === STATUS.INACTIVE) {
      await userRepository.revokeTokens(id);
    }
    return userService.getById(id);
  },

  // Solo desde update. Un usuario de antes de los perfiles que aún no tiene el suyo lo
  // recibe aquí, con un aviso: la migración (npm run migrate:profiles) debería haberlo creado
  async updateProfile(id, profile, actor) {
    const actorId = actor?.id ?? id;
    if (await profileService.update(id, profile, actorId)) return;

    console.warn(`User ${id} had no profile: created on update`);
    await profileService.createFor(id, profile, actorId);
  },

  // El propio usuario, con su contraseña actual. Cierra el resto de sesiones (tokenVersion)
  async changePassword(id, { currentPassword, newPassword }) {
    const user = await userRepository.findPasswordHash(id);
    if (!user) throw notFound("User");
    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw fieldError("currentPassword", "currentPassword is incorrect");
    }
    return userService.update(id, { password: newPassword }, { id: String(id) });
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(userRepository, id, "User");
    if (current.isActive === isActive) return userService.getById(id);
    return userService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  async remove(id, actor) {
    const current = await findCurrent(userRepository, id, "User");
    if (isSelf(actor, id)) throw conflict("You cannot delete your own account");
    await assertAdminRemains(current);
    await assertNoDependents(
      hostRepository,
      { userId: id },
      "Cannot delete a user that has a host profile"
    );

    const user = ensureWritten(await userRepository.softDeleteById(id), "User");
    await userRepository.revokeTokens(id);
    await profileService.removeFor(id, user.deletedAt);
    await imageService.removeByOwner("user", id, user.deletedAt);
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(userRepository, id, "User");

    await assertRestorable(roleRepository, deleted.roleId, "roleId", "role");

    await userRepository.restoreById(id, restoredStatus(isActive));
    await profileService.restoreFor(id);
    await imageService.restoreByOwner("user", id, deleted.deletedAt);
    return userService.getById(id);
  },
};
