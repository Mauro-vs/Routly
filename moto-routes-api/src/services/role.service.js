import { STATUS, restoredStatus, statusFromActive } from "../models/status.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import {
  assertHasChanges,
  assertNotTaken,
  assertNoDependents,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";

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
    return findExisting(roleRepository, id, "Role");
  },

  async getBySlug(slug) {
    const role = await roleRepository.findBySlug(slug);
    if (!role) throw notFound("Role");
    return role;
  },

  // isSystem no llega desde la API (Zod lo rechaza); solo lo envía el seed
  async create(data) {
    assertNotTaken(
      await roleRepository.findDuplicateByName(data.name),
      "A role with this name already exists"
    );
    assertNotTaken(
      await roleRepository.findDuplicateByLabel(data.label),
      "A role with this label already exists"
    );

    const { _id } = await roleRepository.create(data);
    return roleService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const role = await findCurrent(roleRepository, id, "Role");

    if (data.name !== undefined && data.name !== role.name) {
      if (role.isSystem) throw conflict("System roles cannot be renamed");
      assertNotTaken(
        await roleRepository.findDuplicateByName(data.name),
        "A role with this name already exists"
      );
    }
    if (data.label !== undefined) {
      assertNotTaken(
        await roleRepository.findDuplicateByLabel(data.label, id),
        "A role with this label already exists"
      );
    }
    // status solo llega desde setActive: el PATCH /:id no lo acepta
    if (role.isSystem && data.status === STATUS.INACTIVE) {
      throw conflict("System roles cannot be deactivated");
    }

    ensureWritten(await roleRepository.updateById(id, data), "Role");
    return roleService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await findCurrent(roleRepository, id, "Role");
    if (current.isActive === isActive) return roleService.getById(id);
    return roleService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    const role = await findCurrent(roleRepository, id, "Role");

    if (role.isSystem) throw conflict("System roles cannot be deleted");
    await assertNoDependents(userRepository, { roleId: id }, "Cannot delete a role that has users");

    ensureWritten(await roleRepository.softDeleteById(id), "Role");
  },

  // Vuelve con el estado que tenía, salvo que se pida otro con isActive
  async restore(id, isActive) {
    await findRestorable(roleRepository, id, "Role");
    return ensureWritten(
      await roleRepository.restoreById(id, restoredStatus(isActive)),
      "Role"
    );
  },
};
