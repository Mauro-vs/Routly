import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createRemoteJWKSet } from "jose";
import { deadUrl, startStack } from "../testing/helpers.js";
import { signToken } from "../testing/tokens.js";

const PROTECTED = "/api/users";
const PUBLIC = "/api/shop/experiences";

describe("el token en la puerta", () => {
  let stack;
  const tokens = {};
  before(async () => {
    stack = await startStack();
    tokens.valid = await signToken();
    tokens.expired = await signToken({ expiresIn: -120 });
    tokens.foreign = await signToken({ foreignKey: true });
    tokens.issuer = await signToken({ issuer: "otro" });
    tokens.audience = await signToken({ audience: "otra" });
  });
  after(() => stack.close());

  const reached = () => stack.api.requests.length;
  const as = {
    cookie: (token) => ({ cookie: `routly_session=${token}` }),
    secureCookie: (token) => ({ cookie: `__Secure-routly_session=${token}` }),
    bearer: (token) => ({ authorization: `Bearer ${token}` }),
  };

  async function call(path, headers, method = "GET") {
    const before = reached();
    const response = await stack.gateway.request(path, { method, headers });
    return { ...response, forwarded: reached() > before };
  }

  describe("ruta que exige sesión", () => {
    it("sin token: 401 sin code, y no llega a la API", async () => {
      const { status, body, forwarded } = await call(PROTECTED, {});
      assert.equal(status, 401);
      assert.deepEqual(body, { statusCode: 401, error: "Unauthorized", message: "Authentication required" });
      assert.equal(forwarded, false);
    });

    for (const [how, header] of Object.entries(as)) {
      it(`token válido por ${how}: pasa`, async () => {
        const { status, forwarded } = await call(PROTECTED, header(tokens.valid));
        assert.equal(status, 200);
        assert.equal(forwarded, true);
      });

      it(`token caducado por ${how}: 401 TOKEN_EXPIRED (el frontal renueva)`, async () => {
        const { status, body, forwarded } = await call(PROTECTED, header(tokens.expired));
        assert.equal(status, 401);
        assert.equal(body.code, "TOKEN_EXPIRED");
        assert.equal(body.message, "Authentication required");
        assert.equal(forwarded, false);
      });

      it(`firma mala, otro emisor, otra audiencia o basura por ${how}: 401 TOKEN_INVALID`, async () => {
        for (const token of [tokens.foreign, tokens.issuer, tokens.audience, "a.b.c", "no-es-un-jwt"]) {
          const { status, body, forwarded } = await call(PROTECTED, header(token));
          assert.equal(status, 401, token);
          assert.equal(body.code, "TOKEN_INVALID", token);
          assert.equal(forwarded, false);
        }
      });
    }

    it("Authorization que no es Bearer: 401 TOKEN_INVALID", async () => {
      const { status, body } = await call(PROTECTED, { authorization: `Basic ${tokens.valid}` });
      assert.equal(status, 401);
      assert.equal(body.code, "TOKEN_INVALID");
    });

    it("manda la cabecera Authorization sobre la cookie, como la API", async () => {
      const { status, body } = await call(PROTECTED, { ...as.bearer(tokens.expired), ...as.cookie(tokens.valid) });
      assert.equal(status, 401);
      assert.equal(body.code, "TOKEN_EXPIRED");
    });

    it("cualquier escritura en /api la exige", async () => {
      for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
        const { status } = await call("/api/routes/1", {}, method);
        assert.equal(status, 401, method);
      }
    });

    it("no distingue mayúsculas ni codificación (como Express)", async () => {
      for (const path of ["/api/USERS", "/api/%75sers", "/api/routes/Deleted"]) {
        const { status } = await call(path, {});
        assert.equal(status, 401, path);
      }
    });

    it("no mira el rol: un rider en /api/users pasa la puerta (el 403 es cosa de la API)", async () => {
      const { status, forwarded } = await call(PROTECTED, as.cookie(await signToken({ role: "rider" })));
      assert.equal(status, 200);
      assert.equal(forwarded, true);
    });

    it("lo marca en el registro", async () => {
      const logged = await startStack({ env: { ACCESS_LOG: "true" } });
      try {
        await logged.gateway.request(PROTECTED);
        assert.equal(logged.gateway.logs.at(-1).blockedBy, "auth");
        assert.equal(logged.gateway.logs.at(-1).service, null);
      } finally {
        await logged.close();
      }
    });
  });

  describe("ruta pública", () => {
    it("sin token, pasa", async () => {
      assert.equal((await call(PUBLIC, {})).forwarded, true);
    });

    it("con una cookie caducada o mala pasa como anónimo, y la cookie llega igual", async () => {
      for (const token of [tokens.expired, tokens.foreign, "basura"]) {
        const { status, body, forwarded } = await call(PUBLIC, as.cookie(token));
        assert.equal(status, 200);
        assert.equal(forwarded, true);
        assert.equal(body.headers.cookie, `routly_session=${token}`);
      }
    });

    it("con una cabecera Authorization mala, 401 como en la API", async () => {
      assert.equal((await call(PUBLIC, as.bearer(tokens.expired))).body.code, "TOKEN_EXPIRED");
      assert.equal((await call(PUBLIC, as.bearer(tokens.foreign))).body.code, "TOKEN_INVALID");
    });

    it("el login, el refresh, el JWKS, la IA y /health no piden sesión", async () => {
      for (const [path, method] of [
        ["/auth/login", "POST"],
        ["/auth/register", "POST"],
        ["/auth/refresh", "POST"],
        ["/auth/logout", "POST"],
        ["/auth/.well-known/jwks.json", "GET"],
        ["/ai/chat", "POST"],
        ["/api/docs", "GET"],
        ["/health", "GET"],
      ]) {
        const { status } = await stack.gateway.request(path, { method });
        assert.equal(status, 200, `${method} ${path}`);
      }
    });

    it("un OPTIONS (CORS) nunca la pide", async () => {
      assert.equal((await call(PROTECTED, {}, "OPTIONS")).status, 200);
    });
  });

  describe("si auth no responde", () => {
    let down;
    before(async () => {
      const jwks = createRemoteJWKSet(new URL(`${await deadUrl()}/auth/.well-known/jwks.json`), { timeoutDuration: 500 });
      down = await startStack({ keys: jwks });
    });
    after(() => down.close());

    it("una ruta que exige sesión da 503 (no 401: el frontal no debe cerrar la sesión)", async () => {
      const { status, body } = await down.gateway.request(PROTECTED, { headers: as.cookie(tokens.valid) });
      assert.equal(status, 503);
      assert.equal(body.message, "Authentication service unavailable");
    });

    it("lo público sigue funcionando, también con cookie o con Bearer", async () => {
      assert.equal((await down.gateway.request(PUBLIC, { headers: as.cookie(tokens.valid) })).status, 200);
      assert.equal((await down.gateway.request(PUBLIC, { headers: as.bearer(tokens.valid) })).status, 200);
    });
  });
});
