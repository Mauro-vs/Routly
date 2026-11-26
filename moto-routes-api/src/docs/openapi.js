import { z } from "zod";
import { cookieConfigFrom } from "../config/cookies.js";
import { uploadsConfigFrom } from "../config/uploads.js";
import { bikeListQuery, createBikeSchema, updateBikeSchema } from "../schemas/bike.schema.js";
import { categoryListQuery, createCategorySchema, updateCategorySchema } from "../schemas/category.schema.js";
import {
  createDepartureSchema,
  departureListQuery,
  updateDepartureSchema,
} from "../schemas/departure.schema.js";
import {
  FACETS_LIMIT,
  createExperienceSchema,
  experienceListQuery,
  updateExperienceSchema,
} from "../schemas/experience.schema.js";
import { createHostSchema, hostListQuery, updateHostSchema } from "../schemas/host.schema.js";
import { createImageSchema, imageListQuery, updateImageSchema } from "../schemas/image.schema.js";
import { createLocationSchema, locationListQuery, updateLocationSchema } from "../schemas/location.schema.js";
import { createRoleSchema, roleListQuery, updateRoleSchema } from "../schemas/role.schema.js";
import {
  SHOP_REVIEWS_LIMIT,
  SHOP_REVIEW_SORT,
  createReviewSchema,
  reviewListQuery,
  updateReviewSchema,
} from "../schemas/review.schema.js";
import { createRouteSchema, routeListQuery, updateRouteSchema } from "../schemas/route.schema.js";
import { SHOP_DEFAULT_SORT, SHOP_LIMIT, SHOP_SORT, shopExperiencesQuery } from "../schemas/shop.schema.js";
import {
  createUserSchema,
  updateOwnUserSchema,
  updateUserSchema,
  userListQuery,
} from "../schemas/user.schema.js";

/*
 * Documentación OpenAPI de todos los recursos.
 *
 * Los diez recursos tienen los mismos endpoints, así que las rutas se generan con
 * crudPaths(). Los cuerpos de las peticiones salen de los propios esquemas de Zod
 * (z.toJSONSchema), así la documentación nunca se desincroniza de la validación.
 * Cada recurso solo aporta un ejemplo de respuesta, sus conflictos (409) y quién puede
 * usar cada endpoint (access): así cada uno lleva su candado, su 401 y su 403.
 */

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

// Zod → JSON Schema compatible con OpenAPI 3.0
function fromZod(schema) {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "input",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      // cannotChange(): campos que existen pero no se aceptan en el PATCH
      if (zodSchema._zod.def.type === "any") {
        jsonSchema.readOnly = true;
        jsonSchema.description = "No se puede cambiar: si se envía, la API responde 400";
      }
      if (zodSchema._zod.def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
      }
      // z.number().int() añade los límites de un entero seguro: no aportan nada
      if (jsonSchema.maximum === MAX_SAFE) delete jsonSchema.maximum;
      if (jsonSchema.minimum === -MAX_SAFE) delete jsonSchema.minimum;
    },
  });
}

const COMMON_FIELDS = {
  status: "active",
  isActive: true,
  deletedAt: null,
  createdAt: "2026-10-16T10:00:00.000Z",
  updatedAt: "2026-10-16T10:00:00.000Z",
};

