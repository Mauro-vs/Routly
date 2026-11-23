// npm run dev: el servicio de auth, la API, el servidor de IA, el panel, la web y la gateway en una
// sola terminal.
//
//   npm run dev               todos
//   npm run dev -- api web    solo esas
//
// Antes de arrancar comprueba lo que suele fallar (Node, MongoDB, el .env, las claves de auth, el
// certificado de la gateway, las
// dependencias y los puertos) y dice cómo arreglarlo. Cada línea lleva el nombre de quien la escribe y los errores
// salen en rojo. Si uno se cae, se avisa y los demás siguen. Ctrl+C para todo.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  SERVICES,
  bold,
  colored,
  dim,
  dirOf,
  fail,
  finished,
  green,
  info,
  installMissing,
  looksLikeError,
  mongoAddress,
  mongoUp,
  nodeIsRecent,
  ok,
  portInUse,
  probe,
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

// La API y auth usan la misma base de datos
if (selected.includes(SERVICES.api) || selected.includes(SERVICES.auth)) {
  const { host, port, fromEnv } = mongoAddress();
  if (await mongoUp()) ok(`MongoDB responde en ${host}:${port}`);
  else
    problems.push(
      `MongoDB no responde en ${host}:${port}${fromEnv ? " (MONGODB_URI)" : ""}. Arráncalo: en Windows, "net start MongoDB" en una terminal de administrador, o abre MongoDB Compass y comprueba que conecta.`,
    );

}

if (selected.includes(SERVICES.api)) {
  if (existsSync(path.join(dirOf(SERVICES.api), ".env"))) ok("moto-routes-api/.env existe");
  else problems.push('Falta moto-routes-api/.env. Copia la plantilla: copy moto-routes-api\\.env.example moto-routes-api\\.env');
  if (!selected.includes(SERVICES.auth))
    info(yellow("La API comprueba los tokens con el JWKS de auth (http://localhost:3002): sin él, las peticiones con sesión dan 503."));
}

// auth arranca sin .env (todo tiene valor por defecto), pero necesita su clave privada RSA. En
// desarrollo es keys/private.pem, que no se sube: si falta, se crea más abajo con npm run keys.
const authKeyPath = path.join(dirOf(SERVICES.auth), "keys", "private.pem");
let needsAuthKeys = false;
if (selected.includes(SERVICES.auth)) {
  const envPath = path.join(dirOf(SERVICES.auth), ".env");
  const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (existsSync(envPath)) ok("moto-routes-auth/.env existe");
  else info(dim("moto-routes-auth no tiene .env: arranca con los valores por defecto (los de .env.example)."));
  const keyInEnv = /^\s*JWT_PRIVATE_KEY(_FILE)?\s*=\s*\S/m.test(env);
  if (existsSync(authKeyPath) || keyInEnv) ok("Clave privada de auth");
  else needsAuthKeys = true;
}
if ((selected.includes(SERVICES.panel) || selected.includes(SERVICES.api)) && !selected.includes(SERVICES.auth))
  info(yellow("Sin auth (npm run dev -- auth ...) no se puede iniciar sesión en el panel."));

// El servidor de IA arranca sin .env: el tiempo y las paradas funcionan, y los textos y el chat
// esperan a que haya una clave de OpenRouter. Se avisa, pero no para nada.
if (selected.includes(SERVICES.ai)) {
  if (existsSync(path.join(dirOf(SERVICES.ai), ".env"))) ok("moto-routes-ai/.env existe");
  else
    info(
      yellow(
        "moto-routes-ai no tiene .env: arranca, pero sin los textos de la IA ni el chat. Copia la plantilla (copy moto-routes-ai\\.env.example moto-routes-ai\\.env) y pon tu OPENROUTER_API_KEY.",
      ),
    );
  if (!selected.includes(SERVICES.api)) info(yellow("El servidor de IA lee la API (http://localhost:3000): si no la tienes arrancada, sus respuestas fallarán."));
}

