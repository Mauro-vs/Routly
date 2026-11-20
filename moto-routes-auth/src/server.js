import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { loadKeys } from "./config/keys.js";
import { mongoRepositories } from "./repositories/index.js";

// Con una configuración o unas claves que no valen no se arranca: lo dice y para
let config;
let keys;
try {
  config = loadConfig();
  keys = await loadKeys(config.jwt);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

try {
  // 5 s para encontrar MongoDB: si no está en marcha, mejor decirlo pronto que esperar 30
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
} catch (error) {
  console.error(`Cannot connect to MongoDB (${error.message})`);
  process.exit(1);
}

const app = createApp({ config, keys, repositories: mongoRepositories });

app.listen(config.port, () => {
  console.log(`Auth server running on http://localhost:${config.port}`);
  console.log(`  JWKS: http://localhost:${config.port}/auth/.well-known/jwks.json (kid ${keys.kid.slice(0, 12)}...)`);
  if (config.swagger) console.log(`  Docs: http://localhost:${config.port}/auth/docs`);
});