const RESOURCES = [
  {
    path: "roles",
    listQuery: roleListQuery,
    tag: "Roles",
    access: { read: "admin" },
    schema: "Role",
    singular: "rol",
    plural: "roles",
    create: createRoleSchema,
    update: updateRoleSchema,
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c901",
      name: "host",
      label: "Anfitrión",
      description: "Organiza experiencias sobre las rutas",
      isSystem: true,
      slug: "anfitrion-b8c901",
    },
    conflicts: {
      create: "Ya existe un rol con ese name (también en la papelera)",
      update: "Rol base renombrado o desactivado, o name repetido",
      remove: "Rol base, o rol con usuarios",
    },
  },
  {
    path: "users",
    listQuery: userListQuery,
    tag: "Users",
    access: { read: "admin" },
    schema: "User",
    singular: "usuario",
    plural: "usuarios",
    create: createUserSchema,
    update: updateUserSchema,
    description:
      "La API recibe password y guarda solo su hash (Argon2id): passwordHash y tokenVersion nunca se devuelven. " +
      "Cada usuario nace con su perfil y lo trae siempre en profile; se edita aquí (profile) o en /api/profile.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c910",
      name: "Lucía Ferrer",
      email: "lucia@routly.dev",
      roleId: "6710a1b2c3d4e5f6a7b8c901",
      role: { _id: "6710a1b2c3d4e5f6a7b8c901", name: "host", label: "Anfitrión" },
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c990", url: "https://picsum.photos/seed/lucia/400/400", alt: "Foto de perfil" },
      profile: {
        _id: "6710a1b2c3d4e5f6a7b8c911",
        userId: "6710a1b2c3d4e5f6a7b8c910",
        city: "Palma",
        experienceLevel: "expert",
        phone: "+34600111222",
        updatedBy: "6710a1b2c3d4e5f6a7b8c910",
        createdAt: "2026-10-16T10:00:00.000Z",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
      slug: "lucia-ferrer-b8c910",
    },
    conflicts: {
      create: "Email repetido",
      update:
        "Email repetido, quitar el rol host a un usuario con perfil de anfitrión, cambiarse el rol o desactivarse a sí mismo, o dejar sin ningún admin activo",
      remove: "El usuario tiene perfil de anfitrión, es el propio admin o es el último admin activo",
    },
  },
  {
    path: "hosts",
    listQuery: hostListQuery,
    tag: "Hosts",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen los activos cuyo usuario también lo esté, y user.email solo lo ve el admin",
    access: { edit: "owner", owner: "el propio anfitrión (su perfil de anfitrión)" },
    schema: "Host",
    singular: "anfitrión",
    plural: "anfitriones",
    create: createHostSchema,
    update: updateHostSchema,
    description: "Perfil público de un anfitrión. El usuario tiene que tener el rol host.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c915",
      userId: "6710a1b2c3d4e5f6a7b8c910",
      user: { _id: "6710a1b2c3d4e5f6a7b8c910", name: "Lucía Ferrer", email: "lucia@routly.dev" },
      name: "Lucía Ferrer",
      biography: "Guía en Mallorca desde 2015.",
      coverImage: null,
      slug: "lucia-ferrer-b8c915",
      // Sus notas: como guía y la de sus experiencias (las calcula la API con las opiniones)
      rating: { average: 4.38, count: 8, distribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 5 } },
      experiencesRating: { average: 4.5, count: 40, distribution: { 1: 1, 2: 1, 3: 2, 4: 9, 5: 27 } },
      // Solo en GET /hosts/:id y /hosts/slug/:slug: su garaje (en público, las públicas)
      bikes: [],
    },
    conflicts: {
      create: "El usuario ya tiene un perfil de anfitrión",
      remove: "El anfitrión tiene experiencias",
      restore: "No está eliminado, su usuario está eliminado o ya no tiene el rol host",
    },
  },
  {
    path: "categories",
    listQuery: categoryListQuery,
    tag: "Categories",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas",
    schema: "Category",
    singular: "categoría",
    plural: "categorías",
    female: true,
    create: createCategorySchema,
    update: updateCategorySchema,
    description:
      "El nombre es único sin distinguir mayúsculas ni tildes (la ñ cuenta como letra propia). coverImage es su foto principal (una imagen con ownerType category), o null.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c930",
      name: "Montaña",
      description: "Carreteras de sierra y alta montaña",
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c993", url: "https://picsum.photos/seed/montana/1200/800", alt: "Montaña" },
      slug: "montana-b8c930",
    },
    conflicts: {
      create: "Nombre repetido",
      update: "Nombre repetido",
      remove: "La categoría tiene rutas",
    },
  },
  {
    path: "locations",
    listQuery: locationListQuery,
    tag: "Locations",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas",
    schema: "Location",
    singular: "ubicación",
    plural: "ubicaciones",
    female: true,
    create: createLocationSchema,
    update: updateLocationSchema,
    description:
      "latitude y longitude van las dos o ninguna. Se guardan como punto GeoJSON. coverImage es su foto principal (una imagen con ownerType location), o null.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c920",
      city: "Sóller",
      region: "Islas Baleares",
      country: "España",
      latitude: 39.7667,
      longitude: 2.715,
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c994", url: "https://picsum.photos/seed/soller/1200/800", alt: "Sóller" },
      slug: "soller-b8c920",
    },
    conflicts: {
      create: "Ciudad, región y país repetidos",
      update: "Ciudad, región y país repetidos",
      remove: "La ubicación es origen o destino de alguna ruta",
    },
  },
  {
    path: "routes",
    listQuery: routeListQuery,
    tag: "Routes",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas cuya categoría y ubicaciones también lo estén",
    schema: "Route",
    singular: "ruta",
    plural: "rutas",
    female: true,
    create: createRouteSchema,
    update: updateRouteSchema,
    description:
      "Cada ruta trae su categoría, su origen, su destino y su imagen principal. waypoints (opcional, hasta 20) son los puntos por los que pasa, en orden, para dibujar el recorrido en un mapa; null en un PATCH los quita.",
    example: {
      _id: "6abfc9f47a7195ca59df38e9",
      title: "Caminos de Mallorca",
      description: "Ruta por la Serra de Tramuntana con curvas sin fin",
      difficulty: "medium",
      distance: 120,
      duration: 3,
      categoryId: "6710a1b2c3d4e5f6a7b8c930",
      category: { _id: "6710a1b2c3d4e5f6a7b8c930", name: "Montaña", slug: "montana-b8c930" },
      startLocationId: "6710a1b2c3d4e5f6a7b8c921",
      startLocation: { _id: "6710a1b2c3d4e5f6a7b8c921", city: "Palma", region: "Islas Baleares", country: "España", slug: "palma-b8c921", latitude: 39.5696, longitude: 2.6502 },
      endLocationId: "6710a1b2c3d4e5f6a7b8c920",
      endLocation: { _id: "6710a1b2c3d4e5f6a7b8c920", city: "Sóller", region: "Islas Baleares", country: "España", slug: "soller-b8c920", latitude: 39.7667, longitude: 2.7152 },
      waypoints: [
        { name: "Valldemossa", latitude: 39.7105, longitude: 2.6224 },
        { name: "Deià", latitude: 39.748, longitude: 2.649 },
      ],
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c991", url: "https://picsum.photos/seed/caminos/1200/800", alt: "Caminos de Mallorca, foto 1" },
      // Las rutas no se comentan: la nota de las opiniones de las experiencias activas que la usan
      rating: { average: 4.38, count: 8, distribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 5 } },
      slug: "caminos-de-mallorca-df38e9",
    },
    conflicts: {
      remove: "La ruta tiene experiencias",
    },
  },
  {
    path: "experiences",
    listQuery: experienceListQuery,
    tag: "Experiences",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas cuyo anfitrión y ruta (y los padres de esta) también lo estén",
    access: { write: "owner", owner: "el anfitrión de la experiencia: hostId tiene que ser su perfil de anfitrión" },
    schema: "Experience",
    singular: "experiencia",
    plural: "experiencias",
    female: true,
    create: createExperienceSchema,
    update: updateExperienceSchema,
    description:
      "Salida guiada que un anfitrión organiza sobre una ruta. guideBikeId (opcional) es la moto con la que guía: una moto activa y pública del usuario del anfitrión; sale como guideBike. " +
      "Cada experiencia trae lo que necesita su tarjeta: su ruta con distancia, duración, dificultad, categoría, origen y destino; su foto principal (coverImage); " +
      "y, de sus salidas reservables (activas, programadas y futuras), el precio más bajo (priceFrom) y la fecha más cercana (nextDepartureAt), o null si no tiene ninguna. " +
      "Se puede ordenar por priceFrom y nextDepartureAt: las que no tienen salidas van siempre al final. " +
      "Por id o por slug (el detalle), host viene entero: su biografía, su foto y su usuario (sin el email, salvo para el admin).",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c940",
      hostId: "6710a1b2c3d4e5f6a7b8c915",
      host: { _id: "6710a1b2c3d4e5f6a7b8c915", name: "Lucía Ferrer", slug: "lucia-ferrer-b8c915" },
      routeId: "6abfc9f47a7195ca59df38e9",
      route: {
        _id: "6abfc9f47a7195ca59df38e9",
        title: "Caminos de Mallorca",
        distance: 120,
        duration: 3,
        difficulty: "medium",
        categoryId: "6710a1b2c3d4e5f6a7b8c930",
        category: { _id: "6710a1b2c3d4e5f6a7b8c930", name: "Montaña", slug: "montana-b8c930" },
        startLocationId: "6710a1b2c3d4e5f6a7b8c921",
        startLocation: { _id: "6710a1b2c3d4e5f6a7b8c921", city: "Palma", region: "Islas Baleares", country: "España", slug: "palma-b8c921", latitude: 39.5696, longitude: 2.6502 },
        endLocationId: "6710a1b2c3d4e5f6a7b8c920",
        endLocation: { _id: "6710a1b2c3d4e5f6a7b8c920", city: "Sóller", region: "Islas Baleares", country: "España", slug: "soller-b8c920", latitude: 39.7667, longitude: 2.7152 },
        slug: "caminos-de-mallorca-df38e9",
      },
      title: "Tramuntana al amanecer",
      description: "Salida temprana por la Serra de Tramuntana.",
      meetingPoint: "Plaça d'Espanya, Palma",
      language: "es",
      duration: 5,
      minParticipants: 2,
      maxParticipants: 8,
      guideBikeId: "6710a1b2c3d4e5f6a7b8c960",
      guideBike: {
        _id: "6710a1b2c3d4e5f6a7b8c960",
        brand: "BMW",
        model: "R 1250 GS",
        version: "Adventure",
        type: "adventure",
        cc: 1254,
        hp: 136,
        license: "A",
        slug: "bmw-r-1250-gs-b8c960",
        userId: "6710a1b2c3d4e5f6a7b8c910",
        coverImage: { _id: "6710a1b2c3d4e5f6a7b8c995", url: "https://picsum.photos/seed/gs/1200/800", alt: "BMW R 1250 GS, foto 1" },
      },
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c996", url: "https://picsum.photos/seed/tramuntana/1200/800", alt: "Tramuntana al amanecer, foto 1" },
      priceFrom: 89,
      nextDepartureAt: "2026-11-08T06:00:00.000Z",
      // La nota de sus opiniones visibles (la calcula la API)
      rating: { average: 4.38, count: 8, distribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 5 } },
      slug: "tramuntana-al-amanecer-b8c940",
    },
    conflicts: {
      update: "maxParticipants por debajo de la capacidad de alguna salida",
      remove: "La experiencia tiene salidas",
    },
  },
  {
    path: "departures",
    listQuery: departureListQuery,
    tag: "Departures",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas cuya experiencia, y todo lo que hay por encima, también lo esté",
    access: { write: "owner", owner: "el anfitrión de la experiencia de la salida" },
    schema: "Departure",
    singular: "salida",
    plural: "salidas",
    female: true,
    create: createDepartureSchema,
    update: updateDepartureSchema,
    description:
      "Fecha concreta de una experiencia. sku (RTL-DEP-AAMMDD-XXXXX) lo genera el servidor y no cambia nunca; el slug sí sigue a la fecha. " +
      "guideBike es la moto del guía de ese día: la suya (guideBikeId) o, si no tiene, la de su experiencia. " +
      "seatsBooked son las plazas reservadas: no se envían (las cambiarán las reservas) y capacity no puede bajar de ellas (409). " +
      "seatsLeft son las libres (capacity - seatsBooked) e isFull, si no queda ninguna: una salida completa no es reservable ni cuenta para el precio desde. " +
      "?full=true lista las completas; ?full=false, las que tienen plazas.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c950",
      experienceId: "6710a1b2c3d4e5f6a7b8c940",
      experience: { _id: "6710a1b2c3d4e5f6a7b8c940", title: "Tramuntana al amanecer", slug: "tramuntana-al-amanecer-b8c940" },
      startAt: "2026-11-08T06:00:00.000Z",
      endAt: "2026-11-08T11:00:00.000Z",
      capacity: 8,
      price: 89,
      state: "scheduled",
      // Reservadas, libres (capacity - seatsBooked) y si está completa
      seatsBooked: 5,
      seatsLeft: 3,
      isFull: false,
      sku: "RTL-DEP-261108-7QX2M",
      // Sin guideBikeId propio: hereda la de su experiencia
      guideBike: {
        _id: "6710a1b2c3d4e5f6a7b8c960",
        brand: "BMW",
        model: "R 1250 GS",
        version: "Adventure",
        type: "adventure",
        cc: 1254,
        hp: 136,
        license: "A",
        slug: "bmw-r-1250-gs-b8c960",
        userId: "6710a1b2c3d4e5f6a7b8c910",
        coverImage: { _id: "6710a1b2c3d4e5f6a7b8c995", url: "https://picsum.photos/seed/gs/1200/800", alt: "BMW R 1250 GS, foto 1" },
      },
      slug: "tramuntana-al-amanecer-2026-11-08-b8c950",
    },
    conflicts: {},
    extraPaths: (ref) => ({
      "/api/departures/sku/{sku}": {
        get: {
          summary: "Obtener salida por SKU",
          description:
            "Se acepta en minúsculas. 404 si no existe, está en la papelera o, sin ser admin, está inactiva o cuelga de algo inactivo.",
          tags: ["Departures"],
          parameters: [
            {
              in: "path",
              name: "sku",
              required: true,
              schema: { type: "string" },
              example: "RTL-DEP-261108-7QX2M",
            },
          ],
          responses: {
            200: ok("Salida encontrada", ref),
            400: error("SKU con formato inválido"),
            404: error("Salida no encontrada o eliminada"),
          },
        },
      },
    }),
  },
  {
    path: "bikes",
    listQuery: bikeListQuery,
    tag: "Bikes",
    // Lo que ve el público (services/visibility.js)
    publicView:
      "solo salen las públicas y activas de usuarios activos (su dueño ve también las suyas por id, y todas en GET /api/profile/me/bikes)",
    access: { write: "owner", owner: "su dueño (cualquier usuario gestiona su garaje)" },
    schema: "Bike",
    singular: "moto",
    plural: "motos",
    female: true,
    create: createBikeSchema,
    update: updateBikeSchema,
    description:
      "El garaje: las motos de cada usuario (rider, host o admin), hasta 10. Obligatorios brand, model y type; el resto de la ficha, opcional. " +
      "license (A1, A2 o A) lo calcula la API con hp y cc. La primera es la principal (isPrimary). " +
      "Al crear, la moto es de quien la crea; solo el admin envía userId para otro usuario. " +
      "modifications se envía entera y sustituye a la anterior. Las fotos son imágenes con ownerType bike. " +
      "Una moto puede ser la moto del guía (guideBikeId) de experiencias y salidas de su anfitrión.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c960",
      userId: "6710a1b2c3d4e5f6a7b8c910",
      user: { _id: "6710a1b2c3d4e5f6a7b8c910", name: "Lucía Ferrer", slug: "lucia-ferrer-b8c910" },
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
      license: "A",
      modifications: [
        { _id: "6710a1b2c3d4e5f6a7b8c961", type: "exhaust", title: "Akrapovič Slip-On", date: "2023-03-14T00:00:00.000Z" },
        { _id: "6710a1b2c3d4e5f6a7b8c962", type: "luggage", title: "Maletas de aluminio" },
      ],
      isPrimary: true,
      isPublic: true,
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c995", url: "https://picsum.photos/seed/gs/1200/800", alt: "BMW R 1250 GS, foto 1" },
      slug: "bmw-r-1250-gs-b8c960",
    },
    conflicts: {
      create: "El usuario ya tiene 10 motos",
      update: "Desactivarla o hacerla privada mientras es la moto del guía de una experiencia activa o una salida futura",
      remove: "Es la moto del guía de una experiencia activa o una salida futura",
      restore: "No está eliminada, su usuario está eliminado o el garaje ya tiene 10 motos",
    },
  },
  {
    path: "images",
    listQuery: imageListQuery,
    tag: "Images",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas de un dueño visible; la galería de un dueño oculto da 404",
    access: {
      write: "owner",
      owner:
        "su dueño: cada usuario, su foto (ownerType user) y las de sus motos (bike); un anfitrión, además, las de su perfil de anfitrión y sus experiencias. Las de rutas, categorías y ubicaciones, solo el admin",
    },
    schema: "Image",
    singular: "imagen",
    plural: "imágenes",
    female: true,
    create: createImageSchema,
    update: updateImageSchema,
    hasSlug: false,
    description:
      "Imágenes de cualquier colección (ownerType + ownerId). La primera de cada dueño es la principal (isCover).",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c991",
      ownerType: "route",
      ownerId: "6abfc9f47a7195ca59df38e9",
      url: "https://picsum.photos/seed/caminos/1200/800",
      alt: "Caminos de Mallorca, foto 1",
      position: 0,
      isCover: true,
    },
    conflicts: {
      update: "Marcar como principal una imagen inactiva",
    },
  },
];

