/*
 * Los paisajes de la marca: la imagen de recurso cuando una experiencia, un destino o un anfitrión
 * no tienen foto (o no carga, que con picsum pasa a menudo). No es un solo dibujo: hay una escena
 * por tipo de carretera (montaña, costa, puertos y viñedos, más una general) y cuatro luces del día
 * (alba, mediodía, atardecer y noche). Lo que no cambia es la carretera: asfalto oscuro con su
 * línea discontinua lima.
 *
 * Todo sale de una semilla (el slug): la misma semilla da siempre el mismo paisaje, y dos semillas
 * seguidas dan paisajes distintos. El lienzo es de 1200 × 800 (3:2, como las fotos del seed).
 */

export type SceneKind = 'mountain' | 'coast' | 'pass' | 'vineyard' | 'plain';

/** Una forma del dibujo: un trazo relleno, una línea o las dos cosas. */
export interface SceneShape {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}

export interface Scene {
  kind: SceneKind;
  sky: [string, string];
  sun: { cx: number; cy: number; r: number; fill: string } | null;
  shapes: SceneShape[];
}

const KINDS: SceneKind[] = ['mountain', 'coast', 'pass', 'vineyard', 'plain'];

/** La escena de un tipo de carretera, por su nombre o su slug ("Montaña", "costa-1a2b"...). */
export function sceneFor(text: string | null | undefined): SceneKind | null {
  const name = (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (/costa|mar|cala|playa/.test(name)) return 'coast';
  if (/puerto|col\b|cols|curva/.test(name)) return 'pass';
  if (/vin|bodega|vino/.test(name)) return 'vineyard';
  if (/montan|sierra|pirine|cumbre|pico/.test(name)) return 'mountain';
  return null;
}

// ---------- La luz ----------

interface Light {
  sky: [string, string];
  sun: string;
  /** El sol (o la luna) alto, bajo o sin verse */
  sunHeight: number;
  /** De lo más lejano a lo más cercano */
  far: string;
  mid: string;
  near: string;
  sea: string;
  snow: string;
  night?: boolean;
}

const LIGHTS: Light[] = [
  // Alba: melocotón apagado sobre verdes claros
  { sky: ['#a9c4b6', '#f1d6b1'], sun: '#f8e6bd', sunHeight: 0.62, far: '#8eae9b', mid: '#4f7c66', near: '#21483a', sea: '#6f9e9a', snow: '#f4f1e6' },
  // Mediodía: el cielo pálido de siempre
  { sky: ['#86ae9f', '#dfe9da'], sun: '#f6f3dc', sunHeight: 0.18, far: '#6e9887', mid: '#33604b', near: '#173a2a', sea: '#3f7f7b', snow: '#ffffff' },
  // Atardecer: ámbar bajo, sierras más cálidas
  { sky: ['#3d5c4f', '#e3aa6d'], sun: '#f3bd6f', sunHeight: 0.66, far: '#6f7d5c', mid: '#3c5a40', near: '#1b3324', sea: '#4e6f62', snow: '#f1dcc0' },
  // Noche: verde de pista casi negro, luna y estrellas
  { sky: ['#0b2118', '#234a3a'], sun: '#e8f0da', sunHeight: 0.2, far: '#2c4f3f', mid: '#1b3b2c', near: '#0e2419', sea: '#17382d', snow: '#c9d6c6', night: true },
];

const ROAD = '#0f1a15';
const LINE = '#c6f04d';

// ---------- El azar con semilla ----------

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

const round = (value: number) => Math.round(value);

/** Una sierra de picos: puntos cada `step` px, cerrada por abajo. Devuelve el trazo y los picos. */
function ridge(next: () => number, base: number, amplitude: number, step: number): { d: string; peaks: Array<[number, number]> } {
  const points: Array<[number, number]> = [];
  for (let x = -step; x <= 1200 + step; x += step) points.push([x, round(base - next() * amplitude)]);
  const peaks = points.filter(([, y], index) => index > 0 && index < points.length - 1 && y < points[index - 1][1] && y < points[index + 1][1]);
  return { d: `M${points.map(([x, y]) => `${x} ${y}`).join(' L')} L1300 800 L-100 800 Z`, peaks };
}

/** Lomas suaves: curvas en vez de picos. */
function hills(next: () => number, base: number, amplitude: number): string {
  let d = `M-50 ${base}`;
  for (let x = 0; x <= 1250; x += 250) {
    const y = round(base - next() * amplitude);
    d += ` Q ${x - 125} ${round(base - amplitude * 0.5 - next() * amplitude * 0.6)}, ${x} ${y}`;
  }
  return `${d} L1300 800 L-100 800 Z`;
}

/** La nieve de un pico: un capuchón con el borde inferior quebrado. */
function snowCap([x, y]: [number, number], size: number): string {
  return `M${x} ${y} L${x + size} ${y + size * 1.1} L${x + size * 0.45} ${y + size * 0.85} L${x} ${y + size * 1.25} L${x - size * 0.45} ${y + size * 0.85} L${x - size} ${y + size * 1.1} Z`;
}

/** Una carretera de ancho fijo: el asfalto y su línea discontinua sobre el mismo trazo. */
function road(d: string, width: number): SceneShape[] {
  return [
    { d, stroke: ROAD, width },
    { d, stroke: LINE, width: Math.max(3, width * 0.09), dash: `${round(width * 0.7)} ${round(width * 0.55)}` },
  ];
}

// ---------- Las escenas ----------

function mountain(next: () => number, light: Light): SceneShape[] {
  const far = ridge(next, 380, 230, 150);
  const mid = ridge(next, 500, 160, 120);
  const near = ridge(next, 600, 90, 200);
  const caps = far.peaks.filter(([, y]) => y < 300).map((peak) => ({ d: snowCap(peak, 34), fill: light.snow, opacity: 0.92 }));
  const bend = round(380 + next() * 440);
  return [
    { d: far.d, fill: light.far },
    ...caps,
    { d: mid.d, fill: light.mid },
    { d: near.d, fill: light.near },
    ...road(`M${bend} 540 C ${bend + 140} 600, ${bend - 220} 660, ${bend + 60} 820`, 70),
  ];
}

function coast(next: () => number, light: Light): SceneShape[] {
  const horizon = round(430 + next() * 40);
  // El cabo, a la izquierda o a la derecha: todo se dibuja a la izquierda y se refleja con fx
  const cliffLeft = next() < 0.5;
  const fx = (x: number) => round(cliffLeft ? x : 1200 - x);
  const edge = 520 + next() * 140;
  // Un cabo redondeado que cae al mar, con una franja más clara en su borde (la luz en la roca)
  const cliff = `M${fx(-60)} ${horizon - 70} Q ${fx(edge * 0.55)} ${horizon - 120}, ${fx(edge)} ${horizon + 30} L${fx(edge + 90)} 820 L${fx(-60)} 820 Z`;
  const rim = `M${fx(edge * 0.62)} ${horizon - 92} Q ${fx(edge * 0.9)} ${horizon - 40}, ${fx(edge)} ${horizon + 30} L${fx(edge + 90)} 820 L${fx(edge + 40)} 820 Q ${fx(edge * 0.92)} ${horizon + 40}, ${fx(edge * 0.62)} ${horizon - 92} Z`;
  // Olas solo en el agua, más anchas y más visibles al acercarse
  const waves: SceneShape[] = [];
  for (let row = 0; row < 6; row++) {
    const y = horizon + 30 + row * 58 + round(next() * 10);
    const start = edge + 140 + next() * (600 - edge * 0.4);
    const span = 50 + row * 14;
    waves.push({ d: `M${fx(start)} ${y} q ${cliffLeft ? span / 2 : -span / 2} -10 ${cliffLeft ? span : -span} 0`, stroke: '#ffffff', width: 2 + row * 0.6, opacity: 0.22 + row * 0.05 });
  }
  // El reflejo del sol en el mar: tres trazos cortos bajo el horizonte
  const glints: SceneShape[] = [0, 1, 2].map((index) => ({
    d: `M${fx(edge + 260 - index * 30)} ${horizon + 14 + index * 18} l ${cliffLeft ? 90 - index * 20 : -(90 - index * 20)} 0`,
    stroke: light.sun,
    width: 5,
    opacity: 0.55 - index * 0.12,
  }));
  // La carretera, sobre el cabo: entra por arriba y baja haciendo una curva, sin tocar el agua
  const roadPath = `M${fx(edge * 0.5)} ${horizon - 88} C ${fx(edge * 0.18)} ${horizon + 20}, ${fx(edge * 0.78)} ${horizon + 150}, ${fx(edge * 0.3)} 830`;
  return [
    { d: ridge(next, horizon, 60, 200).d, fill: light.far, opacity: 0.7 },
    { d: `M-50 ${horizon} L1250 ${horizon} L1250 820 L-50 820 Z`, fill: light.sea },
    ...glints,
    ...waves,
    { d: cliff, fill: light.near },
    { d: rim, fill: light.mid, opacity: 0.75 },
    ...road(roadPath, 52),
  ];
}

function pass(next: () => number, light: Light): SceneShape[] {
  const far = ridge(next, 360, 160, 160);
  // La ladera de enfrente y la carretera que la sube en zigzag
  const slope = `M-50 820 L-50 520 C 300 360, 700 300, 1250 420 L1250 820 Z`;
  const left = round(160 + next() * 120);
  const right = round(860 + next() * 160);
  const turns = [780, 680, 590, 510];
  let d = `M${round((left + right) / 2)} 830`;
  turns.forEach((y, index) => {
    const x = index % 2 === 0 ? right : left;
    d += ` L${x} ${y} Q ${x + (index % 2 === 0 ? 60 : -60)} ${y - 40}, ${x} ${y - 80}`;
  });
  return [
    { d: far.d, fill: light.far },
    { d: ridge(next, 470, 110, 140).d, fill: light.mid },
    { d: slope, fill: light.near },
    ...road(d, 34),
  ];
}

function vineyard(next: () => number, light: Light): SceneShape[] {
  const back = hills(next, 430, 90);
  const front = hills(next, 540, 70);
  // Las hileras de cepas: curvas que siguen la loma, cada vez más separadas al acercarse
  const rows: SceneShape[] = [];
  for (let row = 0; row < 9; row++) {
    const y = 580 + row * row * 3.2 + row * 14;
    rows.push({ d: `M-20 ${round(y + 30)} Q 600 ${round(y - 40 - next() * 20)}, 1220 ${round(y + 30)}`, stroke: light.mid, width: 4 + row * 1.4, dash: `${10 + row * 3} ${8 + row * 2}`, opacity: 0.85 });
  }
  const vanish = round(500 + next() * 200);
  return [
    { d: back, fill: light.far },
    { d: front, fill: light.near },
    ...rows,
    { d: `M${vanish - 8} 520 L${vanish + 8} 520 L${vanish + 190} 820 L${vanish - 190} 820 Z`, fill: ROAD },
    { d: `M${vanish} 528 L${vanish} 820`, stroke: LINE, width: 6, dash: '28 22' },
  ];
}

function plain(next: () => number, light: Light): SceneShape[] {
  const bend = round(320 + next() * 560);
  return [
    { d: ridge(next, 390, 170, 100).d, fill: light.far },
    { d: ridge(next, 480, 140, 100).d, fill: light.mid },
    { d: ridge(next, 570, 110, 100).d, fill: light.near },
    { d: `M${bend - 34} 480 C ${bend} 570, 900 610, 780 800 L 520 800 C 650 630, ${bend - 70} 570, ${bend - 44} 480 Z`, fill: ROAD },
    { d: `M${bend - 39} 486 C ${bend - 14} 580, 820 630, 650 800`, stroke: LINE, width: 6, dash: '24 18' },
  ];
}

const DRAW: Record<SceneKind, (next: () => number, light: Light) => SceneShape[]> = { mountain, coast, pass, vineyard, plain };

/**
 * El paisaje de una semilla. Con `kind`, esa escena; sin él, una de las cinco según la semilla
 * (así los destinos y los anfitriones también son variados).
 */
export function drawScene(seed: string, kind: SceneKind | null = null): Scene {
  const next = random(seed || 'routly');
  const light = LIGHTS[Math.floor(next() * LIGHTS.length)];
  const chosen = kind ?? KINDS[Math.floor(next() * KINDS.length)];
  const shapes = DRAW[chosen](next, light);

  if (light.night) {
    const stars: SceneShape[] = [];
    for (let star = 0; star < 18; star++) {
      const x = round(next() * 1200);
      const y = round(next() * 300);
      const r = next() < 0.2 ? 2.5 : 1.5;
      stars.push({ d: `M${x - r} ${y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`, fill: '#e8f0da', opacity: 0.55 + next() * 0.4 });
    }
    shapes.unshift(...stars);
  }

  return {
    kind: chosen,
    sky: light.sky,
    sun: { cx: round(200 + next() * 800), cy: round(80 + light.sunHeight * 300), r: light.night ? 34 : 56, fill: light.sun },
    shapes,
  };
}
