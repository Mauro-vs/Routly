import { parseInline, parseMarkdown } from './chat-markdown';

describe('parseMarkdown', () => {
  it('separa párrafos y elementos de lista', () => {
    const blocks = parseMarkdown('Te propongo dos:\n\n- La primera\n- La segunda\n\nAdemás, mira el tiempo.');
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'item', 'item', 'paragraph']);
  });

  it('respeta la negrita y los enlaces a fichas de la web', () => {
    expect(parseInline('Mira **Pirineo** en [su ficha](/experiencias/pirineo-1a2b).')).toEqual([
      { kind: 'text', text: 'Mira ' },
      { kind: 'bold', text: 'Pirineo' },
      { kind: 'text', text: ' en ' },
      { kind: 'link', text: 'su ficha', href: '/experiencias/pirineo-1a2b', internal: true },
      { kind: 'text', text: '.' },
    ]);
  });

  it('un enlace raro se queda en texto: nada de javascript: ni de otras rutas', () => {
    expect(parseInline('[pincha](javascript:alert(1))')).toEqual([{ kind: 'text', text: 'pincha' }, { kind: 'text', text: ')' }]);
    expect(parseInline('[panel](/admin)')).toEqual([{ kind: 'text', text: 'panel' }]);
    expect(parseInline('[mapa](https://www.openstreetmap.org/node/1)')[0]).toEqual({
      kind: 'link',
      text: 'mapa',
      href: 'https://www.openstreetmap.org/node/1',
      internal: false,
    });
  });

  it('el texto con < y > se queda como texto (la plantilla nunca usa innerHTML)', () => {
    expect(parseMarkdown('<img src=x onerror=alert(1)>')[0].parts).toEqual([{ kind: 'text', text: '<img src=x onerror=alert(1)>' }]);
  });
});
