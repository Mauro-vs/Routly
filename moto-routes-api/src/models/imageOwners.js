import { Category } from "./category.model.js";
import { Experience } from "./experience.model.js";
import { Host } from "./host.model.js";
import { Location } from "./location.model.js";
import { Route } from "./route.model.js";
import { User } from "./user.model.js";

// ownerType → modelo. Es el único sitio donde se definen los dueños posibles de una
// imagen: para que otra colección tenga imágenes, basta con añadir una línea.
export const IMAGE_OWNERS = Object.freeze({
  route: Route,
  user: User,
  host: Host,
  experience: Experience,
  category: Category,
  location: Location,
});

export const IMAGE_OWNER_TYPES = Object.freeze(Object.keys(IMAGE_OWNERS));
