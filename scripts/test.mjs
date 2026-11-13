// npm test: los tests de la API, el panel y la web, uno detrás de otro, y una tabla al final.
//
//   npm test                    los tres
//   npm test -- api web         solo esos
//   npm test -- --verbose       con toda la salida
//
// Sin --verbose solo se enseña lo que falla. Termina con código 1 si algo falla (sirve antes de
// un commit, o en npm run check).
import {
  SERVICES,
  bold,
  dim,
  dirOf,
  fail,
  finished,
  green,
  installMissing,
  looksLikeError,
  mongoAddress,
  mongoUp,
  ok,
  red,
  run,
  table,
  title,
} from "./lib.mjs";

const KARMA = "npx ng test --watch=false --browsers=ChromeHeadless";
const COMMANDS = { api: "npm test", panel: KARMA, web: KARMA };

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const names = args.filter((arg) => !arg.startsWith("--"));
const unknown = names.filter((name) => !SERVICES[name]);
if (unknown.length > 0) {
  fail(`No sé qué es ${unknown.join(", ")}. Puedes elegir: ${Object.keys(SERVICES).join(", ")}.`);
  process.exit(1);
}
const selected = (names.length > 0 ? names : Object.keys(SERVICES)).map((name) => SERVICES[name]);

// Cuántos tests han pasado y fallado, leídos de la salida de node:test o de Karma
function countsOf(output) {
  const text = output.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  const nodeTotal = /ℹ tests (\d+)[\s\S]*?ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(text);
  if (nodeTotal) return { total: +nodeTotal[1], passed: +nodeTotal[2], failed: +nodeTotal[3] };
  // Karma: "TOTAL: 482 SUCCESS" o "TOTAL: 2 FAILED, 469 SUCCESS"
  const karma = /TOTAL: (?:(\d+) FAILED, )?(\d+) SUCCESS/.exec(text);
  if (karma) {
    const failed = Number(karma[1] ?? 0);
    const passed = Number(karma[2]);
    return { total: failed + passed, passed, failed };
  }
  return null;
}

// Las líneas que explican un fallo. node:test lo resume al final ("✖ failing tests:"); Karma marca
// cada test con FAILED y pone el motivo debajo. Si no, las de error y unas cuantas después.
const isStackLine = (line) => /^\s*at /.test(line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ""));

function failureLines(lines) {
  const summary = lines.findIndex((line) => /✖ failing tests:/.test(line));
  if (summary !== -1) return lines.slice(summary).filter((line) => !isStackLine(line) && line.trim()).slice(0, 60);

  const karma = [];
  lines.forEach((line, index) => {
    if (!/ FAILED$/.test(line) || /Executed \d+ of/.test(line)) return;
    karma.push(line);
    for (let next = index + 1; next < Math.min(lines.length, index + 8); next++) {
      if (/ FAILED$|Executed \d+ of/.test(lines[next])) break;
      if (!isStackLine(lines[next]) && lines[next].trim()) karma.push(lines[next]);
    }
  });
  if (karma.length > 0) return karma.slice(0, 60);

  const picked = new Set();
  lines.forEach((line, index) => {
    if (!looksLikeError(line)) return;
    for (let next = index; next < Math.min(lines.length, index + 6); next++) picked.add(next);
  });
  return [...picked]
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .filter((line) => !/^\s*at /.test(line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")) && !/Executed \d+ of/.test(line))
    .slice(0, 60);
}

if (selected.includes(SERVICES.api) && !(await mongoUp())) {
  const { host, port } = mongoAddress();
  fail(red(`MongoDB no responde en ${host}:${port}: los tests de la API lo necesitan (usan una base de datos temporal que borran al terminar).`));
  process.exit(1);
}
if (!(await installMissing(selected))) process.exit(1);

const rows = [];
for (const service of selected) {
  title(`Tests de ${service.label}${dim(` (${COMMANDS[service.label]})`)}`);
  const lines = [];
  const started = Date.now();
  const child = run(COMMANDS[service.label], {
    cwd: dirOf(service),
    env: { FORCE_COLOR: "0" },
    onLine: (line) => {
      lines.push(line);
      if (verbose) console.log(`${dim(`[${service.label}]`)} ${line}`);
    },
  });
  const code = await finished(child);
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  const counts = countsOf(lines.join("\n"));
  const passedAll = code === 0 && (!counts || counts.failed === 0);

  if (passedAll) ok(`${service.label}: ${counts ? `${counts.passed} tests` : "sin errores"} en ${seconds} s`);
  else {
    fail(red(`${service.label}: ${counts ? `${counts.failed} de ${counts.total} fallan` : `ha terminado con código ${code}`}`));
    if (!verbose) {
      const shown = failureLines(lines);
      for (const line of shown.length > 0 ? shown : lines.slice(-20)) console.log(red(`   ${line}`));
      console.log(dim(`   Toda la salida: npm test -- ${service.label} --verbose`));
    }
  }
  rows.push([
    service.label,
    passedAll ? green("pasan") : red("fallan"),
    counts ? `${counts.passed}/${counts.total}` : "-",
    `${seconds} s`,
  ]);
}

table(rows, ["App", "Resultado", "Tests", "Tiempo"]);
const failed = rows.some((row) => row[1] !== green("pasan"));
console.log(failed ? `\n${red(bold("Hay tests que fallan."))}` : `\n${green(bold("Todo pasa."))}`);
process.exit(failed ? 1 : 0);
