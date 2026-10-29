import "dotenv/config";
import mongoose from "mongoose";
import { Category } from "./models/category.model.js";
import { Departure } from "./models/departure.model.js";
import { Experience } from "./models/experience.model.js";
import { Host } from "./models/host.model.js";
import { Image } from "./models/image.model.js";
import { Location } from "./models/location.model.js";
import { Profile } from "./models/profile.model.js";
import { RevokedToken } from "./models/revokedToken.model.js";
import { Role } from "./models/role.model.js";
import { Route } from "./models/route.model.js";
import { User } from "./models/user.model.js";
import { categoryService } from "./services/category.service.js";
import { departureService } from "./services/departure.service.js";
import { experienceService } from "./services/experience.service.js";
import { hostService } from "./services/host.service.js";
import { imageService } from "./services/image.service.js";
import { locationService } from "./services/location.service.js";
import { roleService } from "./services/role.service.js";
import { routeService } from "./services/route.service.js";
import { userService } from "./services/user.service.js";
import { SYSTEM_ACTOR } from "./utils/access.js";

// Contraseña de todos los usuarios del seed. Solo para desarrollo.
const DEV_PASSWORD = "routly-dev-1234";

const MODELS = [Image, Departure, Experience, Route, Location, Category, Host, Profile, RevokedToken, User, Role];

const ROLES = [
  { name: "admin", label: "Administrador", description: "Gestiona todo el panel", isSystem: true },
  { name: "host", label: "Anfitrión", description: "Organiza experiencias sobre las rutas", isSystem: true },
  { name: "rider", label: "Motorista", description: "Reserva experiencias y sigue rutas", isSystem: true },
];

// Cada usuario nace con su perfil (userService.create): con estos datos, o vacío
const USERS = [
  { key: "admin", name: "Admin Routly", email: "admin@routly.dev", role: "admin" },
  {
    key: "lucia",
    name: "Lucía Ferrer",
    email: "lucia@routly.dev",
    role: "host",
    profile: { city: "Palma", experienceLevel: "expert", phone: "+34600111222" },
  },
  {
    key: "pablo",
    name: "Pablo Ortega",
    email: "pablo@routly.dev",
    role: "host",
    profile: { city: "Huesca", experienceLevel: "advanced" },
  },
  // Sin rol: el service le asigna rider
  {
    key: "marta",
    name: "Marta Gil",
    email: "marta@routly.dev",
    profile: {
      bio: "Empecé hace dos años y ya no paro de buscar puertos.",
      city: "Logroño",
      birthDate: new Date("1994-03-12T00:00:00.000Z"),
      experienceLevel: "intermediate",
      emergencyContact: { name: "Jorge Gil", phone: "+34600333444" },
    },
  },
];

const HOSTS = [
  {
    user: "lucia",
    name: "Lucía Ferrer",
    biography: "Guía en Mallorca desde 2015. Conoce cada curva de la Serra de Tramuntana.",
  },
  {
    user: "pablo",
    name: "Pablo Ortega",
    biography: "Instructor de conducción y viajero del Pirineo. Organiza salidas de varios días.",
  },
];

const CATEGORIES = [
  { name: "Costa", description: "Rutas junto al mar" },
  { name: "Montaña", description: "Carreteras de sierra y alta montaña" },
  { name: "Puertos", description: "Subidas a puertos de montaña" },
  { name: "Viñedos", description: "Recorridos tranquilos entre bodegas y viñas" },
];

const LOCATIONS = [
  { city: "Barcelona", region: "Cataluña", latitude: 41.3874, longitude: 2.1686 },
  { city: "Huesca", region: "Aragón", latitude: 42.1401, longitude: -0.4089 },
  { city: "Lleida", region: "Cataluña", latitude: 41.6176, longitude: 0.62 },
  { city: "Logroño", region: "La Rioja", latitude: 42.4627, longitude: -2.445 },
  { city: "Haro", region: "La Rioja", latitude: 42.5763, longitude: -2.8473 },
  { city: "Granada", region: "Andalucía", latitude: 37.1773, longitude: -3.5986 },
  { city: "Palma", region: "Islas Baleares", latitude: 39.5696, longitude: 2.6502 },
  { city: "Sóller", region: "Islas Baleares", latitude: 39.7667, longitude: 2.715 },
  { city: "Panes", region: "Asturias", latitude: 43.3222, longitude: -4.5786 },
  { city: "Potes", region: "Cantabria", latitude: 43.1541, longitude: -4.6229 },
];

// state: inactive o deleted, para que el panel tenga de todo desde el principio
const ROUTES = [
  {
    title: "Costa Brava Loop",
    description: "Ruta costera con vistas espectaculares al Mediterráneo",
    difficulty: "medium",
    distance: 180,
    duration: 4,
    category: "Costa",
    from: "Barcelona",
    to: "Barcelona",
    images: 2,
  },
  {
    title: "Pirineos Adventure",
    description: "Travesía por los puertos de montaña del Pirineo aragonés",
    difficulty: "hard",
    distance: 320,
    duration: 7,
    category: "Montaña",
    from: "Huesca",
    to: "Lleida",
    images: 2,
  },
  {
    title: "Ruta del Vino",
    description: "Recorrido tranquilo por La Rioja entre viñedos",
    difficulty: "easy",
    distance: 90,
    duration: 2,
    category: "Viñedos",
    from: "Logroño",
    to: "Haro",
    images: 1,
    state: "inactive",
  },
  {
    title: "Sierra Nevada Express",
    description: "Subida al puerto más alto de la península",
    difficulty: "hard",
    distance: 150,
    duration: 5,
    category: "Puertos",
    from: "Granada",
    to: "Granada",
    images: 1,
  },
  {
    title: "Caminos de Mallorca",
    description: "Ruta por la Serra de Tramuntana con curvas sin fin",
    difficulty: "medium",
    distance: 120,
    duration: 3,
    category: "Montaña",
    from: "Palma",
    to: "Sóller",
    images: 2,
  },
  {
    title: "Desfiladero de La Hermida y Potes",
    description: "Carretera estrecha entre paredes de roca",
    difficulty: "medium",
    distance: 70,
    duration: 1.5,
    category: "Montaña",
    from: "Panes",
    to: "Potes",
    images: 1,
    state: "deleted",
  },
];

