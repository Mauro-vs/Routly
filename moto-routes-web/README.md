# Routly · web pública

La cara pública de Routly: el **Home**, el **Shop** y el **detalle de una experiencia**, donde un motero sin cuenta encuentra una salida guiada y elige fecha. Usa solo `/api/shop`, la tienda pública de la API (sin sesión). El panel de administración es otra aplicación, `moto-routes-frontend/`.

> Estado: **fase 6 de 7**. Están la base, los componentes reutilizables, el **Home**, el **Shop** y el **detalle** con la elección de salida. Queda el pulido (fase 7).

## El Home

`features/home/`: una carretera a sangre (la foto del tipo de carretera con más experiencias, o el paisaje de marca) y, encima, el **panel de orientación**: una fila por tipo de carretera, con cuántas experiencias tiene, que lleva a `/experiencias?categoria=<slug>`, y la búsqueda como última fila (`?buscar=`). A la derecha, el hito con el total. Debajo, tres carriles: destinos (`?ubicacion=`), tipos de carretera y guías (`?anfitrion=`).

- `HomeStore` pide los tres carruseles y el total a la vez, con un `AbortController`: al salir de la página, lo pendiente se cancela. Con error, el panel lo explica y deja reintentar.
- Composición lista + tarjeta: `app-place-rail` pinta un `ui-carousel` con un `app-place-card` por elemento. Un carril sin elementos no se pinta.
- La cabecera va transparente sobre la foto solo en el Home.

## El Shop

`features/shop/`: `/experiencias`, con la URL como fuente de verdad.

| URL | API | Qué es |
|---|---|---|
| `categoria`, `anfitrion`, `ubicacion` | `category`, `host`, `location` | Por slug, como los enlaces del Home |
| `buscar` | `search` | Palabras enteras del título y la descripción |
| `dificultad` | `difficulty` | `facil`, `media` o `dificil` |
| `con-fechas=si` | `hasDepartures=true` | Solo las que tienen salidas reservables |
| `orden` | `sort` | `proximas`, `precio`, `precio-desc`, `titulo`; sin orden, novedades (o relevancia si se busca) |
| `pagina` | `page` | 12 por página |

- `shop-query.ts` traduce la URL a los parámetros de la API, y lo que no vale en la URL se ignora.
- `ShopStore` lee la URL (`sync`) cada vez que cambia: un filtro, atrás o un enlace del Home. Las acciones (filtrar, buscar, ordenar) no tocan el estado: escriben la URL y vuelven a la primera página.
- Cada petición lleva su `AbortController`, y una nueva aborta la anterior: una respuesta vieja nunca pisa a la nueva, y lo abortado no se enseña como error. Mientras llega lo nuevo, lo anterior se ve atenuado; la primera vez, esqueletos.
- Una página que ya no existe pasa a la última, con `replaceUrl`. Un slug que no existe sale como filtro "no encontrado".
- En pantalla:
  - el pórtico: tres placas con su desplegable (Carretera, Destino, Guía) y la búsqueda;
  - debajo, cuántas hay (anunciado al lector de pantalla), la dificultad, "Solo con fechas", el orden y los filtros puestos;
  - en el móvil, la búsqueda y una hoja con los filtros (`dialog`);
  - estados de vacío (con "Quitar los filtros") y de error (con reintentar).
- Lista + tarjeta: `app-experience-list` y `app-experience-card`, con el hito kilométrico sobre la foto.

## El detalle y la elección de salida

`features/experience/`: `/experiencias/:slug?salida=<slug de la salida>`.

- `ExperienceStore` pide la experiencia y sus salidas a la vez, con su `AbortController`. Una experiencia que no existe, o que no se ve, queda como "no encontrada".
- En pantalla:
  - la galería en el carrusel;
  - el cartel de la ruta: origen y destino como placas de población, km, horas, dificultad y tipo de carretera;
  - la descripción, lo práctico (punto de encuentro, duración, idioma, participantes, moto del guía);
  - el anfitrión con su foto, su biografía y "Más salidas con…" (`?anfitrion=`).
