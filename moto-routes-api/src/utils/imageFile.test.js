import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fakeJpeg, fakePng, fakeWebp } from "../testing/images.js";
import { readImageInfo } from "./imageFile.js";

describe("readImageInfo", () => {
  it("reconoce JPEG, PNG y WebP por sus bytes y lee su tamaño", () => {
    assert.deepEqual(readImageInfo(fakeJpeg(1600, 1067)), {
      type: "jpeg",
      mimetype: "image/jpeg",
      extension: "jpg",
      width: 1600,
      height: 1067,
    });
    assert.deepEqual(
      readImageInfo(fakePng(800, 600)),
      { type: "png", mimetype: "image/png", extension: "png", width: 800, height: 600 },
    );
    assert.deepEqual(
      readImageInfo(fakeWebp(1600, 900)),
      { type: "webp", mimetype: "image/webp", extension: "webp", width: 1600, height: 900 },
    );
  });

  it("el SOF de un JPEG puede venir después de segmentos grandes (EXIF)", () => {
    assert.equal(readImageInfo(fakeJpeg(40, 30, 5000)).width, 40);
  });

  it("si es una imagen pero no se lee el tamaño, width y height van a null", () => {
    const truncated = fakeJpeg(40, 30).subarray(0, 10);
    assert.deepEqual(
      readImageInfo(truncated),
      { type: "jpeg", mimetype: "image/jpeg", extension: "jpg", width: null, height: null },
    );
  });

  it("lo que no es JPEG, PNG ni WebP es null, se llame como se llame", () => {
    assert.equal(readImageInfo(Buffer.from("esto es un .txt renombrado a .jpg")), null);
    assert.equal(readImageInfo(Buffer.from("GIF89a......")), null);
    assert.equal(readImageInfo(Buffer.from("RIFF....WAVEfmt ")), null);
    assert.equal(readImageInfo(Buffer.alloc(0)), null);
  });
});
