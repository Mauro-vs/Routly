# moto-routes-auth

El servicio de autenticación de Routly: registro, login y sesiones. **Es el único que conoce las
contraseñas y el único que firma tokens.** La API, la IA y la futura gateway solo los comprueban, con
su clave pública.

- Puerto **3002**. Todo cuelga de `/auth` (la API de `/api` y la IA de `/ai`): el proxy de Angular, y
  la futura gateway, mandan cada prefijo a su servicio.
- Mismo stack que la API: Node 20.19+, Express 5, Zod, Mongoose, argon2, helmet y
  express-rate-limit, en JS ESM. Los tokens con [jose](https://github.com/panva/jose).
- Misma base de datos que la API (`moto_routes`). Los usuarios y los roles son de la API; este
  servicio solo escribe la contraseña (`passwordHash`), `tokenVersion`, el alta del registro y sus
  colecciones `sessions` y `revokedtokens`.

## Arrancar

```bash
cd moto-routes-auth
npm install
copy .env.example .env      # en Linux o macOS: cp .env.example .env
npm run keys                # crea keys/private.pem (una vez; no se sube)
npm run dev
```

MongoDB tiene que estar en marcha, con los roles del seed de la API (`npm run seed` en la raíz).
Desde la raíz, `npm run dev` lo arranca con lo demás (y crea la clave si falta), y `npm test -- auth`
pasa sus tests.
Swagger: http://localhost:3002/auth/docs (solo fuera de producción).

## Endpoints

Responden los errores con el formato de la API (`{ statusCode, error, message, code?, details? }`).

| Método y ruta | Qué hace |
| --- | --- |
| `POST /auth/register` | Crea la cuenta (siempre rider, con su perfil vacío) y abre sesión. `{ name, email, password }`. 201 |
| `POST /auth/login` | Abre sesión. `{ email, password }`. El mismo 401 si el correo no existe, la contraseña no es o la cuenta está desactivada |
| `POST /auth/refresh` | Con la cookie `routly_refresh`: la cambia por otra y da un token de acceso nuevo. 401 si no vale (y borra las cookies) |
| `POST /auth/logout` | Cierra esta sesión. Vale con el refresh, con el token de acceso o con los dos, así que se puede salir con el de acceso caducado. 204 |
| `POST /auth/logout-all` | Cierra todas las sesiones del usuario. 204 |
| `GET /auth/me` | `{ id, name, email, role }` |
| `PATCH /auth/password` | `{ currentPassword, newPassword }`. Cierra las demás sesiones y renueva esta |
| `GET /auth/.well-known/jwks.json` | La clave pública (JWKS) |
| `GET /auth/health` (y `/health`) | `{ ok: true }` |

Una sesión responde `{ tokenType, expiresIn, refreshExpiresIn, user }` (`refreshExpiresIn`: los segundos que se puede renovar con `/auth/refresh`) y deja dos cookies. El token de acceso va también
en el body (`token`) fuera de producción, para Swagger y Postman (`TOKEN_IN_BODY`).

## Cómo funcionan los tokens

**Token de acceso**: JWT **RS256** de 15 min, en la cookie httpOnly `routly_session` con `Path=/`
(llega a `/api`, `/ai` y `/auth` desde el mismo origen), o en `Authorization: Bearer`. Lleva `sub`,
`role`, `tv` (tokenVersion), `sid` (la sesión), `jti`, `iss: routly-auth`, `aud: routly`, `iat` y `exp`,
y en la cabecera el `kid` de la clave. Sin correo ni nombre: un JWT se lee sin clave.

**Refresh**: 32 bytes aleatorios en la cookie httpOnly `routly_refresh` con `Path=/auth` (solo lo ve
este servicio). En la base de datos solo su hash (`sessions`, con TTL). Cada uso lo gasta y emite el
siguiente de la misma familia. Si llega uno ya gastado (pasados 10 s de gracia para dos pestañas a la
vez), alguien lo ha copiado: se cierran todas las sesiones del usuario.

**Comprobarlos desde otro servicio**: con la clave pública del JWKS, sin ningún secreto compartido:

```js
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL("http://localhost:3002/auth/.well-known/jwks.json"));
const { payload } = await jwtVerify(token, jwks, { algorithms: ["RS256"], issuer: "routly-auth", audience: "routly" });
```

`jose` guarda el JWKS en caché y no lo vuelve a pedir más de una vez cada 30 s aunque lleguen `kid`
desconocidos. Quien comprueba tiene que fijar siempre el algoritmo, `iss` y `aud`.

**Quién lo usa**: la API comprueba así los tokens (`AUTH_JWKS_URL` en su `.env`) y ya no tiene login
propio. El panel llama a `/auth` por su proxy (en desarrollo, `proxy.conf.json` lo manda al 3002) y,
cuando la API responde `401 TOKEN_EXPIRED`, pide otro token a `/auth/refresh` y repite la petición.

**Cerrar sesiones**: subir `tokenVersion` del usuario invalida sus tokens de acceso (la API lo mira
en cada petición) y sus refresh. Lo hacen el logout-all, el cambio de contraseña, un refresh
reutilizado y, desde la API, desactivar o eliminar un usuario.

## Seguridad

- La clave privada nunca se sube (`keys/` está en `.gitignore`), nunca se loguea y en producción
  llega por `JWT_PRIVATE_KEY`. Tiene que ser RSA de 2048 bits o más, si no, no arranca.
- Solo RS256: ni `alg: none` ni HS256 (el ataque de firmar con la clave pública como secreto). La
  clave sale siempre del JWKS propio, nunca de lo que diga el token (`jku`, `jwk`).
- CSRF: cualquier POST o PATCH con una cabecera `Origin` de fuera es un 403, y las cookies son
  `SameSite=strict`.
- Límite de intentos: login 10 fallos por IP y 5 por correo cada 15 min, registro 10 por IP y
  refresh 60 por IP.
- Las respuestas con tokens llevan `Cache-Control: no-store`, y morgan no escribe cabeceras en los
  logs (ni `Cookie` ni `Authorization`).
- Al abrir sesión se borra la cookie vieja de la API (`Path=/api`), que si no taparía a la nueva.
- En producción: cookies `__Secure-` y `Secure` obligatorias, sin token en el body y sin Swagger.

## Rotar la clave

1. Copia `keys/public.pem` a `keys/previous-public.pem` y pon `JWT_PREVIOUS_PUBLIC_KEY_FILE=keys/previous-public.pem`.
2. `npm run keys -- --force` y reinicia: los tokens nuevos llevan el `kid` nuevo, y los de antes
   siguen valiendo porque su clave sigue en el JWKS.
3. Pasados 15 min (lo que dura un token de acceso), quita `JWT_PREVIOUS_PUBLIC_KEY_FILE`.

Si la clave se ha filtrado, sáltate el paso 1: los tokens firmados con ella (también los que haya
fabricado quien la tenga) dejan de valer al momento, y los usuarios siguen dentro gracias al refresh.

## Tests

```bash
npm test
```

Sin red ni MongoDB: los repositorios se cambian por unos en memoria (`src/testing/`) y las claves se
generan al vuelo. Para probar además los repositorios de verdad contra MongoDB (crea una base de datos
temporal y la borra al acabar):

```bash
TEST_MONGODB_URI=mongodb://localhost:27017 npm test
# PowerShell: $env:TEST_MONGODB_URI="mongodb://localhost:27017"; npm test
```
