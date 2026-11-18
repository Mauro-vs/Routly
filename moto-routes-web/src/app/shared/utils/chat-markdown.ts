/*
 * Un markdown mínimo para las respuestas del asistente: párrafos, listas con "- " o "1. ", negrita
 * con ** y enlaces [texto](url). Se convierte en piezas que la plantilla pinta una a una (nunca
 * innerHTML): así lo que escribe la IA no puede meter HTML en la página.
 *
 * Los enlaces solo se respetan si van a una ficha de la web (/experiencias/...) o a una web https;
 * cualquier otro se queda en texto.
 */

export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; href: string; internal: boolean };

export interface MarkdownBlock {
  kind: 'paragraph' | 'item';
  parts: InlinePart[];
}

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
const INTERNAL = /^\/experiencias(\/[a-z0-9-]+)?(\?[^\s]*)?$/;
const EXTERNAL = /^https:\/\/[^\s]+$/;

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) parts.push({ kind: 'text', text: text.slice(last, match.index) });
    if (match[1] !== undefined) {
      parts.push({ kind: 'bold', text: match[1] });
    } else {
      const [label, href] = [match[2], match[3]];
      if (INTERNAL.test(href)) parts.push({ kind: 'link', text: label, href, internal: true });
      else if (EXTERNAL.test(href)) parts.push({ kind: 'link', text: label, href, internal: false });
      else parts.push({ kind: 'text', text: label });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flush = (): void => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', parts: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const item = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (!line) flush();
    else if (item) {
      flush();
      blocks.push({ kind: 'item', parts: parseInline(item[1]) });
    } else {
      // Los títulos (## ...) se quedan como un párrafo en negrita
      const heading = /^#{1,6}\s+(.*)$/.exec(line);
      if (heading) {
        flush();
        blocks.push({ kind: 'paragraph', parts: [{ kind: 'bold', text: heading[1] }] });
      } else paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
