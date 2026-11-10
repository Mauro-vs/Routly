<a id="top"></a>

<img src="../docs/assets/banner-admin.svg" alt="Routly Admin. Panel de administración en Angular 20." width="100%">

<p align="center">
  <img src="https://img.shields.io/badge/Angular-20.3-1b7a4e?style=flat-square&labelColor=0c2419&logo=angular&logoColor=c6f04d" alt="Angular 20.3">
  <img src="https://img.shields.io/badge/TypeScript-5.9_strict-1b7a4e?style=flat-square&labelColor=0c2419&logo=typescript&logoColor=c6f04d" alt="TypeScript 5.9 strict">
  <img src="https://img.shields.io/badge/RxJS-7.8-1b7a4e?style=flat-square&labelColor=0c2419&logo=reactivex&logoColor=c6f04d" alt="RxJS 7.8">
  <img src="https://img.shields.io/badge/zoneless-signals-1b7a4e?style=flat-square&labelColor=0c2419" alt="zoneless signals">
  <img src="https://img.shields.io/badge/tests-Karma_%2B_Jasmine-1b7a4e?style=flat-square&labelColor=0c2419&logo=jasmine&logoColor=c6f04d" alt="tests Karma + Jasmine">
</p>

Panel de administración de Routly, la plataforma de rutas en moto. Está hecho con Angular 20 y consume la API REST de [`moto-routes-api`](../moto-routes-api/README.md).

La API tiene nueve colecciones relacionadas entre sí. El panel ya tiene la **base de todas** (modelos, servicios y stores) y las **páginas de las rutas**: listado, formulario con sus categorías y ubicaciones, y papelera. Las páginas del resto de entidades irán después. La visión general del proyecto está en el [README de la raíz](../README.md).

<img src="../docs/demo.gif" alt="Demo del panel: se activa una ruta, se busca por nombre, se cambia a la vista de tabla y se abre la papelera" width="100%">

## Contenido

