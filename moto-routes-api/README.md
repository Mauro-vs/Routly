<a id="top"></a>

<img src="../docs/assets/banner-api.svg" alt="Routly API. API REST con Express 5, Mongoose y Zod." width="100%">

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-1b7a4e?style=flat-square&labelColor=0c2419&logo=nodedotjs&logoColor=c6f04d" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/Express-5.2-1b7a4e?style=flat-square&labelColor=0c2419&logo=express&logoColor=c6f04d" alt="Express 5.2">
  <img src="https://img.shields.io/badge/Mongoose-9.10-1b7a4e?style=flat-square&labelColor=0c2419&logo=mongodb&logoColor=c6f04d" alt="Mongoose 9.10">
  <img src="https://img.shields.io/badge/Zod-4.6-1b7a4e?style=flat-square&labelColor=0c2419&logo=zod&logoColor=c6f04d" alt="Zod 4.6">
  <img src="https://img.shields.io/badge/OpenAPI-3-1b7a4e?style=flat-square&labelColor=0c2419&logo=swagger&logoColor=c6f04d" alt="OpenAPI 3">
</p>

API REST de Routly. Gestiona nueve colecciones relacionadas entre sí: roles, usuarios, anfitriones, categorías, ubicaciones, rutas, experiencias, salidas e imágenes. Todas se crean, se consultan (también por slug), se editan, se activan o desactivan, se eliminan con borrado lógico y se restauran.

Forma parte del monorepo de Routly. La visión general del proyecto está en el [README de la raíz](../README.md), el diseño campo a campo de la base de datos en [`DATABASE.md`](../DATABASE.md) y el panel que consume esta API en [`moto-routes-frontend`](../moto-routes-frontend/README.md).

## Contenido