// ---------- Piezas de las respuestas ----------

const errorRef = { $ref: "#/components/schemas/ErrorResponse" };

function error(description) {
  return { description, content: { "application/json": { schema: errorRef } } };
}

function ok(description, ref) {
  return { description, content: { "application/json": { schema: ref } } };
}

function list(description, ref) {
  return { description, content: { "application/json": { schema: { type: "array", items: ref } } } };
}

const idParam = {
  in: "path",
  name: "id",
  required: true,
  schema: { type: "string" },
  description: "ID del documento (ObjectId)",
};

const body = (schemaName, required = true) => ({
  required,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } } },
});

const activeBody = (required) => ({
  required,
  content: {
    "application/json": {
      schema: {
        type: "object",
        ...(required && { required: ["isActive"] }),
        properties: { isActive: { type: "boolean", example: true } },
      },
    },
  },
});

// ---------- Seguridad: quién puede usar cada endpoint ----------

// El nombre de la cookie de este entorno: __Secure-routly_session con Secure (producción)
const SESSION_COOKIE = cookieConfigFrom().name;

// Cualquiera de los dos: la cabecera Authorization o la cookie de sesión del panel
const bearer = [{ bearerAuth: [] }, { cookieAuth: [] }];
const unauthorized = { $ref: "#/components/responses/Unauthorized" };
const forbidden = { $ref: "#/components/responses/Forbidden" };