- [Lenguajes y librerías](#lenguajes-y-librerías)
- [Requisitos](#requisitos) · [Arrancar el proyecto](#arrancar-el-proyecto) · [Comandos](#comandos) · [Variables de entorno](#variables-de-entorno)
- [Arquitectura](#arquitectura): flujo de datos, interruptor de activa, errores, endpoints, papelera, auth y rendimiento
- [Patrones de Angular](#patrones-de-angular)
- [Cómo añadir una feature](#cómo-añadir-una-feature)
- [Iconos](#iconos) · [Sistema de diseño](#sistema-de-diseño) · [Tests](#tests)
- [Limitaciones conocidas](#limitaciones-conocidas)

## Lenguajes y librerías

**TypeScript** en modo estricto (sin `any`), plantillas **HTML** de Angular y **CSS** puro con variables, sin preprocesadores ni frameworks de estilos.

| Librería | Versión | Para qué se usa |
|---|---|---|
| [Angular](https://angular.dev) | 20.3 | Framework. Componentes standalone, signals y sin zone.js |
| [RxJS](https://rxjs.dev) | 7.8 | Solo donde Angular lo exige: `HttpClient`, interceptores y eventos del router. El resto usa `async/await` con `firstValueFrom` |
| [SweetAlert2](https://sweetalert2.github.io) | 11.26 | Diálogos de confirmación y de error, siempre a través de `NotificationService` |
| [Phosphor Icons](https://phosphoricons.com) | 2.1 | Iconos. Solo se empaquetan los que se usan (ver [Iconos](#iconos)) |
| [Onest](https://fontsource.org/fonts/onest) (Fontsource) | 5.3 | Tipografía variable, servida desde el propio panel |
| Karma + Jasmine | 6.4 / 5.9 | Tests unitarios |

## Requisitos

- Node.js 20.19 o superior (probado con 24.8)
- MongoDB en marcha, para la API

## Arrancar el proyecto

Hacen falta dos terminales: una para la API y otra para el panel.

**1. API** (`http://localhost:3000`)

```bash
cd moto-routes-api
npm install
```

Copia `.env.example` a `.env` y ajusta los valores si hace falta. Después:

```bash
npm run seed
```

```bash
npm run dev
```

`npm run seed` borra las rutas y carga cinco de ejemplo. Solo hace falta la primera vez o para empezar de cero.

**2. Panel** (`http://localhost:4200`)

```bash
cd moto-routes-frontend
npm install
```

```bash
npm start
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compilación de producción en `dist/` |
| `npm test` | Tests con Karma y Jasmine |
| `npm run icons` | Regenera el registro de iconos (ver [Iconos](#iconos)) |

Para ejecutar los tests una sola vez, sin abrir navegador:

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

## Variables de entorno

El panel se configura en `src/environments/`:

| Archivo | Cuándo se usa |
|---|---|
| `environment.development.ts` | `npm start` |
| `environment.ts` | `npm run build` (producción) |

| Variable | Valor por defecto | Para qué |
|---|---|---|
| `apiUrl` | `/api` | URL base de la API, sin barra final. En desarrollo la sirve el proxy de `ng serve`; en producción, el proxy de la web (ver abajo) |
| `apiTimeout` | `10000` | Milisegundos que se espera una respuesta antes de cortar la petición |

**El proxy de desarrollo.** `npm start` sirve el panel con `proxy.conf.json`: las peticiones a `/api` y `/health` pasan a `http://localhost:3000`. Así el panel llama a la API desde su propio origen y la cookie de sesión viaja sin credenciales cruzadas entre puertos. La documentación de la API también se abre por el proxy (`http://localhost:4200/api/docs`). En producción se hace lo mismo con el servidor web: sirve el panel y reenvía `/api` a la API, con HTTPS. Cómo montarlo, con un ejemplo de Nginx, está en "Producción con HTTPS" del README de la API. Si la API va en otro origen, `apiUrl` lleva su URL completa y el origen del panel tiene que estar en el `CORS_ORIGIN` de la API.

La API se configura con su propio `.env` (ver `moto-routes-api/README.md`):

| Variable | Ejemplo | Para qué |
|---|---|---|
| `PORT` | `3000` | Puerto de la API. Si lo cambias, cambia también el `target` de `proxy.conf.json` |
| `MONGODB_URI` | `mongodb://localhost:27017/moto_routes` | Base de datos |
| `NODE_ENV` | `development` | En `production` la API solo acepta los orígenes de `CORS_ORIGIN` |
| `CORS_ORIGIN` | `http://localhost:4200` | Origen del panel: en producción, para CORS con credenciales; siempre, para la comprobación CSRF de la cookie |

## Arquitectura

Organización por features. Cada carpeta tiene una responsabilidad y unas reglas de quién puede importar de quién.

```
src/app/
├── auth/                  Sesión: store, service, interceptor, guards y modelos
│   ├── guards/            auth, admin y guest
│   └── testing/           Token y usuario falsos para los specs
├── core/                  Lo que existe una sola vez en la aplicación
│   ├── services/          ApiService, NotificationService, ErrorHandlerService, EntityStore,
│   │                      EntityApiService, OptionList, CollectionCountsService...
│   ├── interceptors/      timeout y errores
│   ├── guards/            Aviso de cambios sin guardar
│   ├── models/            Interfaces de las 9 entidades, con sus relaciones, y ApiError
│   └── utils/             Traducción de los errores de la API
├── shared/                Piezas reutilizables, sin lógica de negocio
│   ├── components/        Plantillas de listado, detalle, formulario y papelera, tabla,
│   │                      galería de imágenes, insignias, interruptor, campos...
│   ├── forms/             EntityForm (base de los formularios) y opciones de los selects
│   ├── pages/             Bases de las páginas y collectionRoutes()
│   └── utils/             Formato, fechas, textos de cada colección, órdenes, validadores
├── layouts/
│   └── admin-layout/      Sidebar con grupos y contadores, barra superior y navigation.ts
├── features/
│   ├── dashboard/         Dashboard: la próxima salida, la agenda y las cifras del catálogo
│   │   ├── components/    dashboard-hero, dashboard-agenda y dashboard-catalog (reciben los
│   │   │                  datos por input) y dashboard-sheet.css, la hoja que comparten
│   │   ├── pages/         La página: carga y elige qué se ve (error, esqueleto, vacío o datos)
│   │   ├── services/      dashboard.service.ts (rutas y salidas) y dashboard.store.ts (cifras)
│   │   └── dashboard-format.ts  Días que faltan, fecha corta y plazas
│   ├── profile/           Mi perfil
│   │   ├── components/    account-form (tus datos) y password-form (la contraseña)
│   │   ├── pages/         La página: cabecera, galería de la foto y aviso de cambios sin guardar
│   │   └── services/      profile.service.ts
│   └── routes/, categories/, locations/, experiences/, departures/,
│       users/, hosts/, roles/, images/
│       ├── components/    El formulario de la colección (<x>-form)
│       ├── pages/         Listado, detalle, formulario (crear y editar) y papelera
│       ├── services/      Servicio (API) y store (estado)
│       └── <x>.routes.ts
├── app.routes.ts
├── app.config.ts
└── app.component.ts
```

Reglas:

- `core` son servicios únicos (singletons).
- `shared` no sabe nada del negocio de una colección concreta.
- Una feature no importa de otra. Lo que comparten va a `core/models` o a `shared`; las opciones de un select (por ejemplo, los roles de un usuario) las pide el servicio de la propia feature.

### Pantallas

Cada colección tiene las mismas cinco páginas:

| Ruta | Página |
|---|---|
| `/<colección>` | Listado paginado por la API, con búsqueda, filtro por estado y orden (en la URL: `?q=pirineo&estado=active&orden=km&pagina=2`), interruptor, ver, editar y eliminar |
| `/<colección>/new` | Crear |
| `/<colección>/:slug` | Detalle: datos por secciones, relaciones enlazadas, estado, registro, eliminar y galería |
| `/<colección>/:slug/edit` | Editar, con la galería debajo del formulario |
| `/<colección>/trash` | Papelera: restaurar activo o inactivo |
| `/<colección>/id/:id` | Lleva al detalle de un registro del que solo se sabe el `_id` (relaciones sin slug) |

Las imágenes no tienen slug ni página de crear: su detalle es `/images/:id` y se añaden desde la galería de su dueño. El Dashboard (`/`) abre con los días que faltan para la próxima salida. Debajo, la agenda (las próximas salidas y las últimas rutas modificadas) y el catálogo: km, rutas activas, plazas ofertadas y precio medio, las rutas por dificultad y por categoría, y las salidas de los próximos seis meses. Las gráficas son componentes propios en CSS (`ui-stat-strip`, `ui-bar-list`, `ui-level-meter`), sin librerías y con su texto para el lector de pantalla.

### Cómo viajan los datos

```mermaid
flowchart LR
    P["Página<br/>(componente)"] -->|"llama a"| ST["Store<br/>signals"]
    ST --> SV["Servicio de la entidad<br/>RoutesService"]
    SV --> API["ApiService<br/>async/await"]
    API --> I1["errorInterceptor"] --> I2["timeoutInterceptor"] --> I3["authInterceptor"] --> B["API REST"]
    ST -.->|"signals"| P
    classDef node fill:#0c2419,stroke:#c6f04d,color:#e8f3ec,stroke-width:2px
    classDef store fill:#1b7a4e,stroke:#0c2419,color:#ffffff
    class P,ST,SV,API node
    class I1,I2,I3 node
    class B store
```

La página nunca llama a la API: pide al store, y el store expone el resultado como signals que la plantilla lee directamente.

- **`ApiService`** es la única puerta hacia la API. Sus métodos `get`, `post`, `put`, `patch` y `delete` devuelven promesas, para usarlas con `async/await`.
- **Interceptores**, en este orden:
  1. `errorInterceptor` convierte cualquier fallo en un `ApiError` con `status`, `type` (`network`, `timeout`, `validation`, `client` o `server`), `message` y, si los hay, `fieldErrors`.
  2. `timeoutInterceptor` corta la petición a los `apiTimeout` milisegundos.
  3. `authInterceptor` añade el token de sesión a las peticiones a la API, y a ninguna más.
- **`EntityApiService`** (`core/services/entity-api.service.ts`) tiene los 11 endpoints comunes a todas las colecciones. El servicio de cada entidad hereda de él y solo declara su ruta (`path`). Las imágenes, que no tienen slug, heredan de `RecordApiService`, que es lo mismo sin `getBySlug`.
- **`EntityStore`** guarda el estado de una entidad con signals y hace las operaciones comunes: cargar, crear, editar, eliminar, deshacer, cambiar el estado activo y la papelera.

### Modelos y relaciones

Cada entidad tiene su modelo en `core/models/` con los mismos campos que la API. Las relaciones llegan de dos formas: el id (`categoryId`) y el documento relacionado que añade el `populate` de la API (`category`), con un resumen de sus campos:

```ts
export interface Route extends BaseEntity {
  categoryId: string;
  category: CategorySummary | null;
  startLocationId: string;
  startLocation: LocationSummary | null;
  // ...
  coverImage?: ImageSummary | null;
}
```

El documento relacionado es `null` si ya no existe. Pasa en la papelera: si después de eliminar una ruta se elimina su categoría, la API ya no la encuentra. Por eso las plantillas no leen `route.startLocation.city` directamente, sino con `routeTrip(route)` y `categoryName(route)`, que ponen "Ubicación eliminada" o "Categoría eliminada".

`BaseRecord` tiene los campos comunes (`_id`, `status`, `isActive`, `deletedAt` y las fechas) y `BaseEntity` le añade el `slug`. Las imágenes usan `BaseRecord`.

### El interruptor de activa

El cambio es optimista: `EntityStore.setActive` actualiza el signal antes de llamar a la API, así se ve al instante. Si la API falla, el registro vuelve a como estaba y se muestra el error. Si el fallo fue un tiempo de espera o un 5xx, además se vuelve a pedir ese registro por su `_id`, por si la API sí llegó a aplicar el cambio.

### Errores

Todas las llamadas de los stores van en `try/catch` y pasan por `ErrorHandlerService`:

| Fallo | Qué ve el usuario |
|---|---|
| Sin red, tiempo de espera o 5xx | Diálogo de SweetAlert2, y en la página `ui-error-state` con "Reintentar" |
| 404 | Aviso breve y vuelta al listado |
| 400 o 422 (validación) | Mensaje junto al campo del formulario |
| 409 | Su motivo concreto: junto al formulario, o en un aviso si no hay formulario |

Los formularios validan también en el cliente, con los mismos criterios que la API. Los mensajes de la API llegan en inglés y se traducen en `core/utils/api-error.mapper.ts`.

Un 409 no siempre es un duplicado. El mapper reconoce cada motivo de la API y lo cuenta tal cual:

| La API dice | El panel muestra |
|---|---|
| `Cannot delete a route that has experiences` | No se puede eliminar: tiene experiencias. |
| `Cannot restore: categoryId references a deleted category` | No se puede restaurar mientras su categoría siga en la papelera. |
| `Route is not deleted` | Ese registro ya estaba restaurado. |
| `System roles cannot be deleted` | Los roles base no se pueden eliminar. |
| `categoryId must reference an active category` (400) | Elige una categoría activa. |

SweetAlert2 solo se usa a través de `NotificationService`. Ningún componente lo importa directamente.

### Endpoints de la API

<details>
<summary><b>Ver qué método del panel usa cada endpoint</b></summary>

Todos los endpoints de la API están en el panel:

| Endpoint | Método del panel | Dónde se usa |
|---|---|---|
| `GET /health` | `ApiStatusService.check` | Indicador de conexión del sidebar |
| `GET /api/docs` | Enlace | "Documentación API" en el sidebar |
| `GET /api/routes` | `RoutesService.getAll` | Listado y Dashboard |
| `GET /api/routes/actives` | `RoutesService.getActives` | Filtro "Activas" del listado |
| `GET /api/routes/inactives` | `RoutesService.getInactives` | Filtro "Inactivas" del listado |
| `GET /api/routes/deleted` | `RoutesService.getDeleted` | Papelera y su contador |
| `GET /api/routes/:id` | `RoutesService.getById` | Comprobar una ruta tras un cambio de estado fallido |
| `GET /api/routes/slug/:slug` | `RoutesService.getBySlug` | Abrir el formulario de edición |
| `POST /api/routes` | `RoutesService.create` | Crear |
| `PATCH /api/routes/:id` | `RoutesService.update` | Guardar cambios |
| `PATCH /api/routes/:id/active` | `RoutesService.setActive` | Interruptor de activa |
| `PATCH /api/routes/:id/delete` | `RoutesService.remove` | Eliminar (borrado lógico) |
| `PATCH /api/routes/:id/restore` | `RoutesService.restore` | "Deshacer" después de eliminar y "Restaurar" en la papelera |
| `GET /api/categories/actives` | `RoutesService.getCategoryOptions` | Select de categoría del formulario |
| `GET /api/locations/actives` | `RoutesService.getLocationOptions` | Selects de origen y destino |

Las demás colecciones (`roles`, `users`, `hosts`, `categories`, `locations`, `experiences`, `departures` e `images`) usan los mismos endpoints desde su servicio. `ImagesService` está en `core/services/` porque también la usa la galería de `shared`; su `getByOwner` pide la galería de un dueño (`GET /api/images?ownerType=route&ownerId=<id>`).

Las URL del panel identifican cada ruta por su `slug` (`/routes/:slug/edit`). La API solo admite `slug` para leer, así que guardar, activar y eliminar van por `_id`.

Cada listado pide a la API solo la página que se ve, con sus query params (`EntityListPage`, en `shared/pages/`):

```
GET /api/routes?page=2&limit=12&q=pirineo&status=active&sort=-distance
```

- **La búsqueda, el filtro por estado, el orden y la página los hace la API.** El total llega en la cabecera `X-Total-Count` (`ApiService.getList`) y la paginación lo usa para saber cuántas páginas hay.
- **El buscador espera a que se deje de escribir** (300 ms) y, si la petición anterior aún no ha vuelto, la cancela: solo cuenta la última. Busca palabras enteras en los textos de la colección (el índice de texto de la API), no en los nombres de sus relaciones.
- **Cada página dice cómo se ordena** con el `sort` de la API (`sorts`): por ejemplo `-distance` en "Más kilómetros". El nombre en la URL del panel (`?orden=km`) no cambia.
- **Mientras llega una página nueva se sigue viendo la anterior**, atenuada y con una barra fina arriba (si tarda más de 150 ms; con movimiento reducido, la barra quieta). Los skeletons solo salen la primera vez.
- **Los contadores del filtro** (todas, activas, inactivas) son dos páginas de un registro, `?limit=1` y `?status=active&limit=1`, de las que solo se lee `X-Total-Count`; las inactivas son la diferencia. **El número del menú** es el total de la colección, sin búsqueda ni filtros, y también sale de `X-Total-Count` (`CollectionCountsService`): ya no se descarga ninguna colección entera para contarla.
- **Después de activar, desactivar, eliminar o restaurar una fila**, el cambio se ve al instante y después se piden otra vez la página y los contadores: un registro que ya no pasa el filtro sale y entra el siguiente. Si la página se queda vacía, se pasa a la anterior.
- **Una página que ya no existe** (`?pagina=20` con 8 páginas, o al borrar las últimas filas) pasa a la última que hay.
- **Los formularios no cambian**: sus desplegables siguen pidiendo la lista entera (`getAll`, `/actives`), aparte de la página del listado.

</details>

### Papelera

Eliminar es un borrado lógico: el registro sigue en la base de datos, marcado como eliminado.

- Se llega desde el botón "Papelera" de cada listado, que muestra cuántos hay.
- "Restaurar" es optimista: sale de la papelera al instante. Si la API falla, vuelve a su sitio y se muestra el error.
- Un registro eliminado conserva su estado: la columna "Estaba" lo muestra. El selector "Al restaurar, dejarla" decide si vuelve como estaba (por defecto), inactiva o activa. Deshacer un borrado recién hecho siempre lo deja como estaba.
- Si una referencia sigue eliminada (la categoría de una ruta, el usuario de un anfitrión...), la API no deja restaurar: el botón se desactiva con el motivo a la vista.

### Formularios

Cada colección tiene su formulario en `components/<x>-form/`, que hereda de `shared/forms/entity-form.ts`:

- Reactive Forms con las mismas validaciones que la API, y los errores de la API pintados junto a su campo (un 409 por duplicado va al campo repetido).
- Al editar solo se envía lo que se puede cambiar: el SKU de una salida, el usuario de un anfitrión o el nombre interno de un rol base se muestran bloqueados con su motivo.
- Los selects de relaciones ofrecen solo las opciones activas; si el registro usa una que se desactivó después, aparece marcada "(inactiva)".
- La contraseña de un usuario es de solo escritura: al editar, solo se envía si se marca "Cambiar la contraseña".
- Al editar, un texto opcional que se vacía se envía como `null` y la API lo borra. Vaciar las dos coordenadas de una ubicación las quita.
- Las fechas de una salida solo se envían si cambian: así una salida que ya pasó se puede editar y marcar como "Realizada".
- Salir con cambios sin guardar pide confirmación (`unsaved-changes.guard.ts`). También al recargar, cerrar la pestaña o escribir otra dirección: ahí sale el aviso genérico del navegador, que no deja cambiar el texto.

Las acciones que la API va a rechazar (desactivar o eliminar un rol base, marcar como principal una imagen inactiva) se desactivan con una explicación visible al pasar el ratón o al llegar con el teclado.

### Imágenes

`app-image-gallery` (en `shared/components/image-gallery/`) va en el detalle y en la edición de rutas, usuarios, anfitriones, experiencias, categorías y ubicaciones. Permite añadir por URL, marcar la principal, subir y bajar, activar o desactivar y eliminar con deshacer. Cuando cambia la principal, la miniatura del detalle se pone al día.

### Autenticación

**La sesión es una cookie `httpOnly`** (`routly_session`) que pone la API en el login. El JavaScript del panel no la puede leer, así que un XSS no se lleva el token; el navegador la manda sola en cada petición a la API. El panel solo guarda en `localStorage` cuándo caduca (`routly.session` = `{ expiresAt }`), para avisar a tiempo y enterarse de los cambios de otras pestañas. El `token` que sigue llegando en el body del login (para Swagger y Postman) se ignora. Las opciones de la cookie y la protección CSRF están en la sección "La cookie de sesión" del README de la API.

Todo está en `src/app/auth/`:

- `auth.store.ts`: el estado con signals y su copia en `localStorage` (`routly.session`, solo `{ expiresAt }`). No llama a la API ni navega.
- `auth.service.ts`: login, registro, logout y comprobación de la sesión con `/auth/me`. Al arrancar solo pregunta si hay un `expiresAt` vigente; si no, se entra como anónimo. No toca la interfaz. `refreshUser()` vuelve a pedir el usuario para que el menú enseñe al momento lo que ha cambiado: lo llaman "Mi perfil" al cambiar la foto principal y `UsersStore` cuando un admin guarda su propia cuenta o le cambia la foto, sin tener que recargar.
- `session.service.ts`: lo que se ve cuando la sesión termina sola: el aviso y la vuelta al login.
- `auth.interceptor.ts`: manda las peticiones a la API con `withCredentials` (la cookie), y a ninguna otra. Con la sesión ya caducada no envía nada.
- `guards/`: `auth.guard.ts`, `admin.guard.ts` y `guest.guard.ts`. Sin sesión, al login; el panel, solo para ADMIN; con sesión, fuera del login.
- `return-url.ts`: la vuelta tras el login, que solo acepta rutas internas.
- `testing/auth.testing.ts`: un token y un usuario falsos para los specs. El token solo sirve para simular el body del login.

Cada spec va junto a su archivo, como en el resto del proyecto.

### El garaje

Las motos de cada usuario y la moto con la que guía cada anfitrión. Todo sale de `features/bikes/`:

- **Mi garaje** (`/profile/garage`): las motos del usuario de la sesión, en su propia zona. `GarageStore` lee `/profile/me/bikes`, también las privadas y las inactivas.
- **Motos** (`/bikes`): todas, solo para el admin, con el listado, detalle, formulario y papelera de cualquier colección.
- **La moto del guía:** se elige en experiencias y salidas entre las motos activas y públicas del anfitrión. La salida sin moto propia hereda la de su experiencia.
- **El carnet** lo calcula la API. El front lo muestra, nunca lo envía ni lo recalcula.
- `ui-bike-card` es la ficha compartida, y el modelo está en `core/models/bike.model.ts`, porque lo usan varias features.

### Rendimiento

- Cada página se descarga cuando se visita (`loadChildren` y `loadComponent`).
- SweetAlert2 se descarga la primera vez que hace falta un aviso.
- Los listados se paginan de 12 en 12 y los skeletons tienen la forma del contenido que sustituyen.

## Cómo añadir una colección

<details>
<summary><b>Ver los pasos, con el ejemplo de categories</b></summary>

La API tiene que exponer la colección con los 11 endpoints comunes.

**1. Modelo** en `core/models/<x>.model.ts`: la entidad, su resumen para los `populate` y el payload.

**2. Servicio** en `features/<x>/services/<x>.service.ts`: hereda los 11 endpoints.

```ts
@Injectable({ providedIn: 'root' })
export class CategoriesService extends EntityApiService<Category, CategoryPayload> {
  protected readonly path = '/categories';
}
```

**3. Store** en `features/<x>/services/<x>.store.ts`, con los textos de la colección y el nombre que se muestra de cada registro:

```ts
export const CATEGORY_LABELS: CollectionLabels = { singular: 'categoría', plural: 'categorías', gender: 'f' };

@Injectable({ providedIn: 'root' })
export class CategoriesStore extends EntityStore<Category, CategoryPayload> {
  protected readonly api = inject(CategoriesService);
  protected readonly listPath = '/categories';
  readonly labels = CATEGORY_LABELS;

  displayName(category: Category): string {
    return category.name;
  }
}
```

Con esto ya tiene carga, filtro por estado, cambio de estado optimista, eliminar con confirmación y deshacer, papelera y su contador en el menú.

**4. Formulario** en `components/<x>-form/`: hereda de `EntityForm`, crea su `FormGroup` y define `fill()` y `toPayload()` (y `toUpdatePayload()` si al editar no se envía todo). Copia `category-form.component.ts`.

**5. Páginas** en `pages/`. Cada una hereda su base y usa su plantilla de `shared`:

| Página | Base | Plantilla |
|---|---|---|
| Listado | `EntityListPage` | `ui-list-page` con `ui-data-table`, `ui-status-toggle` y `ui-row-actions` |
| Detalle | `EntityDetailPage` | `ui-detail-page` con `ui-detail-section` y `ui-field-list` |
| Formulario | `EntityFormPage` | `ui-form-page` con el formulario |
| Papelera | `EntityTrashPage` | `ui-trash-page` con `ui-restore-button` |

**6. Rutas** en `<x>.routes.ts` con `collectionRoutes({ labels, title, list, detail, form, trash })`, y regístralas en `app.routes.ts` con `loadChildren`.

**7. Menú**: añade la entrada a su grupo en `layouts/admin-layout/navigation.ts`, con su `id` igual a la ruta de la API.

</details>

## Iconos

<details>
<summary><b>Ver cómo añadir un icono</b></summary>

Los iconos son de [Phosphor](https://phosphoricons.com). Para no empaquetar la librería entera, solo se incluyen los que aparecen en `tools/generate-icons.mjs`.

Para usar uno nuevo, añade su nombre a esa lista y ejecuta:

```bash
npm run icons
```

Después ya se puede usar con `<ui-icon name="nombre" />`. El nombre está tipado: uno que no esté en la lista no compila.

</details>

## Patrones de Angular

| Patrón | Dónde | Por qué |
|---|---|---|
| Sin zone.js (`provideZonelessChangeDetection`) | `app.config.ts` | La vista se actualiza cuando cambia un signal, no tras cada evento |
| Componentes standalone y `OnPush` | Todos | Sin `NgModule`; cada componente declara lo que importa |
| `signal`, `computed`, `linkedSignal` | Stores y páginas | Estado reactivo sin suscripciones manuales |
| `input()`, `model()`, `output()` | Componentes de `shared` | API de componentes basada en signals |
| `inject()` | Todos | Sin inyección por constructor |
| `withComponentInputBinding` | Router | El `:slug` de la URL llega a la página como `input()` |
| Control flow `@if`, `@for` | Plantillas | Sintaxis nativa, sin directivas estructurales |
| Reactive Forms con selects | `components/route-form` | Validación en el cliente con los mismos límites que la API |
| `viewChild()` | Página del formulario | Devolver al formulario los errores de la API |
| Interceptores y guards funcionales | `core/` | Funciones en lugar de clases |
| `canDeactivate` | `unsaved-changes.guard.ts` | Avisa antes de salir de un formulario con cambios |

## Sistema de diseño

Todo el aspecto sale de variables CSS en `src/styles/`:

| Archivo | Contenido |
|---|---|
| `tokens.css` | Colores, tipografía, espacios, radios, sombras, duraciones y medidas del layout |
| `base.css` | Estilos de partida del documento, foco visible y movimiento reducido |
| `primitives.css` | Piezas comunes: botones, badges, tarjetas, paneles y selects |
| `sweetalert.css` | SweetAlert2 adaptado a la paleta |

La dirección visual ("D Mixta") y sus reglas están en [`DESIGN.md`](DESIGN.md); el propósito del producto, en [`PRODUCT.md`](PRODUCT.md).

**Paleta.** Un acento lima (`#c6f04d`, siempre con tinta oscura encima) para la acción principal y lo destacado, un verde principal (`--color-primary: #14663f`) para enlaces y estados, y una banda verde muy oscura (`#0c2419`) en el sidebar y en la cabecera de cada página. Los neutros están teñidos de verde. Todas las parejas de texto y fondo cumplen contraste **WCAG AA** en los dos temas.

![accent](https://img.shields.io/badge/accent-%23c6f04d-c6f04d?style=for-the-badge&labelColor=c6f04d) ![primary](https://img.shields.io/badge/primary-%2314663f-14663f?style=for-the-badge&labelColor=14663f) ![band](https://img.shields.io/badge/band-%230c2419-0c2419?style=for-the-badge&labelColor=0c2419) ![canvas](https://img.shields.io/badge/canvas-%23f1f4f0-f1f4f0?style=for-the-badge&labelColor=f1f4f0) ![ink](https://img.shields.io/badge/ink-%230f1a15-0f1a15?style=for-the-badge&labelColor=0f1a15)

**Tema claro y oscuro.** Los tokens se redefinen bajo `data-theme="dark"`. Un script en `index.html` pone el tema antes de pintar (lo guardado en `routly.theme` o, si no hay nada, el del sistema) y `ThemeService` lo cambia desde el botón del menú. En oscuro el principal pasa a ser el lima.

**Tipografía.** Onest Variable, en una escala de seis tamaños (de `--text-xs` a `--text-2xl`). Los títulos de banda van en cursiva inclinada (`--slant-text`). Las cifras usan números tabulares para que se alineen en columna.

**El ángulo.** El logo marca un ángulo (`--slant: -16deg`) que se repite en el botón principal, las insignias, la marca del menú activo y los extremos de la cabecera de las tablas. Los kilómetros van primero en cada fila, como en un roadbook, y la dificultad se pinta como un medidor de marcas.

**Espacios y formas.** Escala de 4 a 48 px (`--space-1` a `--space-7`) y radios pequeños (3, 4 y 6 px): las formas son rectas o inclinadas, no redondeadas.

**Movimiento.** Tres duraciones (120, 200 y 300 ms) con una curva de salida fuerte, y otra para lo que se desplaza (la marca del menú). Con `prefers-reduced-motion` se quitan los desplazamientos.

**Estado inactivo.** No depende solo del color: combina fondo gris, borde discontinuo, texto atenuado y una etiqueta con icono.

**Responsive.** Por debajo de 900 px el sidebar pasa a ser un cajón que se abre desde la barra superior y las tablas se convierten en bloques. Mínimo: 375 px sin scroll horizontal.

**Probado con el peor caso.** Nombres de 60 caracteres, emails sin espacios de 90, nombres de una letra, relaciones eliminadas, cifras extremas y cien filas, inyectados interceptando la API en el navegador (sin código de demo en la app): nada desborda, todo texto cortado se puede leer entero al pasar el ratón y no aparece ningún `undefined` ni `NaN`.

## Tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

478 tests. Cubren la lógica y los formularios:

| Spec | Qué prueba |
|---|---|
| `api-error.mapper.spec.ts` | Conversión de cualquier fallo HTTP a `ApiError` y traducción de los mensajes (409 por duplicado, campos que no se pueden cambiar...) |
| `api.service.spec.ts`, `<x>.service.spec.ts` | URLs, métodos y cuerpo de cada petición |
| `entity.store.spec.ts`, `routes.store.spec.ts` | Carga, la página del listado (total, cancelar la anterior, seguir viendo la que había, errores, pedirla otra vez tras una acción), los contadores con `X-Total-Count`, CRUD, actualización optimista, papelera, deshacer y contador del menú |
| `entity-list-page.spec.ts` | La base de los listados: la primera petición con lo que dice la URL, los contadores, la barra de carga, el buscador con espera, volver a la página 1 al cambiar el orden, la página que ya no existe y la URL |
| `<x>-form.component.spec.ts` (9) | Validaciones, lo que se envía al crear y al editar, y dónde se pinta cada error de la API |
| `image-gallery.component.spec.ts` | Principal, orden, regla de la imagen inactiva y añadir por URL |
| Componentes compartidos | Insignia de estado, lista de datos, acciones de fila, interruptor, plantillas de listado y papelera |
| `navigation.spec.ts`, `utils.spec.ts` | Menú, formato, fechas, textos y validadores |
| `auth/*.spec.ts`, `app.routes.spec.ts` | Sesión (el token nunca llega a `localStorage`), interceptor (`withCredentials`, sesión caducada, respuestas no válidas), guards, `returnUrl` y qué ve cada rol en cada URL |
| `users.store.spec.ts`, `user-form.component.spec.ts` | Tu propia cuenta no se desactiva, ni se elimina, ni cambia de rol |
| `experience-form-page.component.spec.ts` | La página pide las motos del anfitrión una sola vez (sin bucle de peticiones) |
| `bikes/**/*.spec.ts`, `profile.component.spec.ts` | El garaje: límites, moto principal, pública y el perfil propio |

## Limitaciones conocidas

- El detalle no lista lo que cuelga de un registro (las salidas de una experiencia, las rutas de una categoría): la API no filtra por relación. Está propuesto en `NOTES.md`.
- El listado global de imágenes muestra el tipo de dueño y enlaza a él, pero no su nombre: la API solo devuelve `ownerType` y `ownerId`.
- Los contadores del menú y el Dashboard piden cada listado completo: la API no tiene un endpoint de totales.
- El Dashboard no muestra tendencias, ocupación ni comparativas con meses anteriores: la API no guarda histórico ni reservas. Está propuesto en `NOTES.md`.
- No hay borrado definitivo: la API no tiene borrado físico.

<p align="right"><a href="#top">Volver arriba</a></p>
