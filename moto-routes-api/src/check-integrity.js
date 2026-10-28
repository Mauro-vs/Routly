import "dotenv/config";
import mongoose from "mongoose";
import { checkIntegrity, fixIntegrity } from "./services/integrity.service.js";

/*
 * Comprueba la integridad referencial de la base de datos de MONGODB_URI.
 *
 *   npm run check:integrity            informa (sale con 1 si encuentra problemas)
 *   npm run check:integrity -- --fix   además repara lo que se puede reparar solo
 *
 * Reparar nunca borra nada físicamente: desactiva hijos de un padre eliminado, manda a la
 * papelera imágenes de un dueño eliminado y alinea los perfiles con su usuario.
 */
const fix = process.argv.includes("--fix");

function print(problems) {
  for (const { collection, id, detail, fix: repair } of problems) {
    console.log(`  ${repair ? "·" : "!"} ${collection} ${id}: ${detail}${repair ? "" : " (needs a person)"}`);
  }
}

try {
  await mongoose.connect(process.env.MONGODB_URI);

  let problems = await checkIntegrity();
  if (problems.length === 0) {
    console.log("Referential integrity: OK, no problems found");
  } else {
    console.log(`Referential integrity: ${problems.length} problem(s)`);
    print(problems);

    if (fix) {
      console.log(`Fixed: ${await fixIntegrity(problems)}`);
      problems = await checkIntegrity();
      console.log(problems.length ? `Still pending: ${problems.length}` : "Everything fixed");
      print(problems);
    } else {
      console.log("Run with --fix to repair the ones marked with ·");
    }
  }

  await mongoose.disconnect();
  process.exit(problems.length ? 1 : 0);
} catch (error) {
  console.error("Integrity check error:", error.message);
  process.exit(1);
}
