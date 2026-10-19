# Postman - Routly API

Base URL: `http://localhost:3000`

Todas las peticiones con body llevan la cabecera:
```
Content-Type: application/json
```

Los ejemplos usan los datos de `npm run seed`. Los `_id` cambian cada vez que se ejecuta: cópialos de un listado antes de probar.

---

## Health Check

**GET** `/health`

Response `200`:
```json
{ "ok": true }
```

---

## Endpoints comunes

Las nueve colecciones tienen los mismos endpoints. Cambia `<colección>` por `roles`, `users`, `hosts`, `categories`, `locations`, `routes`, `experiences`, `departures` o `images`.

| Petición | Qué hace | Éxito |
|---|---|---|
| **GET** `/api/<colección>` | Listado, sin los eliminados | 200 |
| **GET** `/api/<colección>/actives` | Solo activos | 200 |
| **GET** `/api/<colección>/inactives` | Solo inactivos (nunca los eliminados) | 200 |
| **GET** `/api/<colección>/deleted` | Papelera, del eliminado más reciente al más antiguo | 200 |
| **GET** `/api/<colección>/slug/:slug` | Por slug (todas menos `images`) | 200 |
| **GET** `/api/<colección>/:id` | Por ID | 200 |
| **POST** `/api/<colección>` | Crear | 201 |
| **PATCH** `/api/<colección>/:id` | Editar solo los campos que se envían | 200 |
| **PATCH** `/api/<colección>/:id/active` | Activar o desactivar | 200 |
| **PATCH** `/api/<colección>/:id/delete` | Eliminar (soft delete) | 204 |
| **PATCH** `/api/<colección>/:id/restore` | Restaurar | 200 |

`slug`, `status` (al crear), `isActive`, `deletedAt`, `createdAt` y `updatedAt` los genera el servidor. Si se envían en el body, se ignoran.

### Activar o desactivar

**PATCH** `/api/routes/:id/active`

```json
{ "isActive": false }
```

También se puede con el PATCH normal: `{ "status": "inactive" }`. El valor `deleted` no se acepta ahí: solo se llega con `/delete`.

### Eliminar y restaurar

**PATCH** `/api/routes/:id/delete` → `204` sin body. El documento pasa a la papelera (`GET /api/routes/deleted`).

**PATCH** `/api/routes/:id/restore`

```json
{ "isActive": true }
```

Sin body, vuelve inactivo. Si no estaba eliminado:
```json
{ "statusCode": 409, "error": "Conflict", "message": "Route is not deleted" }
```

### Errores comunes

Response `400` (validación de Zod):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "difficulty", "message": "difficulty must be one of: easy, medium, hard" },
    { "field": "distance", "message": "distance must be greater than or equal to 0" }
  ]
}
```

Response `400` (ID con formato no válido, por ejemplo `/api/routes/123`):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "id", "message": "id has an invalid format" }]
}
```

Response `404` (no existe o está eliminado):
```json
{ "statusCode": 404, "error": "Not Found", "message": "Route not found" }
```

Response `400` (JSON mal formado):
```json
{ "statusCode": 400, "error": "Bad Request", "message": "Malformed JSON in request body" }
```

---

## Roles

**POST** `/api/roles`

```json
{ "name": "editor", "label": "Editor", "description": "Revisa el contenido" }
```

- `name` se guarda en minúsculas y solo admite letras, números y guiones.
- Los roles base (`admin`, `host`, `rider`) no se pueden desactivar, eliminar ni renombrar:

```json
{ "statusCode": 409, "error": "Conflict", "message": "System roles cannot be deactivated" }
```

| Caso | Mensaje (409) |
|---|---|
| `name` repetido | `A role with this name already exists` |
| Renombrar un rol base | `System roles cannot be renamed` |
| Eliminar un rol base | `System roles cannot be deleted` |
| Eliminar un rol con usuarios | `Cannot delete a role that has users` |

---

## Users

**POST** `/api/users`

```json
{
  "name": "Ana Ruiz",
  "email": "ana@routly.dev",
  "password": "una-contraseña-larga",
  "roleId": "<id de un rol>"
}
```

Response `201`:
```json
{
  "_id": "6ad647681b0b769e10cbcc85",
  "name": "Marta Gil",
  "email": "marta@routly.dev",
  "roleId": "6ad647681b0b769e10cbcc7d",
  "status": "active",
  "isActive": true,
  "deletedAt": null,
  "slug": "marta-gil-cbcc85",
  "createdAt": "2026-10-19T16:38:00.932Z",
  "updatedAt": "2026-10-19T16:38:00.932Z",
  "__v": 0,
  "role": { "_id": "6ad647681b0b769e10cbcc7d", "name": "rider", "label": "Motorista" },
  "coverImage": {
    "_id": "6ad647691b0b769e10cbccbf",
    "url": "https://picsum.photos/seed/marta-gil-cbcc85/400/400",
    "alt": "Foto de perfil de Marta Gil"
  }
}
```

