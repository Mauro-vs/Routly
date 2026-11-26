import "dotenv/config";
import mongoose from "mongoose";
import { Experience } from "./models/experience.model.js";
import { Host } from "./models/host.model.js";
import { Review } from "./models/review.model.js";
import { REVIEW_TARGETS } from "./models/reviewTargets.js";
import { Role } from "./models/role.model.js";
import { User } from "./models/user.model.js";
import { ratingService } from "./services/rating.service.js";
import { reviewService } from "./services/review.service.js";
import { userService } from "./services/user.service.js";
import { SYSTEM_ACTOR } from "./utils/access.js";

/*
 * npm run seed:reviews: añade opiniones de ejemplo a lo que ya hay en la base de datos de
 * MONGODB_URI, sin borrar nada (al revés que npm run seed). Para que el resumen IA y la salud del
 * producto tengan con qué trabajar.
 *
 *   - Crea, si no existen, unos cuantos riders de ejemplo (rider01@routly.dev...), con la
 *     contraseña de siempre del seed.
 *   - Entre 4 y 12 opiniones por experiencia activa y entre 2 y 6 por anfitrión activo, con notas
 *     variadas (muy buenas, regulares y malas) y temas que se repiten, repartidas en los últimos
 *     8 meses.
 *   - Si un rider ya opinó sobre algo, se lo salta: se puede ejecutar más de una vez.
 *   - Pasa por reviewService: las mismas reglas que la API (el anfitrión no opina sobre lo suyo,
 *     el comentario obligatorio con 1 o 2 estrellas...).
 *   - Al terminar recalcula todas las notas.
 */

const DEV_PASSWORD = "routly-dev-1234";
const MONTHS = 8;
const DAY = 24 * 60 * 60 * 1000;

const RIDERS = [
  "Carlos Medina", "Elena Ruiz", "Javier Soto", "Laura Campos", "Miguel Ángel Prieto", "Sara Domínguez",
  "Álvaro Navarro", "Irene Molina", "David Herrero", "Cristina Vega", "Rubén Castillo", "Paula Iglesias",
  "Óscar Fuentes", "Andrea Lozano",
].map((name, index) => ({ name, email: `rider${String(index + 1).padStart(2, "0")}@routly.dev` }));

// Siempre las mismas opiniones con los mismos datos: un generador con semilla (mulberry32)
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const next = random(20261126);
const pick = (list) => list[Math.floor(next() * list.length)];
const between = (min, max) => min + Math.floor(next() * (max - min + 1));

// Una nota con más buenas que malas, como en una tienda de verdad
function randomRating(bias) {
  const roll = next() + bias;
  if (roll < 0.08) return 1;
  if (roll < 0.17) return 2;
  if (roll < 0.32) return 3;
  if (roll < 0.62) return 4;
  return 5;
}

// Los textos, por nota y con temas que se repiten (guía, paisaje, ritmo, comida, organización, moto)
const EXPERIENCE_TEXTS = {
  5: [
    ["Inolvidable", "El paisaje es espectacular y el guía conoce cada curva. Paramos en los mejores miradores y la comida fue de diez."],
    ["Repetiría mañana", "Organización perfecta de principio a fin. El ritmo fue cómodo para todo el grupo y las carreteras, una maravilla."],
    ["De lo mejor que he hecho en moto", "Curvas, vistas y un guía muy atento. Nos explicó la historia de cada pueblo y la parada para comer fue un acierto."],
    ["Muy recomendable", "Todo muy bien explicado en el punto de encuentro, buen ambiente en el grupo y unas carreteras preciosas."],
    ["Diez de diez", null],
  ],
  4: [
    ["Muy buena experiencia", "El recorrido es precioso y el guía muy majo. Solo le faltó alguna parada más para hacer fotos."],
    ["Bonita ruta", "Disfruté mucho del paisaje. El ritmo fue algo rápido en la parte de montaña, pero nada grave."],
    ["Bien organizada", "Todo puntual y bien explicado. La comida estuvo bien, aunque el sitio iba un poco lleno."],
    ["Merece la pena", "Carreteras muy divertidas y buen grupo. Repetiría, quizá en otra época con menos calor."],
    [null, null],
  ],
  3: [
    ["Correcta", "La ruta está bien, pero esperaba más paisaje. El guía cumplió sin más y el ritmo fue irregular."],
    ["Ni fu ni fa", "Mucho tramo de autovía para llegar a lo bonito. La parada para comer, bien; el resto, normal."],
    ["Mejorable", "El punto de encuentro estaba mal indicado y empezamos tarde. Luego la ruta fue agradable."],
  ],
  2: [
    ["Me esperaba otra cosa", "El ritmo fue demasiado rápido para mi nivel y el guía no esperaba a los de atrás. El paisaje, eso sí, muy bonito."],
    ["Organización floja", "Cambiaron la hora de salida el mismo día y la parada para comer fue en un sitio caro y lento. La ruta en sí está bien."],
  ],
  1: [
    ["No la recomiendo", "Salimos con una hora de retraso, el guía apenas explicó nada y nos perdimos dos veces. Una pena porque la zona es preciosa."],
    ["Muy decepcionante", "El grupo era demasiado grande para el tipo de carretera y el ritmo fue peligroso en las curvas. No repetiré."],
  ],
};

