// Servidor estático de las maquetas (design/), en http://localhost:4311
// /fonts sirve la Onest del panel y /assets, los logos de docs/assets: así los bocetos usan la
// misma fuente y la misma marca sin copiarlas. Solo para desarrollo.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..");
const MOUNTS = {
  "/fonts/": join(root, "moto-routes-frontend/node_modules/@fontsource-variable/onest/files"),
  "/assets/": join(root, "docs/assets"),
  "/": here,
};
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

function resolvePath(url) {
  const path = decodeURIComponent(new URL(url, "http://x").pathname);
  for (const [prefix, dir] of Object.entries(MOUNTS)) {
    if (!path.startsWith(prefix)) continue;
    const file = normalize(join(dir, path.slice(prefix.length)));
    // Nada fuera de su carpeta
    if (!file.startsWith(dir)) return null;
    return file;
  }
  return null;
}

// Si picsum no responde: un paisaje sintético (montes, cielo y una carretera), distinto para cada
// semilla y marcado como foto de ejemplo. Solo para poder juzgar la composición de los bocetos.
function syntheticPhoto(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  const skies = [["#9fc3d8", "#e9d7b5"], ["#f0b37a", "#f7e2c4"], ["#7ea6c4", "#d8e6ec"], ["#c98a6b", "#efd2b0"], ["#5f7f9c", "#cfdbe3"]];
  const [top, bottom] = skies[Math.floor(rnd() * skies.length)];
  const ridge = (y, amp, color) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 1200; x += 100) d += ` L${x} ${y - rnd() * amp}`;
    return `<path d="${d} L1200 800 L0 800 Z" fill="${color}"/>`;
  };
  const curve = 300 + rnd() * 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#s)"/>
${ridge(380, 160, "#6d8a86")}${ridge(470, 140, "#3f6656")}${ridge(560, 110, "#24493a")}
<path d="M${curve - 30} 470 C ${curve} 560, 900 600, 760 800 L 520 800 C 640 620, ${curve - 60} 560, ${curve - 40} 470 Z" fill="#2b2f2c"/>
<path d="M${curve - 35} 475 C ${curve - 10} 570, 820 620, 640 800" fill="none" stroke="#f3f0e2" stroke-width="5" stroke-dasharray="22 18"/>
<text x="1180" y="780" text-anchor="end" font-family="sans-serif" font-size="18" fill="#ffffff" opacity=".7">foto de ejemplo</text>
</svg>`;
}

// /img/... reenvía a picsum.photos: las fotos del seed, servidas desde el mismo origen que la maqueta
async function proxyImage(req, res) {
  const path = req.url.slice("/img/".length);
  try {
    const upstream = await fetch(`https://picsum.photos/${path}`, { redirect: "follow", signal: AbortSignal.timeout(4000) });
    if (!upstream.ok) throw new Error(String(upstream.status));
    res.writeHead(200, { "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "max-age=86400" });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" }).end(syntheticPhoto(path));
  }
}

createServer((req, res) => {
  if (req.url.startsWith("/img/")) return void proxyImage(req, res);
  let file = resolvePath(req.url);
  try {
    if (file && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!file || !statSync(file).isFile()) throw new Error("not found");
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado");
    return;
  }
  // CORS abierto: la web en :4300 carga de aquí el script del peor caso (design/peor-caso/)
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  createReadStream(file).pipe(res);
}).listen(4311, () => console.log("Maquetas en http://localhost:4311/bocetos-web/"));
