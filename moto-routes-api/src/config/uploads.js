import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { z } from "zod";

/*
 * Los archivos que suben los usuarios (hoy, las fotos de las opiniones). Se guardan en disco, no
 * en MongoDB: la base de datos solo guarda el nombre del archivo. Se lee al usarse, como
 * config/auth.js, para que los tests puedan poner su propia carpeta temporal.
 *
 *   UPLOADS_DIR             Carpeta de las subidas. Relativa a moto-routes-api o absoluta.
 *                           Por defecto, moto-routes-api/uploads (ignorada por git)
 *   REVIEW_PHOTO_MAX_BYTES  Tamaño máximo de una foto: 1048576 (1 MB). La web ya la manda reducida
 *   REVIEW_PHOTOS_MAX       Fotos por opinión como mucho: 4
 */

const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Una variable vacía (UPLOADS_DIR=) es como no ponerla
const blank = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const envSchema = z.object({
  UPLOADS_DIR: z.preprocess(blank, z.string().trim().optional()),
  REVIEW_PHOTO_MAX_BYTES: z.preprocess(blank, z.coerce.number().int().min(1024).max(10 * 1024 * 1024).default(1_048_576)),
  REVIEW_PHOTOS_MAX: z.preprocess(blank, z.coerce.number().int().min(1).max(10).default(4)),
});

/** La ruta pública de las fotos de las opiniones: /api/uploads/reviews/<archivo>. */
export const REVIEW_PHOTOS_PATH = "/api/uploads/reviews";

/** Lee y comprueba la configuración de las subidas a partir de unas variables de entorno. */
export function uploadsConfigFrom(env = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid uploads configuration (${problems})`);
  }
  const { UPLOADS_DIR, REVIEW_PHOTO_MAX_BYTES, REVIEW_PHOTOS_MAX } = parsed.data;
  const dir = path.resolve(API_ROOT, UPLOADS_DIR ?? "uploads");
  return Object.freeze({
    dir,
    reviewsDir: path.join(dir, "reviews"),
    reviewPhotoMaxBytes: REVIEW_PHOTO_MAX_BYTES,
    reviewPhotosMax: REVIEW_PHOTOS_MAX,
  });
}

let config;

/** La configuración del proceso, leída una vez. */
export function loadUploadsConfig() {
  config ??= uploadsConfigFrom();
  return config;
}

/**
 * Sirve las fotos de las opiniones en REVIEW_PHOTOS_PATH. El nombre del archivo lo pone el
 * servidor y no cambia nunca, así que se puede guardar en caché un año. Sin listado de carpeta, y
 * nosniff para que el navegador no interprete una foto como otra cosa. Cross-Origin-Resource-Policy
 * same-site (helmet pone same-origin): la web y el panel van por la gateway, en *.routly.localhost.
 * Lo que no existe sigue al 404 de siempre.
 */
export function serveUploads(app) {
  app.use(
    REVIEW_PHOTOS_PATH,
    express.static(loadUploadsConfig().reviewsDir, {
      index: false,
      dotfiles: "ignore",
      redirect: false,
      immutable: true,
      maxAge: "365d",
      setHeaders(res) {
        res.set("X-Content-Type-Options", "nosniff");
        res.set("Cross-Origin-Resource-Policy", "same-site");
      },
    }),
  );
}
