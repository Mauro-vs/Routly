import dotenv from "dotenv";
import mongoose from "mongoose";
import { Route } from "./models/route.model.js";

dotenv.config();

const routes = [
  {
    title: "Costa Brava Loop",
    description: "Ruta costera con vistas espectaculares al Mediterráneo",
    difficulty: "medium",
    distance: 180,
    duration: 4,
    startPoint: "Barcelona",
    endPoint: "Barcelona",
  },
  {
    title: "Pirineos Adventure",
    description: "Travesía por los puertos de montaña del Pirineo aragonés",
    difficulty: "hard",
    distance: 320,
    duration: 7,
    startPoint: "Huesca",
    endPoint: "Lleida",
  },
  {
    title: "Ruta del Vino",
    description: "Recorrido tranquilo por La Rioja entre viñedos",
    difficulty: "easy",
    distance: 90,
    duration: 2,
    startPoint: "Logroño",
    endPoint: "Haro",
  },
  {
    title: "Sierra Nevada Express",
    description: "Subida al puerto más alto de la península",
    difficulty: "hard",
    distance: 150,
    duration: 5,
    startPoint: "Granada",
    endPoint: "Granada",
  },
  {
    title: "Caminos de Mallorca",
    description: "Ruta por la Serra de Tramuntana con curvas sin fin",
    difficulty: "medium",
    distance: 120,
    duration: 3,
    startPoint: "Palma",
    endPoint: "Sóller",
  },
];

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // El seed reinicia los datos de desarrollo: aquí sí se borra físicamente
  await Route.deleteMany({});
  console.log("Cleared routes collection");

  // create (no insertMany) para que se ejecuten los hooks: slug, isActive...
  await Route.create(routes);
  await Route.syncIndexes();
  console.log(`Inserted ${routes.length} routes`);

  process.exit(0);
} catch (error) {
  console.error("Seed error:", error.message);
  process.exit(1);
}
