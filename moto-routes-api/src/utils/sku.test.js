import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSku, SKU_PATTERN } from "./sku.js";

test("el SKU cumple el formato RTL-DEP-AAMMDD-XXXXX", () => {
  const sku = buildSku("DEP", new Date("2026-11-08T08:00:00Z"));

  assert.match(sku, SKU_PATTERN);
  assert.equal(sku.length, 20);
  assert.ok(sku.startsWith("RTL-DEP-261108-"));
});

test("la fecha del SKU sale en hora de Madrid, no en UTC", () => {
  // 00:30 del 8 de noviembre en Madrid son las 23:30 del día 7 en UTC
  const sku = buildSku("DEP", new Date("2026-11-07T23:30:00Z"));

  assert.ok(sku.startsWith("RTL-DEP-261108-"));
});

test("el código no usa caracteres ambiguos", () => {
  const codes = Array.from({ length: 500 }, () => buildSku("DEP", new Date()).slice(-5)).join("");

  assert.doesNotMatch(codes, /[ILOU]/);
});
