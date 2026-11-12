import "dotenv/config";
import mongoose from "mongoose";
import { Bike } from "./models/bike.model.js";
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
import { bikeService } from "./services/bike.service.js";
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

const MODELS = [Image, Departure, Experience, Bike, Route, Location, Category, Host, Profile, RevokedToken, User, Role];

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
  {
    key: "nuria",
    name: "Núria Vidal",
    email: "nuria@routly.dev",
    role: "host",
    profile: { city: "Barcelona", experienceLevel: "expert" },
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
  {
    user: "nuria",
    name: "Núria Vidal",
    biography: "Barcelonesa y motera desde los 18. Guía la Costa Brava y las bodegas de La Rioja.",
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
  {
    title: "Entre bodegas de La Rioja",
    description: "Carreteras tranquilas entre viñas, de Logroño a Haro, con parada en dos bodegas",
    difficulty: "easy",
    distance: 95,
    duration: 3,
    category: "Viñedos",
    from: "Logroño",
    to: "Haro",
    images: 2,
  },
];

// El garaje: guide marca la moto con la que guía en su experiencia. La primera de cada uno es
// la principal; la CB500X de Pablo es privada (solo la ven él y el admin)
const BIKES = [
  {
    key: "gs",
    user: "lucia",
    brand: "BMW",
    model: "R 1250 GS",
    version: "Adventure",
    type: "adventure",
    year: 2022,
    cc: 1254,
    hp: 136,
    torque: 143,
    weight: 268,
    seatHeight: 890,
    km: 38500,
    color: "Triple Black",
    nickname: "La Tramuntana",
    modifications: [
      { type: "exhaust", title: "Akrapovič Slip-On", date: "2023-03-14" },
      { type: "luggage", title: "Maletas de aluminio", description: "Dos laterales y top case, para las salidas de varios días." },
      { type: "lighting", title: "Faros auxiliares LED" },
    ],
    photos: 2,
  },
  {
    key: "africa",
    user: "pablo",
    brand: "Honda",
    model: "CRF1100L Africa Twin",
    type: "adventure",
    year: 2021,
    cc: 1084,
    hp: 102,
    torque: 105,
    weight: 226,
    seatHeight: 850,
    km: 52000,
    color: "Tricolor",
    modifications: [
      { type: "suspension", title: "Suspensión regulable", date: "2022-06-01" },
      { type: "tyres", title: "Neumáticos mixtos", description: "Para los tramos de pista del Pirineo." },
      { type: "ergonomics", title: "Manillar elevado" },
    ],
    photos: 2,
  },
  {
    key: "cb500x",
    user: "pablo",
    brand: "Honda",
    model: "CB500X",
    type: "trail",
    year: 2019,
    cc: 471,
    hp: 47,
    km: 31000,
    isPublic: false,
    photos: 1,
  },
  {
    key: "mt07",
    user: "marta",
    brand: "Yamaha",
    model: "MT-07",
    version: "35 kW",
    type: "naked",
    year: 2021,
    cc: 689,
    hp: 47,
    weight: 184,
    km: 14200,
    modifications: [{ type: "ergonomics", title: "Cúpula alta" }],
    photos: 1,
  },
];

const EXPERIENCES = [
  {
    key: "tramuntana",
    host: "lucia",
    guide: "gs",
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
    guide: "africa",
    route: "Pirineos Adventure",
    title: "Travesía de los Pirineos",
    description: "Un día entero de puertos de montaña con paradas para comer y fotos.",
    meetingPoint: "Estación de Huesca",
    duration: 9,
    minParticipants: 3,
    maxParticipants: 10,
  },
  // Más experiencias para el Shop de la web pública: repartidas entre anfitriones, categorías,
  // idiomas, precios y fechas, para ver los filtros, el orden y la paginación con datos
  {
    key: "costa-amanecer",
    host: "nuria",
    route: "Costa Brava Loop",
    title: "Costa Brava al amanecer",
    description: "Salimos de Barcelona con la primera luz y desayunamos frente al mar en Tossa.",
    meetingPoint: "Port Olímpic, Barcelona",
    duration: 4,
    minParticipants: 2,
    maxParticipants: 8,
  },
  {
    key: "calas-costa-brava",
    host: "nuria",
    route: "Costa Brava Loop",
    title: "Les cales de la Costa Brava",
    description: "Ruta guiada en catalán por las calas más bonitas, con baño si el tiempo acompaña.",
    meetingPoint: "Plaça de Catalunya, Barcelona",
    language: "ca",
    duration: 6,
    minParticipants: 2,
    maxParticipants: 6,
  },
  {
    key: "costa-brava-english",
    host: "nuria",
    route: "Costa Brava Loop",
    title: "Costa Brava coastal ride",
    description: "A relaxed ride along the Mediterranean coast, guided in English.",
    meetingPoint: "Port Olímpic, Barcelona",
    language: "en",
    duration: 5,
    minParticipants: 2,
    maxParticipants: 10,
  },
  {
    key: "cumbres-sierra-nevada",
    host: "pablo",
    route: "Sierra Nevada Express",
    title: "Cumbres de Sierra Nevada",
    description: "La carretera asfaltada más alta de Europa, con curvas hasta casi los 2.500 metros.",
    meetingPoint: "Paseo del Salón, Granada",
    duration: 6,
    minParticipants: 3,
    maxParticipants: 8,
  },
  {
    // Sin salidas programadas: para el filtro hasDepartures y el detalle sin fechas
    key: "sierra-nevada-atardecer",
    host: "pablo",
    route: "Sierra Nevada Express",
    title: "Sierra Nevada al atardecer",
    description: "Subida corta para ver la puesta de sol desde la sierra.",
    meetingPoint: "Paseo del Salón, Granada",
    duration: 4,
    minParticipants: 2,
    maxParticipants: 6,
  },
  {
    key: "pirineo-dos-dias",
    host: "pablo",
    guide: "africa",
    route: "Pirineos Adventure",
    title: "Pirineo en dos días",
    description: "Dos jornadas de puertos con noche en un hotel de montaña en el valle de Arán.",
    meetingPoint: "Estación de Huesca",
    duration: 16,
    minParticipants: 4,
    maxParticipants: 10,
  },
  {
    key: "cols-pyrenees",
    host: "pablo",
    route: "Pirineos Adventure",
    title: "Les cols des Pyrénées",
    description: "Une journée de cols mythiques des deux côtés de la frontière, guidée en français.",
    meetingPoint: "Estación de Huesca",
    language: "fr",
    duration: 8,
    minParticipants: 3,
    maxParticipants: 10,
  },
  {
    key: "calas-mallorca",
    host: "lucia",
    route: "Caminos de Mallorca",
    title: "Calas de Mallorca en moto",
    description: "Carreteras secundarias hasta las calas del norte, con parada para comer en Deià.",
    meetingPoint: "Plaça d'Espanya, Palma",
    duration: 4,
    minParticipants: 2,
    maxParticipants: 6,
  },
  {
    key: "tramuntana-sunset",
    host: "lucia",
    guide: "gs",
    route: "Caminos de Mallorca",
    title: "Tramuntana sunset ride",
    description: "An evening ride through the Serra de Tramuntana, guided in English.",
    meetingPoint: "Plaça d'Espanya, Palma",
    language: "en",
    duration: 3,
    minParticipants: 2,
    maxParticipants: 8,
  },
  {
    key: "bodegas-rioja",
    host: "nuria",
    route: "Entre bodegas de La Rioja",
    title: "Bodegas y viñedos de La Rioja",
    description: "Ruta tranquila entre viñas con visita a dos bodegas. Sin alcohol para quien conduce.",
    meetingPoint: "Calle Laurel, Logroño",
    duration: 5,
    minParticipants: 2,
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
  { experience: "tramuntana", start: inDays(14, 6), hours: 5, capacity: 8, price: 89, booked: 5 },
  { experience: "tramuntana", start: inDays(28, 6), hours: 5, capacity: 6, price: 89, state: "cancelled" },
  { experience: "pirineos", start: inDays(21, 7), hours: 9, capacity: 10, price: 149.5 },
  { experience: "costa-amanecer", start: inDays(7, 6), hours: 4, capacity: 8, price: 65 },
  { experience: "costa-amanecer", start: inDays(35, 6), hours: 4, capacity: 8, price: 65 },
  { experience: "calas-costa-brava", start: inDays(12, 8), hours: 6, capacity: 6, price: 95 },
  { experience: "costa-brava-english", start: inDays(20, 8), hours: 5, capacity: 10, price: 110 },
  { experience: "costa-brava-english", start: inDays(50, 8), hours: 5, capacity: 10, price: 120 },
  { experience: "cumbres-sierra-nevada", start: inDays(18, 7), hours: 6, capacity: 8, price: 135 },
  { experience: "pirineo-dos-dias", start: inDays(30, 7), hours: 16, capacity: 10, price: 320 },
  { experience: "pirineo-dos-dias", start: inDays(60, 7), hours: 16, capacity: 10, price: 320, state: "cancelled" },
  { experience: "cols-pyrenees", start: inDays(25, 7), hours: 8, capacity: 10, price: 160 },
  // Completa: sale en el detalle, pero no cuenta para el precio "desde" ni deja reservar
  { experience: "calas-mallorca", start: inDays(5, 8), hours: 4, capacity: 6, price: 70, booked: 6 },
  { experience: "calas-mallorca", start: inDays(40, 8), hours: 4, capacity: 6, price: 75 },
  { experience: "tramuntana-sunset", start: inDays(9, 16), hours: 3, capacity: 8, price: 60 },
  { experience: "bodegas-rioja", start: inDays(15, 9), hours: 5, capacity: 10, price: 85 },
  { experience: "bodegas-rioja", start: inDays(45, 9), hours: 5, capacity: 10, price: 85 },
];

const photo = (seed, size) => `https://picsum.photos/seed/${seed}/${size}`;
const EXPERIENCE_PHOTOS = 4;

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

  // Una foto por categoría y por ubicación: las tarjetas de los carruseles de la web pública
  const categories = {};
  for (const category of CATEGORIES) {
    categories[category.name] = await categoryService.create(category);
    await imageService.create({
      ownerType: "category",
      ownerId: String(categories[category.name]._id),
      url: photo(categories[category.name].slug, "1200/800"),
      alt: `Rutas de ${category.name.toLowerCase()}`,
    }, SYSTEM_ACTOR);
  }

  const locations = {};
  for (const location of LOCATIONS) {
    locations[location.city] = await locationService.create(location);
    await imageService.create({
      ownerType: "location",
      ownerId: String(locations[location.city]._id),
      url: photo(locations[location.city].slug, "1200/800"),
      alt: location.city,
    }, SYSTEM_ACTOR);
  }

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

  const bikes = {};
  for (const { key, user, photos, ...bike } of BIKES) {
    bikes[key] = await bikeService.create({ ...bike, userId: String(users[user]._id) }, SYSTEM_ACTOR);
    for (let index = 0; index < photos; index++) {
      await imageService.create({
        ownerType: "bike",
        ownerId: String(bikes[key]._id),
        url: photo(index === 0 ? bikes[key].slug : `${bikes[key].slug}-${index + 1}`, "1200/800"),
        alt: `${bike.brand} ${bike.model}, foto ${index + 1}`,
      }, SYSTEM_ACTOR);
    }
  }

  const experiences = {};
  for (const { key, host, route, guide, ...experience } of EXPERIENCES) {
    experiences[key] = await experienceService.create({
      ...experience,
      hostId: String(hosts[host]._id),
      routeId: String(routes[route]._id),
      ...(guide && { guideBikeId: String(bikes[guide]._id) }),
    }, SYSTEM_ACTOR);

    // Cuatro fotos: el carrusel del detalle de la experiencia en la web pública
    for (let index = 0; index < EXPERIENCE_PHOTOS; index++) {
      await imageService.create({
        ownerType: "experience",
        ownerId: String(experiences[key]._id),
        url: photo(`${experiences[key].slug}-${index + 1}`, "1200/800"),
        alt: `${experience.title}, foto ${index + 1}`,
      }, SYSTEM_ACTOR);
    }
  }

  for (const { experience, start, hours, booked, ...departure } of DEPARTURES) {
    const created = await departureService.create({
      ...departure,
      experienceId: String(experiences[experience]._id),
      startAt: start,
      endAt: new Date(start.getTime() + hours * 60 * 60 * 1000),
    }, SYSTEM_ACTOR);
    // Aún no hay reservas que las ocupen: las plazas reservadas de ejemplo se escriben directamente
    if (booked) await Departure.updateOne({ _id: created._id }, { seatsBooked: booked });
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
