import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeWeather, warningsOf } from "./weatherCodes.js";

describe("weatherCodes", () => {
  it("traduce los códigos de la OMM y avisa si no conoce uno", () => {
    assert.deepEqual(describeWeather(63), { label: "Lluvia", icon: "rain" });
    assert.deepEqual(describeWeather(1234), { label: "Sin datos", icon: "unknown" });
  });

  it("avisa de lo que importa en moto: lluvia, frío, calor, viento y tormenta", () => {
    const calm = { code: 1, max: 24, min: 11, precipitation: 0, rainChance: 10, wind: 15 };
    assert.deepEqual(warningsOf(calm), []);
    assert.deepEqual(warningsOf({ ...calm, rainChance: 70 }), ["rain"]);
    assert.deepEqual(warningsOf({ ...calm, min: 2, max: 36 }), ["cold", "heat"]);
    assert.deepEqual(warningsOf({ ...calm, code: 95, wind: 60 }), ["storm", "wind"]);
  });
});
