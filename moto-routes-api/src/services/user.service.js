import bcrypt from "bcrypt";
import { restoredStatus, statusFromActive } from "../models/status.js";
import { hostRepository } from "../repositories/host.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
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

const BCRYPT_ROUNDS = 10;
const DEFAULT_ROLE = "rider";
const HOST_ROLE = "host";

// La contraseña nunca se guarda ni se devuelve: solo su hash, que el modelo oculta
async function withPasswordHash({ password, ...data }) {
  if (password === undefined) return data;
  return { ...data, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) };
}

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

  async create(data) {
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
    return userService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const user = await findCurrent(userRepository, id, "User");

    if (data.email !== undefined) {
      assertNotTaken(
        await userRepository.findDuplicateByEmail(data.email, id),
        "A user with this email already exists"
      );
    }

    if (data.roleId !== undefined && data.roleId !== String(user.roleId)) {
      const role = await assertReference(roleRepository, data.roleId, "roleId", "role");
      // Un anfitrión tiene que seguir teniendo el rol host mientras tenga perfil
      if (role.name !== HOST_ROLE && (await hostRepository.exists({ userId: id }))) {
        throw conflict("User has a host profile");
      }
    }

    ensureWritten(await userRepository.updateById(id, await withPasswordHash(data)), "User");
    return userService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await findCurrent(userRepository, id, "User");
    if (current.isActive === isActive) return userService.getById(id);
    return userService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await findCurrent(userRepository, id, "User");
    await assertNoDependents(
      hostRepository,
      { userId: id },
      "Cannot delete a user that has a host profile"
    );

    const user = ensureWritten(await userRepository.softDeleteById(id), "User");
    await imageService.removeByOwner("user", id, user.deletedAt);
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(userRepository, id, "User");

    await assertRestorable(roleRepository, deleted.roleId, "roleId", "role");

    await userRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("user", id, deleted.deletedAt);
    return userService.getById(id);
  },
};
