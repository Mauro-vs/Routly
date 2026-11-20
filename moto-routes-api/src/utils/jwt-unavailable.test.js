import assert from "node:assert/strict";
import { test } from "node:test";
import { signTestToken } from "../testing/tokens.js";
import { verifyToken } from "./jwt.js";

// Cada archivo de test es su propio proceso: aquí el JWKS apunta a un puerto donde no hay nadie
process.env.AUTH_JWKS_URL = "http://127.0.0.1:9/auth/.well-known/jwks.json";

test("si el servicio de auth no responde, 503 y no 401: el token puede ser bueno", async (t) => {
  t.mock.method(console, "error", () => {});
  const token = await signTestToken({ _id: "6710a1b2c3d4e5f6a7b8c910", role: "admin" });
  await assert.rejects(verifyToken(token), { status: 503, message: "Authentication service unavailable" });
});
