import { z } from "zod";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { createBikeSchema, updateBikeSchema } from "../schemas/bike.schema.js";
import { createCategorySchema, updateCategorySchema } from "../schemas/category.schema.js";
import { createDepartureSchema, updateDepartureSchema } from "../schemas/departure.schema.js";
import { createExperienceSchema, updateExperienceSchema } from "../schemas/experience.schema.js";
import { createHostSchema, updateHostSchema } from "../schemas/host.schema.js";
import { createImageSchema, updateImageSchema } from "../schemas/image.schema.js";
import { createLocationSchema, updateLocationSchema } from "../schemas/location.schema.js";
import { createRoleSchema, updateRoleSchema } from "../schemas/role.schema.js";
import { createRouteSchema, updateRouteSchema } from "../schemas/route.schema.js";
import {
  changePasswordSchema,
  createUserSchema,
  updateOwnUserSchema,
  updateUserSchema,
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
    tag: "Hosts",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen los activos cuyo usuario también lo esté",
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
    tag: "Categories",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas",
    schema: "Category",
    singular: "categoría",
    plural: "categorías",
    female: true,
    create: createCategorySchema,
    update: updateCategorySchema,
    description: "El nombre es único sin distinguir mayúsculas ni tildes (la ñ cuenta como letra propia).",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c930",
      name: "Montaña",
      description: "Carreteras de sierra y alta montaña",
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
    tag: "Locations",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas",
    schema: "Location",
    singular: "ubicación",
    plural: "ubicaciones",
    female: true,
    create: createLocationSchema,
    update: updateLocationSchema,
    description: "latitude y longitude van las dos o ninguna. Se guardan como punto GeoJSON.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c920",
      city: "Sóller",
      region: "Islas Baleares",
      country: "España",
      latitude: 39.7667,
      longitude: 2.715,
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
    tag: "Routes",
    // Lo que ve el público (services/visibility.js)
    publicView: "solo salen las activas cuya categoría y ubicaciones también lo estén",
    schema: "Route",
    singular: "ruta",
    plural: "rutas",
    female: true,
    create: createRouteSchema,
    update: updateRouteSchema,
    description: "Cada ruta trae su categoría, su origen, su destino y su imagen principal.",
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
      startLocation: { _id: "6710a1b2c3d4e5f6a7b8c921", city: "Palma", region: "Islas Baleares", country: "España", slug: "palma-b8c921" },
      endLocationId: "6710a1b2c3d4e5f6a7b8c920",
      endLocation: { _id: "6710a1b2c3d4e5f6a7b8c920", city: "Sóller", region: "Islas Baleares", country: "España", slug: "soller-b8c920" },
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c991", url: "https://picsum.photos/seed/caminos/1200/800", alt: "Caminos de Mallorca, foto 1" },
      slug: "caminos-de-mallorca-df38e9",
    },
    conflicts: {
      remove: "La ruta tiene experiencias",
    },
  },
  {
    path: "experiences",
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
      "Salida guiada que un anfitrión organiza sobre una ruta. guideBikeId (opcional) es la moto con la que guía: una moto activa y pública del usuario del anfitrión; sale como guideBike.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c940",
      hostId: "6710a1b2c3d4e5f6a7b8c915",
      host: { _id: "6710a1b2c3d4e5f6a7b8c915", name: "Lucía Ferrer", slug: "lucia-ferrer-b8c915" },
      routeId: "6abfc9f47a7195ca59df38e9",
      route: { _id: "6abfc9f47a7195ca59df38e9", title: "Caminos de Mallorca", slug: "caminos-de-mallorca-df38e9" },
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
      slug: "tramuntana-al-amanecer-b8c940",
    },
    conflicts: {
      update: "maxParticipants por debajo de la capacidad de alguna salida",
      remove: "La experiencia tiene salidas",
    },
  },
  {
    path: "departures",
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
      "guideBike es la moto del guía de ese día: la suya (guideBikeId) o, si no tiene, la de su experiencia.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c950",
      experienceId: "6710a1b2c3d4e5f6a7b8c940",
      experience: { _id: "6710a1b2c3d4e5f6a7b8c940", title: "Tramuntana al amanecer", slug: "tramuntana-al-amanecer-b8c940" },
      startAt: "2026-11-08T06:00:00.000Z",
      endAt: "2026-11-08T11:00:00.000Z",
      capacity: 8,
      price: 89,
      state: "scheduled",
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
    listParameters: [
      { in: "query", name: "ownerType", schema: { type: "string" }, description: "Filtra por dueño (con ownerId)" },
      { in: "query", name: "ownerId", schema: { type: "string" }, description: "Filtra por dueño (con ownerType)" },
    ],
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

const bearer = [{ bearerAuth: [] }];
const unauthorized = { $ref: "#/components/responses/Unauthorized" };
const forbidden = { $ref: "#/components/responses/Forbidden" };
const tooManyRequests = { $ref: "#/components/responses/TooManyRequests" };

/**
 * Añade a una operación el candado (bearerAuth), quién puede usarla y sus 401 y 403.
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
        description: "Sin los eliminados (soft delete).",
        tags,
        ...(resource.listParameters && { parameters: resource.listParameters }),
        responses: {
          200: list("Listado", ref),
          ...(resource.listParameters && {
            400: error("Filtro incompleto o inválido"),
            404: error("El dueño del filtro no existe o está eliminado"),
          }),
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

// ---------- Auth y profile: no siguen el patrón de las colecciones ----------

const userRef = { $ref: "#/components/schemas/User" };
const sessionRef = { $ref: "#/components/schemas/Session" };
const userIdParam = { ...idParam, name: "userId", description: "ID del usuario (ObjectId)" };

const AUTH_PATHS = {
  "/api/auth/register": {
    post: {
      summary: "Registrarse",
      description:
        "Alta pública: siempre con el rol rider (roleId no se acepta) y con su perfil vacío. Devuelve la sesión, como el login. Como mucho 10 altas cada 15 minutos por IP.",
      tags: ["Auth"],
      requestBody: body("RegisterInput"),
      responses: {
        201: ok("Registrado, con la sesión iniciada", sessionRef),
        400: error("Datos no válidos, o roleId (is not allowed)"),
        409: error("Email repetido"),
        429: tooManyRequests,
      },
    },
  },
  "/api/auth/login": {
    post: {
      summary: "Iniciar sesión",
      description:
        "Devuelve el JWT y el usuario con su rol y su perfil. El mismo 401 si el correo no existe, la contraseña no coincide o la cuenta está inactiva. Como mucho 10 intentos fallidos cada 15 minutos por IP.",
      tags: ["Auth"],
      requestBody: body("LoginInput"),
      responses: {
        200: ok("Sesión iniciada", sessionRef),
        400: error("Falta el email o la contraseña"),
        401: {
          description: "Credenciales no válidas",
          content: {
            "application/json": {
              schema: errorRef,
              example: { statusCode: 401, error: "Unauthorized", message: "Invalid email or password" },
            },
          },
        },
        429: tooManyRequests,
      },
    },
  },
  "/api/auth/me": {
    get: secured(
      { summary: "Usuario de la sesión", description: "Con su rol y su perfil.", tags: ["Auth"], responses: { 200: ok("Usuario", userRef) } },
      "user"
    ),
  },
  "/api/auth/logout": {
    post: secured(
      {
        summary: "Cerrar sesión",
        description:
          "Cierra esta sesión: el token pasa a la lista negra y deja de servir al momento, aunque no haya caducado. Las sesiones de otros dispositivos siguen abiertas. El cliente, además, borra el token.",
        tags: ["Auth"],
        responses: { 204: { description: "Sesión cerrada" } },
      },
      "user"
    ),
  },
  "/api/auth/logout-all": {
    post: secured(
      {
        summary: "Cerrar todas las sesiones",
        description:
          "Invalida todos los tokens del usuario (sube su tokenVersion), también el de esta petición, en todos los dispositivos. Para cerrar solo esta sesión: POST /api/auth/logout.",
        tags: ["Auth"],
        responses: { 204: { description: "Sesiones cerradas" } },
      },
      "user"
    ),
  },
};

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
  "/api/profile/me/password": {
    patch: secured(
      {
        summary: "Cambiar mi contraseña",
        description:
          "Pide la actual. Cierra todas las sesiones y devuelve una nueva para seguir en esta. Una contraseña actual incorrecta es un 400 en currentPassword, no un 401: la sesión sigue siendo válida.",
        tags: ["Profile"],
        requestBody: body("ChangePasswordInput"),
        responses: {
          200: ok("Contraseña cambiada, con la sesión nueva", sessionRef),
          400: error("currentPassword incorrecta, o newPassword no válida o igual a la actual"),
        },
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
  429: { statusCode: 429, error: "Too Many Requests", message: "Too many attempts, please try again later" },
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
        "El token de POST /api/auth/login (o /register). En Swagger UI: botón Authorize y pegar solo el token, sin \"Bearer\".",
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
    TooManyRequests: errorExample("Demasiados intentos desde esta IP: hay que esperar", ERROR_EXAMPLES[429]),
  },
};

export const apiTags = [
  { name: "Auth", description: "Registro, login (JWT) y sesión. Ver el botón Authorize." },
  { name: "Profile", description: "El usuario de la sesión y su perfil. El perfil pertenece al usuario: nace, se elimina y se restaura con él." },
  ...RESOURCES.map(({ tag, description }) => ({ name: tag, ...(description && { description }) })),
];

export const apiPaths = Object.assign({}, AUTH_PATHS, PROFILE_PATHS, ...RESOURCES.map(crudPaths));

export const apiSchemas = {
  Session: {
    type: "object",
    example: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzEwYTFiMmMzZDRlNWY2YTdiOGM5MTAiLCJyb2xlIjoiaG9zdCJ9.firma",
      tokenType: "Bearer",
      expiresIn: 604800,
      user: { ...RESOURCES.find((resource) => resource.path === "users").example, ...COMMON_FIELDS },
    },
  },
  RegisterInput: fromZod(registerSchema),
  LoginInput: fromZod(loginSchema),
  UpdateOwnUserInput: fromZod(updateOwnUserSchema),
  ChangePasswordInput: fromZod(changePasswordSchema),
  ...Object.fromEntries(
    RESOURCES.flatMap(({ schema, create, update, example }) => [
      [schema, { type: "object", example: { ...example, ...COMMON_FIELDS } }],
      [`Create${schema}Input`, fromZod(create)],
      [`Update${schema}Input`, fromZod(update)],
    ])
  ),
};
