import "dotenv/config";
import http from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";

// Con una configuración que no vale no se arranca: lo dice y para
let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = createApp({ config });

http.createServer(app).listen(config.port, () => {
  console.log(`Gateway running on http://localhost:${config.port}`);
  for (const { prefix, target } of Object.values(config.services)) console.log(`  ${prefix.padEnd(5)} → ${target}`);
});
