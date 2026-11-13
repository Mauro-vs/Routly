// npm run dev: la API, el panel y la web en una sola terminal.
//
//   npm run dev               las tres
//   npm run dev -- api web    solo esas
//
// Antes de arrancar comprueba lo que suele fallar (Node, MongoDB, el .env, las dependencias y los
// puertos) y dice cómo arreglarlo. Cada línea lleva el nombre de quien la escribe y los errores
// salen en rojo. Si uno se cae, se avisa y los demás siguen. Ctrl+C para todo.
import { existsSync } from "node:fs";
import path from "node:path";
import {
  SERVICES,
  bold,
  colored,
  dim,
  dirOf,
  fail,
  green,
  info,
  installMissing,
  looksLikeError,
  mongoAddress,
  mongoUp,
  nodeIsRecent,
  ok,
  portInUse,
  red,
  run,
  stopTree,
  title,
  yellow,
} from "./lib.mjs";

const READY_TIMEOUT = 180_000;
const TAIL = 15;

// ---------- Qué se arranca ----------

const names = process.argv.slice(2);
const unknown = names.filter((name) => !SERVICES[name]);
if (unknown.length > 0) {
  fail(`No sé qué es ${unknown.map((name) => `"${name}"`).join(", ")}. Puedes elegir: ${Object.keys(SERVICES).join(", ")}.`);
  process.exit(1);
}
const selected = (names.length > 0 ? names : Object.keys(SERVICES)).map((name) => SERVICES[name]);

// ---------- Comprobaciones ----------

title("Comprobando...");
const problems = [];

if (nodeIsRecent()) ok(`Node ${process.versions.node}`);
else problems.push(`Node ${process.versions.node} es antiguo: Angular 20 pide la 20.19 o más. Instala la LTS de https://nodejs.org`);

if (selected.includes(SERVICES.api)) {
  const { host, port, fromEnv } = mongoAddress();
  if (await mongoUp()) ok(`MongoDB responde en ${host}:${port}`);
  else
    problems.push(
      `MongoDB no responde en ${host}:${port}${fromEnv ? " (MONGODB_URI)" : ""}. Arráncalo: en Windows, "net start MongoDB" en una terminal de administrador, o abre MongoDB Compass y comprueba que conecta.`,
    );

  if (existsSync(path.join(dirOf(SERVICES.api), ".env"))) ok("moto-routes-api/.env existe");
  else problems.push('Falta moto-routes-api/.env. Copia la plantilla: copy moto-routes-api\\.env.example moto-routes-api\\.env');
}

for (const service of selected) {
  if (await portInUse(service.port))
    problems.push(
      `El puerto ${service.port} (${service.label}) está ocupado: ¿ya lo tienes arrancado en otra terminal? Ciérralo, o arranca solo lo demás (npm run dev -- ${selected
        .filter((other) => other !== service)
        .map((other) => other.label)
        .join(" ")}).`,
    );
  else ok(`Puerto ${service.port} libre (${service.label})`);
}

if (problems.length > 0) {
  console.log("");
  for (const problem of problems) fail(red(problem));
  console.log(`\n${red(bold("No se ha arrancado nada."))} Arregla lo de arriba y vuelve a lanzar ${bold("npm run dev")}.`);
  process.exit(1);
}

if (!(await installMissing(selected))) process.exit(1);

// ---------- Arrancar ----------

const width = Math.max(...selected.map((service) => service.label.length));
const prefixOf = (service) => colored(service.color, `[${service.label.padEnd(width)}]`);
const children = new Map();
const tails = new Map(selected.map((service) => [service, []]));
let stopping = false;

function printLine(service, line) {
  const tail = tails.get(service);
  tail.push(line);
  if (tail.length > TAIL) tail.shift();
  console.log(`${prefixOf(service)} ${looksLikeError(line) ? red(line) : line}`);
  // nodemon no termina cuando la API se cae: lo dice con esta línea y espera a un cambio
  if (/app crashed/i.test(line)) reportCrash(service, "se ha caído (nodemon espera a que guardes un cambio)");
}

function reportCrash(service, reason) {
  const lines = tails.get(service);
  console.log(`\n${red(bold(`━━ ${service.label} ${reason} ━━`))}`);
  for (const line of lines) console.log(red(`   ${line}`));
  const others = selected.filter((other) => other !== service && children.has(other));
  console.log(
    red(bold("━━")) +
      (others.length > 0 ? ` Los demás siguen: ${others.map((other) => other.label).join(", ")}.` : "") +
      ` Arréglalo y, si hace falta, vuelve a lanzarlo: ${bold(`npm run dev -- ${service.label}`)}\n`,
  );
}

// Ctrl+C: se paran todos, con lo que hayan arrancado (nodemon, ng serve...)
function stopAll() {
  if (stopping) return;
  stopping = true;
  console.log(`\n${dim("Parando...")}`);
  for (const child of children.values()) stopTree(child);
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

title(`Arrancando ${selected.map((service) => service.label).join(", ")}... (Ctrl+C para todo)`);
for (const service of selected) {
  // Cada uno con su puerto: un PORT que venga de fuera no puede mandar la API a otro sitio
  const child = run(service.dev, {
    cwd: dirOf(service),
    env: { PORT: String(service.port) },
    onLine: (line) => printLine(service, line),
  });
  children.set(service, child);
  child.on("close", (code) => {
    children.delete(service);
    if (!stopping) reportCrash(service, `se ha parado (código ${code ?? "?"})`);
    if (children.size === 0 && !stopping) {
      console.log(red("No queda nada en marcha."));
      process.exit(1);
    }
  });
}

// ---------- Cuando responden ----------

async function waitReady(service) {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT) {
    if (!children.has(service)) return false;
    try {
      const response = await fetch(service.ready, { signal: AbortSignal.timeout(2000) });
      if (response.status < 500) return true;
    } catch {
      // Aún no escucha
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

const LINKS = {
  api: ["API", "http://localhost:3000/api", "Swagger: http://localhost:3000/api/docs"],
  panel: ["Panel", "http://localhost:4200", "admin@routly.dev (contraseña del seed)"],
  web: ["Web", "http://localhost:4300", "Home, Shop y detalle"],
};

const results = await Promise.all(selected.map(async (service) => [service, await waitReady(service)]));
if (!stopping) {
  const up = results.filter(([, ready]) => ready);
  const down = results.filter(([, ready]) => !ready);
  console.log(`\n${green(bold("━━ En marcha ━━"))}`);
  for (const [service] of up) {
    const [name, url, note] = LINKS[service.label];
    console.log(`   ${green("●")} ${bold(name.padEnd(6))} ${url}   ${dim(note)}`);
  }
  for (const [service] of down) {
    console.log(`   ${red("●")} ${bold(LINKS[service.label][0].padEnd(6))} ${red("no responde: mira sus líneas en rojo")}`);
  }
  console.log(dim("   Ctrl+C para todo.\n"));
  if (up.length > 0 && down.length === 0) info(yellow("Los cambios se recargan solos: no hace falta volver a lanzar nada."));
}