const HOST_TEXTS = {
  5: [
    ["Un guía de los que no se olvidan", "Conoce la zona como nadie, explica todo con paciencia y está pendiente de cada moto del grupo."],
    ["Muy profesional", "Puntual, simpático y con mucha experiencia. Se nota que le gusta lo que hace."],
    ["Encantadora", null],
  ],
  4: [
    ["Muy buen guía", "Muy atento y con buenas explicaciones. A veces iba un poco rápido, pero siempre esperaba en los cruces."],
    ["Recomendable", "Se nota que conoce bien las carreteras. Buen trato con el grupo."],
  ],
  3: [["Correcto", "Hizo su trabajo, pero le faltó explicar más la ruta y hacer alguna parada más."]],
  2: [["Poco atento", "Iba a su ritmo sin mirar atrás y en las paradas apenas hablaba con el grupo. Esperaba más de un guía."]],
  1: [["No volvería con él", "Llegó tarde, fue muy brusco con un compañero que se quedó atrás y no respetó los tiempos de descanso."]],
};

const daysAgo = (days) => new Date(Date.now() - days * DAY - between(0, 12) * 60 * 60 * 1000);

async function ensureRiders() {
  const role = await Role.findOne({ name: "rider" }).lean();
  if (!role) throw new Error('No existe el rol "rider": carga antes los datos con npm run seed');
  const riders = [];
  for (const rider of RIDERS) {
    let user = await User.findOne({ email: rider.email }).lean();
    if (!user) {
      user = await userService.create({ ...rider, password: DEV_PASSWORD, roleId: String(role._id) }, SYSTEM_ACTOR);
      console.log(`  + rider ${rider.email}`);
    }
    riders.push(user);
  }
  // Los riders que ya había (como Marta) también opinan
  const others = await User.find({ roleId: role._id, isActive: true, email: { $nin: RIDERS.map((rider) => rider.email) } }).lean();
  return [...riders, ...others];
}

// Mezcla una copia (Fisher-Yates con el generador con semilla)
function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function addReviews(targetType, target, riders, [min, max], texts) {
  // Cada objetivo tiene su tendencia: unos gustan más que otros (para que la salud del producto varíe)
  const bias = (next() - 0.5) * 0.5;
  let added = 0;
  for (const rider of shuffled(riders).slice(0, between(min, max))) {
    const rating = randomRating(bias);
    const [title, comment] = pick(texts[rating]);
    const actor = { id: String(rider._id), role: "rider", email: rider.email, name: rider.name };
    try {
      const review = await reviewService.create(
        { targetType, targetId: String(target._id), rating, ...(title && { title }), ...(comment && { comment }) },
        actor,
      );
      const when = daysAgo(between(1, MONTHS * 30));
      await Review.updateOne({ _id: review._id }, { createdAt: when, updatedAt: when }, { timestamps: false });
      added++;
    } catch (error) {
      // Ya había opinado, o es el anfitrión de eso: se lo salta
      if (![403, 409].includes(error.status)) throw error;
    }
  }
  return added;
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  await Review.syncIndexes();
  console.log("Connected to MongoDB");

  const riders = await ensureRiders();
  const experiences = await Experience.find({ isActive: true }).lean();
  const hosts = await Host.find({ isActive: true }).lean();

  let total = 0;
  for (const experience of experiences) {
    total += await addReviews(REVIEW_TARGETS.EXPERIENCE, experience, riders, [4, 12], EXPERIENCE_TEXTS);
  }
  for (const host of hosts) {
    total += await addReviews(REVIEW_TARGETS.HOST, host, riders, [2, 6], HOST_TEXTS);
  }

  await ratingService.recalculateAll();
  console.log(`Added ${total} reviews (${await Review.countDocuments()} in total). Ratings recalculated.`);
  console.log(`Password for the new riders: ${DEV_PASSWORD}`);
  process.exit(0);
} catch (error) {
  console.error("Seed reviews error:", error.message);
  process.exit(1);
}
