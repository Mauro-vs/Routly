# Routly · diseño de la base de datos

Detalle campo a campo de las nueve colecciones. Es una propuesta para revisar: **todavía no está implementado en `moto-routes-api`**. Hoy el backend solo tiene `routes`.

Base de datos: MongoDB con Mongoose. Los nombres de campo van en camelCase, como ya hace `routes`.

## Vista general

| Colección | Qué guarda | Apunta a |
|---|---|---|
| `roles` | Tipos de usuario | nada |
| `users` | Cuentas para entrar | `roles` |
| `hosts` | Perfil público del anfitrión | `users` |
| `categories` | Tipo de ruta | nada |
| `locations` | Lugares | nada |
| `routes` | El recorrido | `categories`, `locations` |
| `experiences` | Salida organizada sobre una ruta | `hosts`, `routes` |
| `departures` | Fecha concreta de una experiencia | `experiences` |
| `images` | Imágenes de cualquier colección | la que diga `ownerType` |

Reservas (`bookings`) y reseñas (`reviews`) quedan fuera por ahora.

## Campos comunes

Todas las colecciones llevan estos campos, gestionados por el servidor. Si el cliente los envía, se ignoran.

| Campo | Tipo | Valor inicial | Notas |
|---|---|---|---|
| `_id` | ObjectId | automático | Identificador |
| `status` | String | `active` | `active`, `inactive` o `deleted` |
| `isActive` | Boolean | `true` | Se deriva de `status`: solo es `true` con `active` |
| `deletedAt` | Date o null | `null` | Fecha del borrado lógico |
| `createdAt` | Date | automático | |
| `updatedAt` | Date | automático | |

Además, las colecciones con página propia llevan `slug`: `hosts`, `categories`, `locations`, `routes` y `experiences`.

| Campo | Tipo | Notas |
|---|---|---|
| `slug` | String, único | Se genera del nombre o título más los 6 últimos caracteres del `_id`, como en `routes`. Cambia si cambia el nombre |

El borrado es siempre lógico, con el plugin `softDelete` que ya existe, y cada colección tiene su papelera.

## `roles`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `name` | String | Sí | Único. De 2 a 30 caracteres, en minúsculas, solo letras, números y guiones |
| `description` | String | No | Máximo 200 caracteres |
| `isSystem` | Boolean | No | `false` por defecto. Los roles base lo llevan a `true` |

- El seed crea tres roles base: `admin`, `host` y `rider`.
- Un rol base no se puede eliminar ni renombrar.
- No se puede eliminar un rol que tenga usuarios (409).
- Índices: `name` único.

## `users`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `name` | String | Sí | De 2 a 100 caracteres |
| `email` | String | Sí | Único. Formato de correo, en minúsculas, máximo 254 caracteres |
| `passwordHash` | String | Sí | Nunca se devuelve en las respuestas |
| `roleId` | ObjectId → `roles` | Sí | Si no se envía, se asigna `rider`. El rol tiene que existir y estar activo |

- La API recibe `password` (de 8 a 72 caracteres) y guarda solo su hash, hecho con bcrypt. La contraseña nunca se guarda ni se devuelve.
- El correo de un usuario eliminado sigue reservado, para poder restaurarlo. Repetirlo da 409.
- Índices: `email` único, `roleId`.

## `hosts`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `userId` | ObjectId → `users` | Sí | Único: un usuario tiene como mucho un perfil de anfitrión |
| `name` | String | Sí | Nombre público. De 2 a 100 caracteres |
| `slug` | String | Automático | A partir de `name` |
| `biography` | String | No | Máximo 1000 caracteres |

- El usuario tiene que existir, no estar eliminado y tener el rol `host`.
- No se puede cambiar el rol de un usuario a otro distinto de `host` mientras tenga perfil de anfitrión.
- Índices: `userId` único, `slug` único.

## `categories`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `name` | String | Sí | Único, sin distinguir mayúsculas. De 2 a 60 caracteres |
| `slug` | String | Automático | A partir de `name` |
| `description` | String | No | Máximo 300 caracteres |

- Índices: `name` único, `slug` único.

## `locations`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `city` | String | Sí | De 2 a 80 caracteres |
| `region` | String | No | Máximo 80 caracteres |
| `country` | String | Sí | De 2 a 80 caracteres. Por defecto, `España` |
| `slug` | String | Automático | A partir de `city` |
| `coordinates` | Punto GeoJSON | No | Se guarda como `{ type: "Point", coordinates: [longitud, latitud] }` |

- La API recibe y devuelve `latitude` (de -90 a 90) y `longitude` (de -180 a 180). Van las dos o ninguna.
- No puede haber dos ubicaciones con la misma ciudad, región y país (409).
- Índices: `slug` único; ciudad, región y país únicos en conjunto; índice geográfico `2dsphere` sobre `coordinates`.

## `routes` (cambia)

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `title` | String | Sí | De 1 a 120 caracteres. Sin cambios |
| `slug` | String | Automático | Sin cambios |
| `description` | String | No | Máximo 500 caracteres. Sin cambios |
| `difficulty` | String | Sí | `easy`, `medium` o `hard`. Sin cambios |
| `distance` | Number | Sí | Kilómetros, mínimo 0. Sin cambios |
| `duration` | Number | Sí | Horas, mínimo 0. Sin cambios |
| `categoryId` | ObjectId → `categories` | Sí | **Nuevo.** La categoría tiene que existir y estar activa |
| `startLocationId` | ObjectId → `locations` | Sí | **Nuevo.** Sustituye a `startPoint` |
| `endLocationId` | ObjectId → `locations` | Sí | **Nuevo.** Sustituye a `endPoint`. Puede ser la misma que el origen (ruta circular) |

