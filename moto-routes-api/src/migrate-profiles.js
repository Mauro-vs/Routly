import "dotenv/config";
import mongoose from "mongoose";
import { profileService } from "./services/profile.service.js";

/*
 * Migración: crea el perfil vacío de los usuarios que se dieron de alta antes de que
 * existieran los perfiles. Avisa de cada uno; si todos lo tienen, no hace nada. Se puede
 * lanzar tantas veces como haga falta.
 *
 *   npm run migrate:profiles
 */
try {
  await mongoose.connect(process.env.MONGODB_URI);

  const created = await profileService.createMissing();
  for (const { _id, email } of created) {
    console.warn(`  Missing profile created for ${email} (${_id})`);
  }
  console.log(created.length ? `Profiles created: ${created.length}` : "Every user already has a profile");

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Migration error:", error.message);
  process.exit(1);
}
