import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardCatalogComponent, OtherCategories } from './dashboard-catalog.component';

describe('DashboardCatalogComponent', () => {
  let fixture: ComponentFixture<DashboardCatalogComponent>;

  async function render(other: OtherCategories | null): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    fixture = TestBed.createComponent(DashboardCatalogComponent);
    fixture.componentRef.setInput('stats', [{ label: 'en 5 rutas', value: '860', unit: 'km' }]);
    fixture.componentRef.setInput('byDifficulty', [{ label: 'Fácil', value: 1 }]);
    fixture.componentRef.setInput('byCategory', [{ label: 'Montaña', value: 2 }]);
    fixture.componentRef.setInput('otherCategories', other);
    fixture.componentRef.setInput('months', [
      { label: 'nov', fullLabel: 'noviembre de 2026', total: 2 },
      { label: 'dic', fullLabel: 'diciembre de 2026', total: 0 },
    ]);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('marca los meses con salidas y los nombra enteros para el lector de pantalla', async () => {
    const element = await render(null);
    const months = element.querySelectorAll('.months li');

    expect(months[0].classList).toContain('has-departures');
    expect(months[0].getAttribute('aria-label')).toBe('noviembre de 2026: 2');
    expect(months[1].classList).not.toContain('has-departures');
  });

  it('las categorías sin barra se resumen en una línea, en singular si es una ruta', async () => {
    expect((await render(null)).textContent).not.toContain('categorías más');

    TestBed.resetTestingModule();
    const element = await render({ count: 3, routes: 1 });
    expect(element.textContent).toContain('Y 3 categorías más, con 1 ruta en total.');
  });
});
