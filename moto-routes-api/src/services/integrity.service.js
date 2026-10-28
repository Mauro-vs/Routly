import { Category } from "../models/category.model.js";
import { Departure } from "../models/departure.model.js";
import { Experience } from "../models/experience.model.js";
import { Host } from "../models/host.model.js";
import { Image } from "../models/image.model.js";
import { IMAGE_OWNERS } from "../models/imageOwners.js";
import { Location } from "../models/location.model.js";
import { Profile } from "../models/profile.model.js";
import { ROLES, Role } from "../models/role.model.js";
import { Route } from "../models/route.model.js";
import { STATUS } from "../models/status.js";
import { User } from "../models/user.model.js";
import { profileService } from "./profile.service.js";

/*
 * Comprobación de la integridad referencial de toda la base de datos (npm run check:integrity).
 *
 * MongoDB no tiene claves foráneas: la integridad la mantienen los services. Esto la verifica
 * desde fuera, por si algo se escribió sin pasar por ellos (un script, una edición a mano, un
 * proceso cortado a medias). Es una herramienta de mantenimiento, como el seed: lee y repara
 * directamente con los modelos, sin el filtro de eliminados. Nunca borra nada físicamente.
 */

const ALL = { withDeleted: true };

// Cada referencia: la colección hija, su campo y la colección padre
const REFERENCES = [
  { model: User, field: "roleId", parent: Role },
  { model: Host, field: "userId", parent: User },
  { model: Route, field: "categoryId", parent: Category },
  { model: Route, field: "startLocationId", parent: Location },
  { model: Route, field: "endLocationId", parent: Location },
  { model: Experience, field: "hostId", parent: Host },
  { model: Experience, field: "routeId", parent: Route },
  { model: Departure, field: "experienceId", parent: Experience },
];

// Los padres de una lista de ids, también los eliminados, en un Map por id
async function parentsById(Parent, ids) {
  const parents = await Parent.find({ _id: { $in: ids } }).setOptions(ALL).lean();
  return new Map(parents.map((parent) => [String(parent._id), parent]));
}

const problem = (collection, id, detail, fix) => ({ collection, id: String(id), detail, fix });

/**
 * Devuelve la lista de problemas: { collection, id, detail, fix }. fix es una función que lo
 * repara, o null si hace falta una persona (se informa, no se toca).
 */
export async function checkIntegrity() {
  const problems = [];

  // 1. Documentos activos que apuntan a un padre inexistente o eliminado → se desactivan. Uno
  //    inactivo ya está contenido (no se ve en público): lo resuelve el admin restaurando el
  //    padre o eliminándolo
  for (const { model, field, parent } of REFERENCES) {
    const children = await model.find({ isActive: true }).lean();
    const parents = await parentsById(parent, children.map((child) => child[field]));
    for (const child of children) {
      const found = parents.get(String(child[field]));
      if (found && !found.deletedAt) continue;
      const state = found ? "a deleted" : "a missing";
      problems.push(
        problem(model.collection.collectionName, child._id, `${field} references ${state} ${parent.modelName}`,
          () => model.updateOne({ _id: child._id }, { status: STATUS.INACTIVE }))
      );
    }
  }

  // 2. Imágenes vivas de un dueño inexistente o eliminado → a la papelera con él
  for (const image of await Image.find({}).lean()) {
    const owner = await IMAGE_OWNERS[image.ownerType].findById(image.ownerId).setOptions(ALL).lean();
    if (owner && !owner.deletedAt) continue;
    problems.push(
      problem("images", image._id, `ownerId references ${owner ? "a deleted" : "a missing"} ${image.ownerType}`,
        () => Image.updateOne({ _id: image._id }, { deletedAt: owner?.deletedAt ?? new Date() }))
    );
  }

  // 3. Perfiles: uno por usuario, con su mismo deletedAt
  const users = await User.find({}).setOptions(ALL).lean();
  const profiles = new Map((await Profile.find({}).lean()).map((profile) => [String(profile.userId), profile]));
  for (const user of users) {
    const profile = profiles.get(String(user._id));
    profiles.delete(String(user._id));
    if (!profile) {
      problems.push(problem("users", user._id, "user has no profile", () => profileService.createMissing()));
    } else if (String(profile.deletedAt) !== String(user.deletedAt)) {
      problems.push(
        problem("profiles", profile._id, "profile deletedAt differs from its user",
          () => Profile.updateOne({ _id: profile._id }, { deletedAt: user.deletedAt ?? null }))
      );
    }
  }
  // Los que quedan no tienen usuario
  for (const profile of profiles.values()) {
    if (profile.deletedAt) continue;
    problems.push(
      problem("profiles", profile._id, "userId references a missing User",
        () => Profile.updateOne({ _id: profile._id }, { deletedAt: new Date() }))
    );
  }

  // 4. Anfitriones vivos cuyo usuario ya no tiene el rol host → lo decide una persona
  const hostRole = await Role.findOne({ name: ROLES.HOST }).setOptions(ALL).lean();
  for (const host of await Host.find({}).lean()) {
    const user = users.find((candidate) => String(candidate._id) === String(host.userId));
    if (user && hostRole && String(user.roleId) !== String(hostRole._id)) {
      problems.push(problem("hosts", host._id, "userId references a user without the host role", null));
    }
  }

  return problems;
}

/** Repara los problemas que tienen fix (en orden) y devuelve cuántos ha reparado. */
export async function fixIntegrity(problems) {
  let fixed = 0;
  for (const { fix } of problems) {
    if (!fix) continue;
    await fix();
    fixed++;
  }
  return fixed;
}
