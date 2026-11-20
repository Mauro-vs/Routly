<a id="top"></a>

<img src="docs/assets/banner.svg" alt="Routly. Rutas en moto, ordenadas y listas para rodar." width="100%">

<p align="center">
  <img src="https://img.shields.io/badge/Angular-20-1b7a4e?style=flat-square&logo=angular&logoColor=c6f04d&labelColor=0c2419" alt="Angular 20">
  <img src="https://img.shields.io/badge/TypeScript-strict-1b7a4e?style=flat-square&logo=typescript&logoColor=c6f04d&labelColor=0c2419" alt="TypeScript estricto">
  <img src="https://img.shields.io/badge/Node.js-20+-1b7a4e?style=flat-square&logo=nodedotjs&logoColor=c6f04d&labelColor=0c2419" alt="Node.js 20 o superior">
  <img src="https://img.shields.io/badge/Express-5-1b7a4e?style=flat-square&logo=express&logoColor=c6f04d&labelColor=0c2419" alt="Express 5">
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9-1b7a4e?style=flat-square&logo=mongodb&logoColor=c6f04d&labelColor=0c2419" alt="MongoDB con Mongoose 9">
  <img src="https://img.shields.io/badge/JWT-RS256_+_JWKS-1b7a4e?style=flat-square&logo=jsonwebtokens&logoColor=c6f04d&labelColor=0c2419" alt="JWT RS256 con JWKS">
  <img src="https://img.shields.io/badge/tests-1024-1b7a4e?style=flat-square&labelColor=0c2419" alt="1024 tests">
  <img src="https://img.shields.io/badge/licencia-MIT-1b7a4e?style=flat-square&labelColor=0c2419" alt="Licencia MIT">
</p>

<p align="center">
  <a href="#míralo-en-marcha"><b>Demo</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#lo-que-ya-funciona"><b>Funciones</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#cómo-está-hecho"><b>Arquitectura</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#preparado-para-la-api-gateway"><b>API gateway</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#puesta-en-marcha"><b>Arrancar</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#hoja-de-ruta"><b>Hoja de ruta</b></a>
</p>

Routly reúne las mejores carreteras para ir en moto en un catálogo cuidado y las convierte en **salidas guiadas** por anfitriones locales: eliges la ruta, la fecha y te apuntas. Cada ruta tiene la misma información (origen, destino, distancia, duración y dificultad) y cada salida, sus plazas, su precio y su moto guía.

Las buenas rutas suelen estar repartidas en foros, grupos de mensajería y tracks sueltos. Routly las ordena para que elegir una sea cuestión de segundos, y una IA que solo trabaja con datos reales te cuenta qué tiempo hará, dónde parar y qué llevar.

## Míralo en marcha

<img src="docs/demo.gif" alt="Demo del panel: se activa una ruta, se busca por nombre, se cambia a la vista de tabla y se abre la papelera" width="100%">

<sub>El panel funcionando contra la API real: activar una ruta, buscar, cambiar a la vista de tabla y abrir la papelera.</sub>

## Lo que ya funciona

Routly son **cinco aplicaciones** que se hablan por HTTP y JSON. Cada una vive en su carpeta, con su puerto, su prefijo y sus tests:

