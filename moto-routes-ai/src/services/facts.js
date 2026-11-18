/*
 * Lo que la IA sabe de una experiencia: los datos de la API resumidos en un objeto pequeño (cuantos
 * menos tokens, más barato y más rápido), sin ids ni URLs de fotos, que no le sirven de nada.
 * Lo usan los textos del detalle (insights.service.js) y el chatbot.
 */

const DIFFICULTY = { easy: "fácil", medium: "media", hard: "difícil" };

const placeName = (place) => (place ? [place.city, place.region].filter(Boolean).join(", ") : null);

export function experienceFacts(experience) {
  const route = experience.route ?? {};
  return {
    slug: experience.slug,
    titulo: experience.title,
    descripcion: experience.description ?? null,
    puntoDeEncuentro: experience.meetingPoint ?? null,
    idioma: experience.language ?? null,
    horasTotales: experience.duration,
    participantes: { minimo: experience.minParticipants ?? 1, maximo: experience.maxParticipants },
    precioDesdeEuros: experience.priceFrom ?? null,
    proximaSalida: experience.nextDepartureAt ?? null,
    ruta: {
      titulo: route.title ?? null,
      km: route.distance ?? null,
      horasConduciendo: route.duration ?? null,
      dificultad: DIFFICULTY[route.difficulty] ?? route.difficulty ?? null,
      tipo: route.category?.name ?? null,
      salida: placeName(route.startLocation),
      llegada: placeName(route.endLocation),
      circular: Boolean(route.startLocation?.slug) && route.startLocation?.slug === route.endLocation?.slug,
    },
    anfitrion: experience.host ? { nombre: experience.host.name, biografia: experience.host.biography ?? null } : null,
    motoDelGuia: experience.guideBike
      ? {
          moto: [experience.guideBike.brand, experience.guideBike.model, experience.guideBike.version].filter(Boolean).join(" "),
          tipo: experience.guideBike.type ?? null,
          carnet: experience.guideBike.license ?? null,
        }
      : null,
  };
}

export function departureFacts(departures = []) {
  return departures.map((departure) => ({
    slug: departure.slug ?? null,
    inicio: departure.startAt,
    fin: departure.endAt ?? null,
    precioEuros: departure.price ?? null,
    plazasLibres: departure.seatsLeft ?? null,
    completa: departure.isFull ?? false,
  }));
}

/** El tiempo, en corto: por salida, la mínima, la máxima y los avisos. */
export function weatherFacts(weather) {
  if (!weather) return null;
  return weather.departures.map((departure) => {
    const temperatures = departure.days.flatMap((day) => [day.min, day.max]).filter((value) => value !== null);
    return {
      inicio: departure.startAt,
      tipo: departure.kind === "forecast" ? "previsión" : `referencia: lo que hizo esos días en ${departure.referenceYear}`,
      cielo: [...new Set(departure.days.map((day) => day.label))],
      minima: temperatures.length ? Math.min(...temperatures) : null,
      maxima: temperatures.length ? Math.max(...temperatures) : null,
      avisos: [...new Set(departure.days.flatMap((day) => day.warnings))],
    };
  });
}

/** Las paradas, en corto: solo los nombres (los que tienen) y a cuántos km. */
export function stopsFacts(stops) {
  if (!stops) return null;
  const names = (list) => list.filter((stop) => stop.name).map((stop) => `${stop.name} (${stop.distanceKm} km)`);
  const around = (point) =>
    point && { lugar: point.place.city, comer: names(point.food), gasolineras: names(point.fuel), miradores: names(point.viewpoints) };
  return { salida: around(stops.start), llegada: around(stops.end) };
}
