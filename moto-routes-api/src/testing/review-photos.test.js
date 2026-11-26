import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { after, before, describe, test } from "node:test";
import { TEST_PASSWORD, seedBasics, startApi } from "./app.js";
import { fakeJpeg, fakePng, fakeWebp } from "./images.js";
// Después de app.js, que pone UPLOADS_DIR en una carpeta temporal
import { loadUploadsConfig } from "../config/uploads.js";

// Las fotos de las opiniones: subirlas, comprobar que son fotos de verdad, servirlas y quitarlas
let api;
let data;
let riders;
before(async () => {
  api = await startApi("review_photos");
  data = await seedBasics(api);
  riders = [];
  for (let i = 1; i <= 6; i++) {
    await api.post("/users", { name: `Rider ${i}`, email: `rider${i}@example.com`, password: TEST_PASSWORD, roleId: data.rider._id });
    riders.push(await api.loginAs(`rider${i}@example.com`));
  }
});
after(() => api?.stop());

const MAX_BYTES = 1_048_576;
const blob = (buffer, type) => new Blob([buffer], { type });
const webp = () => [blob(fakeWebp(1600, 900), "image/webp"), "foto.webp"];

// Los archivos que hay en la carpeta de las fotos
const files = () => {
  try {
    return readdirSync(loadUploadsConfig().reviewsDir).sort();
  } catch {
    return [];
  }
};

// Una opinión nueva de ese rider sobre el anfitrión (cada rider tiene como mucho una)
async function reviewOf(rider, extra = {}) {
  const response = await rider.post("/reviews", { targetType: "host", targetId: data.host._id, rating: 5, ...extra });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}

const upload = (client, review, photo = webp()) => client.upload(`/reviews/${review._id}/photos`, { photo });

describe("subir una foto", () => {
  let review;
  before(async () => {
    review = await reviewOf(riders[0]);
  });

  test("su autor sube una WebP: 201, con su URL y su tamaño, y el archivo en disco", async () => {
    const before = files();
    const { status, body } = await upload(riders[0], review);
    assert.equal(status, 201, JSON.stringify(body));
    assert.equal(body.photos.length, 1);
    const [photo] = body.photos;
    assert.match(photo.url, /^\/api\/uploads\/reviews\/[0-9a-f-]{36}\.webp$/);
    assert.equal(photo.width, 1600);
    assert.equal(photo.height, 900);
    assert.ok(photo._id && photo.createdAt);
    assert.equal(photo.file, undefined, "la ruta en disco no sale");
    assert.deepEqual(files(), [...before, photo.url.split("/").pop()].sort());
  });

  test("se sirve en público, con su tipo, nosniff, caché larga y CORP same-site", async () => {
    const { body } = await api.get(`/reviews/${review._id}`);
    const response = await fetch(new URL(body.photos[0].url, api.base));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("cache-control"), /max-age=31536000.*immutable/);
    assert.equal(response.headers.get("cross-origin-resource-policy"), "same-site");
    assert.equal(Buffer.from(await response.arrayBuffer()).length, fakeWebp(1600, 900).length);
  });

  test("una que no existe es el 404 de siempre, y no se listan las carpetas", async () => {
    for (const path of ["/uploads/reviews/no-existe.webp", "/uploads/reviews/", "/uploads/reviews/../app.js"]) {
      const response = await fetch(api.base + path);
      assert.equal(response.status, 404, path);
      assert.equal((await response.json()).statusCode, 404);
    }
  });

  test("un PNG que llega como image/jpeg se guarda como .png, con su tamaño", async () => {
    const { status, body } = await upload(riders[0], review, [blob(fakePng(800, 600), "image/jpeg"), "foto.jpg"]);
    assert.equal(status, 201);
    const photo = body.photos.at(-1);
    assert.match(photo.url, /\.png$/);
    assert.deepEqual([photo.width, photo.height], [800, 600]);
    assert.ok(files().includes(photo.url.split("/").pop()));
    const served = await fetch(new URL(photo.url, api.base));
    assert.equal(served.headers.get("content-type"), "image/png");
  });

  test("un .txt renombrado a .jpg: 400 INVALID_IMAGE y nada en disco", async () => {
    const before = files();
    const { status, body } = await upload(riders[0], review, [blob(Buffer.from("no soy una foto, soy un texto"), "image/jpeg"), "foto.jpg"]);
    assert.equal(status, 400);
    assert.equal(body.code, "INVALID_IMAGE");
    assert.equal(body.details[0].field, "photo");
    assert.deepEqual(files(), before);
  });

  test("lo que ni dice ser una foto (text/plain, image/gif): 400 INVALID_IMAGE y nada en disco", async () => {
    const before = files();
    for (const [content, type] of [["hola", "text/plain"], ["GIF89a", "image/gif"]]) {
      const { status, body } = await upload(riders[0], review, [blob(Buffer.from(content), type), "x"]);
      assert.equal(status, 400, type);
      assert.equal(body.code, "INVALID_IMAGE", type);
    }
    assert.deepEqual(files(), before);
  });

  test("de más de 1 MB: 413 PHOTO_TOO_LARGE y nada en disco", async () => {
    const before = files();
    const big = fakeJpeg(4000, 3000, 60_000);
    const huge = Buffer.concat([big, Buffer.alloc(MAX_BYTES)]);
    const { status, body } = await upload(riders[0], review, [blob(huge, "image/jpeg"), "grande.jpg"]);
    assert.equal(status, 413);
    assert.equal(body.code, "PHOTO_TOO_LARGE");
    assert.deepEqual(files(), before);
  });

  test("sin foto, con otro campo o con dos fotos: 400", async () => {
    const path = `/reviews/${review._id}/photos`;
    const cases = [
      await riders[0].upload(path, {}),
      await riders[0].upload(path, { imagen: webp() }),
      await riders[0].upload(path, { photo: webp(), caption: "hola" }),
      await riders[0].post(path, { photo: "no es multipart" }),
    ];
    for (const { status, body } of cases) {
      assert.equal(status, 400, JSON.stringify(body));
    }
    const form = new FormData();
    form.append("photo", ...webp());
    form.append("photo", ...webp());
    const twice = await fetch(api.base + path, { method: "POST", headers: { authorization: `Bearer ${riders[0].token}` }, body: form });
    assert.equal(twice.status, 400);
  });

  test("las fotos no se cambian por el PATCH de la opinión", async () => {
    const { status } = await riders[0].patch(`/reviews/${review._id}`, { photos: [] });
    assert.equal(status, 400);
  });
});

