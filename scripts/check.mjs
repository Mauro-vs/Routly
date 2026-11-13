// npm run check: lo de antes de un commit. Compila el panel y la web (como en producción) y pasa
// todos los tests. Termina con código 1 si algo falla, y dice qué.
import path from "node:path";
import {
  ROOT,
  SERVICES,
  bold,
  dim,
  dirOf,
  fail,
  finished,
  green,
  installMissing,
  looksLikeError,
  ok,
  red,
  run,
  title,
} from "./lib.mjs";

const builds = [SERVICES.panel, SERVICES.web];
if (!(await installMissing(Object.values(SERVICES)))) process.exit(1);

let broken = false;
for (const service of builds) {
  title(`Compilando ${service.label}${dim(" (npm run build)")}`);
  const lines = [];
  const started = Date.now();
  const code = await finished(run("npm run build", { cwd: dirOf(service), env: { FORCE_COLOR: "0" }, onLine: (line) => lines.push(line) }));
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  if (code === 0) {
    const size = lines.find((line) => /Initial total/.test(line));
    ok(`${service.label} compila en ${seconds} s${size ? dim(`  ${size.replace(/\s+/g, " ").trim()}`) : ""}`);
  } else {
    broken = true;
    fail(red(`${service.label} no compila`));
    const errors = lines.filter(looksLikeError);
    for (const line of (errors.length > 0 ? errors : lines.slice(-20)).slice(0, 40)) console.log(red(`   ${line}`));
  }
}

title("Tests");
const tests = await finished(run(`node "${path.join(ROOT, "scripts", "test.mjs")}"`, { cwd: ROOT }));

if (broken || tests !== 0) {
  console.log(`\n${red(bold("npm run check: hay algo que arreglar"))} (mira lo que sale en rojo).`);
  process.exit(1);
}
console.log(`\n${green(bold("npm run check: todo compila y todos los tests pasan."))}`);
