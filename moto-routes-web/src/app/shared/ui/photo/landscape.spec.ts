import { drawScene, sceneFor } from './landscape';

describe('landscape', () => {
  it('cada tipo de carretera tiene su escena, por nombre o por slug', () => {
    expect(sceneFor('Montaña')).toBe('mountain');
    expect(sceneFor('costa-1a2b')).toBe('coast');
    expect(sceneFor('Puertos')).toBe('pass');
    expect(sceneFor('Viñedos')).toBe('vineyard');
    expect(sceneFor('Desierto')).toBeNull();
    expect(sceneFor(null)).toBeNull();
  });

  it('la misma semilla da siempre el mismo paisaje', () => {
    expect(drawScene('costa-brava', 'coast')).toEqual(drawScene('costa-brava', 'coast'));
  });

  it('dibuja la escena pedida; sin escena, una según la semilla, y no siempre la misma', () => {
    expect(drawScene('a', 'vineyard').kind).toBe('vineyard');
    const kinds = new Set(Array.from({ length: 30 }, (_, index) => drawScene(`destino-${index}`).kind));
    expect(kinds.size).toBeGreaterThan(2);
  });

  it('siempre lleva la carretera de la marca: la línea discontinua lima', () => {
    for (const kind of ['mountain', 'coast', 'pass', 'vineyard', 'plain'] as const) {
      const line = drawScene('routly', kind).shapes.find((shape) => shape.stroke === '#c6f04d');
      expect(line?.dash).withContext(kind).toBeTruthy();
    }
  });
});
