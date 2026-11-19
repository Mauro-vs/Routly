import "dotenv/config";
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

app.listen(config.port, () => {
  console.log(`AI server running on http://localhost:${config.port}`);
  console.log(`  Routly API: ${config.routlyApiUrl}`);
  if (config.ai.apiKey) console.log(`  AI: ${config.ai.label} (${config.ai.models.join(", ")})`);
  else console.warn(`  No API key for ${config.ai.label} (AI_API_KEY): the AI texts and the chat will answer 503 (weather and stops still work)`);
});