- **Las salidas** son un grupo de radios con forma de billete: fecha, hora de salida y llegada, plazas libres (`seatsLeft`) y precio.
  - La elegida va en la URL (`?salida=`, con `replaceUrl`), con el contorno sólido y el sello lima.
  - Una completa (`isFull`) se ve, con su sello, pero no se puede elegir, tampoco si llega en la URL.
  - Sin salidas, se dice.
- **La reserva, preparada:** `core/booking/booking.service.ts` tiene la interfaz (`BookingRequest`, `Booking`, `reserve`) y `available = false`. El botón "Reservar" está deshabilitado y explica por qué (`aria-describedby`); cuando la API tenga `/api/bookings`, basta con `available = true` y la llamada.
- "Volver a las experiencias" vuelve atrás si se llegó desde la web (el Shop, con sus filtros); si no, al Shop.
- La pestaña lleva el nombre de la experiencia y la descripción, su primer párrafo (SEO). Cambiar solo `?salida=` no los pisa.

## Arrancar

Necesitas Node.js 20.19 o superior y la API en marcha en `http://localhost:3000` (ver `moto-routes-api/README.md`).

```bash
cd moto-routes-web
npm install
npm start
```

La web queda en **http://localhost:4300**. En desarrollo, `/api` llega a la API por `proxy.conf.json`, como en el panel.

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en el puerto 4300 |
| `npm test` | Los specs (Karma + Jasmine). Sin ventana: `npx ng test --watch=false --browsers=ChromeHeadless` |
| `npm run build` | La build de producción, en `dist/` |
| `npm run icons` | Regenera los iconos de `tools/generate-icons.mjs` |

## Cómo está hecha

Angular 20 como el panel: standalone, OnPush, signals y sin zone.js. TypeScript estricto, sin dependencias nuevas.

```
src/app/
├── core/
│   ├── api/            ShopApiService (con AbortSignal), los modelos de /api/shop y ApiError
│   ├── interceptors/   el tiempo de espera de las peticiones
│   └── services/       el tema y el título y la descripción de cada página (SEO)
├── layout/             la cabecera y el pie
├── shared/
│   ├── ui/             componentes reutilizables, sin saber nada de experiencias
│   └── utils/          formato de números, fechas y dinero
└── features/           home, shop, experience y la página 404, cada una en su trozo
```

- **Una feature no importa de otra**, y `shared/` no sabe de negocio: sus componentes reciben datos y emiten eventos.
- **Carga diferida por rutas:** cada pantalla es un trozo que se pide al entrar en ella.
- **La URL manda:** filtros, búsqueda, página y salida elegida van en la URL, en español: `/experiencias?categoria=&anfitrion=&ubicacion=&buscar=&pagina=&orden=`.

### Peticiones sin carreras

`ShopApiService.get(path, params, signal)` devuelve una promesa y acepta un `AbortSignal`. Quien pide crea un `AbortController` por petición y, cuando llega una nueva, hace `abort()` de la anterior:

- HttpClient no admite una señal, así que al abortar se cancela la suscripción; con `withFetch()` eso aborta el `fetch` de verdad.
- La promesa se rechaza con un `AbortError`, que se distingue con `isAbortError()` y no se enseña como fallo.
- Se pasa por HttpClient y no por `fetch` directamente para que siga valiendo el interceptor del tiempo de espera.

La búsqueda espera 300 ms desde la última tecla, en un solo sitio: el componente `ui-search-box`.

### Piezas copiadas del panel

Los tokens (`styles/tokens.css`), el icono, la marca, el esqueleto, el formato de cifras y fechas, el tema y el tiempo de espera se copian de `moto-routes-frontend`, con una línea al principio que lo dice. **Si cambian allí, se cambian aquí.** El tema usa la misma clave (`routly.theme`): quien eligió oscuro lo tiene en las dos caras.

