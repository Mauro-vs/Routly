/*
 * El paisaje de la marca: tres sierras y una carretera con su línea discontinua, en los verdes de
 * la paleta. Es la imagen de recurso cuando una experiencia, un destino o un anfitrión no tienen
 * foto (o no carga). Cada semilla dibuja uno distinto, y siempre el mismo para la misma semilla,
 * así dos tarjetas seguidas no parecen la misma.
 */

export interface Landscape {
  sky: [string, string];
  ridges: string[];
  road: string;
  line: string;
}

// Cielos de la paleta: amanecer, mediodía y atardecer, siempre apagados
const SKIES: Array<[string, string]> = [
  ['#9fbfb0', '#dde8d6'],
  ['#7fa596', '#cfdccd'],
  ['#b9c79a', '#e6ead2'],
  ['#5f8577', '#b6cbbd'],
];

/** Un número de 0 a 1, siempre el mismo para la misma semilla (FNV-1a + xorshift). */
function random(seed: string): () => number {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return (hash >>> 0) / 4294967296;
  };
}

export function drawLandscape(seed: string): Landscape {
  const next = random(seed || 'routly');
  const sky = SKIES[Math.floor(next() * SKIES.length)];

  // Una sierra: puntos cada 100 px a una altura que sube y baja, cerrada por abajo
  const ridge = (base: number, amplitude: number): string => {
    let path = `M0 ${base}`;
    for (let x = 0; x <= 1200; x += 100) path += ` L${x} ${Math.round(base - next() * amplitude)}`;
    return `${path} L1200 800 L0 800 Z`;
  };

  const bend = Math.round(320 + next() * 560);
  return {
    sky,
    ridges: [ridge(390, 170), ridge(480, 140), ridge(570, 110)],
    road: `M${bend - 34} 480 C ${bend} 570, 900 610, 780 800 L 520 800 C 650 630, ${bend - 70} 570, ${bend - 44} 480 Z`,
    line: `M${bend - 39} 486 C ${bend - 14} 580, 820 630, 650 800`,
  };
}