- Desaparecen `startPoint` y `endPoint`, que eran texto libre.
- Al leer una ruta, la API devuelve la categoría y las dos ubicaciones con sus datos básicos, no solo los ids.
- Índices: `slug` único, `categoryId`, `startLocationId`, `endLocationId`.

**Este es el único cambio que rompe algo que ya funciona.** Afecta al seed, a la documentación de la API y al panel: el formulario de rutas pasa de dos campos de texto a dos selectores de ubicación y uno de categoría, y las tarjetas y la tabla leen la ciudad de la ubicación.

## `experiences`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `hostId` | ObjectId → `hosts` | Sí | El anfitrión tiene que existir y estar activo |
| `routeId` | ObjectId → `routes` | Sí | La ruta tiene que existir y estar activa |
| `title` | String | Sí | De 1 a 120 caracteres |
| `slug` | String | Automático | A partir de `title` |
| `description` | String | No | Máximo 2000 caracteres |
| `meetingPoint` | String | No | Punto de encuentro. Máximo 200 caracteres |
| `language` | String | Sí | Código de dos letras: `es`, `en`, `fr`... Por defecto, `es` |
| `duration` | Number | Sí | Horas totales, con paradas. Mínimo 0 |
| `minParticipants` | Number | Sí | Entero, mínimo 1. Por defecto, 1 |
| `maxParticipants` | Number | Sí | Entero, de `minParticipants` a 100 |

- Al leer una experiencia, la API devuelve el anfitrión y la ruta con sus datos básicos.
- Índices: `slug` único, `hostId`, `routeId`.

## `departures`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `experienceId` | ObjectId → `experiences` | Sí | La experiencia tiene que existir y estar activa |
| `startAt` | Date | Sí | Al crear, tiene que ser una fecha futura |
| `endAt` | Date | Sí | Posterior a `startAt` |
| `capacity` | Number | Sí | Entero, mínimo 1, y no mayor que el `maxParticipants` de la experiencia |
| `price` | Number | Sí | Euros por persona. Mínimo 0, hasta dos decimales |
| `state` | String | No | `scheduled` (por defecto), `cancelled` o `completed` |

- No lleva `slug`: una fecha no tiene un nombre del que generarlo. Se identifica por su `_id`.
- `state` es el momento de la salida y es independiente de `status`: una salida puede estar cancelada y seguir activa en el panel.
- Índice: `experienceId` junto con `startAt`, para listar las fechas de una experiencia en orden.

## `images`

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `ownerType` | String | Sí | De qué colección es: `route`, `experience`, `host`, `user`, `category` o `location` |
| `ownerId` | ObjectId | Sí | De qué documento es. Tiene que existir en la colección que indica `ownerType` |
| `url` | String | Sí | Dirección `http` o `https`. Máximo 2048 caracteres |
| `alt` | String | No | Texto alternativo. Máximo 200 caracteres |
| `position` | Number | No | Entero, mínimo 0. Si no se envía, va la última |
| `isCover` | Boolean | No | `false` por defecto |

- Solo se guarda la URL. No hay subida de archivos.
- La primera imagen de un documento es su portada. Al marcar otra como portada, la anterior se desmarca.
- Índices: `ownerType`, `ownerId` y `position` en conjunto; y uno que impide dos portadas para el mismo dueño.

## Reglas entre colecciones

MongoDB no vigila las relaciones ni borra en cascada, así que estas reglas van en los services:

1. **Las referencias se comprueban al guardar.** Si el id no existe, o apunta a un documento eliminado, la API responde 400 en ese campo.
2. **No se puede eliminar algo de lo que dependen otros documentos no eliminados** (409). Por ejemplo: una categoría con rutas, una ruta con experiencias o una experiencia con salidas.
3. **Las imágenes son la excepción:** al eliminar su dueño se eliminan con él, y al restaurarlo vuelven.
4. **Desactivar no afecta a los demás.** Una ruta inactiva conserva sus experiencias tal cual.

## Endpoints

Cada colección tendrá los mismos que ya tiene `routes`:

```
GET   /api/<colección>              listado
GET   /api/<colección>/actives      solo activos
GET   /api/<colección>/inactives    solo inactivos
GET   /api/<colección>/deleted      papelera
GET   /api/<colección>/:id          por id
GET   /api/<colección>/slug/:slug   por slug (si la colección tiene slug)
POST  /api/<colección>              crear
PATCH /api/<colección>/:id          editar
PATCH /api/<colección>/:id/active   activar o desactivar
PATCH /api/<colección>/:id/delete   eliminar (borrado lógico)
PATCH /api/<colección>/:id/restore  restaurar
```

`images` añade un filtro al listado: `GET /api/images?ownerType=route&ownerId=<id>`.

## Orden de implantación

Por dependencias, de lo que no necesita nada a lo que necesita todo:

1. `roles`
2. `users`
3. `hosts`
4. `categories`
5. `locations`
6. `routes` (cambio de origen, destino y categoría)
7. `experiences`
8. `departures`
9. `images`

## Decisiones tomadas en este diseño

- **`status` es igual en todas las colecciones** (`active`, `inactive`, `deleted`). Lo que es propio de una colección va en un campo aparte, como `state` en `departures`. Así el borrado lógico, la papelera y el interruptor de activo funcionan igual en todas.
- **`hosts` es el perfil y `users` la cuenta.** La biografía y el nombre público están en `hosts`.
- **Las imágenes van en su propia colección**, con `ownerType` y `ownerId` para saber de quién son.
- **Toda experiencia va ligada a una ruta.**
- **El país es texto**, no un código. Es más simple y suficiente mientras las rutas sean de pocos países.