/**
 * Añade a una operación el candado (bearerAuth o cookieAuth), quién puede usarla y sus 401 y 403.
 *   public: sin token · user: cualquier sesión · admin: solo admin · owner: admin o el dueño
 */
function secured(operation, level, owner) {
  if (level === "public") return operation;

  const who = {
    user: "Requiere sesión.",
    admin: "Solo admin.",
    owner: `Admin, o ${owner}.`,
  }[level];
  return {
    ...operation,
    description: [who, operation.description].filter(Boolean).join(" "),
    security: bearer,
    responses: {
      ...operation.responses,
      401: unauthorized,
      ...(level !== "user" && { 403: forbidden }),
    },
  };
}

// ---------- Query params de los listados (utils/listQuery.js) ----------

// Lo que significa cada filtro. Su tipo y sus valores salen del esquema de Zod.
const FILTER_DOCS = {
  difficulty: "Dificultad (en experiencias, la de su ruta)",
  categoryId: "Id de la categoría (en experiencias, la de su ruta)",
  locationId: "Id de una ubicación, de origen o de destino (en experiencias, de su ruta)",
  distanceMin: "Kilómetros, como mínimo",
  distanceMax: "Kilómetros, como máximo",
  durationMin: "Horas, como mínimo",
  durationMax: "Horas, como máximo",
  country: "País, entero y sin distinguir mayúsculas",
  hostId: "Id del anfitrión",
  routeId: "Id de la ruta",
  language: "Idioma (código de dos letras)",
  experienceId: "Id de la experiencia",
  state: "Estado de la salida",
  from: "Empieza en esta fecha o después (ISO 8601: 2026-11-01 o con hora). En experiencias, alguna de sus salidas reservables",
  to: "Empieza en esta fecha o antes (ISO 8601). En experiencias, alguna de sus salidas reservables",
  priceMin: "Precio, como mínimo. En experiencias, el de alguna de sus salidas reservables",
  priceMax: "Precio, como máximo. En experiencias, el de alguna de sus salidas reservables",
  roleId: "Id del rol",
  userId: "Id del usuario",
  isSystem: "Solo los roles base (true) o solo los creados (false)",
  type: "Tipo de moto",
  license: "Carnet necesario",
  ccMin: "Cilindrada, como mínimo",
  ccMax: "Cilindrada, como máximo",
  ownerType: "Tipo de dueño. Solo, las imágenes de ese tipo; con ownerId, la galería de ese dueño",
  ownerId: "Id del dueño (necesita ownerType)",
  isCover: "Solo la principal (true) o las demás (false)",
  hasDepartures: "Solo las que tienen alguna salida reservable: activa, programada y futura (solo admite true)",
  targetType: "Qué se valora: experience o host",
  targetId: "Id de la experiencia o del anfitrión que se valora",
  rating: "Estrellas, de 1 a 5",
};

// El tipo de un filtro para Swagger, a partir de su esquema de Zod (lo que llega en la URL)
function filterSchema(zodSchema) {
  const { $schema, ...json } = z.toJSONSchema(zodSchema, { io: "input", unrepresentable: "any" });
  // Una fecha: el patrón exacto no ayuda a nadie a leer la documentación
  if (json.anyOf) return { type: "string", format: "date", example: "2026-11-01" };
  return json;
}

const PAGE_HEADERS = {
  "X-Total-Count": { description: "Con page: cuántos hay en total con estos filtros", schema: { type: "integer" } },
  "X-Page": { description: "Con page: la página devuelta", schema: { type: "integer" } },
  "X-Limit": { description: "Con page: el tamaño de la página", schema: { type: "integer" } },
};

/** Los query params de un listado: los comunes y los filtros de su listQuery. */
function listParameters({ sortable, filters }) {
  const query = (name, schema, description) => ({ in: "query", name, required: false, schema, description });
  return [
    query("q", { type: "string", maxLength: 100 }, "Busca palabras en los campos de texto (índice de texto, en español: el plural encuentra el singular)"),
    query("status", { type: "string", enum: ["active", "inactive"] }, "Activos o inactivos. Sin sesión de admin solo se ven los activos"),
    query(
      "sort",
      { type: "string", example: `-${sortable[0]}` },
      `Orden: campos separados por comas, con - delante para descendente. Campos: ${sortable.join(", ")}. Sin sort, el orden de siempre`,
    ),
    query("page", { type: "integer", minimum: 1 }, "Página, desde 1. Sin page se devuelve todo"),
    query("limit", { type: "integer", minimum: 1, maximum: 100, default: 20 }, "Tamaño de la página (con limit y sin page, la primera)"),
    ...Object.entries(filters).map(([name, schema]) => query(name, filterSchema(schema), FILTER_DOCS[name] ?? name)),
  ];
}

// ---------- Los 11 endpoints de cada recurso ----------

