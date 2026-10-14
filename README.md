<a id="top"></a>

<img src="docs/assets/banner.svg" alt="Routly. Rutas en moto, ordenadas y listas para rodar." width="100%">

<p align="center">
  <img src="https://img.shields.io/badge/Angular-20-1b7a4e?style=flat-square&logo=angular&logoColor=c6f04d&labelColor=0c2419" alt="Angular 20">
  <img src="https://img.shields.io/badge/TypeScript-strict-1b7a4e?style=flat-square&logo=typescript&logoColor=c6f04d&labelColor=0c2419" alt="TypeScript estricto">
  <img src="https://img.shields.io/badge/Node.js-20+-1b7a4e?style=flat-square&logo=nodedotjs&logoColor=c6f04d&labelColor=0c2419" alt="Node.js 20 o superior">
  <img src="https://img.shields.io/badge/Express-5-1b7a4e?style=flat-square&logo=express&logoColor=c6f04d&labelColor=0c2419" alt="Express 5">
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9-1b7a4e?style=flat-square&logo=mongodb&logoColor=c6f04d&labelColor=0c2419" alt="MongoDB con Mongoose 9">
  <img src="https://img.shields.io/badge/licencia-MIT-1b7a4e?style=flat-square&labelColor=0c2419" alt="Licencia MIT">
</p>

<p align="center">
  <a href="#míralo-en-marcha"><b>Demo</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#lo-que-ya-funciona"><b>Funciones</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#cómo-está-hecho"><b>Arquitectura</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#puesta-en-marcha"><b>Arrancar</b></a>&nbsp;&nbsp;/&nbsp;&nbsp;<a href="#hoja-de-ruta"><b>Hoja de ruta</b></a>
</p>

Routly reúne las mejores carreteras para ir en moto en un catálogo cuidado. Cada ruta tiene la misma información: origen, destino, distancia, duración y dificultad. El siguiente paso son las salidas en grupo organizadas por anfitriones locales.

Las buenas rutas suelen estar repartidas en foros, grupos de mensajería y tracks sueltos. Routly las ordena para que elegir una sea cuestión de segundos.

## Míralo en marcha

<img src="docs/demo.gif" alt="Demo del panel: se activa una ruta, se busca por nombre, se cambia a la vista de tabla y se abre la papelera" width="100%">

<sub>El panel funcionando contra la API real: activar una ruta, buscar, cambiar a la vista de tabla y abrir la papelera.</sub>

## Lo que ya funciona

Hoy Routly es el **panel de administración** del catálogo y la **API** que lo sirve.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/icon-catalog.svg" width="44" alt=""><br>
      <b>Catálogo completo</b><br>
      Crea, edita y elimina rutas. Cada una tiene su propia dirección, como <code>/routes/costa-brava-loop-df38e5/edit</code>.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/icon-toggle.svg" width="44" alt=""><br>
      <b>Activar y desactivar al instante</b><br>
      Un interruptor oculta una ruta sin borrarla. El cambio se ve en el momento y, si el servidor falla, vuelve atrás solo.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-trash.svg" width="44" alt=""><br>
      <b>Papelera con vuelta atrás</b><br>
      Nada se borra para siempre. Las rutas eliminadas se pueden restaurar como activas o inactivas, o deshacer justo después.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-search.svg" width="44" alt=""><br>
      <b>Encontrar rápido</b><br>
      Búsqueda por título, origen o destino, filtros por estado y dificultad, y vista en tarjetas o en tabla.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-chart.svg" width="44" alt=""><br>
      <b>Resumen del catálogo</b><br>
      Rutas activas e inactivas, kilómetros totales, reparto por dificultad y últimos cambios, de un vistazo.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-errors.svg" width="44" alt=""><br>
      <b>Errores que se entienden</b><br>
      Los datos no válidos se señalan junto al campo. Los fallos de red o del servidor se explican, sin pantallas en blanco.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="docs/assets/icon-mobile.svg" width="44" alt=""><br>
      <b>Accesible y responsive</b><br>
      Contraste AA, uso completo con teclado y menú lateral desplegable en el móvil.
    </td>
    <td valign="top">
      <img src="docs/assets/icon-docs.svg" width="44" alt=""><br>
      <b>API documentada</b><br>
      Todos los endpoints se pueden probar desde Swagger, en <code>/api/docs</code>.
    </td>
  </tr>
</table>

## Capturas

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/resumen.png" alt="Resumen del catálogo"></td>
    <td width="50%"><img src="docs/screenshots/rutas-lista.png" alt="Listado de rutas en tabla"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Resumen</b>: el estado del catálogo de un vistazo</sub></td>
    <td align="center"><sub><b>Vista en tabla</b>: la ruta inactiva se distingue sin depender del color</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/papelera.png" alt="Papelera con una ruta eliminada"></td>
    <td><img src="docs/screenshots/formulario.png" alt="Formulario de nueva ruta"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Papelera</b>: restaurar con un clic</sub></td>
    <td align="center"><sub><b>Nueva ruta</b>: validación en el momento, con los mismos límites que la API</sub></td>
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