| | Aplicación | Puerto | Prefijo | Para qué |
|:---:|---|:---:|---|---|
| <img src="docs/assets/icon-search.svg" width="28" alt=""> | [**Web pública**](moto-routes-web/README.md) | 4300 | | Un motero sin cuenta encuentra una salida guiada, ve el recorrido en el mapa y elige fecha |
| <img src="docs/assets/icon-chart.svg" width="28" alt=""> | [**Panel**](moto-routes-dashboard/README.md) | 4200 | | Los administradores gestionan el catálogo, las salidas, los usuarios y las imágenes |
| <img src="docs/assets/icon-docs.svg" width="28" alt=""> | [**API**](moto-routes-api/README.md) | 3000 | `/api` | Las diez colecciones, los permisos de cada rol y la tienda pública (`/api/shop`) |
| <img src="docs/assets/icon-lock.svg" width="28" alt=""> | [**Auth**](moto-routes-auth/README.md) | 3002 | `/auth` | Inicia, renueva y cierra las sesiones, y es el único que firma los tokens |
| <img src="docs/assets/icon-sparkle.svg" width="28" alt=""> | [**IA**](moto-routes-ai/README.md) | 3001 | `/ai` | El bloque Routly IA del detalle, el mapa del recorrido y el asistente |

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/icon-catalog.svg" width="44" alt=""><br>
      <b>Diez colecciones, un mismo patrón</b><br>
      Rutas, categorías, ubicaciones, experiencias, salidas, usuarios, anfitriones, roles, imágenes y el garaje de motos: cada una con listado, detalle, formulario y papelera, y las relaciones enlazadas entre sí.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/icon-lock.svg" width="44" alt=""><br>
      <b>Sesión segura en un servicio propio</b><br>
      Tokens RS256 de 15 minutos en cookies <code>httpOnly</code> y un refresh de 7 días que cambia en cada uso. Si alguien reutiliza uno copiado, se cierran todas las sesiones de ese usuario.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-sparkle.svg" width="44" alt=""><br>
      <b>Routly IA, con datos reales</b><br>
      Resumen y para quién es cada salida, el tiempo en sus fechas (Open-Meteo), qué llevar y preguntas frecuentes, y un asistente que responde en streaming. La IA solo redacta: no se inventa sitios ni datos.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-map.svg" width="44" alt=""><br>
      <b>El recorrido en el mapa</b><br>
      La ruta por carretera de verdad (OSRM), con dónde comer, repostar y parar a mirar a lo largo del camino (OpenStreetMap), filtrable por tipo y kilómetro a kilómetro.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-toggle.svg" width="44" alt=""><br>
      <b>Activar y desactivar al instante</b><br>
      Un interruptor oculta cualquier registro sin borrarlo. El cambio se ve en el momento y, si el servidor falla, vuelve atrás solo.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-trash.svg" width="44" alt=""><br>
      <b>Papelera con vuelta atrás</b><br>
      Nada se borra para siempre. Lo eliminado se puede restaurar como activo o inactivo, o deshacer justo después.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-errors.svg" width="44" alt=""><br>
      <b>Errores que se entienden</b><br>
      Los datos no válidos se señalan junto al campo. Los fallos de red o del servidor se explican, sin pantallas en blanco.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-mobile.svg" width="44" alt=""><br>
      <b>Accesible y responsive</b><br>
      Contraste AA, uso completo con teclado, menú lateral desplegable en el móvil y filtros de la web en una hoja que sube desde abajo.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-docs.svg" width="44" alt=""><br>
      <b>API completa y documentada</b><br>
      Más de 120 endpoints, todos en Swagger (<code>/api/docs</code>, y los de la sesión en <code>/auth/docs</code>), con un mismo formato de error y la validación antes del controlador.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-gateway.svg" width="44" alt=""><br>
      <b>Lista para una API gateway</b><br>
      Cada servicio con su prefijo, tokens que cualquiera comprueba con la clave pública y todo pensado para ir detrás de un proxy. <a href="#preparado-para-la-api-gateway">Cómo está montado</a>.
    </td>
  </tr>
</table>

## Capturas

### La web pública

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/web-home.png" alt="Home de la web pública: el panel de orientación verde con los tipos de carretera sobre una carretera"></td>
    <td width="50%"><img src="docs/screenshots/web-shop.png" alt="Shop filtrado por Costa, con el pórtico de filtros y las tarjetas con su hito kilométrico"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Home</b>: el panel de orientación es la navegación: cada tipo de carretera lleva al Shop filtrado</sub></td>
    <td align="center"><sub><b>Shop</b>: los filtros, la búsqueda y la página van en la URL</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/web-detalle.png" alt="Detalle de una experiencia con el cartel de la ruta y las salidas como billetes"></td>
    <td align="center"><img src="docs/screenshots/web-movil.jpg" alt="Shop en el móvil" width="260"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Detalle</b>: el cartel de la ruta y las salidas como billetes; la completa se ve, pero no se elige</sub></td>
    <td align="center"><sub><b>En el móvil</b>: los filtros, en una hoja que sube desde abajo</sub></td>
  </tr>
