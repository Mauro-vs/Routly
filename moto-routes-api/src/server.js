import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { loadAuthConfig } from "./config/auth.js";
import { corsMiddleware } from "./config/cors.js";
import { connectDB } from "./config/db.js";
import { helmetMiddleware } from "./config/helmet.js";
import { morganMiddleware } from "./config/morgan.js";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import bikeRoutes from "./routes/bike.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import departureRoutes from "./routes/departure.routes.js";
import experienceRoutes from "./routes/experience.routes.js";
import hostRoutes from "./routes/host.routes.js";
import imageRoutes from "./routes/image.routes.js";
import locationRoutes from "./routes/location.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import roleRoutes from "./routes/role.routes.js";
import routeRoutes from "./routes/route.routes.js";
import userRoutes from "./routes/user.routes.js";

// Sin un JWT_SECRET válido no se arranca: mejor fallar aquí que en el primer login
loadAuthConfig();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(morganMiddleware);
// El body más grande es una experiencia con su descripción (unos 3 kB): 50 kB da margen
// y corta peticiones desmedidas con un 413
app.use(express.json({ limit: "50kb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// persistAuthorization: el token de Authorize no se pierde al recargar la página
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { swaggerOptions: { persistAuthorization: true } })
);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hosts", hostRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/departures", departureRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/bikes", bikeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
