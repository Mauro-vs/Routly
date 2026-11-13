import { formatHours, formatPrice, formatShortDate, formatTime, plural } from './shop-format';

// Los espacios de Intl (no separables) se normalizan para comparar
const clean = (text: string): string => text.replace(/\s/g, ' ');

describe('shop-format', () => {
  it('un precio entero, sin decimales; con céntimos, siempre dos', () => {
    expect(clean(formatPrice(89))).toBe('89 €');
    expect(clean(formatPrice(149.5))).toBe('149,50 €');
    expect(clean(formatPrice(12500.5))).toBe('12.500,50 €');
  });

  it('la fecha corta sin el punto de la abreviatura, y la hora de la península', () => {
    expect(formatShortDate('2026-11-20T08:00:00.000Z')).toBe('20 nov');
    expect(formatTime('2026-11-20T08:00:00.000Z')).toBe('09:00');
  });

  it('horas y plurales', () => {
    expect(formatHours(1.5)).toBe('1,5 h');
    expect(plural(1, 'experiencia', 'experiencias')).toBe('1 experiencia');
    expect(plural(0, 'experiencia', 'experiencias')).toBe('0 experiencias');
  });
});
