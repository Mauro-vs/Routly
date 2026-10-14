# Postman - Routly API

Base URL: `http://localhost:3000`

Todas las peticiones con body llevan la cabecera:
```
Content-Type: application/json
```

---

## Health Check

**GET** `/health`

Response `200`:
```json
{ "ok": true }
```

---

## Listar rutas

**GET** `/api/routes`

Devuelve solo las rutas no eliminadas, de la más reciente a la más antigua.

Response `200`:
```json
[
  {
    "_id": "6abd589e3d6101dd2eb767e1",
    "title": "Sierra Nevada Express",
    "slug": "sierra-nevada-express-b767e1",
    "description": "Subida al puerto más alto de la península",
    "difficulty": "hard",
    "distance": 150,
    "duration": 5,
    "startPoint": "Granada",
    "endPoint": "Granada",
    "status": "active",
    "isActive": true,
    "deletedAt": null,
    "createdAt": "2026-09-30T18:44:46.613Z",
    "updatedAt": "2026-09-30T18:44:46.613Z",
    "__v": 0
  }
]
```

---

## Listar rutas activas

**GET** `/api/routes/actives`

Response `200`: lista con el mismo formato que el listado general, solo con las rutas que tienen `isActive: true`.

---

## Listar rutas inactivas

**GET** `/api/routes/inactives`

Response `200`: lista solo con las rutas que tienen `isActive: false` y no están eliminadas. Las rutas eliminadas no aparecen aunque estén inactivas.

---

## Listar rutas eliminadas (papelera)

**GET** `/api/routes/deleted`

Response `200`: lista solo con las rutas eliminadas (soft delete), de la eliminada más reciente a la más antigua. Cada una lleva `deletedAt` con la fecha de eliminación, `status: "deleted"` e `isActive: false`.

```json
[
  {
    "_id": "6abd58a874e3ba83e1fcb51c",
    "title": "Ruta del Cañón",
    "slug": "ruta-del-canon-fcb51c",
    "difficulty": "hard",
    "distance": 250,
    "duration": 6,
    "startPoint": "Santander",
    "endPoint": "Bilbao",
    "status": "deleted",
    "isActive": false,
    "deletedAt": "2026-10-01T09:12:30.000Z",
    "createdAt": "2026-09-30T18:44:56.279Z",
    "updatedAt": "2026-10-01T09:12:30.000Z",
    "__v": 0
  }
]
```

Es la única consulta que devuelve rutas eliminadas. Para recuperar una, usa `PATCH /api/routes/:id/restore`.

---

## Obtener ruta por ID

**GET** `/api/routes/:id`

Response `200`: un objeto ruta (mismo formato que en el listado).

Response `400` (ID con formato inválido):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "id", "message": "id has an invalid format" }]
}
```

Response `404` (no existe o está eliminada):
```json
{ "statusCode": 404, "error": "Not Found", "message": "Route not found" }
```

---

## Obtener ruta por slug

**GET** `/api/routes/slug/:slug`

Ejemplo: `/api/routes/slug/sierra-nevada-express-b767e1`

Response `200`: un objeto ruta (mismo formato que en el listado).

Response `400` (slug con formato inválido: solo minúsculas, números y guiones):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "slug", "message": "slug has an invalid format" }]
}
```

Response `404` (no existe o está eliminada):
```json
{ "statusCode": 404, "error": "Not Found", "message": "Route not found" }
```

---

## Crear ruta

**POST** `/api/routes`

Body:
```json
{
  "title": "Ruta del Cañón",
  "description": "Travesía por los desfiladeros del norte",
  "difficulty": "hard",
  "distance": 250,
  "duration": 6,
  "startPoint": "Santander",
  "endPoint": "Bilbao"
}
```