- Sin `roleId`, el usuario es `rider`.
- `password` tiene de 8 a 72 caracteres. Se guarda solo su hash: **`passwordHash` nunca aparece en una respuesta**.
- El correo se guarda en minúsculas.

| Caso | Respuesta |
|---|---|
| Email repetido | 409 `A user with this email already exists` |
| `roleId` inexistente, eliminado o inactivo | 400 en `roleId`: `roleId must reference an active role` |
| Quitar el rol `host` a un usuario con perfil de anfitrión | 409 `User has a host profile` |
| Eliminar un usuario con perfil de anfitrión | 409 `Cannot delete a user that has a host profile` |

---

## Hosts

**POST** `/api/hosts`

```json
{
  "userId": "<id de un usuario con el rol host>",
  "name": "Lucía Ferrer",
  "biography": "Guía en Mallorca desde 2015."
}
```

`userId` no se puede cambiar después. La respuesta trae `user: { _id, name, email }` y `coverImage`.

| Caso | Respuesta |
|---|---|
| El usuario no tiene el rol `host` | 400 en `userId`: `userId must reference a user with the host role` |
| El usuario ya tiene perfil | 409 `This user already has a host profile` |
| Eliminar un anfitrión con experiencias | 409 `Cannot delete a host that has experiences` |

---

## Categories

**POST** `/api/categories`

```json
{ "name": "Urbana", "description": "Rutas por ciudad" }
```

El nombre es único sin distinguir mayúsculas ni tildes: `MONTAÑA` y `Cósta` chocan con `Montaña` y `Costa`. La `ñ` cuenta como letra propia: `Montana` es otro nombre.

| Caso | Mensaje (409) |
|---|---|
| Nombre repetido | `A category with this name already exists` |
| Eliminar una categoría con rutas | `Cannot delete a category that has routes` |

---

## Locations

**POST** `/api/locations`

```json
{ "city": "Teruel", "region": "Aragón", "latitude": 40.3456, "longitude": -1.1065 }
```