- [Lenguaje y librerías](#lenguaje-y-librerías)
- [Instalación](#instalación) · [Configuración](#configuración) · [Ejecución](#ejecución) · [Seed](#seed)
- [Arquitectura](#arquitectura) · [Estructura del proyecto](#estructura-del-proyecto)
- [Colecciones y relaciones](#colecciones-y-relaciones) · [Endpoints](#endpoints)
- [Activo / inactivo frente a eliminado](#activo--inactivo-frente-a-eliminado) · [Soft delete y papelera](#soft-delete-y-papelera)
- [Imágenes](#imágenes) · [SKU de las salidas](#sku-de-las-salidas)
- [Validación (Zod)](#validación-zod) · [Manejo de errores](#manejo-de-errores)
- [Seguridad (Helmet)](#seguridad-helmet) · [Logs (Morgan)](#logs-morgan)
- [Cómo añadir un recurso](#cómo-añadir-un-recurso)

## Lenguaje y librerías

JavaScript moderno sobre **Node.js**, con módulos ES (`"type": "module"` en `package.json`, así que se usa `import`/`export` en lugar de `require`). No hay paso de compilación: el código de `src/` es el que se ejecuta.

| Librería | Versión | Para qué se usa |
|---|---|---|
| [Express](https://expressjs.com) | 5.2 | Servidor HTTP y enrutado |
| [Mongoose](https://mongoosejs.com) | 9.10 | Modelos sobre MongoDB, relaciones con `ref` y `populate`, validación de segundo nivel, hooks y plugins |
| [Zod](https://zod.dev) | 4.6 | Validación y limpieza de `params`, `query` y `body` antes del controlador. También genera los esquemas de Swagger |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0 | Hash de las contraseñas de los usuarios |
| [Helmet](https://helmetjs.github.io) | 8.3 | Cabeceras de seguridad |
| [cors](https://github.com/expressjs/cors) | 2.8 | Orígenes y métodos permitidos |
| [Morgan](https://github.com/expressjs/morgan) | 1.12 | Logs HTTP en consola y en archivo |
| [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) + [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | 6.3 / 5.0 | Documentación OpenAPI en `/api/docs` |
| [dotenv](https://github.com/motdotla/dotenv) | 18.0 | Carga las variables de `.env` |
| [nodemon](https://nodemon.io) (desarrollo) | 3.1 | Reinicia el servidor al guardar |

Los tests usan el runner que trae Node (`node:test`), sin dependencias.

## Instalación

Requisitos: **Node.js 20 o superior** (probado con 24.8) y **MongoDB** en marcha.

```bash
cd moto-routes-api
npm install
```

## Configuración

Copiar `.env.example` a `.env` y ajustar los valores:

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/moto_routes
CORS_ORIGIN=http://localhost:4200
```

`CORS_ORIGIN` solo se usa con `NODE_ENV=production`: es la lista de orígenes (separados por comas) que pueden llamar a la API. En desarrollo se acepta cualquier origen; en producción, si no se define, no se acepta ninguno.

`NODE_ENV` puede ser `development` o `production` y cambia el comportamiento de Helmet y Morgan (ver abajo).

## Ejecución

```bash
# Desarrollo (nodemon reinicia el servidor al guardar un cambio)
npm run dev

# Producción
npm start

# Reiniciar la base de datos con datos de ejemplo
npm run seed

# Tests
npm test
```

En desarrollo, `nodemon` vigila la carpeta `src/` y el archivo `.env`, y reinicia al cambiar un `.js` o un `.json`. Se configura en `nodemonConfig`, dentro de `package.json`. Para reiniciar a mano, escribe `rs` y pulsa Intro en esa terminal.

Con el servidor en marcha, la documentación interactiva está en `http://localhost:3000/api/docs` y la comprobación de estado en `http://localhost:3000/health`.

## Seed

`npm run seed` borra **todas** las colecciones y carga datos de ejemplo coherentes entre sí. Se puede ejecutar las veces que haga falta: siempre deja lo mismo.

| Colección | Datos |
|---|---|
| `roles` | `admin` (Administrador), `host` (Anfitrión) y `rider` (Motorista): los tres son roles base protegidos |
| `users` | Admin Routly (`admin@routly.dev`, admin), Lucía Ferrer (`lucia@routly.dev`, host), Pablo Ortega (`pablo@routly.dev`, host) y Marta Gil (`marta@routly.dev`, rider) |
| `hosts` | Los perfiles de Lucía y Pablo |
| `categories` | Costa, Montaña, Puertos y Viñedos |
| `locations` | Barcelona, Huesca, Lleida, Logroño, Haro, Granada, Palma, Sóller, Panes y Potes, con coordenadas reales |
| `routes` | Seis rutas. "Ruta del Vino" queda inactiva y "Desfiladero de La Hermida y Potes" en la papelera |
| `experiences` | "Tramuntana al amanecer" (Lucía, Caminos de Mallorca) y "Travesía de los Pirineos" (Pablo, Pirineos Adventure) |
| `departures` | Tres salidas futuras, calculadas desde el día en que se ejecuta. Una está cancelada |
| `images` | Fotos de las rutas, de los usuarios y de los anfitriones. Las de la ruta de la papelera están eliminadas con ella |

> [!WARNING]
> - El seed **borra físicamente** todas las colecciones. Es la única excepción al soft delete y solo debe usarse en desarrollo.
> - Todos los usuarios tienen la contraseña **`routly-dev-1234`**. Es solo para desarrollo.

Los datos se crean a través de los services, así que pasan por las mismas reglas que una petición a la API: hash de la contraseña, referencias, slug, SKU...

## Arquitectura

Arquitectura por capas. Cada capa tiene una sola responsabilidad y solo llama a la inmediatamente inferior:

```mermaid
flowchart LR
    R["routes/<br/>endpoints y validate()"] --> C["controllers/<br/>HTTP: req → res"]
    C --> S["services/<br/>reglas de negocio"]
    S --> RE["repositories/<br/>consultas y populate"]
    RE --> M["models/<br/>esquema Mongoose"]
    M --> DB[("MongoDB")]
    classDef node fill:#0c2419,stroke:#c6f04d,color:#e8f3ec,stroke-width:2px
    classDef store fill:#1b7a4e,stroke:#0c2419,color:#ffffff
    class R,C,S,RE,M node
    class DB store
```

Cada colección tiene sus seis archivos, uno por capa. Por ejemplo, para `routes`:

| Capa | Archivo | Responsabilidad | Lo que no hace |
|---|---|---|---|
| Rutas | `routes/route.routes.js` | Asocia método y URL a un controlador, y aplica `validate()` con el esquema de Zod | Lógica |
| Controlador | `controllers/route.controller.js` | `async/await` con `try/catch`: lee `req`, llama al service y responde con el código adecuado (200, 201, 204). Si algo falla, pasa el error con `next(error)` | Consultar la base de datos |
| Service | `services/route.service.js` | Reglas de negocio: 404 si no existe, 400 si una referencia no es válida, 409 si hay dependientes o el slug está repetido. Gestiona el slug, las relaciones y la cascada de imágenes | Conocer `req` o `res` |
| Repositorio | `repositories/route.repository.js` | Consultas a Mongoose con `populate` de las relaciones. Devuelven objetos planos (`.lean()`) y filtran `deletedAt` | Decidir errores HTTP |
| Modelo | `models/route.model.js` | Esquema, relaciones (`ref`), índices y plugins | |
| Esquema | `schemas/route.schema.js` | Validación de Zod de la petición | |

### Piezas compartidas

Lo que es igual en todas las colecciones no se repite: está en un solo sitio.

| Archivo | Qué hace |
|---|---|
| `models/status.js` | Los estados (`active`, `inactive`, `deleted`) y lo que se fija al eliminar |
| `models/plugins/status.plugin.js` | Añade `status` e `isActive` y mantiene `isActive` derivado de `status` |
| `models/plugins/slug.plugin.js` | Añade `slug` (único) y lo regenera cuando cambia el campo del que sale |
| `models/plugins/softDelete.plugin.js` | Borrado lógico: `deletedAt`, filtro automático, `softDeleteById` y `restoreById` |
| `models/imageOwners.js` | Las colecciones que pueden tener imágenes (`IMAGE_OWNERS`) |
| `models/validators.js` | Enteros y precios con dos decimales en el modelo, igual que en Zod |
| `schemas/common.schema.js` | Validación de `:id`, `:slug`, `status`, `/active` y `/restore` |
| `services/references.js` | Comprobaciones que comparten todos los services: id válido (`assertObjectId`), documento que existe y es el pedido (`findExisting`), escritura que no devuelve `null` (`ensureWritten`), PATCH con algún campo (`assertHasChanges`), referencias, dependientes, slug libre y documento restaurable |
| `services/image.service.js` | Además de las imágenes, la imagen principal (`coverImage`) y la cascada con la papelera |
| `utils/errors.js` | `notFound`, `conflict`, `badRequest` y `fieldError` (400 con `details` en un campo) |
| `utils/slugify.js` y `utils/sku.js` | Generación del slug y del SKU |
| `docs/openapi.js` | Documentación de los endpoints de todas las colecciones |

### El recorrido de una petición

Ejemplo: `PATCH /api/routes/:id` con una categoría nueva.

```mermaid
sequenceDiagram
    participant Cliente
    participant MW as helmet · cors · morgan · json
    participant V as validate (Zod)
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant DB as MongoDB
    Cliente->>MW: PATCH /api/routes/:id
    MW->>V: petición con body JSON
    V->>V: valida :id y body, limpia campos extra
    V->>C: req.body limpio
    C->>S: update(id, data)
    S->>R: categoryRepository.findById(categoryId)
    R->>DB: findOne({ _id, deletedAt: null })
    Note over S: assertReference: si no existe o está inactiva, 400
    S->>R: routeRepository.updateById(id, data)
    R->>DB: findOneAndUpdate + populate
    Note over DB: el modelo recalcula slug e isActive
    R-->>S: ruta con category, startLocation y endLocation
    S-->>C: ruta + coverImage
    C-->>Cliente: 200 + JSON
```

Si algo falla en cualquier punto (Zod, el service o Mongoose), el error llega a `errorHandler`, que responde con el formato común (ver [Manejo de errores](#manejo-de-errores)).

### Orden de los middlewares (`server.js`)

1. `helmet`: cabeceras de seguridad.
2. `cors`: orígenes permitidos y métodos `GET`, `POST` y `PATCH`.
3. `morgan`: logs.
4. `express.json()`: lee el body.
5. `GET /health`, `/api/docs` y los routers de las nueve colecciones.
6. `notFoundHandler`: 404 para cualquier otra URL.
7. `errorHandler`: siempre el último.

El servidor solo empieza a escuchar cuando la conexión con MongoDB está lista. Si falla, el proceso termina con un error.

## Estructura del proyecto

<details>
<summary><b>Ver el árbol de carpetas comentado</b></summary>

```
src/
├── config/
│   ├── db.js                      Conexión a MongoDB
│   ├── cors.js                    Orígenes y métodos permitidos
│   ├── helmet.js                  Cabeceras de seguridad
│   ├── morgan.js                  Logs en consola y en logs/
│   └── swagger.js                 Definición OpenAPI
├── models/
│   ├── <recurso>.model.js         Uno por colección: role, user, host, category, location,
│   │                              route, experience, departure, image
│   ├── imageOwners.js             Colecciones que pueden tener imágenes
│   ├── status.js                  Estados comunes
│   └── plugins/
│       ├── softDelete.plugin.js   Borrado lógico reutilizable
│       ├── status.plugin.js       status e isActive
│       └── slug.plugin.js         slug único
├── schemas/
│   ├── <recurso>.schema.js        Esquemas de Zod de cada colección
│   └── common.schema.js           Piezas comunes (:id, :slug, status...)
├── repositories/<recurso>.repository.js
├── services/
│   ├── <recurso>.service.js
│   └── references.js              Comprobaciones entre colecciones
├── controllers/<recurso>.controller.js
├── routes/<recurso>.routes.js
├── middlewares/
│   ├── validate.js                Aplica los esquemas de Zod (params, query y body)
│   └── errorHandler.js            404 y formato común de errores
├── docs/openapi.js                Documentación de todos los endpoints
├── utils/
│   ├── errors.js                  notFound, conflict, badRequest, fieldError
│   ├── slugify.js                 Generación del slug
│   ├── sku.js                     Generación del SKU
│   └── sku.test.js                Tests del SKU
├── seed.js                        Datos de ejemplo
└── server.js                      Punto de entrada
```

Hay además un [`postman.md`](postman.md) con ejemplos de las peticiones para probarlas en Postman.

</details>

## Colecciones y relaciones

```mermaid
erDiagram
    roles ||--o{ users : "roleId"
    users ||--o| hosts : "userId"
    hosts ||--o{ experiences : "hostId"
    categories ||--o{ routes : "categoryId"
    locations ||--o{ routes : "startLocationId / endLocationId"
    routes ||--o{ experiences : "routeId"
    experiences ||--o{ departures : "experienceId"
    routes ||--o{ images : "ownerType + ownerId"
    users ||--o{ images : "ownerType + ownerId"
    hosts ||--o{ images : "ownerType + ownerId"
```

| Colección | Campos propios | Relaciones (`ref`) | Al leer trae (`populate`) |
|---|---|---|---|
| `roles` | `name` (clave: `admin`, `host`, `rider`), `label`, `description`, `isSystem` | | |
| `users` | `name`, `email`, `passwordHash` (oculto) | `roleId` → `roles` | `role`, `coverImage` |
| `hosts` | `name`, `biography` | `userId` → `users` (uno por usuario) | `user`, `coverImage` |
| `categories` | `name`, `description` | | |
| `locations` | `city`, `region`, `country`, `latitude`, `longitude` | | |
| `routes` | `title`, `description`, `difficulty`, `distance`, `duration` | `categoryId` → `categories`, `startLocationId` y `endLocationId` → `locations` | `category`, `startLocation`, `endLocation`, `coverImage` |
| `experiences` | `title`, `description`, `meetingPoint`, `language`, `duration`, `minParticipants`, `maxParticipants` | `hostId` → `hosts`, `routeId` → `routes` | `host`, `route` |
| `departures` | `startAt`, `endAt`, `capacity`, `price`, `state`, `sku` | `experienceId` → `experiences` | `experience` |
| `images` | `url`, `alt`, `position`, `isCover` | `ownerType` + `ownerId` → cualquiera de `IMAGE_OWNERS` | |

Además, **todas** tienen `_id`, `slug` (menos `images`), `status`, `isActive`, `deletedAt`, `createdAt` y `updatedAt`, que gestiona el servidor: si el cliente los envía, se ignoran (salvo `status`, ver abajo).

El detalle de cada campo (tipos, límites, valores por defecto, índices y reglas) está en [`DATABASE.md`](../DATABASE.md).

### Reglas entre colecciones

MongoDB no tiene claves foráneas, así que las relaciones las vigilan los services:

1. **Referencias al guardar.** Al crear, o al editar una referencia, el documento al que apunta tiene que existir, no estar eliminado y estar activo. Si no, 400 con `details` en ese campo, por ejemplo `categoryId must reference an active category`. Excepción: el dueño de una imagen puede estar inactivo.
2. **Desactivar no se propaga.** Una categoría inactiva no desactiva sus rutas; solo impide usarla en rutas nuevas.
3. **No se elimina nada con dependientes no eliminados** (409):

| Para eliminar... | No puede tener... | Mensaje |
|---|---|---|
| un rol | usuarios | `Cannot delete a role that has users` |
| un usuario | perfil de anfitrión | `Cannot delete a user that has a host profile` |
| un anfitrión | experiencias | `Cannot delete a host that has experiences` |
| una categoría | rutas | `Cannot delete a category that has routes` |
| una ubicación | rutas (como origen o destino) | `Cannot delete a location that is used by routes` |
| una ruta | experiencias | `Cannot delete a route that has experiences` |
| una experiencia | salidas | `Cannot delete an experience that has departures` |

4. **Restaurar comprueba las referencias.** Si una ruta se restaura y su categoría está en la papelera: 409 `Cannot restore: categoryId references a deleted category`.

Reglas propias de cada colección:

- Los roles base (`isSystem`) no se pueden desactivar, eliminar ni renombrar.
- Un usuario sin `roleId` es `rider`. El correo es único, también entre los eliminados.
- Solo un usuario con el rol `host` puede tener perfil de anfitrión, y no se le puede quitar ese rol mientras lo tenga.
- Los nombres de categoría y los lugares (ciudad, región y país) son únicos sin distinguir mayúsculas ni tildes. La `ñ` cuenta como letra propia, como en español.
- Una experiencia no puede tener `minParticipants` mayor que `maxParticipants`, ni bajar el máximo por debajo de las plazas de una salida.
- Una salida se crea con fecha futura, termina después de empezar y no tiene más plazas que el máximo de su experiencia.

## Endpoints

Las nueve colecciones exponen los mismos endpoints. `<colección>` es `roles`, `users`, `hosts`, `categories`, `locations`, `routes`, `experiences`, `departures` o `images`.

| Método | Ruta | Descripción | Éxito |
|--------|------|-------------|-------|
| GET | `/api/<colección>` | Listado (sin eliminados) | 200 |
| GET | `/api/<colección>/actives` | Solo activos | 200 |
| GET | `/api/<colección>/inactives` | Solo inactivos (no eliminados) | 200 |
| GET | `/api/<colección>/deleted` | Papelera | 200 |
| GET | `/api/<colección>/slug/:slug` | Por slug (todas menos `images`) | 200 |
| GET | `/api/<colección>/:id` | Por ID | 200 |
| POST | `/api/<colección>` | Crear | 201 |
| PATCH | `/api/<colección>/:id` | Editar parcialmente | 200 |
| PATCH | `/api/<colección>/:id/active` | Activar o desactivar | 200 |
| PATCH | `/api/<colección>/:id/delete` | Eliminar (soft delete) | 204 |
| PATCH | `/api/<colección>/:id/restore` | Restaurar | 200 |

Además:

| Método | Ruta | Descripción | Éxito |
|--------|------|-------------|-------|
| GET | `/health` | Health check | 200 |
| GET | `/api/docs` | Documentación Swagger | 200 |
| GET | `/api/images?ownerType=route&ownerId=<id>` | Imágenes de un dueño, por posición | 200 |
| GET | `/api/departures/sku/:sku` | Una salida por su SKU (también en minúsculas) | 200 |

En el `PATCH /:id` se puede enviar `status` con `active` o `inactive`. El valor `deleted` solo se alcanza con `PATCH /:id/delete`.

## Activo / inactivo frente a eliminado

Son dos cosas distintas y se gestionan con operaciones independientes, en todas las colecciones:

| Campo | Qué indica | Cómo se cambia |
|-------|------------|----------------|
| `isActive` | Si el documento está activo o inactivo | `PATCH /:id/active` con `{ "isActive": true }` o `{ "isActive": false }` |
| `deletedAt` | Si está eliminado (soft delete) | `PATCH /:id/delete` |

- Un documento inactivo sigue apareciendo en el listado, en `/inactives` y por ID o slug, y se puede editar. Lo que no se puede es usarlo en documentos nuevos.
- Desactivar nunca elimina: `deletedAt` no se toca.
- Un documento eliminado queda siempre inactivo: el soft delete fija `isActive: false`.
- Un documento eliminado no se puede activar con `/active` (404). La única forma de recuperarlo es restaurarlo.
- `status` resume ambos campos (`active`, `inactive` o `deleted`) e `isActive` se deriva de él en el modelo, por eso siempre coinciden.
- Activar algo que ya está activo (o desactivar algo inactivo) devuelve el documento tal cual: no se escribe y `updatedAt` no cambia.

## Soft delete y papelera

Nada se borra físicamente desde la API.

- `PATCH /:id/delete` fija `deletedAt` a la fecha actual, `status: "deleted"` e `isActive: false`.
- Un documento eliminado no aparece en ningún listado y devuelve **404** en GET (por ID, slug o SKU), en el PATCH y si se intenta eliminar otra vez.
- La única consulta que devuelve eliminados es `GET /deleted` (la papelera), del eliminado más reciente al más antiguo.
- No existe ningún endpoint `DELETE`: como el documento se modifica y no se borra, se usa `PATCH`.
- Los repositorios filtran `deletedAt: null` de forma explícita en todas sus consultas. Además, el plugin `softDelete` lo añade a todas las búsquedas y actualizaciones como red de seguridad, salvo que la consulta ya indique `deletedAt` o pida incluirlos con `.setOptions({ withDeleted: true })` (solo lo usan las comprobaciones de unicidad: slug, email, nombre...).

### Restaurar

`PATCH /:id/restore` deshace el soft delete: pone `deletedAt` a `null`.

| Body | Resultado |
|------|-----------|
| `{ "isActive": true }` | Restaurado y activo (`status: "active"`) |
| `{ "isActive": false }` o sin body | Restaurado pero inactivo (`status: "inactive"`) |

- Solo actúa sobre documentos eliminados. Si no lo está responde **409** (`Route is not deleted`); si no existe, **404**.
- Si alguna de sus referencias está en la papelera, **409** (ver [Reglas entre colecciones](#reglas-entre-colecciones)).
- `deletedAt` y `status` cambian en la misma operación, así que un documento nunca queda activo mientras sigue eliminado.

## Imágenes

Todas las imágenes van en una sola colección. Cada una apunta a su dueño con `ownerType` (la colección) y `ownerId` (el documento). Solo se guarda la URL: no hay subida de archivos.

- **Quién puede tener imágenes** sale de un único registro, `IMAGE_OWNERS` en `models/imageOwners.js`: `route`, `user`, `host`, `experience`, `category` y `location`. Para que otra colección tenga imágenes basta con añadir una línea.
- **Imagen principal.** La primera imagen de cada dueño es la principal (`isCover: true`): portada de la ruta, foto de perfil del usuario o del anfitrión. Al marcar otra, la anterior se desmarca. Una imagen inactiva o eliminada no puede ser la principal: si se desactiva o se elimina, pasa a serlo la siguiente por `position`.
- **`coverImage`.** Rutas, usuarios y anfitriones devuelven su imagen principal en `coverImage: { _id, url, alt }`, o `null`. La galería completa se pide con `GET /api/images?ownerType=route&ownerId=<id>`.
- **Cascada con la papelera.** Al eliminar un documento, sus imágenes se eliminan con el mismo `deletedAt`. Al restaurarlo vuelven esas, pero no las que se habían eliminado antes a mano.
- El dueño puede estar inactivo (así se preparan las imágenes de una ruta antes de activarla), pero no eliminado.

## SKU de las salidas

Cada salida tiene un `sku`: su código comercial, el que verán reservas, facturas y soporte. Por ejemplo, **`RTL-DEP-261108-7QX2M`**.

| Segmento | Qué es |
|---|---|
| `RTL` | Prefijo de Routly |
| `DEP` | Tipo de producto (*departure*) |
| `261108` | Día del alta (`AAMMDD`) en hora de Madrid |
| `7QX2M` | 5 caracteres aleatorios en Crockford Base32: sin `I`, `L`, `O` ni `U`, para que no se confundan al leerlos |

- Es obligatorio, único (también en la papelera) y lo genera el servidor: el cliente no lo envía.
- **No cambia nunca**, aunque se cambie la fecha de la salida: por eso lleva la fecha del alta. El slug, en cambio, sí sigue a la fecha de salida y al título de la experiencia.
- Es un identificador público: las relaciones internas siguen usando `_id`.
- Se genera en `utils/sku.js` y tiene tests en `utils/sku.test.js` (`npm test`).

## Validación (Zod)

Todo lo que envía el cliente se valida con esquemas de Zod **antes de llegar al controlador**.

- Cada colección tiene sus esquemas en `src/schemas/<recurso>.schema.js`: `create<Recurso>Schema` para el POST y `update<Recurso>Schema` para el PATCH (los mismos campos, opcionales, más `status`). Algunas tienen además reglas entre campos con `.refine()`: `latitude` y `longitude` juntas, `endAt` después de `startAt`, `minParticipants` no mayor que `maxParticipants`.
- Los comunes están en `src/schemas/common.schema.js`:

| Esquema | Valida |
|---------|--------|
| `idParamSchema` | `:id` con formato de ObjectId (24 caracteres hexadecimales) |
| `slugParamSchema` | `:slug` en minúsculas, números y guiones |
| `objectIdSchema` | Las referencias (`roleId`, `categoryId`...) |
| `statusSchema` | `status` del PATCH: `active` o `inactive` |
| `setActiveSchema` | Body de `/active`: `isActive` obligatorio y booleano |
| `restoreSchema` | Body de `/restore`: `isActive` opcional |

- Se aplican en las rutas con el middleware `validate` (`src/middlewares/validate.js`), que valida `params`, `query` y `body`:

```js
router.post("/", validate({ body: createRouteSchema }), routeController.create);
router.patch("/:id", validate({ params: idParamSchema, body: updateRouteSchema }), routeController.update);
router.get("/", validate({ query: imageQuerySchema }), imageController.list);
```

- Si los datos son válidos, `req.body` (y `req.query`) se sustituyen por la versión limpia: textos sin espacios sobrantes y **sin los campos que no están en el esquema** (por eso el cliente no puede fijar `slug`, `sku`, `isActive`, `deletedAt`, `isSystem` ni `passwordHash`).
- Si no lo son, Zod lanza un error y el `errorHandler` responde 400 con un `details` por campo. No se llega a consultar la base de datos.
- El modelo de Mongoose mantiene sus propias reglas como segunda barrera. Si cambia un límite, hay que cambiarlo en el esquema de Zod **y** en el modelo.
- Swagger genera los cuerpos de las peticiones a partir de estos mismos esquemas (`z.toJSONSchema`), así que la documentación siempre coincide con la validación.

## Manejo de errores

En tres capas:

1. **Rutas:** `validate()` con Zod rechaza la petición antes de llegar al controlador. En los `PATCH`, además, los campos que no se pueden cambiar (`cannotChange()` en `schemas/common.schema.js`).
2. **Services:** antes de escribir, cada operación comprueba que el documento existe, es el pedido y está en un estado que la permite (funciones de `services/references.js`). Lanzan errores controlados con `utils/errors.js` (`notFound`, `conflict`, `badRequest`, `fieldError`).
3. **Server:** un único middleware global, `src/middlewares/errorHandler.js`, convierte cualquier error en la respuesta. Los controladores lo capturan con `try/catch` y se lo pasan con `next(error)`.

Todas las respuestas de error tienen el mismo formato:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "categoryId", "message": "categoryId must reference an active category" }
  ]
}
```

`details` solo aparece en errores de validación (de Zod, de Mongoose o de una referencia).

| Caso | Código |
|------|--------|
| Validación de Zod (campo requerido, vacío, enum, mín./máx., tipo, formato) | 400 |
| `id`, `slug` o `sku` con formato no válido | 400 |
| Referencia que no existe, está eliminada o inactiva | 400 |
| Regla de un campo (fecha pasada, plazas de más...) | 400 |
| `PATCH /:id` sin ningún campo que cambiar: `No fields to update` | 400 |
| Campo que no se puede cambiar en un `PATCH` (`_id`, `slug`, `sku`, `userId`...): `<campo> cannot be changed`, con `details` | 400 |
| JSON mal formado | 400 |
| Validación del modelo de Mongoose (segunda barrera) | 400 |
| Documento no encontrado o eliminado, también si se elimina mientras se edita | 404 |
| Endpoint inexistente | 404 |
| Eliminar con dependientes, o tocar un rol base | 409 |
| Restaurar algo que no está eliminado, o con una referencia eliminada | 409 |
| Valor único repetido (email, nombre, lugar, slug...) | 409 |
| Error inesperado | 500 |

> [!NOTE]
> En los errores 500 el cliente solo recibe `"Internal server error"`. La traza completa se muestra en la consola del servidor y nunca en la respuesta.

## Seguridad (Helmet)

<details>
<summary><b>Ver las cabeceras que se añaden</b></summary>

Configurado en `src/config/helmet.js`. Añade cabeceras de seguridad a todas las respuestas.

**Protección contra clickjacking** (doble capa):

| Cabecera                                          | Para qué                                            |
|---------------------------------------------------|-----------------------------------------------------|
| `Content-Security-Policy: frame-ancestors 'none'` | Impide incrustar la API en un `<iframe>` (navegadores modernos) |
| `X-Frame-Options: DENY`                           | Lo mismo para navegadores antiguos                  |

Además Helmet oculta `X-Powered-By` y añade `X-Content-Type-Options: nosniff`, `Referrer-Policy`, etc.

Solo en `production`: se activan `Strict-Transport-Security` (HSTS) y `upgrade-insecure-requests`, que requieren HTTPS.

Las contraseñas se guardan con bcrypt (10 rondas) y `passwordHash` está marcado con `select: false` en el modelo: no sale en ninguna consulta.

</details>

## Logs (Morgan)

<details>
<summary><b>Ver dónde y cómo se registran las peticiones</b></summary>

Configurado en `src/config/morgan.js`. Cada petición se registra en:

| Destino           | Contenido                 | Formato                                               |
|-------------------|---------------------------|-------------------------------------------------------|
| Consola           | Todas las peticiones      | `dev` (con color) en desarrollo, `combined` en producción |
| `logs/access.log` | Todas las peticiones      | `combined` + tiempo de respuesta                      |
| `logs/error.log`  | Solo respuestas 4xx y 5xx | `combined` + tiempo de respuesta                      |

- La carpeta `logs/` se crea automáticamente al arrancar y está en `.gitignore`.
- Los archivos se abren en modo *append*: no se pierden al reiniciar el servidor.
- En producción no se registran las peticiones a `/health`.

</details>

## Cómo añadir un recurso

Por ejemplo, `reviews`. Cada paso copia el patrón de una colección que ya existe:

1. **Modelo** en `models/review.model.js`, con `statusPlugin`, `slugPlugin` y `softDeletePlugin` (ver `category.model.js`). Las relaciones, con `ref` y un virtual para el `populate`.
2. **Esquemas de Zod** en `schemas/review.schema.js`, con los mismos límites que el modelo.
3. **Repositorio**, **service** y **controlador**, uno por archivo y con las mismas funciones que los de `routes`. Las referencias se comprueban con `assertReference` y los dependientes con `assertNoDependents` (`services/references.js`).
4. **Rutas** en `routes/review.routes.js`. Las fijas (`/actives`, `/inactives`, `/deleted`, `/slug/:slug`) van antes de `/:id`.
5. **Registro** en `server.js`: `app.use("/api/reviews", reviewRoutes)`, antes de `notFoundHandler`.
6. **Documentación:** una entrada más en `RESOURCES`, en `docs/openapi.js`. Los endpoints y los cuerpos se generan solos.
7. **Imágenes:** si tiene, `review: Review` en `IMAGE_OWNERS`, y la cascada en su service (`imageService.removeByOwner` y `restoreByOwner`).
8. Si el panel va a llamar con métodos nuevos, revisa `methods` en `config/cors.js`.

<p align="right"><a href="#top">Volver arriba</a></p>
