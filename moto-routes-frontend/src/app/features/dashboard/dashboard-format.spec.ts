import { daysUntil, seats, shortDate } from './dashboard-format';

describe('Textos del Dashboard', () => {
  it('cuenta los días que faltan desde la última carga, nunca en negativo', () => {
    const from = new Date('2026-11-04T10:00:00.000Z');
    expect(daysUntil('2026-11-12T07:00:00.000Z', from)).toBe(8);
    expect(daysUntil('2026-11-04T11:00:00.000Z', from)).toBe(1);
    expect(daysUntil('2026-11-01T10:00:00.000Z', from)).toBe(0);
  });

  it('concierta las plazas y escribe la fecha corta sin el punto del mes', () => {
    expect(seats(1)).toBe('1 plaza');
    expect(seats(8)).toBe('8 plazas');
    expect(shortDate('2026-11-11T07:00:00.000Z')).not.toContain('.');
  });
});