</table>

<sub>Las fotos del seed son de picsum; cuando no cargan, la web enseña el paisaje de la marca, que es lo que se ve en estas capturas.</sub>

### El panel

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/dashboard.png" alt="Dashboard con la cuenta atrás de la próxima salida, la agenda y el catálogo"></td>
    <td width="50%"><img src="docs/screenshots/rutas-lista.png" alt="Listado de rutas en tema oscuro"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Dashboard</b>: la próxima salida, la agenda y el catálogo de un vistazo</sub></td>
    <td align="center"><sub><b>Rutas en oscuro</b>: km primero, como en un roadbook; la inactiva se distingue sin depender del color</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/papelera.png" alt="Papelera con una ruta eliminada"></td>
    <td><img src="docs/screenshots/formulario.png" alt="Formulario de nueva ruta"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Papelera</b>: restaurar con un clic</sub></td>
    <td align="center"><sub><b>Nueva ruta</b>: validación en el momento, con los mismos límites que la API</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/login.png" alt="Pantalla de inicio de sesión con la carretera dibujada"></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><sub><b>Inicio de sesión</b>: la carretera se dibuja al entrar</sub></td>
  </tr>
</table>

<details>
<summary><b>Ver la versión para móvil</b></summary>
<br>
<p align="center">
  <img src="docs/screenshots/movil.png" alt="Listado de rutas en el móvil" width="320">
</p>
</details>

## Cómo está hecho

<p>
  <img src="https://skillicons.dev/icons?i=angular,ts,html,css,nodejs,express,mongodb,postman&theme=dark" alt="Angular, TypeScript, HTML, CSS, Node.js, Express, MongoDB y Postman">
</p>

Un monorepo con cinco aplicaciones independientes. Los dos frontales llaman siempre a su propio origen (`/api`, `/auth`, `/ai`), y un proxy reparte cada prefijo a su servicio:

```mermaid
flowchart LR
    W["Web pública<br/>Angular 20 · 4300"]
    A["Panel<br/>Angular 20 · 4200"]
    P{{"Proxy<br/>/api · /auth · /ai"}}
    B["API REST<br/>Express 5 · 3000"]
    U["Auth<br/>Express 5 · 3002"]
    I["IA<br/>Express 5 · 3001"]
    C[("MongoDB<br/>moto_routes")]
    E["Open-Meteo, OSRM,<br/>OpenStreetMap y Groq"]

    W --> P
    A --> P
    P -- "/api" --> B
    P -- "/auth" --> U
    P -- "/ai" --> I
    I -- "/api/shop" --> B
    B -. "JWKS: clave pública" .-> U
    B -- "Mongoose" --> C
    U -- "Mongoose" --> C
    I -.-> E

    classDef front fill:#c6f04d,stroke:#0c2419,color:#0c2419,stroke-width:2px
    classDef app fill:#0c2419,stroke:#c6f04d,color:#e8f3ec,stroke-width:2px
    classDef edge fill:#1b7a4e,stroke:#c6f04d,color:#ffffff,stroke-width:2px
    classDef data fill:#e8f3ec,stroke:#1b7a4e,color:#0c2419
    class W,A front
    class B,U,I app
    class P edge
    class C,E data
```