const EXPERIENCES = [
  {
    key: "tramuntana",
    host: "lucia",
    route: "Caminos de Mallorca",
    title: "Tramuntana al amanecer",
    description: "Salida temprana por la Serra de Tramuntana, con desayuno en Sóller.",
    meetingPoint: "Plaça d'Espanya, Palma",
    duration: 5,
    minParticipants: 2,
    maxParticipants: 8,
  },
  {
    key: "pirineos",
    host: "pablo",
    route: "Pirineos Adventure",
    title: "Travesía de los Pirineos",
    description: "Un día entero de puertos de montaña con paradas para comer y fotos.",
    meetingPoint: "Estación de Huesca",
    duration: 9,
    minParticipants: 3,
    maxParticipants: 10,
  },
];

// Las fechas se calculan desde hoy para que siempre sean futuras
const inDays = (days, hour) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

const DEPARTURES = [
  { experience: "tramuntana", start: inDays(14, 6), hours: 5, capacity: 8, price: 89 },
  { experience: "tramuntana", start: inDays(28, 6), hours: 5, capacity: 6, price: 89, state: "cancelled" },
  { experience: "pirineos", start: inDays(21, 7), hours: 9, capacity: 10, price: 149.5 },
];

const photo = (seed, size) => `https://picsum.photos/seed/${seed}/${size}`;

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // El seed reinicia los datos de desarrollo: aquí sí se borra físicamente
  for (const Model of MODELS) {
    await Model.deleteMany({}).setOptions({ withDeleted: true });
    await Model.syncIndexes();
  }
  console.log("Cleared all collections");

  const roles = {};
  for (const role of ROLES) roles[role.name] = await roleService.create(role);

  const users = {};
  for (const { key, role, ...user } of USERS) {
    users[key] = await userService.create(
      {
        ...user,
        password: DEV_PASSWORD,
        ...(role && { roleId: String(roles[role]._id) }),
      },
      SYSTEM_ACTOR
    );
  }

  const hosts = {};
  for (const { user, ...host } of HOSTS) {
    hosts[user] = await hostService.create({ ...host, userId: String(users[user]._id) });
  }

  const categories = {};
  for (const category of CATEGORIES) categories[category.name] = await categoryService.create(category);

  const locations = {};
  for (const location of LOCATIONS) locations[location.city] = await locationService.create(location);

  const routes = {};
  for (const { category, from, to, images, state, ...route } of ROUTES) {
    const created = await routeService.create({
      ...route,
      categoryId: String(categories[category]._id),
      startLocationId: String(locations[from]._id),
      endLocationId: String(locations[to]._id),
    });
    routes[route.title] = created;

    // Las imágenes se añaden antes de eliminar, así la ruta de la papelera
    // también tiene las suyas (eliminadas con ella, en cascada)
    for (let index = 0; index < images; index++) {
      await imageService.create({
        ownerType: "route",
        ownerId: String(created._id),
        url: photo(index === 0 ? created.slug : `${created.slug}-${index + 1}`, "1200/800"),
        alt: `${route.title}, foto ${index + 1}`,
      }, SYSTEM_ACTOR);
    }

    if (state === "inactive") await routeService.setActive(created._id, false);
    if (state === "deleted") await routeService.remove(created._id);
  }

  for (const user of Object.values(users)) {
    await imageService.create({
      ownerType: "user",
      ownerId: String(user._id),
      url: photo(user.slug, "400/400"),
      alt: `Foto de perfil de ${user.name}`,
    }, SYSTEM_ACTOR);
  }
  for (const host of Object.values(hosts)) {
    await imageService.create({
      ownerType: "host",
      ownerId: String(host._id),
      url: photo(host.slug, "400/400"),
      alt: `Foto de ${host.name}`,
    }, SYSTEM_ACTOR);
  }

  const experiences = {};
  for (const { key, host, route, ...experience } of EXPERIENCES) {
    experiences[key] = await experienceService.create({
      ...experience,
      hostId: String(hosts[host]._id),
      routeId: String(routes[route]._id),
    }, SYSTEM_ACTOR);
  }

  for (const { experience, start, hours, ...departure } of DEPARTURES) {
    await departureService.create({
      ...departure,
      experienceId: String(experiences[experience]._id),
      startAt: start,
      endAt: new Date(start.getTime() + hours * 60 * 60 * 1000),
    }, SYSTEM_ACTOR);
  }

  for (const Model of MODELS) {
    const count = await Model.countDocuments().setOptions({ withDeleted: true });
    console.log(`  ${Model.collection.collectionName}: ${count}`);
  }
  console.log(`Seed completed. Password for every user: ${DEV_PASSWORD}`);

  process.exit(0);
} catch (error) {
  console.error("Seed error:", error.message);
  process.exit(1);
}