// La gateway arranca sin .env, pero va por HTTPS: necesita su certificado (certs/, que no se sube).
// Si falta, se crea más abajo con npm run certs. Y los servicios, detrás de ella, necesitan
// TRUST_PROXY=1: si no, el login por https://routly.localhost:4000 da 403 (el Origin no cuadra)
const gatewayCertPath = path.join(dirOf(SERVICES.gateway), "certs", "cert.pem");
let needsGatewayCerts = false;
if (selected.includes(SERVICES.gateway)) {
  if (existsSync(gatewayCertPath)) ok("Certificado de la gateway");
  else needsGatewayCerts = true;
  const untrusted = [SERVICES.auth, SERVICES.api, SERVICES.ai].filter((service) => {
    const envPath = path.join(dirOf(service), ".env");
    const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    return !/^\s*TRUST_PROXY\s*=\s*[1-9]/m.test(env);
  });
  if (untrusted.length > 0)
    info(
      yellow(
        `Para entrar por la gateway, pon TRUST_PROXY=1 en el .env de ${untrusted.map((service) => service.dir).join(", ")}: si no, el login por https://routly.localhost:4000 da 403.`,
      ),
    );
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

if (needsAuthKeys) {
  info("moto-routes-auth no tiene clave: npm run keys (crea keys/private.pem, que no se sube)...");
  if ((await finished(run("npm run keys", { cwd: dirOf(SERVICES.auth) }))) !== 0) {
    fail(red("No se ha podido crear la clave de auth. Prueba a mano: cd moto-routes-auth && npm run keys"));
    process.exit(1);
  }
  ok("Clave de auth creada en moto-routes-auth/keys/private.pem");
}

if (needsGatewayCerts) {
  info("moto-routes-gateway no tiene certificado: npm run certs (crea certs/, que no se sube)...");
  if ((await finished(run("npm run certs", { cwd: dirOf(SERVICES.gateway) }))) !== 0) {
    fail(red("No se ha podido crear el certificado de la gateway. Prueba a mano: cd moto-routes-gateway && npm run certs"));
    process.exit(1);
  }
  ok("Certificado de la gateway creado en moto-routes-gateway/certs/ (el navegador avisará la primera vez)");
}

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
    // null: aún no escucha
    const status = await probe(service.ready);
    if (status !== null && status < 500) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

const LINKS = {
  auth: ["Auth", "http://localhost:3002/auth", "Swagger: http://localhost:3002/auth/docs"],
  api: ["API", "http://localhost:3000/api", "Swagger: http://localhost:3000/api/docs"],
  ai: ["IA", "http://localhost:3001/health", "La web lo usa en /ai"],
  panel: ["Panel", "http://localhost:4200", "admin@routly.dev (contraseña del seed)"],
  web: ["Web", "http://localhost:4300", "Home, Shop y detalle"],
  gateway: ["Gateway", "https://routly.localhost:4000", "la web; el panel en https://panel.routly.localhost:4000"],
};

const results = await Promise.all(selected.map(async (service) => [service, await waitReady(service)]));
if (!stopping) {
  const up = results.filter(([, ready]) => ready);
  const down = results.filter(([, ready]) => !ready);
  console.log(`\n${green(bold("━━ En marcha ━━"))}`);
  for (const [service] of up) {
    const [name, url, note] = LINKS[service.label];
    console.log(`   ${green("●")} ${bold(name.padEnd(7))} ${url}   ${dim(note)}`);
  }
  for (const [service] of down) {
    console.log(`   ${red("●")} ${bold(LINKS[service.label][0].padEnd(7))} ${red("no responde: mira sus líneas en rojo")}`);
  }
  console.log(dim("   Ctrl+C para todo.\n"));
  if (up.length > 0 && down.length === 0) info(yellow("Los cambios se recargan solos: no hace falta volver a lanzar nada."));
}