- `country` es `España` si no se envía.
- `latitude` y `longitude` van las dos o ninguna:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "latitude", "message": "latitude and longitude must be sent together" }]
}
```

| Caso | Mensaje (409) |
|---|---|
| Ciudad, región y país repetidos | `A location with this city, region and country already exists` |
| Eliminar una ubicación usada por rutas | `Cannot delete a location that is used by routes` |

---

## Routes

**POST** `/api/routes`

```json
{
  "title": "Ruta del Cañón",
  "description": "Travesía por los desfiladeros del norte",
  "difficulty": "hard",
  "distance": 250,
  "duration": 6,
  "categoryId": "<id de una categoría>",
  "startLocationId": "<id de una ubicación>",
  "endLocationId": "<id de una ubicación>"
}
```

Response `200` de **GET** `/api/routes/slug/caminos-de-mallorca-cbccb5`:
```json
{
  "_id": "6ad647691b0b769e10cbccb5",
  "title": "Caminos de Mallorca",
  "description": "Ruta por la Serra de Tramuntana con curvas sin fin",
  "difficulty": "medium",
  "distance": 120,
  "duration": 3,
  "categoryId": "6ad647681b0b769e10cbcc8d",
  "startLocationId": "6ad647681b0b769e10cbcc9f",
  "endLocationId": "6ad647681b0b769e10cbcca1",
  "status": "active",
  "isActive": true,
  "deletedAt": null,
  "slug": "caminos-de-mallorca-cbccb5",
  "createdAt": "2026-10-19T16:38:01.043Z",
  "updatedAt": "2026-10-19T16:38:01.043Z",
  "__v": 0,
  "category": { "_id": "6ad647681b0b769e10cbcc8d", "name": "Montaña", "slug": "montana-cbcc8d" },
  "startLocation": { "_id": "6ad647681b0b769e10cbcc9f", "city": "Palma", "region": "Islas Baleares", "country": "España", "slug": "palma-cbcc9f" },
  "endLocation": { "_id": "6ad647681b0b769e10cbcca1", "city": "Sóller", "region": "Islas Baleares", "country": "España", "slug": "soller-cbcca1" },
  "coverImage": {
    "_id": "6ad647691b0b769e10cbccb7",
    "url": "https://picsum.photos/seed/caminos-de-mallorca-cbccb5/1200/800",
    "alt": "Caminos de Mallorca, foto 1"
  }
}
```

- `endLocationId` puede ser igual que `startLocationId` (ruta circular).
- El slug se regenera si cambia el título.

| Caso | Respuesta |
|---|---|
| Categoría inexistente, eliminada o inactiva | 400 en `categoryId`: `categoryId must reference an active category` |
| Ubicación inexistente, eliminada o inactiva | 400 en `startLocationId` o `endLocationId` |
| Eliminar una ruta con experiencias | 409 `Cannot delete a route that has experiences` |
| Restaurar una ruta cuya categoría está en la papelera | 409 `Cannot restore: categoryId references a deleted category` |

---

## Experiences

**POST** `/api/experiences`

```json
{
  "hostId": "<id de un anfitrión>",
  "routeId": "<id de una ruta>",
  "title": "Tramuntana al amanecer",
  "meetingPoint": "Plaça d'Espanya, Palma",
  "language": "es",
  "duration": 5,
  "minParticipants": 2,
  "maxParticipants": 8
}
```

La respuesta trae `host: { _id, name, slug }` y `route: { _id, title, slug }`.

| Caso | Respuesta |
|---|---|
| `minParticipants` mayor que `maxParticipants` | 400 en `maxParticipants` |
| Bajar `maxParticipants` por debajo de las plazas de una salida | 409 `maxParticipants is lower than the capacity of an existing departure` |
| Eliminar una experiencia con salidas | 409 `Cannot delete an experience that has departures` |

---

## Departures

**POST** `/api/departures`

```json
{
  "experienceId": "<id de una experiencia>",
  "startAt": "2026-11-08T06:00:00.000Z",
  "endAt": "2026-11-08T11:00:00.000Z",
  "capacity": 8,
  "price": 89.5
}
```

Response `201`:
```json
{
  "_id": "6ad647691b0b769e10cbccc6",
  "experienceId": "6ad647691b0b769e10cbccc2",
  "startAt": "2026-11-02T06:00:00.000Z",
  "endAt": "2026-11-02T11:00:00.000Z",
  "capacity": 8,
  "price": 89,
  "state": "scheduled",
  "sku": "RTL-DEP-261102-YTSKF",
  "slug": "tramuntana-al-amanecer-2026-11-02-cbccc6",
  "status": "active",
  "isActive": true,
  "deletedAt": null,
  "createdAt": "2026-10-19T16:38:01.097Z",
  "updatedAt": "2026-10-19T16:38:01.097Z",
  "__v": 0,
  "experience": { "_id": "6ad647691b0b769e10cbccc2", "title": "Tramuntana al amanecer", "slug": "tramuntana-al-amanecer-cbccc2" }
}
```

- `sku` y `slug` los genera el servidor. El SKU **no cambia nunca**; el slug sigue a `startAt`.
- `state`: `scheduled` (por defecto), `cancelled` o `completed`. Es independiente de `status`.
- `price` admite como mucho dos decimales.

**GET** `/api/departures/sku/RTL-DEP-261102-YTSKF` → la salida. También funciona en minúsculas.

| Caso | Respuesta |
|---|---|
| `startAt` en el pasado | 400 en `startAt`: `startAt must be in the future` |
| `endAt` antes de `startAt` | 400 en `endAt`: `endAt must be after startAt` |
| Más plazas que el máximo de la experiencia | 400 en `capacity` |
| SKU con formato no válido | 400 en `sku` |

---

## Images

**POST** `/api/images`

```json
{
  "ownerType": "route",
  "ownerId": "<id de la ruta>",
  "url": "https://picsum.photos/seed/mi-ruta/1200/800",
  "alt": "Vista del puerto"
}
```

- `ownerType` es `route`, `user`, `host`, `experience`, `category` o `location`.
- La primera imagen de un dueño es la principal (`isCover: true`). `position` va al final si no se envía.
- Para cambiar la principal: **PATCH** `/api/images/:id` con `{ "isCover": true }`. La anterior se desmarca.
- Las imágenes no tienen slug: no hay `GET /slug/:slug`.

**GET** `/api/images?ownerType=route&ownerId=<id>` → la galería de un dueño, por posición.

| Caso | Respuesta |
|---|---|
| El dueño no existe o está eliminado | 400 en `ownerId`: `ownerId must reference an existing route` |
| Filtro con solo `ownerType` o solo `ownerId` | 400: `ownerType and ownerId must be sent together` |
| Marcar como principal una imagen inactiva | 409 `Inactive images cannot be the cover` |

Al eliminar el dueño, sus imágenes van a la papelera con él, y vuelven al restaurarlo.

---

## Endpoint inexistente

**GET** `/api/nope`

Response `404`:
```json
{ "statusCode": 404, "error": "Not Found", "message": "Endpoint GET /api/nope not found" }
```