Hoy ese proxy es el de `ng serve` en desarrollo (`proxy.conf.json` de cada frontal) y un Nginx o Caddy en producción. Mañana será la [API gateway](#preparado-para-la-api-gateway), sin tocar los frontales.

<table>
  <tr>
    <th align="left">Parte</th>
    <th align="left">Tecnología</th>
    <th align="left">Lo que la hace especial</th>
  </tr>
  <tr>
    <td><a href="moto-routes-web/README.md"><b>Web pública</b></a></td>
    <td>Angular 20 sin zone.js, signals, TypeScript estricto, Leaflet</td>
    <td>La URL como fuente de verdad, peticiones canceladas con <code>AbortController</code>, componentes reutilizables (carrusel, filtros, búsqueda, paginación) y la señalización de carretera como diseño</td>
  </tr>
  <tr>
    <td><a href="moto-routes-dashboard/README.md"><b>Panel</b></a></td>
    <td>Angular 20 sin zone.js, signals, TypeScript estricto</td>
    <td>Actualizaciones optimistas, carga diferida por secciones, un sistema de diseño propio en variables CSS y la sesión que se renueva sola sin que se note</td>
  </tr>
  <tr>
    <td><a href="moto-routes-api/README.md"><b>API</b></a></td>
    <td>Express 5, Mongoose 9 con relaciones y <code>populate</code>, Zod 4, <code>jose</code></td>
    <td>Arquitectura por capas, validación antes del controlador, borrado lógico reutilizable, permisos por rol y por propiedad, y un único formato de error</td>
  </tr>
  <tr>
    <td><a href="moto-routes-auth/README.md"><b>Auth</b></a></td>
    <td>Express 5, Zod 4, <code>jose</code> (JWT RS256 y JWKS), Argon2id</td>
    <td>Solo él tiene la clave privada: los demás comprueban los tokens con la pública. Refresh rotatorio con detección de reutilización, límite de intentos y protección CSRF</td>
  </tr>
  <tr>
    <td><a href="moto-routes-ai/README.md"><b>IA</b></a></td>
    <td>Express 5, Zod 4, IA gratuita con Groq (GPT-OSS 120B), cambiable a Gemini u OpenRouter desde el <code>.env</code></td>
    <td>Sin base de datos, respuestas de la IA validadas con Zod, agente con herramientas de solo lectura, streaming SSE y caché en memoria</td>
  </tr>
</table>

### Cómo viaja una sesión

```mermaid
sequenceDiagram
    autonumber
    participant N as Navegador
    participant U as Auth
    participant B as API
    N->>U: POST /auth/login
    U-->>N: Cookies httpOnly: routly_session (15 min) y routly_refresh (7 días, solo /auth)
    N->>B: GET /api/... con la cookie
    B->>B: Comprueba la firma (JWKS), el usuario, el rol y la propiedad
    B-->>N: 200
    Note over N,B: A los 15 minutos
    N->>B: GET /api/...
    B-->>N: 401 TOKEN_EXPIRED
    N->>U: POST /auth/refresh
    U-->>N: Cookies nuevas (el refresh anterior ya no sirve)
    N->>B: Repite la petición: 200
```

La API nunca ve una contraseña ni una clave con la que pueda fabricar tokens: solo los comprueba. El panel guarda en `localStorage` hasta cuándo dura la sesión, nunca el token.

```
Routly/
├── moto-routes-web/        Web pública: Home, Shop y detalle con el mapa (Angular)
├── moto-routes-dashboard/  Panel de administración (Angular)
├── moto-routes-api/        API REST: colecciones, permisos y tienda (Node.js + Express + MongoDB)
├── moto-routes-auth/       Auth: login, refresh y JWKS (Node.js + Express + MongoDB)
├── moto-routes-ai/         IA: bloque Routly IA, mapa y asistente (Node.js + Express)
├── design/                 Bocetos de la web pública y el script del peor caso
├── docs/                   Demo, capturas e imágenes de los README
├── scripts/                npm run dev, test, check y seed para todas las partes a la vez
└── package.json            Esos comandos (sin dependencias)
```

Cada parte tiene su README técnico, con la arquitectura explicada pieza a pieza:

- [`moto-routes-web/README.md`](moto-routes-web/README.md): la URL como estado, la cancelación de peticiones y cómo se usa cada componente reutilizable.
- [`moto-routes-dashboard/README.md`](moto-routes-dashboard/README.md): flujo de datos, patrones de Angular, la sesión, el sistema de diseño y cómo añadir una entidad.
- [`moto-routes-api/README.md`](moto-routes-api/README.md): capas, modelo, endpoints, permisos, validación y errores.
- [`moto-routes-auth/README.md`](moto-routes-auth/README.md): el flujo de la sesión, las claves y su rotación, y las medidas de seguridad.
- [`moto-routes-ai/README.md`](moto-routes-ai/README.md): endpoints de la IA, el mapa, el asistente y sus herramientas, y de dónde sale cada dato.

## Preparado para la API gateway

La siguiente pieza es una **API gateway**: una sola puerta de entrada que reciba todo el tráfico, termine el HTTPS y reparta cada petición a su servicio. No está hecha todavía, pero el resto ya está montado para que entre sin tocar ni los frontales ni la lógica de los servicios.

```mermaid
flowchart LR
    N["Navegador<br/>web y panel"] -- "HTTPS<br/>un solo dominio" --> G{{"API gateway"}}
    G -- "/api" --> B["API · 3000"]
    G -- "/auth" --> U["Auth · 3002"]
    G -- "/ai" --> I["IA · 3001"]
    G -. "JWKS (caché)" .-> U
    B -. "JWKS (caché)" .-> U
    subgraph red["Red interna: solo la gateway llega a los servicios"]
        B
        U
        I
    end
    classDef gw fill:#c6f04d,stroke:#0c2419,color:#0c2419,stroke-width:2px
    classDef app fill:#0c2419,stroke:#c6f04d,color:#e8f3ec,stroke-width:2px
    classDef client fill:#e8f3ec,stroke:#1b7a4e,color:#0c2419
    class G gw
    class B,U,I app
    class N client
    style red fill:#f4f9f1,stroke:#1b7a4e,stroke-dasharray:4 4,color:#0c2419
```

### Lo que ya está listo

| Pieza | Cómo está hoy | Por qué le sirve a la gateway |
|---|---|---|
| **Un prefijo por servicio** | `/api` (API), `/auth` (auth) y `/ai` (IA), cada uno con su `/health` | La gateway enruta por prefijo, sin reescribir rutas, y sabe si cada servicio está vivo |
| **Los frontales no saben de puertos** | La web y el panel llaman a `/api`, `/auth` y `/ai` en su mismo origen. En desarrollo los reparte `proxy.conf.json`, que hace ya de gateway | Montarla solo cambia a quién apunta el proxy: ni una línea de Angular |
| **Tokens que cualquiera comprueba** | Auth firma con RS256 y publica la clave pública en `/auth/.well-known/jwks.json`, con `kid`, emisor (`routly-auth`) y audiencia (`routly`) | La gateway puede rechazar un token malo en la puerta con el mismo JWKS, sin secretos compartidos ni llamar a auth en cada petición |
| **Rotar la clave sin cortes** | `JWT_PREVIOUS_PUBLIC_KEY_FILE` sigue publicando la clave anterior mientras viven sus tokens | La gateway y la API recogen la nueva sola: el `kid` del token dice cuál usar |
| **Cookies pensadas para un solo dominio** | `routly_session` con `Path=/` y `routly_refresh` con `Path=/auth`, `SameSite=Strict`, y `__Secure-` con HTTPS | Detrás de la gateway todo es el mismo origen: el refresh solo viaja a auth |
| **Detrás de un proxy** | `TRUST_PROXY` en la API, auth y la IA: leen la IP, el protocolo y el host de `X-Forwarded-*` | El límite de intentos cuenta la IP real y la comprobación CSRF del `Origin` sigue funcionando |
| **Orígenes permitidos** | `CORS_ORIGIN` en la API y en auth | Con todo en un dominio no hace falta CORS; si un frontal va aparte, se configura en un sitio |
| **La API no se fía de nadie** | Comprueba ella misma cada token, el usuario, el rol y la propiedad | Si alguien llega a la API saltándose la gateway, no gana nada |

### Qué hará la gateway

1. **Ser la única entrada**: HTTPS, un solo dominio y los servicios en una red interna, sin puertos abiertos fuera.
2. **Enrutar por prefijo**: `/api` → 3000, `/auth` → 3002, `/ai` → 3001, y servir la web y el panel.
3. **Comprobar el token en la puerta** con el JWKS de auth, para cortar antes lo que no lleva sesión válida. La API lo seguirá comprobando (cuesta microsegundos) y seguirá decidiendo los permisos.
4. **Límites y logs comunes**: un límite de peticiones global y un registro de todo el tráfico en un solo sitio, sin cabeceras `Cookie` ni `Authorization`.

Al montarla, cada servicio solo necesita `TRUST_PROXY=1`, `COOKIE_SECURE=true` y, en la API, `AUTH_JWKS_URL` apuntando a auth por la red interna.

## Puesta en marcha

> [!NOTE]
> Necesitas **Node.js 20.19 o superior** y **MongoDB** en marcha en local. Nada más: los scripts de la raíz solo usan Node.

### Arrancar todo con un comando

```bash
git clone https://github.com/Mauro-vs/Routly.git
cd Routly
```

```bash
cp moto-routes-api/.env.example moto-routes-api/.env
cp moto-routes-ai/.env.example moto-routes-ai/.env
```

El servicio de auth no necesita `.env` en desarrollo (usa los valores de `moto-routes-auth/.env.example`), y su clave privada (`moto-routes-auth/keys/private.pem`, que no se sube) la crea `npm run dev` la primera vez.

En `moto-routes-ai/.env` va la clave de la IA (`AI_API_KEY`), que es gratis y sin tarjeta: se crea en [console.groq.com/keys](https://console.groq.com/keys). Sin clave todo arranca igual: el tiempo y las paradas salen, y los textos de la IA y el asistente esperan a que la pongas.

```bash
npm run seed
```

```bash
npm run dev
```

`npm run dev` arranca el **servicio de auth** (`http://localhost:3002`), la **API** (`http://localhost:3000`), el **servidor de IA** (`http://localhost:3001`), el **panel** (`http://localhost:4200`) y la **web pública** (`http://localhost:4300`) en una sola terminal:

- **Antes de arrancar comprueba** lo que suele fallar: la versión de Node, que MongoDB responde, que existe el `.env` de la API, que auth tiene su clave (si no, la crea) y que los puertos están libres. Si algo falla, dice qué y cómo arreglarlo, y no arranca nada.
- **Instala solo** las dependencias (`npm install`) de las aplicaciones que aún no las tienen.
- **Cada línea lleva su nombre** (`[auth]`, `[api]`, `[ai]`, `[panel]`, `[web]`) y **los errores salen en rojo**. Cuando todas responden, enseña sus URL.
- **Si una se cae**, sale un bloque rojo con su nombre y las últimas líneas del error, y las demás siguen.
- **`Ctrl+C` lo para todo**, sin dejar procesos colgados. Los cambios en el código se recargan solos.

`npm run seed` solo hace falta la primera vez, o para volver a los datos de ejemplo.

> [!WARNING]
> `npm run seed` vacía todas las colecciones de la base de datos del `.env` de la API y carga los datos de ejemplo. Por eso pregunta antes de seguir. Úsalo solo en desarrollo.

| Comando (desde la raíz) | Qué hace |
|---|---|
| `npm run dev` | Auth, la API, el servidor de IA, el panel y la web a la vez |
| `npm run dev -- auth api panel` | Solo los que se digan (`auth`, `api`, `ai`, `panel`, `web`). El panel necesita auth y la API para iniciar sesión |
| `npm test` | Los tests de todas, uno detrás de otro, con una tabla al final. Solo enseña lo que falla |
| `npm test -- panel --verbose` | Los de una, con toda la salida |
| `npm run check` | Lo de antes de un commit: compila el panel y la web y pasa todos los tests |
| `npm run seed` | Los datos de ejemplo, después de confirmarlo (`-- --yes` para no preguntar) |

Los scripts están en [`scripts/`](scripts) y solo usan Node: no hace falta instalar nada en la raíz.

<details>
<summary><b>Arrancar cada parte por separado</b></summary>

**1. El servicio de auth** en `http://localhost:3002`

```bash
cd moto-routes-auth
npm install
npm run keys
npm run dev
```

**2. La API** en `http://localhost:3000`, en otra terminal

```bash
cd moto-routes-api
npm install
npm run dev
```

**3. El servidor de IA** en `http://localhost:3001`, en otra terminal

```bash
cd moto-routes-ai
npm install
npm run dev
```

**4. El panel** en `http://localhost:4200`, en otra terminal

```bash
cd moto-routes-dashboard
npm install
npm start
```

**5. La web pública** en `http://localhost:4300`, en otra terminal

```bash
cd moto-routes-web
npm install
npm start
```

</details>

## Hoja de ruta

El catálogo está hecho de punta a punta (API, panel y tests), la web pública ya enseña las salidas con su mapa y su IA, y la sesión vive en su propio servicio. Lo siguiente es la API gateway y, después, las reservas: la API ya cuenta las plazas reservadas de cada salida y la web tiene preparado el botón y el servicio.

| Estado | Bloque | Dónde | Para qué |
|:---:|---|---|---|
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Rutas | `routes` | Catálogo de rutas, con categoría, origen, destino, puntos de paso y portada |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Catálogo | `categories`, `locations` | Tipos de ruta y ubicaciones con coordenadas |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Cuentas | `roles`, `users`, `profiles`, `hosts` | Administradores, riders y anfitriones con perfil público |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Experiencias | `experiences`, `departures` | Salidas guiadas sobre una ruta, con fechas, plazas, precio y SKU |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Contenido | `images` | Galería de imágenes para rutas, usuarios, anfitriones y el resto |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Garaje | `bikes` | Las motos de cada usuario con su ficha, modificaciones y fotos, y la moto con la que guía cada anfitrión |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Web pública | `/api/shop` | Home, Shop y detalle con la elección de salida |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Routly IA | `/ai` | El bloque Routly IA del detalle, el mapa del recorrido y el asistente, en un servidor aparte sin base de datos |
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Auth | `/auth`, `sessions` | Servicio propio con RS256 + JWKS, cookies `httpOnly` y refresh rotatorio; el panel solo para admin, y el perfil y el garaje para cada usuario |
| ![siguiente](https://img.shields.io/badge/siguiente-c6f04d?style=flat-square&labelColor=0c2419) | API gateway | | Una sola entrada para todo, con HTTPS, enrutado por prefijo y el token comprobado en la puerta ([cómo está preparada](#preparado-para-la-api-gateway)) |
| ![preparado](https://img.shields.io/badge/preparado-3f7a5c?style=flat-square) | Reservas | `bookings` | Plazas reservadas en cada salida y el botón "Reservar" listos; falta la colección |
| ![más adelante](https://img.shields.io/badge/más_adelante-7b8a81?style=flat-square) | Comunidad | `reviews` | Valoraciones |

## Autor

Hecho por **Mauro** como proyecto del módulo de Desarrollo Web en Entorno Servidor, en 2º de DAW.

Se publica bajo licencia [MIT](LICENSE): puedes usar, copiar y modificar el código siempre que mantengas el aviso de copyright.

<p align="right"><a href="#top">Volver arriba</a></p>
