/*
 * Qué imagen es un archivo, mirando sus bytes y no su nombre ni el Content-Type que manda el
 * cliente (que se pueden inventar). Solo JPEG, PNG y WebP, y su ancho y alto leídos de la
 * cabecera, sin librerías de imagen.
 */
import { fieldError, withCode } from "./errors.js";

/** 400 INVALID_IMAGE: lo que ha llegado en el campo photo no es una foto que se acepte. */
export const invalidImage = () =>
  withCode(fieldError("photo", "photo must be a JPEG, PNG or WebP image"), "INVALID_IMAGE");

export const IMAGE_TYPES = Object.freeze({
  jpeg: { mimetype: "image/jpeg", extension: "jpg" },
  png: { mimetype: "image/png", extension: "png" },
  webp: { mimetype: "image/webp", extension: "webp" },
});

const startsWith = (buffer, bytes, offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((byte, index) => buffer[offset + index] === byte);
const ascii = (text) => [...text].map((char) => char.charCodeAt(0));

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

// Los marcadores SOF (Start Of Frame) de JPEG, que llevan el tamaño: C0-CF menos C4, C8 y CC
const isStartOfFrame = (marker) => marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

function jpegSize(buffer) {
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    // Relleno (varios FF seguidos) y marcadores sin longitud
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // fin, o empiezan los datos sin haber visto SOF
    if (isStartOfFrame(marker)) {
      if (offset + 9 > buffer.length) return null;
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

function pngSize(buffer) {
  if (buffer.length < 24 || !startsWith(buffer, ascii("IHDR"), 12)) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function webpSize(buffer) {
  if (buffer.length < 30) return null;
  const chunk = buffer.toString("ascii", 12, 16);
  // Con pérdida: después de la etiqueta del frame (3 bytes) y el código 9D 01 2A
  if (chunk === "VP8 " && startsWith(buffer, [0x9d, 0x01, 0x2a], 23)) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  // Sin pérdida: firma 2F y luego 14 bits de ancho - 1 y 14 de alto - 1
  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  // Extendido: ancho - 1 y alto - 1 en 24 bits cada uno
  if (chunk === "VP8X") {
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/**
 * El tipo de imagen por su firma, y su tamaño si se puede leer: { type, mimetype, extension,
 * width, height } (width y height a null si no). null si no es JPEG, PNG ni WebP.
 */
export function readImageInfo(buffer) {
  let type;
  let size;
  if (startsWith(buffer, JPEG_SIGNATURE)) {
    type = "jpeg";
    size = jpegSize(buffer);
  } else if (startsWith(buffer, PNG_SIGNATURE)) {
    type = "png";
    size = pngSize(buffer);
  } else if (startsWith(buffer, ascii("RIFF")) && startsWith(buffer, ascii("WEBP"), 8)) {
    type = "webp";
    size = webpSize(buffer);
  } else {
    return null;
  }
  const valid = size && size.width > 0 && size.height > 0;
  return { type, ...IMAGE_TYPES[type], width: valid ? size.width : null, height: valid ? size.height : null };
}