## Componentes reutilizables (`shared/ui/`)

Todos con `input()`, `output()` o `model()`, OnPush y su spec.

### `ui-carousel`

Carrusel horizontal. Cada hijo proyectado es una tarjeta; su ancho lo pone quien lo usa.

```html
<ui-carousel label="Tipos de carretera">
  @for (category of categories(); track category._id) {
    <a class="card" [routerLink]="['/experiencias']" [queryParams]="{ categoria: category.slug }">…</a>
  }
</ui-carousel>
```

- Con el dedo, scroll nativo con `scroll-snap` (inercia, se para a mitad). Con el ratón, arrastre 1:1 que al soltar sigue con su inercia hasta la tarjeta más cercana, y no cuenta como clic.
- Botones "Anteriores" y "Siguientes" (casi una pantalla), que se desactivan en los extremos y desaparecen si no hay nada que desplazar. Con el teclado, ← y → pasan el foco a la tarjeta de al lado.
- Es una región `aria-roledescription="carrusel"` con su nombre, y las tarjetas, una lista. Con movimiento reducido, los saltos son instantáneos.
- Variables CSS: `--carousel-gap` (espacio entre tarjetas) y `--carousel-inset` (margen interior, para que las tarjetas salgan del borde con el contenido).

### `ui-search-box`

```html
<ui-search-box label="Buscar experiencias" placeholder="costa, pirineo…"
  hint="Busca palabras enteras" [value]="store.search()" (search)="store.setSearch($event)" />
```

Espera 300 ms (`SEARCH_DEBOUNCE_MS`) y emite el texto sin espacios de más, solo si cambia. Enter busca ya. El botón de borrar sale con texto, vacía, emite y devuelve el foco. El valor que llega de fuera (la URL) se enseña y no se vuelve a emitir.

### `ui-filter-group`

```html
<ui-filter-group legend="Tipo de carretera" allLabel="Cualquiera"
  [options]="[{ value: 'montana-1a2b', label: 'Montaña', count: 6 }]" [(value)]="categoria" />
```

Un filtro de una opción: radios con su leyenda, "todas" primero y cuántos resultados tiene cada opción. `value` es el elegido o `null`.

### `ui-active-filters`

```html
<ui-active-filters [filters]="[{ key: 'categoria', label: 'Montaña' }]" (remove)="quitar($event)" (clear)="quitarTodos()" />
```

Los filtros puestos, cada uno con su botón de quitar, y "Quitar los filtros". Sin filtros no enseña nada.

### `ui-pager`

```html
<ui-pager [page]="page()" [totalPages]="totalPages()" />
```

Cada página es un enlace (`?pagina=3`) que conserva el resto de parámetros; la primera no lleva parámetro. Con muchas páginas: la primera, la última y las vecinas de la actual (`pageItems`). Con una sola, no se enseña.

### `ui-photo`

```html
<ui-photo [src]="experience.coverImage?.url ?? null" [seed]="experience.slug" alt="" [priority]="true" />
```

La foto llena su caja (la proporción la pone quien la usa con `aspect-ratio`). Sin url, o si no carga, el **paisaje de la marca**: sierras y una carretera en los verdes de la paleta, distinto para cada `seed` y siempre el mismo para la misma. Con `priority`, la imagen se pide enseguida (la primera de la página).

### Copiados del panel

`ui-icon` (Phosphor, solo los de `tools/generate-icons.mjs`), `ui-brand-mark` y `ui-skeleton`.

## Diseño

Dirección "Señales de carretera": la misma marca que el panel (lima, verde de pista, banda verde oscura, Onest y el ángulo de 16°) llevada a la señalización vertical. Las piezas y sus reglas están en `moto-routes-frontend/DESIGN.md` ("Superficie pública"), y los bocetos, en `design/bocetos-web/`.
