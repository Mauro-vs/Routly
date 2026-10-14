import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { corsMiddleware } from "./config/cors.js";
import { connectDB } from "./config/db.js";
import { helmetMiddleware } from "./config/helmet.js";
import { morganMiddleware } from "./config/morgan.js";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import routeRoutes from "./routes/route.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(morganMiddleware);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/routes", routeRoutes);

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
