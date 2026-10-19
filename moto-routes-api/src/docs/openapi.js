import { z } from "zod";
import { createCategorySchema, updateCategorySchema } from "../schemas/category.schema.js";
import { createDepartureSchema, updateDepartureSchema } from "../schemas/departure.schema.js";
import { createExperienceSchema, updateExperienceSchema } from "../schemas/experience.schema.js";
import { createHostSchema, updateHostSchema } from "../schemas/host.schema.js";
import { createImageSchema, updateImageSchema } from "../schemas/image.schema.js";
import { createLocationSchema, updateLocationSchema } from "../schemas/location.schema.js";
import { createRoleSchema, updateRoleSchema } from "../schemas/role.schema.js";
import { createRouteSchema, updateRouteSchema } from "../schemas/route.schema.js";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema.js";

/*
 * Documentación OpenAPI de todos los recursos.
 *
 * Los nueve recursos tienen los mismos endpoints, así que las rutas se generan con
 * crudPaths(). Los cuerpos de las peticiones salen de los propios esquemas de Zod
 * (z.toJSONSchema), así la documentación nunca se desincroniza de la validación.
 * Cada recurso solo aporta un ejemplo de respuesta y sus conflictos (409).
 */

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

// Zod → JSON Schema compatible con OpenAPI 3.0
function fromZod(schema) {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "input",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
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
    schema: "User",
    singular: "usuario",
    plural: "usuarios",
    create: createUserSchema,
    update: updateUserSchema,
    description: "La API recibe password y guarda solo su hash (bcrypt). passwordHash nunca se devuelve.",
    example: {
      _id: "6710a1b2c3d4e5f6a7b8c910",
      name: "Lucía Ferrer",
      email: "lucia@routly.dev",
      roleId: "6710a1b2c3d4e5f6a7b8c901",
      role: { _id: "6710a1b2c3d4e5f6a7b8c901", name: "host", label: "Anfitrión" },
      coverImage: { _id: "6710a1b2c3d4e5f6a7b8c990", url: "https://picsum.photos/seed/lucia/400/400", alt: "Foto de perfil" },
      slug: "lucia-ferrer-b8c910",
    },
    conflicts: {
      create: "Email repetido",
      update: "Email repetido, o quitar el rol host a un usuario con perfil de anfitrión",
      remove: "El usuario tiene perfil de anfitrión",
    },
  },
  {
    path: "hosts",
    tag: "Hosts",
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
    },
    conflicts: {
      create: "El usuario ya tiene un perfil de anfitrión",
      remove: "El anfitrión tiene experiencias",
    },
  },
  {
    path: "categories",
    tag: "Categories",
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
    schema: "Experience",
    singular: "experiencia",
    plural: "experiencias",
    female: true,
    create: createExperienceSchema,
    update: updateExperienceSchema,
    description: "Salida guiada que un anfitrión organiza sobre una ruta.",
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
    schema: "Departure",
    singular: "salida",
    plural: "salidas",
    female: true,
    create: createDepartureSchema,
    update: updateDepartureSchema,
    description:
      "Fecha concreta de una experiencia. sku (RTL-DEP-AAMMDD-XXXXX) lo genera el servidor y no cambia nunca; el slug sí sigue a la fecha.",
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
      slug: "tramuntana-al-amanecer-2026-11-08-b8c950",
    },
    conflicts: {},
    extraPaths: (ref) => ({
      "/api/departures/sku/{sku}": {
        get: {
          summary: "Obtener salida por SKU",
          description: "Se acepta en minúsculas. 404 si no existe o está en la papelera.",
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
    path: "images",
    tag: "Images",
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

// ---------- Los 11 endpoints de cada recurso ----------

function crudPaths(resource) {
  const { path, tag, schema, singular, plural, female, conflicts = {}, hasSlug = true } = resource;
  const ending = female ? "as" : "os";
  const ref = { $ref: `#/components/schemas/${schema}` };
  const base = `/api/${path}`;
  const tags = [tag];
  const conflict = (key) => conflicts[key] && { 409: error(conflicts[key]) };

  const paths = {
    [base]: {
      get: {
        summary: `Listar ${plural}`,
        description: "Sin los eliminados (soft delete).",
        tags,
        ...(resource.listParameters && { parameters: resource.listParameters }),
        responses: { 200: list("Listado", ref), ...(resource.listParameters && { 400: error("Filtro incompleto o inválido") }) },
      },
      post: {
        summary: `Crear ${singular}`,
        description: "slug, status, isActive, deletedAt y las fechas los genera el servidor.",
        tags,
        requestBody: body(`Create${schema}Input`),
        responses: {
          201: ok("Creado", ref),
          400: error("Datos no válidos o una referencia que no existe, está eliminada o inactiva"),
          ...conflict("create"),
        },
      },
    },
    [`${base}/actives`]: {
      get: { summary: `Listar ${plural} activ${ending}`, tags, responses: { 200: list(`Solo activ${ending}`, ref) } },
    },
    [`${base}/inactives`]: {
      get: {
        summary: `Listar ${plural} inactiv${ending}`,
        description: "Los eliminados nunca aparecen aquí.",
        tags,
        responses: { 200: list(`Solo inactiv${ending}`, ref) },
      },
    },
    [`${base}/deleted`]: {
      get: {
        summary: `Papelera de ${plural}`,
        description: "Solo los eliminados, del más reciente al más antiguo.",
        tags,
        responses: { 200: list("Eliminados", ref) },
      },
    },
    [`${base}/{id}`]: {
      get: {
        summary: `Obtener ${singular} por ID`,
        tags,
        parameters: [idParam],
        responses: { 200: ok("Encontrado", ref), 400: error("ID inválido"), 404: error("No encontrado o eliminado") },
      },
      patch: {
        summary: `Editar ${singular}`,
        description: "Edición parcial. status admite active o inactive.",
        tags,
        parameters: [idParam],
        requestBody: body(`Update${schema}Input`),
        responses: {
          200: ok("Actualizado", ref),
          400: error("ID o datos no válidos"),
          404: error("No encontrado o eliminado"),
          ...conflict("update"),
        },
      },
    },
    [`${base}/{id}/active`]: {
      patch: {
        summary: `Activar o desactivar ${singular}`,
        description: "No afecta a deletedAt ni a los documentos que lo usan.",
        tags,
        parameters: [idParam],
        requestBody: activeBody(true),
        responses: {
          200: ok("Actualizado", ref),
          400: error("ID inválido o isActive ausente"),
          404: error("No encontrado o eliminado"),
          ...conflict("update"),
        },
      },
    },
    [`${base}/{id}/delete`]: {
      patch: {
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
      },
    },
    [`${base}/{id}/restore`]: {
      patch: {
        summary: `Restaurar ${singular}`,
        description: "Vuelve inactivo salvo que se envíe isActive: true.",
        tags,
        parameters: [idParam],
        requestBody: activeBody(false),
        responses: {
          200: ok("Restaurado", ref),
          400: error("ID inválido"),
          404: error("No encontrado"),
          409: error("No está eliminado, o una de sus referencias está eliminada"),
        },
      },
    },
  };

  if (hasSlug) {
    paths[`${base}/slug/{slug}`] = {
      get: {
        summary: `Obtener ${singular} por slug`,
        tags,
        parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" }, example: resource.example.slug }],
        responses: { 200: ok("Encontrado", ref), 400: error("Slug con formato inválido"), 404: error("No encontrado o eliminado") },
      },
    };
  }

  return { ...paths, ...resource.extraPaths?.(ref) };
}

export const apiTags = RESOURCES.map(({ tag, description }) => ({ name: tag, ...(description && { description }) }));

export const apiPaths = Object.assign({}, ...RESOURCES.map(crudPaths));

export const apiSchemas = Object.fromEntries(
  RESOURCES.flatMap(({ schema, create, update, example }) => [
    [schema, { type: "object", example: { ...example, ...COMMON_FIELDS } }],
    [`Create${schema}Input`, fromZod(create)],
    [`Update${schema}Input`, fromZod(update)],
  ])
);
