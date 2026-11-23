# moto-routes-gateway

La **API gateway** de Routly: la única puerta de entrada, con HTTPS. Reparte cada petición a su servicio por el prefijo, sin reescribir la ruta, y sirve la web y el panel, cada uno en su nombre.

`npm run dev` en la raíz la arranca junto a los demás (y crea el certificado si falta); `npm test` y `npm run check` pasan también sus tests.

| Dirección | Qué es |
|---|---|
| `https://routly.localhost:4000` | La web pública |
| `https://panel.routly.localhost:4000` | El panel |

Los nombres `*.localhost` apuntan siempre a tu equipo, sin tocar el archivo `hosts`. Y como el navegador guarda las cookies por nombre (no por puerto), **la web y el panel tienen cada uno su propia sesión**: puedes estar como rider en la web y como admin en el panel a la vez.

| Petición | Va a |
|---|---|
| `/api/**` y `/health` | API (`API_URL`, 3000). `/health` sigue siendo el de la API: el indicador de conexión del panel lo usa |
| `/auth/**` | Auth (`AUTH_URL`, 3002) |
| `/ai/**` | IA (`AI_URL`, 3001) |
| `/gateway/health` | La propia gateway: está viva |
| `/gateway/ready` | La gateway pregunta al `/health` de los tres: 200 si contestan todos, 503 si no, con el estado de cada uno |
| Lo demás, en `routly.localhost` | La web: su `ng serve` (`WEB_URL`, 4300) con el live reload por WebSocket, o su build si hay `WEB_DIST` |
| Lo demás, en `panel.routly.localhost` | El panel: su `ng serve` (`PANEL_URL`, 4200) o su build (`PANEL_DIST`) |
| Lo demás, en otro nombre | 421 con el formato de error común |

## Arrancar

```bash
cp .env.example .env
npm install
npm run certs   # el certificado de desarrollo, en certs/ (no se sube)
npm run dev     # https://routly.localhost:4000 y https://panel.routly.localhost:4000
npm test
```

Con los servicios y los dos `ng serve` en marcha (`npm run dev` en la raíz), abre `https://routly.localhost:4000`, o `https://routly.localhost:4000/gateway/ready` para ver si llegan los tres servicios.

**Los servicios, detrás de la gateway**: pon `TRUST_PROXY=1` en el `.env` de auth, la API y la IA. Así leen el protocolo y el nombre de `X-Forwarded-Proto` y `X-Forwarded-Host`, la comprobación del `Origin` (CSRF) acepta `https://routly.localhost:4000` y el límite de intentos cuenta la IP real. Sin eso, el login por la gateway da **403 `Request origin not allowed`**.

### El certificado

`npm run certs` crea uno **autofirmado** para `localhost`, `routly.localhost` y `panel.routly.localhost`, válido un año. El navegador avisará la primera vez en cada nombre ("La conexión no es privada"): **Configuración avanzada → Continuar**.