Un monorepo con dos aplicaciones independientes que se comunican por HTTP y JSON:

```mermaid
flowchart LR
    A["Panel de administración<br/>Angular 20"] -- "HTTP / JSON" --> B["API REST<br/>Express 5"]
    B -- "Mongoose" --> C[("MongoDB")]
    B -. "/api/docs" .-> D["Swagger UI"]
    classDef app fill:#0c2419,stroke:#c6f04d,color:#e8f3ec,stroke-width:2px
    classDef data fill:#1b7a4e,stroke:#0c2419,color:#ffffff
    class A,B app
    class C,D data
```

<table>
  <tr>
    <th align="left">Parte</th>
    <th align="left">Tecnología</th>
    <th align="left">Lo que la hace especial</th>
  </tr>
  <tr>
    <td><a href="moto-routes-frontend/README.md"><b>Panel</b></a></td>
    <td>Angular 20 sin zone.js, signals, TypeScript estricto</td>
    <td>Actualizaciones optimistas, carga diferida por secciones y un sistema de diseño propio en variables CSS</td>
  </tr>
  <tr>
    <td><a href="moto-routes-api/README.md"><b>API</b></a></td>
    <td>Express 5, Mongoose 9, Zod 4</td>
    <td>Arquitectura por capas, validación antes del controlador, borrado lógico reutilizable y un único formato de error</td>
  </tr>
</table>

```
Routly/
├── moto-routes-api/        API REST (Node.js + Express + MongoDB)
├── moto-routes-frontend/   Panel de administración (Angular)
├── docs/                   Demo, capturas e imágenes de los README
└── DATABASE.md             Diseño de la base de datos completa
```

Cada parte tiene su README técnico, con la arquitectura explicada pieza a pieza:

- [`moto-routes-api/README.md`](moto-routes-api/README.md): capas, modelo, endpoints, validación y errores.
- [`moto-routes-frontend/README.md`](moto-routes-frontend/README.md): flujo de datos, patrones de Angular, sistema de diseño y cómo añadir una entidad.

## Puesta en marcha

> [!NOTE]
> Necesitas **Node.js 20.19 o superior** y **MongoDB** en marcha en local.

**1. Clona el repositorio**

```bash
git clone https://github.com/Mauro-vs/Routly.git
```

**2. Arranca la API** en `http://localhost:3000`

```bash
cd Routly/moto-routes-api
npm install
cp .env.example .env
npm run seed
npm run dev
```

> [!WARNING]
> `npm run seed` borra las rutas que haya y carga cinco de ejemplo. Úsalo solo en desarrollo.

**3. Arranca el panel** en `http://localhost:4200`, en otra terminal

```bash
cd Routly/moto-routes-frontend
npm install
npm start
```

## Hoja de ruta

Las siguientes piezas siguen el mismo patrón que las rutas: papelera, estado activo y su sección en el panel, que ya aparece en el menú como "Próximamente". El diseño completo, campo a campo, está en [`DATABASE.md`](DATABASE.md).

| Estado | Bloque | Colecciones | Para qué |
|:---:|---|---|---|
| ![hecho](https://img.shields.io/badge/hecho-1b7a4e?style=flat-square) | Rutas | `routes` | Catálogo de rutas |
| ![siguiente](https://img.shields.io/badge/siguiente-c6f04d?style=flat-square) | Cuentas | `roles`, `users`, `hosts` | Administradores, riders y anfitriones con perfil público |
| ![diseñado](https://img.shields.io/badge/diseñado-0c2419?style=flat-square) | Catálogo | `categories`, `locations` | Tipos de ruta y ubicaciones con coordenadas para buscar por cercanía |
| ![diseñado](https://img.shields.io/badge/diseñado-0c2419?style=flat-square) | Experiencias | `experiences`, `departures` | Salidas guiadas sobre una ruta, con fechas, plazas y precio |
| ![diseñado](https://img.shields.io/badge/diseñado-0c2419?style=flat-square) | Contenido | `images` | Galería de imágenes para cualquier elemento |
| ![más adelante](https://img.shields.io/badge/más_adelante-7b8a81?style=flat-square) | Comunidad | `bookings`, `reviews` | Reservas y valoraciones |

## Autor

Hecho por **Mauro** como proyecto del módulo de Desarrollo Web en Entorno Servidor, en 2º de DAW.

Se publica bajo licencia [MIT](LICENSE): puedes usar, copiar y modificar el código siempre que mantengas el aviso de copyright.

<p align="right"><a href="#top">Volver arriba</a></p>
