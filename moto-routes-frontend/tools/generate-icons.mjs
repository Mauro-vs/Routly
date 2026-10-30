// Genera el registro de iconos del panel a partir de @phosphor-icons/core.
// Solo se empaquetan los iconos de esta lista, no la librería entera.
//
// Para añadir uno: busca su nombre en https://phosphoricons.com, escríbelo aquí
// y ejecuta `npm run icons`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICONS = [
  // navegación
  'squares-four',
  'path',
  'compass',
  'calendar-blank',
  'tag',
  'map-pin',
  'user-circle',
  'users',
  'shield-check',
  'images',
  'list',
  'list-bullets',
  'x',
  'caret-left',
  'caret-right',
  'arrow-left',
  'arrow-right',
  'arrow-up-right',
  'book-open',
  // acciones
  'plus',
  'pencil-simple',
  'trash',
  'check',
  'magnifying-glass',
  'arrows-clockwise',
  'arrow-counter-clockwise',
  'eye',
  'arrow-up',
  'arrow-down',
  'star',
  // estado y datos
  'check-circle',
  'warning',
  'warning-circle',
  'eye-slash',
  'x-circle',
  'lock-simple',
  'calendar-check',
  'image',
  'ruler',
  'clock',
  'wifi-slash',
  'prohibit',
  'sign-out',
  'sun',
  'moon',
  'motorcycle',
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'node_modules/@phosphor-icons/core/assets/regular');
const output = resolve(root, 'src/app/shared/components/icon/icons.generated.ts');

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
