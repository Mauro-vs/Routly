// Piezas comunes de los comandos de la raíz (dev, test, check y seed). Solo usa Node: sin
// dependencias, para que funcionen recién clonado el repositorio.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WINDOWS = process.platform === "win32";

// ---------- Los servicios ----------

/** Las tres aplicaciones del monorepo. `ready` es la URL que responde cuando ya están en marcha. */
export const SERVICES = {
  api: {
    label: "api",
    dir: "moto-routes-api",
    dev: "npm run dev",
    port: 3000,
    ready: "http://localhost:3000/health",
    color: 36,
  },
  panel: {
    label: "panel",
    dir: "moto-routes-dashboard",
    dev: "npm start",
    port: 4200,
    ready: "http://localhost:4200/",
    color: 35,
  },
  web: {
    label: "web",
    dir: "moto-routes-web",
    dev: "npm start",
    port: 4300,
    ready: "http://localhost:4300/",
    color: 33,
  },
};

// ---------- Colores ----------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : String(text));
export const red = paint(31);
export const green = paint(32);
export const yellow = paint(33);
export const dim = paint(2);
export const bold = paint(1);
export const colored = (code, text) => paint(code)(text);

// Quita los códigos de color de un texto (para buscar en él)
export const plain = (text) => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

/**
 * Una línea de error de verdad: "Error: ...", "[ERROR]", "npm ERR!", "✘", "TypeError: ..."... y no
 * un test que se llama "devuelve false, no un error" ni "0 errors".
 */
export function looksLikeError(line) {
  const text = plain(line);
  if (/\b0 (errors?|failed)\b/i.test(text)) return false;
  return /\berror\s*[:\]]|\[ERROR\]|\bERR!|✘|✖|\bFAILED\b|\bUnhandled\b|\b[A-Z]\w*Error\b:|\bCannot find\b|\bEADDRINUSE\b|\bECONNREFUSED\b|\bapp crashed\b/i.test(
    text,
  );
}

export const title = (text) => console.log(`\n${bold(text)}`);
export const ok = (text) => console.log(`${green("✓")} ${text}`);
export const fail = (text) => console.log(`${red("✗")} ${text}`);
export const info = (text) => console.log(`${dim("·")} ${text}`);

// ---------- Procesos ----------

/**
 * Arranca un comando en la carpeta de una aplicación. Con `onLine`, cada línea de su salida pasa
 * por ahí (para ponerle el prefijo); sin él, la salida va directa a esta terminal.
 */
export function run(command, { cwd = ROOT, onLine, env } = {}) {
  const child = spawn(command, {
    cwd,
    shell: true,
    // En Windows, sin ventana propia; en Linux y macOS, en su propio grupo para pararlo entero
    detached: !IS_WINDOWS,
    windowsHide: true,
    stdio: onLine ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, ...env },
  });
  if (onLine) {
    for (const stream of [child.stdout, child.stderr]) {
      let rest = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => {
        const lines = (rest + chunk).split(/\r?\n/);
        rest = lines.pop();
        for (const line of lines) onLine(line);
      });
      stream.on("end", () => rest && onLine(rest));
    }
  }
  return child;
}

/** Espera a que termine un proceso: su código de salida. */
export const finished = (child) => new Promise((resolve) => child.on("close", (code) => resolve(code ?? 1)));

/** Para un proceso y todos los que ha arrancado (nodemon, ng serve, esbuild...). */
export function stopTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (IS_WINDOWS) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // Ya había terminado
    }
  }
}

// ---------- Comprobaciones ----------

/** Si algo escucha en ese puerto (en IPv4 o en IPv6). */
export async function portInUse(port) {
  const probe = (host) =>
    new Promise((resolve) => {
      const socket = net.connect({ port, host });
      socket.setTimeout(700);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("error", () => resolve(false));
    });
  const [v4, v6] = await Promise.all([probe("127.0.0.1"), probe("::1")]);
  return v4 || v6;
}

/** El host y el puerto de MongoDB: los de MONGODB_URI si está en el entorno; si no, los de siempre. */
export function mongoAddress() {
  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^:/,]+)(?::(\d+))?/.exec(uri);
  return { host: match?.[1] ?? "localhost", port: Number(match?.[2] ?? 27017), fromEnv: Boolean(process.env.MONGODB_URI) };
}

export async function mongoUp() {
  const { host, port } = mongoAddress();
  if (host === "localhost" || host === "127.0.0.1") return portInUse(port);
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

/** Node 20.19 o más (lo piden Angular 20 y la API). */
export function nodeIsRecent() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major > 20 || (major === 20 && minor >= 19);
}

export const hasModules = (service) => existsSync(path.join(ROOT, service.dir, "node_modules"));
export const dirOf = (service) => path.join(ROOT, service.dir);

/** Instala las dependencias de las aplicaciones que no las tienen. false si alguna falla. */
export async function installMissing(services) {
  for (const service of services) {
    if (hasModules(service)) continue;
    info(`${service.dir} no tiene node_modules: npm install...`);
    const code = await finished(run("npm install", { cwd: dirOf(service) }));
    if (code !== 0) {
      fail(`npm install en ${service.dir} ha fallado (código ${code}). Revisa el error de arriba.`);
      return false;
    }
    ok(`Dependencias de ${service.dir} instaladas`);
  }
  return true;
}

/** Una tabla sencilla para la terminal. */
export function table(rows, headers) {
  const widths = headers.map((header, column) =>
    Math.max(plain(header).length, ...rows.map((row) => plain(String(row[column])).length)),
  );
  const line = (cells) => cells.map((cell, column) => String(cell) + " ".repeat(widths[column] - plain(String(cell)).length)).join("   ");
  console.log(`\n${bold(line(headers))}`);
  console.log(dim(widths.map((width) => "─".repeat(width)).join("   ")));
  for (const row of rows) console.log(line(row));
}
