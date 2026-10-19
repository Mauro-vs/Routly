import { STATUS, statusFromActive } from "../models/status.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { buildSlug } from "../utils/slugify.js";
import { assertNoDependents, assertSlugAvailable, findRestorable } from "./references.js";

// Los roles base (isSystem) los crea el seed y están protegidos: si se pudiera
// desactivar o eliminar "admin", nadie podría administrar
export const roleService = {
  async list() {
    return roleRepository.findAll();
  },

  async listByActive(isActive) {
    return roleRepository.findAll({ isActive });
  },

  async listDeleted() {
    return roleRepository.findDeleted();
  },

  async getById(id) {
    const role = await roleRepository.findById(id);
    if (!role) throw notFound("Role");
    return role;
  },

  async getBySlug(slug) {
    const role = await roleRepository.findBySlug(slug);
    if (!role) throw notFound("Role");
    return role;
  },

  // isSystem no llega desde la API (Zod lo descarta); solo lo envía el seed
  async create(data) {
    if (await roleRepository.existsByName(data.name)) {
      throw conflict("A role with this name already exists");
    }

    const _id = roleRepository.generateId();
    await assertSlugAvailable(roleRepository, buildSlug(data.label, _id), "Role");

    await roleRepository.create({ ...data, _id });
    return roleService.getById(_id);
  },

  async update(id, data) {
    const role = await roleService.getById(id);

    if (data.name !== undefined && data.name !== role.name) {
      if (role.isSystem) throw conflict("System roles cannot be renamed");
      if (await roleRepository.existsByName(data.name)) {
        throw conflict("A role with this name already exists");
      }
    }
    if (role.isSystem && data.status === STATUS.INACTIVE) {
      throw conflict("System roles cannot be deactivated");
    }

    return roleRepository.updateById(id, data);
  },

  async setActive(id, isActive) {
    return roleService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    const role = await roleService.getById(id);

    if (role.isSystem) throw conflict("System roles cannot be deleted");
    await assertNoDependents(userRepository, { roleId: id }, "Cannot delete a role that has users");

    await roleRepository.softDeleteById(id);
  },

  // Vuelve inactivo salvo que se pida isActive: true
  async restore(id, isActive = false) {
    await findRestorable(roleRepository, id, "Role");
    return roleRepository.restoreById(id, { status: statusFromActive(isActive) });
  },
};