describe("quién sube y cuántas", () => {
  test("la opinión de otro: 403, también para el admin, y nada en disco", async () => {
    const review = await reviewOf(riders[1]);
    const before = files();
    assert.equal((await upload(riders[2], review)).status, 403);
    assert.equal((await upload(api, review)).status, 403);
    assert.deepEqual(files(), before);
  });

  test("sin sesión: 401", async () => {
    const review = await reviewOf(riders[3]);
    assert.equal((await upload(api.anonymous, review)).status, 401);
  });

  test("una opinión que no existe o está borrada: 404", async () => {
    assert.equal((await riders[4].upload("/reviews/6710a1b2c3d4e5f6a7b8c999/photos", { photo: webp() })).status, 404);
    const review = await reviewOf(riders[4]);
    assert.equal((await riders[4].patch(`/reviews/${review._id}/delete`)).status, 204);
    const before = files();
    assert.equal((await upload(riders[4], review)).status, 404);
    assert.deepEqual(files(), before);
  });

  test("la quinta foto: 409 TOO_MANY_PHOTOS, y nada en disco", async () => {
    const review = await reviewOf(riders[5]);
    for (let i = 0; i < 4; i++) assert.equal((await upload(riders[5], review)).status, 201);
    const before = files();
    const { status, body } = await upload(riders[5], review);
    assert.equal(status, 409);
    assert.equal(body.code, "TOO_MANY_PHOTOS");
    assert.deepEqual(files(), before);
    assert.equal((await api.get(`/reviews/${review._id}`)).body.photos.length, 4);
  });

  test("dos subidas a la vez con un hueco: entra una, la otra es 409 y su archivo se borra", async () => {
    // riders[2] no tiene opinión todavía (la de arriba era de riders[1])
    const review = await reviewOf(riders[2]);
    for (let i = 0; i < 3; i++) assert.equal((await upload(riders[2], review)).status, 201);
    const before = files();
    const results = await Promise.all([upload(riders[2], review), upload(riders[2], review)]);
    const statuses = results.map((result) => result.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    const { body } = await api.get(`/reviews/${review._id}`);
    assert.equal(body.photos.length, 4);
    assert.equal(files().length, before.length + 1);
  });
});

describe("quitar una foto", () => {
  let owner;
  let review;
  before(async () => {
    await api.post("/users", { name: "Rider Fotos", email: "fotos@example.com", password: TEST_PASSWORD, roleId: data.rider._id });
    owner = await api.loginAs("fotos@example.com");
    review = await reviewOf(owner);
    for (let i = 0; i < 3; i++) review = (await upload(owner, review)).body;
  });
  const fileOf = (photo) => photo.url.split("/").pop();

  test("otro rider: 403, y la foto sigue", async () => {
    const [photo] = review.photos;
    assert.equal((await riders[0].delete(`/reviews/${review._id}/photos/${photo._id}`)).status, 403);
    assert.ok(files().includes(fileOf(photo)));
  });

  test("su autor la quita: 200, sin ella, y su archivo borrado", async () => {
    const [photo] = review.photos;
    const { status, body } = await owner.delete(`/reviews/${review._id}/photos/${photo._id}`);
    assert.equal(status, 200);
    assert.equal(body.photos.length, 2);
    assert.ok(!body.photos.some((item) => item._id === photo._id));
    assert.ok(!files().includes(fileOf(photo)));
    assert.equal((await fetch(new URL(photo.url, api.base))).status, 404);
  });

  test("el admin también (la moderación)", async () => {
    const photo = review.photos[1];
    const { status, body } = await api.delete(`/reviews/${review._id}/photos/${photo._id}`);
    assert.equal(status, 200);
    assert.equal(body.photos.length, 1);
    assert.ok(!files().includes(fileOf(photo)));
  });

  test("una foto que no está: 404; un id mal formado: 400; sin sesión: 401", async () => {
    const [photo] = review.photos;
    assert.equal((await owner.delete(`/reviews/${review._id}/photos/${photo._id}`)).status, 404);
    assert.equal((await owner.delete(`/reviews/${review._id}/photos/6710a1b2c3d4e5f6a7b8c999`)).status, 404);
    assert.equal((await owner.delete(`/reviews/${review._id}/photos/no-es-un-id`)).status, 400);
    const last = (await api.get(`/reviews/${review._id}`)).body.photos[0];
    assert.equal((await api.anonymous.delete(`/reviews/${review._id}/photos/${last._id}`)).status, 401);
  });
});

describe("las fotos en la tienda", () => {
  test("cada opinión trae sus fotos con URL, summary.withPhotos las cuenta y withPhotos=true filtra", async () => {
    const all = await api.anonymous.get(`/shop/hosts/${data.host.slug}/reviews?limit=20`);
    assert.equal(all.status, 200);
    const withPhotos = all.body.data.filter((review) => review.photos.length > 0);
    assert.ok(withPhotos.length > 0);
    assert.ok(all.body.data.every((review) => Array.isArray(review.photos)));
    assert.ok(withPhotos.every((review) => review.photos.every((photo) => photo.url.startsWith("/api/uploads/reviews/"))));
    assert.equal(all.body.summary.withPhotos, withPhotos.length);

    const filtered = await api.anonymous.get(`/shop/hosts/${data.host.slug}/reviews?withPhotos=true&limit=20`);
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.pagination.total, withPhotos.length);
    assert.ok(filtered.body.data.every((review) => review.photos.length > 0));

    assert.equal((await api.anonymous.get(`/shop/hosts/${data.host.slug}/reviews?withPhotos=si`)).status, 400);
  });

  test("una opinión oculta no cuenta en withPhotos, pero sus fotos siguen en disco", async () => {
    const before = (await api.anonymous.get(`/shop/hosts/${data.host.slug}/reviews`)).body.summary.withPhotos;
    const { body: list } = await api.get(`/reviews?targetType=host&limit=50`);
    const target = list.find((review) => review.photos.length > 0 && review.isActive);
    assert.equal((await api.patch(`/reviews/${target._id}/active`, { isActive: false })).status, 200);
    const afterHide = (await api.anonymous.get(`/shop/hosts/${data.host.slug}/reviews`)).body.summary.withPhotos;
    assert.equal(afterHide, before - 1);
    assert.ok(target.photos.every((photo) => files().includes(photo.url.split("/").pop())));
  });
});
