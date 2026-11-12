import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveFilter, ActiveFiltersComponent } from './active-filters.component';

describe('ActiveFiltersComponent', () => {
  let fixture: ComponentFixture<ActiveFiltersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ActiveFiltersComponent], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(ActiveFiltersComponent);
  });

  function render(filters: ActiveFilter[]): HTMLElement {
    fixture.componentRef.setInput('filters', filters);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('sin filtros no enseña nada', () => {
    expect(render([]).querySelector('ul')).toBeNull();
  });

  it('cada filtro activo se quita con su botón, que dice cuál quita', () => {
    const removed: string[] = [];
    fixture.componentInstance.remove.subscribe((key) => removed.push(key));
    const element = render([
      { key: 'categoria', label: 'Montaña' },
      { key: 'buscar', label: '«costa»' },
    ]);
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('li button')];

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Quitar el filtro Montaña', 'Quitar el filtro «costa»']);
    buttons[1].click();
    expect(removed).toEqual(['buscar']);
  });

  it('con alguno puesto, se quitan todos a la vez', () => {
    let cleared = 0;
    fixture.componentInstance.clear.subscribe(() => cleared++);
    const element = render([{ key: 'categoria', label: 'Montaña' }]);

    const clearAll = [...element.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Quitar los filtros');
    clearAll?.click();

    expect(cleared).toBe(1);
  });
});
