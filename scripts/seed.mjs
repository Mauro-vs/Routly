// npm run seed: carga los datos de ejemplo de la API, después de confirmarlo, porque borra todas las
// colecciones de la base de datos del .env de la API (moto_routes, si no se ha cambiado).
//
//   npm run seed            pregunta antes
//   npm run seed -- --yes   sin preguntar
import readline from "node:readline/promises";
import { SERVICES, bold, dirOf, fail, finished, installMissing, mongoAddress, mongoUp, ok, red, run, yellow } from "./lib.mjs";

const api = SERVICES.api;

if (!(await mongoUp())) {
  const { host, port } = mongoAddress();
  fail(red(`MongoDB no responde en ${host}:${port}. Arráncalo antes de cargar los datos.`));
  process.exit(1);
}
if (!(await installMissing([api]))) process.exit(1);

if (!process.argv.includes("--yes")) {
  const target = process.env.MONGODB_URI ? `MONGODB_URI (${process.env.MONGODB_URI})` : "la base de datos de moto-routes-api/.env (moto_routes, si no la has cambiado)";
  console.log(yellow(`\nEl seed ${bold("borra todas las colecciones")} de ${target} y carga los datos de ejemplo.`));
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await prompt.question('¿Seguir? Escribe "si" para confirmar: ')).trim().toLowerCase();
  prompt.close();
  if (answer !== "si" && answer !== "sí") {
    console.log("No se ha tocado nada.");
    process.exit(0);
  }
}

const code = await finished(run("npm run seed", { cwd: dirOf(api) }));
if (code === 0) ok("Datos de ejemplo cargados. Todos los usuarios tienen la contraseña routly-dev-1234 (solo desarrollo).");
else fail(red(`El seed ha fallado (código ${code}). Revisa el error de arriba.`));
process.exit(code);