Para que no avise, crea uno de confianza con [mkcert](https://github.com/FiloSottile/mkcert) en la misma ruta, y la gateway lo usa tal cual:

```bash
mkcert -install
mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost routly.localhost panel.routly.localhost 127.0.0.1 ::1
```

`HTTP_PORT=8080` abre además un puerto HTTP que solo redirige a HTTPS (a uno de nuestros nombres, nunca al que diga el `Host`). `HTTPS=false` arranca en HTTP, solo para depurar.

### Las builds en vez de `ng serve`

Con `WEB_DIST` o `PANEL_DIST` apuntando a la carpeta de su `ng build` (`../moto-routes-web/dist/moto-routes-web/browser`), la gateway sirve los archivos ella misma: los que llevan hash en el nombre con caché de un año, el resto revalidando, y cualquier ruta de la app (`/experiencias/costa`) con su `index.html`. Un archivo que no existe (`/logo.png`) es un 404.

## Qué hace con cada petición

1. **HSTS**, solo en producción (en `localhost`, con un certificado autofirmado, dejaría el navegador sin el botón de "Continuar").
2. **`X-Request-Id`**: respeta el del cliente si es un UUID; si no, crea uno. Llega al servicio y vuelve en la respuesta.
3. **Registro**: una línea JSON por petición (hora, id, método, ruta **sin query**, servicio, estado y ms). Nunca `Cookie`, `Authorization`, `Set-Cookie` ni cuerpos.
4. **Limpia las cabeceras**: borra los `X-Forwarded-*`, `Forwarded` y `X-Real-IP` que mande el cliente (pone los suyos) y cualquier cabecera de identidad (`X-User-*`, `X-Auth-*`...). La gateway nunca dice a los servicios quién es el usuario: la API lo comprueba con el token.
5. **Tope del cuerpo** por `Content-Length` (`MAX_BODY_BYTES`, 413). El cuerpo no se lee: se reenvía en streaming.
6. **Límites por IP** en `/api`, `/auth` y `/ai`: uno general (`RATE_LIMIT_MAX`, 300 por minuto) y otro más estricto para lo que gasta cuota de la IA, el chat y los textos (`AI_RATE_LIMIT_MAX`, 30 cada 10 minutos). Los frontales no cuentan. Al pasarse, 429 con `Retry-After`. Los límites del login siguen en auth.
7. **El token en la puerta** (ver abajo).
8. **Reenvía** con `http-proxy-middleware`: método, ruta, query, cabeceras (`Cookie` y `Authorization` incluidas) y cuerpo, tal cual. La respuesta vuelve igual: el `Set-Cookie` de auth sin tocar y el chat de la IA (SSE) evento a evento, sin buffer ni compresión.

## El token en la puerta

La gateway comprueba que el token es **auténtico** con la clave pública de auth (su JWKS, descargado una vez y guardado; con un `kid` nuevo lo vuelve a pedir): firma RS256, emisor, audiencia y caducidad. Lo lee como la API: primero `Authorization: Bearer`, si no la cookie `routly_session` (o `__Secure-routly_session`).

No mira la base de datos: la lista negra, que el usuario siga activo, su rol y la propiedad del recurso los sigue comprobando la API. Un rider que pide `/api/users` pasa la puerta y la API le responde 403. Y la gateway nunca dice a la API quién es el usuario: reenvía el token tal cual.

Qué rutas exigen sesión lo dice [`src/config/policies.js`](src/config/policies.js):

| Exigen sesión | Públicas |
|---|---|
| Cualquier `POST`, `PUT`, `PATCH` o `DELETE` en `/api` | El resto de `GET` de `/api`, incluidos `/api/shop` y `/api/docs` |
| Todo `/api/users`, `/api/roles` y `/api/profile` | Login, registro, refresh y logout de auth, y su JWKS |
| `GET /api/*/inactives` y `/api/*/deleted` | Toda la IA (`/ai`) |
| `GET /auth/me`, `POST /auth/logout-all` y `PATCH /auth/password` | `/health` y `/gateway/*` |

Un test (`policies.test.js`) lee las rutas de la API y de auth y falla si alguna exige sesión allí y no en la tabla, o al revés.

Responde **exactamente como la API**, porque los interceptores del panel y de la web cuentan con ello:

| | Ruta que exige sesión | Ruta pública |
|---|---|---|
| Sin token | 401 sin `code` | Pasa |
| Token válido | Pasa | Pasa |
| Caducado | 401 `TOKEN_EXPIRED` → el frontal renueva con `/auth/refresh` | Por cookie, pasa como anónimo; por `Authorization`, 401 |
| Firma mala, otro emisor o audiencia, basura | 401 `TOKEN_INVALID` → el frontal cierra la sesión | Por cookie, pasa; por `Authorization`, 401 |
| Auth no responde (sin JWKS) | 503: el token puede ser bueno, así que el frontal no cierra la sesión | Pasa: lo público no depende de auth |

En una ruta pública la cookie vieja no se borra: llega a la API, que hace su `optionalAuth`, y la renueva o la borra auth.

## Errores

Con el mismo formato que los servicios (`{ statusCode, error, message }`):

| Caso | Respuesta |
|---|---|
| El servicio está caído | 502 `The <servicio> service is not available` |
| No contesta en `UPSTREAM_TIMEOUT_MS` (la IA, en `AI_TIMEOUT_MS`) | 504 `The <servicio> service took too long to answer` |
| Cuerpo demasiado grande | 413 |
| Demasiadas peticiones | 429, con `Retry-After` |
| Token que no vale, en la puerta | 401 (ver arriba) |
| Ruta que no es de nadie | 404 |

Los errores del propio servicio (un 401 con su `code`, un 403...) pasan tal cual.

## Estructura

```
src/
  app.js                createApp({ config, fetch, log }): sin efectos al importarse
  server.js             lee la config y el certificado, y arranca
  servers.js            el servidor HTTPS (con los WebSocket) y el de redirección
  proxy/frontends.js    la web y el panel por su nombre: ng serve o su build
  config/env.js         la configuración, con Zod
  config/policies.js    qué rutas exigen sesión
  middlewares/          requestId, accessLog, cleanHeaders, bodyLimit, rateLimit, gateAuth, errorHandler
  proxy/serviceProxy.js el proxy de cada servicio (502, 504, SSE)
  routes/health.js      /gateway/health y /gateway/ready
  testing/helpers.js    servicios falsos (node:http en puertos libres) y la gateway de los tests
  testing/tokens.js     claves y tokens de prueba, como los de auth
scripts/generate-certs.js  npm run certs
```

Los tests (`node --test`) arrancan servicios falsos que devuelven lo que les llega (y un WebSocket de eco), así se comprueba qué reenvía la gateway sin red ni servicios reales.