function crudPaths(resource) {
  const { path, tag, schema, singular, plural, female, conflicts = {}, hasSlug = true } = resource;
  const ending = female ? "as" : "os";
  const ref = { $ref: `#/components/schemas/${schema}` };
  const base = `/api/${path}`;
  const tags = [tag];
  const conflict = (key) => conflicts[key] && { 409: error(conflicts[key]) };

  // Por defecto: leer, público; escribir, solo admin. Inactivos y papelera, siempre admin.
  const { read = "public", write = "admin", edit = write, owner } = resource.access ?? {};
  const as = (level) => (operation) => secured(operation, level, owner);
  // En los GET públicos del catálogo, la regla de visibilidad (services/visibility.js)
  const visibility = resource.publicView &&
    `Sin token, o con uno que no es de admin, ${resource.publicView}: lo demás no aparece en el listado y por id o slug da 404. El admin lo ve todo.`;
  const withVisibility = (operation) =>
    visibility ? { ...operation, description: [operation.description, visibility].filter(Boolean).join(" ") } : operation;
  const asRead = (operation) => as(read)(withVisibility(operation));
  const asAdmin = as("admin");
  const asWrite = as(write);
  const asEdit = as(edit);

  const paths = {
    [base]: {
      get: asRead({
        summary: `Listar ${plural}`,
        description:
          "Sin los eliminados (soft delete). Admite query params: todos opcionales y combinables. Sin page devuelve todo; con page, solo esa página y el total en las cabeceras.",
        tags,
        parameters: listParameters(resource.listQuery),
        responses: {
          200: { ...list("Listado (o la página pedida)", ref), headers: PAGE_HEADERS },
          400: error("Un query param que no existe, con un valor no válido, o un rango cruzado (el mínimo mayor que el máximo)"),
          ...(resource.listQuery.filters.ownerType && { 404: error("El dueño del filtro no existe o está eliminado") }),
        },
      }),
      post: asWrite({
        summary: `Crear ${singular}`,
        description:
          "slug, status, isActive, deletedAt y las fechas los genera el servidor. Un campo que no está en el esquema da 400.",
        tags,
        requestBody: body(`Create${schema}Input`),
        responses: {
          201: ok("Creado", ref),
          400: error("Datos no válidos o una referencia que no existe, está eliminada o inactiva"),
          ...conflict("create"),
        },
      }),
    },
    [`${base}/actives`]: {
      get: asRead({ summary: `Listar ${plural} activ${ending}`, tags, responses: { 200: list(`Solo activ${ending}`, ref) } }),
    },
    [`${base}/inactives`]: {
      get: asAdmin({
        summary: `Listar ${plural} inactiv${ending}`,
        description: "Los eliminados nunca aparecen aquí.",
        tags,
        responses: { 200: list(`Solo inactiv${ending}`, ref) },
      }),
    },
    [`${base}/deleted`]: {
      get: asAdmin({
        summary: `Papelera de ${plural}`,
        description: "Solo los eliminados, del más reciente al más antiguo.",
        tags,
        responses: { 200: list("Eliminados", ref) },
      }),
    },
    [`${base}/{id}`]: {
      get: asRead({
        summary: `Obtener ${singular} por ID`,
        tags,
        parameters: [idParam],
        responses: { 200: ok("Encontrado", ref), 400: error("ID inválido"), 404: error("No encontrado o eliminado") },
      }),
      patch: asEdit({
        summary: `Editar ${singular}`,
        description:
          "Edición parcial. Para activar o desactivar se usa PATCH /:id/active. Los campos opcionales de texto se vacían enviando null.",
        tags,
        parameters: [idParam],
        requestBody: body(`Update${schema}Input`),
        responses: {
          200: ok("Actualizado", ref),
          400: error("ID o datos no válidos, body sin ningún campo (No fields to update) o un campo que no se puede cambiar"),
          404: error("No encontrado o eliminado"),
          ...conflict("update"),
        },
      }),
    },
    [`${base}/{id}/active`]: {
      patch: asWrite({
        summary: `Activar o desactivar ${singular}`,
        description:
          "No afecta a deletedAt ni a los documentos que lo usan. Si ya tiene ese estado, se devuelve tal cual, sin cambios.",
        tags,
        parameters: [idParam],
        requestBody: activeBody(true),
        responses: {
          200: ok("Actualizado", ref),
          400: error("ID inválido o isActive ausente"),
          404: error("No encontrado o eliminado"),
          ...conflict("update"),
        },
      }),
    },
    [`${base}/{id}/delete`]: {
      patch: asWrite({
        summary: `Eliminar ${singular} (soft delete)`,
        description: "No borra el documento: lo pasa a la papelera.",
        tags,
        parameters: [idParam],
        responses: {
          204: { description: "Eliminado" },
          400: error("ID inválido"),
          404: error("No encontrado o ya eliminado"),
          ...conflict("remove"),
        },
      }),
    },
    [`${base}/{id}/restore`]: {
      patch: asWrite({
        summary: `Restaurar ${singular}`,
        description: "Vuelve inactivo salvo que se envíe isActive: true.",
        tags,
        parameters: [idParam],
        requestBody: activeBody(false),
        responses: {
          200: ok("Restaurado", ref),
          400: error("ID inválido"),
          404: error("No encontrado"),
          409: error(conflicts.restore ?? "No está eliminado, o una de sus referencias está eliminada"),
        },
      }),
    },
  };

  if (hasSlug) {
    paths[`${base}/slug/{slug}`] = {
      get: asRead({
        summary: `Obtener ${singular} por slug`,
        tags,
        parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" }, example: resource.example.slug }],
        responses: { 200: ok("Encontrado", ref), 400: error("Slug con formato inválido"), 404: error("No encontrado o eliminado") },
      }),
    };
  }

  return { ...paths, ...resource.extraPaths?.(ref) };
}

// ---------- Profile: no sigue el patrón de las colecciones ----------
// El registro, el login, el logout y el cambio de contraseña son del servicio de auth
// (moto-routes-auth, http://localhost:3002/auth/docs)

const userRef = { $ref: "#/components/schemas/User" };
const userIdParam = { ...idParam, name: "userId", description: "ID del usuario (ObjectId)" };

const profileUpdate = (who) => ({
  summary: `Editar ${who}`,
  description:
    "name, email y profile (datos del perfil; null vacía un campo). El rol, el estado y la contraseña no se cambian aquí (400 cannot be changed).",
  tags: ["Profile"],
  requestBody: body("UpdateOwnUserInput"),
  responses: {
    200: ok("Actualizado", userRef),
    400: error("Datos no válidos, o un campo que no se puede cambiar"),
    409: error("Email repetido"),
  },
});

const PROFILE_PATHS = {
  "/api/profile/me": {
    get: secured(
      { summary: "Mi usuario con mi perfil", tags: ["Profile"], responses: { 200: ok("Usuario", userRef) } },
      "user"
    ),
    patch: secured(profileUpdate("mi usuario y mi perfil"), "user"),
  },
  "/api/profile/me/bikes": {
    get: secured(
      {
        summary: "Mi garaje",
        description: "Todas mis motos, también las privadas y las inactivas. La principal, primero.",
        tags: ["Profile"],
        responses: { 200: list("Mis motos", { $ref: "#/components/schemas/Bike" }) },
      },
      "user"
    ),
  },
  "/api/profile/{userId}": {
    get: secured(
      {
        summary: "Usuario con su perfil",
        tags: ["Profile"],
        parameters: [userIdParam],
        responses: { 200: ok("Usuario", userRef), 400: error("ID inválido"), 404: error("No encontrado o eliminado") },
      },
      "owner",
      "el propio usuario"
    ),
    patch: secured(
      {
        ...profileUpdate("un usuario y su perfil"),
        parameters: [userIdParam],
        responses: { ...profileUpdate().responses, 404: error("No encontrado o eliminado") },
      },
      "owner",
      "el propio usuario"
    ),
  },
};

const ERROR_EXAMPLES = {
  401: { statusCode: 401, error: "Unauthorized", message: "Authentication required", code: "TOKEN_EXPIRED" },
  403: { statusCode: 403, error: "Forbidden", message: "You do not have permission to access this resource" },
};

const errorExample = (description, example) => ({
  description,
  content: { "application/json": { schema: errorRef, example } },
});

