import { byText, matchesQuery, normalize } from './search';

describe('Búsqueda en los listados', () => {
  it('no distingue mayúsculas ni tildes', () => {
    expect(normalize('  Sóller ÁVILA ')).toBe('soller avila');
    expect(matchesQuery('Caminos de Mallorca · Palma a Sóller', 'SOLLER')).toBeTrue();
  });

  it('todas las palabras tienen que estar, en cualquier orden', () => {
    expect(matchesQuery('Pirineos Adventure Huesca Lleida Montaña', 'montaña pirineos')).toBeTrue();
    expect(matchesQuery('Pirineos Adventure Huesca Lleida Montaña', 'pirineos costa')).toBeFalse();
  });

  it('una búsqueda vacía lo deja pasar todo', () => {
    expect(matchesQuery('Lo que sea', '   ')).toBeTrue();
  });

  it('ordena por texto como lo leería una persona', () => {
    const names = ['zaragoza', 'Ávila', 'barcelona'];
    expect([...names].sort(byText((name: string) => name))).toEqual(['Ávila', 'barcelona', 'zaragoza']);
  });
});
