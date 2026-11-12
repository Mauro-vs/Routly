// Genera el registro de iconos de la web pública a partir de @phosphor-icons/core.
// Solo se empaquetan los iconos de esta lista, no la librería entera.
//
// Para añadir uno: busca su nombre en https://phosphoricons.com, escríbelo aquí
// y ejecuta `npm run icons`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICONS = [
  // navegación
  'arrow-left',
  'arrow-right',
  'arrow-up-right',
  'caret-left',
  'caret-right',
  'caret-down',
  'x',
  'list',
  // búsqueda y filtros
  'magnifying-glass',
  'sliders-horizontal',
  // datos
  'map-pin',
  'clock',
  'calendar-blank',
  'users',
  'motorcycle',
  'translate',
  'ruler',
  // estado
  'warning-circle',
  'wifi-slash',
  'arrows-clockwise',
  'check',
  // tema
  'sun',
  'moon',
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'node_modules/@phosphor-icons/core/assets/regular');
const output = resolve(root, 'src/app/shared/ui/icon/icons.generated.ts');

const entries = ICONS.map((name) => {
  const svg = readFileSync(resolve(assets, `${name}.svg`), 'utf8');
  const paths = [...svg.matchAll(/<path\b[^>]*?\sd="([^"]+)"/g)].map((match) => match[1]);
  const otherShapes = svg.match(/<(?!\/?svg\b|path\b)[a-z]/gi);
  if (paths.length === 0 || otherShapes) {
    throw new Error(`El icono "${name}" no se puede reducir a un único trazo.`);
  }
  return `  '${name}': '${paths.join('')}',`;
});

const content = `// Archivo generado por tools/generate-icons.mjs a partir de @phosphor-icons/core (licencia MIT).
// No lo edites a mano: añade el nombre del icono en ese script y ejecuta \`npm run icons\`.

export const ICONS = {
${entries.join('\n')}
} as const;

export type IconName = keyof typeof ICONS;
`;

writeFileSync(output, content);
process.stdout.write(`${entries.length} iconos escritos en ${output}\n`);