// Lo que swagger.js añade a components: el candado y las respuestas comunes
export const apiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description:
        "Un token de acceso del servicio de auth (POST /auth/login en http://localhost:3002/auth/docs: fuera de producción viene en el body). Lo firma con RS256 y la API lo comprueba con su clave pública (JWKS). Dura 15 minutos. En Swagger UI: botón Authorize y pegar solo el token, sin \"Bearer\". Si llegan la cabecera y la cookie, manda la cabecera.",
    },
    cookieAuth: {
      type: "apiKey",
      in: "cookie",
      name: SESSION_COOKIE,
      description:
        "La sesión del panel: la pone el servicio de auth al hacer login (httpOnly, SameSite=Strict, Path=/) y el navegador la manda sola. Al caducar, el panel la renueva con POST /auth/refresh. Con la cookie, un POST o PATCH con cabecera Origin de otra web es un 403 (Request origin not allowed).",
    },
  },
  responses: {
    Unauthorized: {
      ...errorExample(
        "Sin sesión, o el token no sirve (caducado, manipulado, de un usuario desactivado o eliminado, o de antes de cambiar la contraseña). code solo aparece si había token: TOKEN_EXPIRED o TOKEN_INVALID.",
        ERROR_EXAMPLES[401]
      ),
      headers: {
        "WWW-Authenticate": {
          description: 'Bearer, o Bearer error="invalid_token" si el token no sirve',
          schema: { type: "string" },
        },
      },
    },
    Forbidden: errorExample("Hay sesión, pero el rol o la propiedad del recurso no lo permiten", ERROR_EXAMPLES[403]),
  },
};

// ---------- La tienda pública: /api/shop ----------

const SHOP_TAGS = ["Shop"];
const slugPath = { in: "path", name: "slug", required: true, schema: { type: "string" }, example: "tramuntana-al-amanecer-b8c940" };
const shopData = (description, schema, example) => ({
  description,
  content: { "application/json": { schema: { type: "object", properties: { data: schema } }, ...(example && { example: { data: example } }) } },
});

const SHOP_PARAM_DOCS = {
  category: "Slug de la categoría (la de su ruta). Si no existe, el Shop sale vacío",
  host: "Slug del anfitrión. Si no existe, el Shop sale vacío",
  location: "Slug de una ubicación, de origen o de destino de su ruta. Si no existe, el Shop sale vacío",
  search:
    "Palabras del título o la descripción, con el índice de texto: sin distinguir mayúsculas ni acentos y con sus variantes (montana encuentra Montaña; rutas, ruta). Palabras enteras: pir no encuentra Pirineos. Sin sort, por relevancia",
  difficulty: "Dificultad de su ruta",
  language: "Idioma (código de dos letras)",
  priceMin: "Alguna de sus salidas reservables cuesta esto o más",
  priceMax: "Alguna de sus salidas reservables cuesta esto o menos",
  from: "Alguna de sus salidas reservables empieza en esta fecha o después (ISO 8601)",
  to: "Alguna de sus salidas reservables empieza en esta fecha o antes (ISO 8601)",
  hasDepartures: "Solo las que tienen alguna salida reservable (solo admite true)",
  sort: `Orden: ${SHOP_SORT.join(", ")}, con - delante para descendente. Por defecto, ${SHOP_DEFAULT_SORT}. Las que no tienen salidas van al final al ordenar por priceFrom o nextDepartureAt`,
  page: "Página, desde 1 (1 por defecto)",
  limit: `Tamaño de la página, de 1 a ${SHOP_LIMIT.max} (${SHOP_LIMIT.default} por defecto)`,
};

const carouselPath = (summary, schema) => ({
  get: {
    summary,
    description:
      "Para un carrusel del Home: solo los que tienen alguna experiencia visible, cada uno con cuántas (experienceCount) y su foto " +
      "(coverImage), de más a menos y por nombre si empatan. La categoría y las ubicaciones de una experiencia son las de su ruta. " +
      "Público: con o sin sesión se ve lo mismo.",
    tags: SHOP_TAGS,
    parameters: [
      {
        in: "query",
        name: "limit",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: FACETS_LIMIT.max, default: FACETS_LIMIT.default },
        description: "Cuántos, como mucho",
      },
    ],
    responses: {
      200: shopData("La lista", { type: "array", items: { $ref: `#/components/schemas/${schema}` } }),
      400: error("limit fuera de rango o un query param que no existe"),
    },
  },
});

const SHOP_PATHS = {
  "/api/shop/categories": carouselPath("Categorías del Home", "Category"),
  "/api/shop/hosts": carouselPath("Anfitriones del Home", "Host"),
  "/api/shop/locations": carouselPath("Ubicaciones del Home", "Location"),
  "/api/shop/experiences": {
    get: {
      summary: "Experiencias del Shop",
      description:
        "Una página de experiencias visibles, con los filtros combinables. Cada una trae lo de su tarjeta: su ruta (distancia, duración, " +
        "dificultad, categoría, origen y destino), el anfitrión, la foto principal, la moto del guía, priceFrom y nextDepartureAt. " +
        "El total va en el cuerpo, en pagination. Público: con o sin sesión se ve lo mismo.",
      tags: SHOP_TAGS,
      parameters: Object.entries(shopExperiencesQuery.shape).map(([name, schema]) => ({
        in: "query",
        name,
        required: false,
        schema: filterSchema(schema),
        description: SHOP_PARAM_DOCS[name] ?? name,
      })),
      responses: {
        200: {
          description: "La página y su paginación",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: { $ref: "#/components/schemas/Experience" } },
                  pagination: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      totalPages: { type: "integer" },
                    },
                  },
                },
              },
              example: { data: ["..."], pagination: { total: 12, page: 1, limit: 12, totalPages: 1 } },
            },
          },
        },
        400: error("Un query param que no existe, un valor no válido o un rango cruzado"),
      },
    },
  },
  "/api/shop/experiences/{slug}": {
    get: {
      summary: "Detalle de una experiencia",
      description:
        "Lo de la tarjeta y, además, el anfitrión entero (biografía, foto y su usuario sin el email) e images: su galería activa, por posición.",
      tags: SHOP_TAGS,
      parameters: [slugPath],
      responses: {
        200: shopData("La experiencia", { $ref: "#/components/schemas/Experience" }),
        400: error("Slug con formato inválido"),
        404: error("No existe, está eliminada o no es visible"),
      },
    },
  },
  "/api/shop/experiences/{slug}/departures": {
    get: {
      summary: "Salidas reservables de una experiencia",
      description:
        "Las activas, programadas y futuras, de la más próxima a la más lejana, con startAt, endAt, capacity, price, seatsBooked, seatsLeft (las plazas libres) e isFull. Las completas salen, marcadas, para enseñarlas sin dejar reservarlas.",
      tags: SHOP_TAGS,
      parameters: [slugPath],
      responses: {
        200: shopData("Las salidas", { type: "array", items: { $ref: "#/components/schemas/Departure" } }),
        400: error("Slug con formato inválido"),
        404: error("La experiencia no existe, está eliminada o no es visible"),
      },
    },
  },
};

// ---------- Opiniones: /api/reviews ----------
// No siguen el patrón de las colecciones: crear es de cualquier sesión, editar solo de su autor,
// borrar de su autor o del admin, y leer, ocultar y restaurar, solo del admin (la moderación)

const REVIEW_TAGS = ["Reviews"];
const reviewRef = { $ref: "#/components/schemas/Review" };

const REVIEW_EXAMPLE = {
  _id: "6710a1b2c3d4e5f6a7b8c9a0",
  targetType: "experience",
  targetId: "6710a1b2c3d4e5f6a7b8c940",
  target: { _id: "6710a1b2c3d4e5f6a7b8c940", name: "Tramuntana al amanecer", slug: "tramuntana-al-amanecer-b8c940" },
  userId: "6710a1b2c3d4e5f6a7b8c912",
  user: { _id: "6710a1b2c3d4e5f6a7b8c912", name: "Marta Gil", coverImage: null },
  rating: 5,
  title: "Inolvidable",
  comment: "El paisaje es espectacular y el guía conoce cada curva.",
  verified: false,
  photos: [
    {
      _id: "6710a1b2c3d4e5f6a7b8c9a1",
      url: "/api/uploads/reviews/0b7c1f9e-3c2a-4a59-9d55-1f1c8f2b6a10.webp",
      width: 1600,
      height: 1067,
      createdAt: "2026-11-20T10:15:00.000Z",
    },
  ],
};

