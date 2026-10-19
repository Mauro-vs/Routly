import bcrypt from "bcrypt";
import { statusFromActive } from "../models/status.js";
import { hostRepository } from "../repositories/host.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { buildSlug } from "../utils/slugify.js";
import { imageService } from "./image.service.js";
import {
  assertNoDependents,
  assertReference,
  assertRestorable,
  assertSlugAvailable,
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
    const user = await userRepository.findById(id);
    if (!user) throw notFound("User");
    return imageService.attachCover("user", user);
  },

  async getBySlug(slug) {
    const user = await userRepository.findBySlug(slug);
    if (!user) throw notFound("User");
    return imageService.attachCover("user", user);
  },

  async create(data) {
    if (await userRepository.existsByEmail(data.email)) {
      throw conflict("A user with this email already exists");
    }

    // Sin roleId, el usuario es rider
    const role = data.roleId
      ? await assertReference(roleRepository, data.roleId, "roleId", "role")
      : await roleRepository.findByName(DEFAULT_ROLE);
    if (!role) throw new Error(`Default role "${DEFAULT_ROLE}" is missing`);

    const _id = userRepository.generateId();
    await assertSlugAvailable(userRepository, buildSlug(data.name, _id), "User");

    await userRepository.create({ ...(await withPasswordHash(data)), roleId: role._id, _id });
    return userService.getById(_id);
  },

  async update(id, data) {
    const user = await userService.getById(id);

    if (data.email !== undefined && (await userRepository.existsByEmail(data.email, id))) {
      throw conflict("A user with this email already exists");
    }

    if (data.roleId !== undefined && data.roleId !== String(user.roleId)) {
      const role = await assertReference(roleRepository, data.roleId, "roleId", "role");
      // Un anfitrión tiene que seguir teniendo el rol host mientras tenga perfil
      if (role.name !== HOST_ROLE && (await hostRepository.exists({ userId: id }))) {
        throw conflict("User has a host profile");
      }
    }

    await userRepository.updateById(id, await withPasswordHash(data));
    return userService.getById(id);
  },

  async setActive(id, isActive) {
    return userService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await userService.getById(id);
    await assertNoDependents(
      hostRepository,
      { userId: id },
      "Cannot delete a user that has a host profile"
    );

    const user = await userRepository.softDeleteById(id);
    await imageService.removeByOwner("user", id, user.deletedAt);
  },

  async restore(id, isActive = false) {
    const deleted = await findRestorable(userRepository, id, "User");

    await assertRestorable(roleRepository, deleted.roleId, "roleId", "role");

    await userRepository.restoreById(id, { status: statusFromActive(isActive) });
    await imageService.restoreByOwner("user", id, deleted.deletedAt);
    return userService.getById(id);
  },
};