Response `201`:
```json
{
  "_id": "6abd58a874e3ba83e1fcb51c",
  "title": "Ruta del Cañón",
  "slug": "ruta-del-canon-fcb51c",
  "description": "Travesía por los desfiladeros del norte",
  "difficulty": "hard",
  "distance": 250,
  "duration": 6,
  "startPoint": "Santander",
  "endPoint": "Bilbao",
  "status": "active",
  "isActive": true,
  "deletedAt": null,
  "createdAt": "2026-09-30T18:44:56.279Z",
  "updatedAt": "2026-09-30T18:44:56.279Z",
  "__v": 0
}
```

`slug`, `status`, `isActive`, `deletedAt`, `createdAt` y `updatedAt` los genera el servidor. Si se envían en el body, se ignoran.

### Campos requeridos

| Campo      | Tipo   | Valores válidos          |
|------------|--------|--------------------------|
| title      | String | máx. 120 caracteres      |
| difficulty | String | `easy`, `medium`, `hard` |
| distance   | Number | >= 0 (en km)             |
| duration   | Number | >= 0 (en horas)          |
| startPoint | String | máx. 100 caracteres      |
| endPoint   | String | máx. 100 caracteres      |

### Campos opcionales

| Campo       | Tipo   | Valores válidos     |
|-------------|--------|---------------------|
| description | String | máx. 500 caracteres |

Response `400` (validación):
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

Response `400` (JSON mal formado):
```json
{ "statusCode": 400, "error": "Bad Request", "message": "Malformed JSON in request body" }
```

Response `409` (ya existe una ruta con el slug generado; se comprueba antes de crear):
```json
{ "statusCode": 409, "error": "Conflict", "message": "A route with this slug already exists" }
```

En la práctica no ocurre con peticiones normales, porque el slug incluye un sufijo del `_id` de la ruta.

---

## Actualizar ruta (parcial)

**PATCH** `/api/routes/:id`

Body (solo los campos a actualizar):
```json
{
  "title": "Desfiladero del Norte",
  "distance": 200
}
```

Response `200`: la ruta actualizada. Si cambia el título, el `slug` se regenera.

### Activar / desactivar una ruta

```json
{ "status": "inactive" }
```

Solo se admiten `active` e `inactive`, e `isActive` se sincroniza automáticamente. `deleted` solo se consigue con `PATCH /api/routes/:id/delete`.

Response `400` (status no permitido):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "status", "message": "status must be one of: active, inactive" }]
}
```

Response `400` (validación): mismo formato que en POST, con `details`.

Response `404`: la ruta no existe o está eliminada.

---

## Activar o desactivar una ruta

**PATCH** `/api/routes/:id/active`

Body:
```json
{ "isActive": false }
```

Response `200`: la ruta actualizada, con `isActive` y `status` (`active` / `inactive`) cambiados. `deletedAt` no se modifica.

Response `400` (falta `isActive` o no es booleano):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "isActive", "message": "isActive must be a valid boolean" }]
}
```

Response `404`: la ruta no existe o está eliminada. Una ruta eliminada no se puede activar.

---

## Eliminar ruta (soft delete)

**PATCH** `/api/routes/:id/delete`

Sin body.

Response `204`: sin contenido.

La ruta no se borra de MongoDB: se le asignan `deletedAt` (fecha actual), `status: "deleted"` e `isActive: false`, y deja de aparecer en todas las consultas.

Response `404`: la ruta no existe o ya estaba eliminada.

---

## Restaurar una ruta eliminada

**PATCH** `/api/routes/:id/restore`

Body opcional:
```json
{ "isActive": true }
```

- Con `isActive: true`: la ruta se restaura y queda activa.
- Con `isActive: false` o sin body: se restaura pero queda inactiva.

Response `200`: la ruta restaurada, con `deletedAt: null`.

Response `409` (la ruta no está eliminada):
```json
{ "statusCode": 409, "error": "Conflict", "message": "Route is not deleted" }
```

Response `400`: `isActive` no es booleano o el ID no es válido.

Response `404`: la ruta no existe.

---

## Endpoint inexistente

**GET** `/api/noexiste`

Response `404`:
```json
{ "statusCode": 404, "error": "Not Found", "message": "Endpoint GET /api/noexiste not found" }
```
