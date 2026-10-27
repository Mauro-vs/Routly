import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BarListComponent } from '../bar-list/bar-list.component';
import { ColumnChartComponent } from './column-chart.component';

const SERIES = [
  { key: 'scheduled', label: 'Programadas', singular: 'programada', color: '--color-chart-1' },
  { key: 'cancelled', label: 'Canceladas', singular: 'cancelada', color: '--color-chart-3' },
];

describe('ColumnChartComponent', () => {
  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ColumnChartComponent);
    fixture.componentRef.setInput('label', 'Salidas por mes');
    fixture.componentRef.setInput('unit', 'salidas');
    fixture.componentRef.setInput('unitOne', 'salida');
    fixture.componentRef.setInput('series', SERIES);
    fixture.componentRef.setInput('data', [
      { label: 'nov', fullLabel: 'noviembre de 2026', values: { scheduled: 2, cancelled: 1 } },
      { label: 'dic', fullLabel: 'diciembre de 2026', values: { scheduled: 1, cancelled: 0 } },
    ]);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('cada columna se enfoca y se describe en texto, con el plural correcto', async () => {
    const element = await render();
    const columns = Array.from(element.querySelectorAll<HTMLElement>('.column'));

    expect(columns.map((column) => column.tabIndex)).toEqual([0, 0]);
    expect(columns.map((column) => column.getAttribute('aria-label'))).toEqual([
      'noviembre de 2026: 3 salidas (2 programadas, 1 cancelada)',
      'diciembre de 2026: 1 salida (1 programada)',
    ]);
  });

  it('con dos o más series muestra la leyenda, y la tabla tiene los mismos datos', async () => {
    const element = await render();

    expect(element.querySelector('.legend')?.textContent).toContain('Programadas');
    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.children).map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['noviembre de 2026', '2', '1', '3'],
      ['diciembre de 2026', '1', '0', '1'],
    ]);
  });
});

describe('BarListComponent', () => {
  it('la barra más larga es la del valor más alto, y cada fila se lee en texto', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(BarListComponent);
    fixture.componentRef.setInput('label', 'Rutas por categoría');
    fixture.componentRef.setInput('unit', 'rutas');
    fixture.componentRef.setInput('items', [
      { label: 'Montaña', value: 4 },
      { label: 'Costa', value: 1 },
    ]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    const widths = Array.from(element.querySelectorAll<HTMLElement>('.fill')).map((fill) => fill.style.width);
    expect(widths).toEqual(['100%', '25%']);
    expect(element.querySelector('.bar')?.getAttribute('aria-label')).toBe('Montaña: 4 rutas');
  });
});