const RATING_EXAMPLE = { average: 4.38, count: 8, distribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 5 } };

// Los límites de las fotos, como los lee la API (config/uploads.js)
const PHOTO_LIMITS = (() => {
  const { reviewPhotoMaxBytes, reviewPhotosMax } = uploadsConfigFrom();
  return { max: reviewPhotosMax, kb: Math.round(reviewPhotoMaxBytes / 1024) };
})();

const REVIEW_CODES =
  "code: REVIEW_ALREADY_EXISTS (409, ya has opinado), OWN_TARGET (403, el anfitrión sobre sí mismo o su experiencia) " +
  "o COMMENT_REQUIRED_FOR_LOW_RATING (400, con 1 o 2 estrellas el comentario es obligatorio, de 30 caracteres como mínimo).";

const REVIEW_PATHS = {
  "/api/reviews": {
    get: secured(
      {
        summary: "Listar opiniones",
        description:
          "Todas las opiniones (visibles y ocultas), con lo que valoran (target) y su autor. status=active, las visibles; status=inactive, las ocultas.",
        tags: REVIEW_TAGS,
        parameters: listParameters(reviewListQuery),
        responses: {
          200: { ...list("Listado (o la página pedida)", reviewRef), headers: PAGE_HEADERS },
          400: error("Un query param que no existe o con un valor no válido"),
        },
      },
      "admin",
    ),
    post: secured(
      {
        summary: "Crear mi opinión",
        description:
          "Sobre una experiencia o un anfitrión visibles. La opinión es de quien la escribe (userId no se envía). Una por usuario y objetivo. " +
          "comment es opcional con 3 a 5 estrellas y obligatorio con 1 o 2. " + REVIEW_CODES,
        tags: REVIEW_TAGS,
        requestBody: body("CreateReviewInput"),
        responses: {
          201: ok("Creada", reviewRef),
          400: error("Datos no válidos, o 1-2 estrellas sin comentario suficiente"),
          403: error("Eres el anfitrión de lo que quieres valorar (OWN_TARGET)"),
          404: error("La experiencia o el anfitrión no existen o no son visibles"),
          409: error("Ya has opinado sobre eso (REVIEW_ALREADY_EXISTS)"),
        },
      },
      "user",
    ),
  },
  "/api/reviews/inactives": {
    get: secured({ summary: "Listar opiniones ocultas", tags: REVIEW_TAGS, responses: { 200: list("Las ocultas", reviewRef) } }, "admin"),
  },
  "/api/reviews/deleted": {
    get: secured(
      { summary: "Papelera de opiniones", description: "De la más reciente a la más antigua.", tags: REVIEW_TAGS, responses: { 200: list("Eliminadas", reviewRef) } },
      "admin",
    ),
  },
  "/api/reviews/{id}": {
    get: secured(
      {
        summary: "Obtener opinión por ID",
        tags: REVIEW_TAGS,
        parameters: [idParam],
        responses: { 200: ok("Encontrada", reviewRef), 400: error("ID inválido"), 404: error("No encontrada o eliminada") },
      },
      "admin",
    ),
    patch: secured(
      {
        summary: "Editar mi opinión",
        description:
          "Solo su autor (ni siquiera el admin cambia lo que ha escrito otro: puede ocultarla o borrarla). rating, title y comment; null vacía el título o el comentario. " +
          "La regla de las notas bajas se comprueba con la opinión como quedaría: bajar a 1 estrella sin comentario es un 400.",
        tags: REVIEW_TAGS,
        parameters: [idParam],
        requestBody: body("UpdateReviewInput"),
        responses: {
          200: ok("Actualizada", reviewRef),
          400: error("Datos no válidos, body vacío o 1-2 estrellas sin comentario suficiente"),
          403: error("No es tu opinión"),
          404: error("No encontrada o eliminada"),
        },
      },
      "user",
    ),
  },
  "/api/reviews/{id}/active": {
    patch: secured(
      {
        summary: "Ocultar o mostrar una opinión",
        description: "La moderación: isActive false la oculta de la tienda y deja de contar en las notas.",
        tags: REVIEW_TAGS,
        parameters: [idParam],
        requestBody: activeBody(true),
        responses: { 200: ok("Actualizada", reviewRef), 400: error("ID inválido o isActive ausente"), 404: error("No encontrada o eliminada") },
      },
      "admin",
    ),
  },
  "/api/reviews/{id}/delete": {
    patch: secured(
      {
        summary: "Eliminar una opinión (soft delete)",
        description: "Su autor o el admin; nadie más (403). Va a la papelera y deja de contar en las notas.",
        tags: REVIEW_TAGS,
        parameters: [idParam],
        responses: {
          204: { description: "Eliminada" },
          400: error("ID inválido"),
          403: error("No es tu opinión"),
          404: error("No encontrada o ya eliminada"),
        },
      },
      "user",
    ),
  },
  "/api/reviews/{id}/photos": {
    post: secured(
      {
        summary: "Subir una foto a mi opinión",
        description:
          `Solo su autor, de una en una y hasta ${PHOTO_LIMITS.max} por opinión. multipart/form-data con un único campo, photo: JPEG, PNG o WebP de ${PHOTO_LIMITS.kb} KB como mucho ` +
          "(la web la manda ya reducida a WebP de 1600 px). Se comprueban los bytes del archivo, no su nombre ni su Content-Type. " +
          "Responde la opinión con photos[].url (/api/uploads/reviews/...). code: INVALID_IMAGE (400), PHOTO_TOO_LARGE (413) o TOO_MANY_PHOTOS (409).",
        tags: REVIEW_TAGS,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", required: ["photo"], properties: { photo: { type: "string", format: "binary" } } },
              encoding: { photo: { contentType: "image/jpeg, image/png, image/webp" } },
            },
          },
        },
        responses: {
          201: ok("Añadida: la opinión con sus fotos", reviewRef),
          400: error("Sin foto, más de un archivo o campos de más, o no es JPEG, PNG ni WebP (INVALID_IMAGE)"),
          403: error("No es tu opinión"),
          404: error("No encontrada o eliminada"),
          409: error(`Ya tiene ${PHOTO_LIMITS.max} fotos (TOO_MANY_PHOTOS)`),
          413: error(`La foto pasa de ${PHOTO_LIMITS.kb} KB (PHOTO_TOO_LARGE)`),
        },
      },
      "user",
    ),
  },
  "/api/reviews/{id}/photos/{photoId}": {
    delete: secured(
      {
        summary: "Quitar una foto de una opinión",
        description: "Su autor o el admin (la moderación). Borra también el archivo.",
        tags: REVIEW_TAGS,
        parameters: [idParam, { in: "path", name: "photoId", required: true, schema: { type: "string" }, description: "Id de la foto (photos[]._id)" }],
        responses: {
          200: ok("Quitada: la opinión con las fotos que le quedan", reviewRef),
          400: error("ID inválido"),
          403: error("No es tu opinión"),
          404: error("La opinión o la foto no existen"),
        },
      },
      "user",
    ),
  },
  "/api/uploads/reviews/{file}": {
    get: {
      summary: "Una foto de una opinión",
      description:
        "Público. La URL viene en photos[].url. El nombre no cambia nunca: se puede guardar en caché un año (Cache-Control immutable). " +
        "Las de una opinión oculta o eliminada se siguen sirviendo, para que se pueda restaurar.",
      tags: REVIEW_TAGS,
      parameters: [{ in: "path", name: "file", required: true, schema: { type: "string" }, example: "0b7c1f9e-3c2a-4a59-9d55-1f1c8f2b6a10.webp" }],
      responses: {
        200: { description: "La foto", content: { "image/webp": {}, "image/jpeg": {}, "image/png": {} } },
        404: error("No existe"),
      },
    },
  },
  "/api/reviews/{id}/restore": {
    patch: secured(
      {
        summary: "Restaurar una opinión",
        description: "Vuelve con el estado que tenía, salvo que se envíe isActive.",
        tags: REVIEW_TAGS,
        parameters: [idParam],
        requestBody: activeBody(false),
        responses: {
          200: ok("Restaurada", reviewRef),
          400: error("ID inválido"),
          404: error("No encontrada"),
          409: error("No está eliminada, su objetivo está eliminado o su autor ya ha vuelto a opinar (REVIEW_ALREADY_EXISTS)"),
        },
      },
      "admin",
    ),
  },
};

