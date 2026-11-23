import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createServers, loadTls } from "./servers.js";

// Con una configuración o un certificado que no valen no se arranca: lo dice y para
let config;
let tls = null;
try {
  config = loadConfig();
  if (config.https) tls = loadTls(config.tls);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = createApp({ config });
const { main, redirect } = createServers({ app, config, tls });
const scheme = config.https ? "https" : "http";

main.listen(config.port, () => {
  console.log(`Gateway running on ${scheme}://localhost:${config.port}`);
  for (const { name, host, target, dist } of Object.values(config.frontends)) {
    console.log(`  ${name.padEnd(5)} ${scheme}://${host}:${config.port} → ${dist ?? target}`);
  }
  for (const { prefix, target } of Object.values(config.services)) console.log(`  ${prefix.padEnd(5)} → ${target}`);
});

redirect?.listen(config.httpPort, () => {
  console.log(`  http://…:${config.httpPort} → redirects to HTTPS`);
});
