# moto-routes-gateway

La **API gateway** de Routly: la única puerta de entrada. Recibe todo el tráfico y reparte cada petición a su servicio por el prefijo, sin reescribir la ruta.

> Estado: **fase 1** (reparto, errores, id de petición, registro y salud), todavía en HTTP. Vienen después el HTTPS y los frontales (fase 2), la comprobación del token en la puerta y los límites (fase 3), y los scripts y la documentación completa (fase 4).

| Petición | Va a |
|---|---|
| `/api/**` y `/health` | API (`API_URL`, 3000). `/health` sigue siendo el de la API: el indicador de conexión del panel lo usa |
| `/auth/**` | Auth (`AUTH_URL`, 3002) |
| `/ai/**` | IA (`AI_URL`, 3001) |
| `/gateway/health` | La propia gateway: está viva |
| `/gateway/ready` | La gateway pregunta al `/health` de los tres: 200 si contestan todos, 503 si no, con el estado de cada uno |
| Lo demás | 404 con el formato de error común |

## Arrancar

```bash
cp .env.example .env
npm install
npm run dev     # http://localhost:4000
npm test
```

Con los servicios en marcha (`npm run dev` en la raíz), prueba `http://localhost:4000/api/shop/experiences` o `http://localhost:4000/gateway/ready`.

## Qué hace con cada petición

1. **`X-Request-Id`**: respeta el del cliente si es un UUID; si no, crea uno. Llega al servicio y vuelve en la respuesta.
2. **Registro**: una línea JSON por petición (hora, id, método, ruta **sin query**, servicio, estado y ms). Nunca `Cookie`, `Authorization`, `Set-Cookie` ni cuerpos.
3. **Limpia las cabeceras**: borra los `X-Forwarded-*`, `Forwarded` y `X-Real-IP` que mande el cliente (pone los suyos) y cualquier cabecera de identidad (`X-User-*`, `X-Auth-*`...). La gateway nunca dice a los servicios quién es el usuario: la API lo comprueba con el token.
4. **Tope del cuerpo** por `Content-Length` (`MAX_BODY_BYTES`, 413). El cuerpo no se lee: se reenvía en streaming.
5. **Reenvía** con `http-proxy-middleware`: método, ruta, query, cabeceras (`Cookie` y `Authorization` incluidas) y cuerpo, tal cual. La respuesta vuelve igual: el `Set-Cookie` de auth sin tocar y el chat de la IA (SSE) evento a evento, sin buffer ni compresión.

Errores, con el mismo formato que los servicios (`{ statusCode, error, message }`):

| Caso | Respuesta |
|---|---|
| El servicio está caído | 502 `The <servicio> service is not available` |
| No contesta en `UPSTREAM_TIMEOUT_MS` (la IA, en `AI_TIMEOUT_MS`) | 504 `The <servicio> service took too long to answer` |
| Cuerpo demasiado grande | 413 |
| Ruta que no es de nadie | 404 |

Los errores del propio servicio (un 401 con su `code`, un 403...) pasan tal cual.

## Estructura

```
src/
  app.js                createApp({ config, fetch, log }): sin efectos al importarse
  server.js             lee la config y arranca
  config/env.js         la configuración, con Zod
  middlewares/          requestId, accessLog, cleanHeaders, bodyLimit, errorHandler
  proxy/serviceProxy.js el proxy de cada servicio (502, 504, SSE)
  routes/health.js      /gateway/health y /gateway/ready
  testing/helpers.js    servicios falsos (node:http en puertos libres) y la gateway de los tests
```

Los tests (`node --test`) arrancan servicios falsos que devuelven lo que les llega, así se comprueba qué reenvía la gateway sin red ni servicios reales.
