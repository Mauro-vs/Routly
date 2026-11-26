import { randomUUID } from "node:crypto";
import multer from "multer";
import { loadUploadsConfig } from "../config/uploads.js";
import { createError, fieldError, withCode } from "../utils/errors.js";
import { IMAGE_TYPES, invalidImage } from "../utils/imageFile.js";

/*
 * La subida de una foto de una opinión (multipart/form-data, campo "photo"), con multer a disco.
 *
 *   - Una sola foto por petición, sin más campos, y como mucho REVIEW_PHOTO_MAX_BYTES (413).
 *   - Primera criba por el Content-Type que manda el navegador (400 INVALID_IMAGE). No basta: el
 *     service lee después los bytes del archivo (utils/imageFile.js).
 *   - El nombre en disco lo pone el servidor (un UUID); el nombre original no se usa para nada.
 *
 * Deja el archivo en req.file. Si algo falla después, el service lo borra.
 */

const EXTENSIONS = Object.fromEntries(Object.values(IMAGE_TYPES).map(({ mimetype, extension }) => [mimetype, extension]));

const tooLarge = (maxBytes) =>
  withCode(createError(`photo must be at most ${Math.round(maxBytes / 1024)} KB`, 413), "PHOTO_TOO_LARGE");

let upload;

function createUpload() {
  const { reviewsDir, reviewPhotoMaxBytes } = loadUploadsConfig();
  return multer({
    // Con la carpeta como texto, multer la crea si no existe
    storage: multer.diskStorage({
      destination: reviewsDir,
      filename: (req, file, done) => done(null, `${randomUUID()}.${EXTENSIONS[file.mimetype]}`),
    }),
    limits: { fileSize: reviewPhotoMaxBytes, files: 1, fields: 0, parts: 1 },
    fileFilter: (req, file, done) => (EXTENSIONS[file.mimetype] ? done(null, true) : done(invalidImage())),
  }).single("photo");
}

// Los errores de multer, al formato de la API
function toApiError(error) {
  if (!(error instanceof multer.MulterError)) return error;
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return tooLarge(loadUploadsConfig().reviewPhotoMaxBytes);
    case "LIMIT_UNEXPECTED_FILE":
      return fieldError(error.field || "photo", "only one file is allowed, in the field photo");
    default:
      return fieldError("photo", "send only one file, in the field photo, and nothing else");
  }
}

export function uploadReviewPhoto(req, res, next) {
  upload ??= createUpload();
  upload(req, res, (error) => {
    if (error) return next(toApiError(error));
    if (!req.file) return next(fieldError("photo", "photo is required (multipart/form-data)"));
    next();
  });
}