// Las opiniones de la tienda: las de una experiencia y las de un anfitrión son iguales
const hostSlugPath = { ...slugPath, example: "lucia-ferrer-b8c915" };
const reviewQuery = [
  { in: "query", name: "sort", required: false, schema: { type: "string", enum: Object.keys(SHOP_REVIEW_SORT), default: "recent" }, description: "recent: las más recientes; best: las mejores; worst: las peores" },
  { in: "query", name: "rating", required: false, schema: { type: "integer", minimum: 1, maximum: 5 }, description: "Solo las de esas estrellas" },
  { in: "query", name: "withPhotos", required: false, schema: { type: "string", enum: ["true", "false"] }, description: "true: solo las que tienen fotos" },
  { in: "query", name: "page", required: false, schema: { type: "integer", minimum: 1 }, description: "Página, desde 1 (1 por defecto)" },
  { in: "query", name: "limit", required: false, schema: { type: "integer", minimum: 1, maximum: SHOP_REVIEWS_LIMIT.max, default: SHOP_REVIEWS_LIMIT.default }, description: "Tamaño de la página" },
];

const shopReviewsPath = (what, param) => ({
  get: {
    summary: `Opiniones de ${what}`,
    description:
      "Las visibles, por páginas, con su autor (nombre y foto, nunca el email) y sus fotos. summary es la nota de todas: average, count, distribution (cuántas de cada estrella) " +
      "y withPhotos (cuántas tienen fotos). Público.",
    tags: SHOP_TAGS,
    parameters: [param, ...reviewQuery],
    responses: {
      200: {
        description: "La página, su paginación y el resumen",
        content: {
          "application/json": {
            schema: { type: "object", properties: { data: { type: "array", items: reviewRef }, pagination: { type: "object" }, summary: { type: "object" } } },
            example: { data: [REVIEW_EXAMPLE], pagination: { total: 8, page: 1, limit: 10, totalPages: 1 }, summary: { ...RATING_EXAMPLE, withPhotos: 1 } },
          },
        },
      },
      400: error("Slug o query param no válido"),
      404: error(`${what[0].toUpperCase()}${what.slice(1)} no existe, está eliminado o no es visible`),
    },
  },
});

const myReviewPath = (what, param) => ({
  get: secured(
    {
      summary: `Mi opinión de ${what}`,
      description:
        "Para el formulario: review (la mía, o null), canReview (si puedo opinar) y reason (por qué no: OWN_TARGET o REVIEW_ALREADY_EXISTS). " +
        "La web enseña o no el botón de opinar con canReview, así no cambia cuando cambie la regla.",
      tags: SHOP_TAGS,
      parameters: [param],
      responses: {
        200: shopData("Mi opinión y si puedo opinar", { type: "object" }, { review: null, canReview: true, reason: null }),
        400: error("Slug con formato inválido"),
        404: error("No existe, está eliminado o no es visible"),
      },
    },
    "user",
  ),
});

Object.assign(SHOP_PATHS, {
  "/api/shop/hosts/{slug}": {
    get: {
      summary: "Ficha de un anfitrión",
      description:
        "Su perfil (biografía, foto y motos públicas), sus dos notas (rating: sus opiniones como guía; experiencesRating: las de todas sus experiencias activas) " +
        "y experiences: sus experiencias visibles, como las tarjetas del Shop. Público.",
      tags: SHOP_TAGS,
      parameters: [hostSlugPath],
      responses: {
        200: shopData("El anfitrión", { $ref: "#/components/schemas/Host" }),
        400: error("Slug con formato inválido"),
        404: error("No existe, está eliminado o no es visible"),
      },
    },
  },
  "/api/shop/experiences/{slug}/reviews": shopReviewsPath("una experiencia", slugPath),
  "/api/shop/experiences/{slug}/reviews/mine": myReviewPath("una experiencia", slugPath),
  "/api/shop/hosts/{slug}/reviews": shopReviewsPath("un anfitrión", hostSlugPath),
  "/api/shop/hosts/{slug}/reviews/mine": myReviewPath("un anfitrión", hostSlugPath),
});

export const apiTags = [
  { name: "Profile", description: "El usuario de la sesión y su perfil. El perfil pertenece al usuario: nace, se elimina y se restaura con él." },
  ...RESOURCES.map(({ tag, description }) => ({ name: tag, ...(description && { description }) })),
  {
    name: "Reviews",
    description:
      "Opiniones de las experiencias y de los anfitriones (targetType + targetId), con estrellas de 1 a 5. Una por usuario y objetivo. " +
      "Las visibles se leen en la tienda (/api/shop/.../reviews); aquí se escriben y se moderan. Cada cambio recalcula las notas guardadas: " +
      "rating en experiencias, anfitriones y rutas (la de una ruta, de las opiniones de sus experiencias) y experiencesRating en los anfitriones.",
  },
  {
    name: "Shop",
    description:
      "La tienda pública: el Home (sus tres carruseles), el Shop (las experiencias con filtros y página) y el detalle con sus salidas. " +
      "Responde { data } y, en el listado, { data, pagination }. Sin sesión, y con sesión se ve lo mismo.",
  },
];

export const apiPaths = Object.assign({}, PROFILE_PATHS, ...RESOURCES.map(crudPaths), REVIEW_PATHS, SHOP_PATHS);

export const apiSchemas = {
  UpdateOwnUserInput: fromZod(updateOwnUserSchema),
  Review: { type: "object", example: { ...REVIEW_EXAMPLE, ...COMMON_FIELDS } },
  CreateReviewInput: fromZod(createReviewSchema),
  UpdateReviewInput: fromZod(updateReviewSchema),
  ...Object.fromEntries(
    RESOURCES.flatMap(({ schema, create, update, example }) => [
      [schema, { type: "object", example: { ...example, ...COMMON_FIELDS } }],
      [`Create${schema}Input`, fromZod(create)],
      [`Update${schema}Input`, fromZod(update)],
    ])
  ),
};
