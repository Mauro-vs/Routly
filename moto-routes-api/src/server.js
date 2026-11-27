import "dotenv/config";
import { createApp } from "./app.js";
import { loadAuthConfig } from "./config/auth.js";
import { loadCookieConfig } from "./config/cookies.js";
import { connectDB } from "./config/db.js";
import { Route } from "./models/route.model.js";
import { ratingService } from "./services/rating.service.js";

// Sin una AUTH_JWKS_URL válida (la clave pública del servicio de auth), o con la cookie mal
// configurada, no se arranca: mejor fallar aquí que en la primera petición
loadAuthConfig();
loadCookieConfig();

const PORT = process.env.PORT || 3000;
const app = createApp();

connectDB()
  // Las rutas de antes de existir difficultyLevel: una sola vez, luego no cambia nada
  .then(() => Route.syncDifficultyLevels())
  // Las notas de los documentos de antes de existir las opiniones: una sola vez, luego no hace nada
  .then(() => ratingService.fillMissing())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`  Tokens checked with ${loadAuthConfig().jwksUrl}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
