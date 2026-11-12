import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterGroupComponent, FilterOption } from './filter-group.component';

const OPTIONS: FilterOption[] = [
  { value: 'montana', label: 'Montaña', count: 6 },
  { value: 'costa', label: 'Costa', count: 3 },
];

describe('FilterGroupComponent', () => {
  let fixture: ComponentFixture<FilterGroupComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FilterGroupComponent], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FilterGroupComponent);
    fixture.componentRef.setInput('legend', 'Tipo de carretera');
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('allLabel', 'Cualquiera');
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  const radios = (): HTMLInputElement[] => [...element.querySelectorAll<HTMLInputElement>('input[type=radio]')];
  const labels = (): string[] => [...element.querySelectorAll('label')].map((label) => label.textContent?.replace(/\s+/g, ' ').trim() ?? '');

  it('es un grupo de opciones con su leyenda, la de todas primero y cuántas tiene cada una', () => {
    expect(element.querySelector('legend')?.textContent?.trim()).toBe('Tipo de carretera');
    // La coma solo la oye el lector de pantalla: "Montaña, 6"
    expect(labels()).toEqual(['Cualquiera', 'Montaña, 6', 'Costa, 3']);
    expect(new Set(radios().map((radio) => radio.name)).size).toBe(1);
  });

  it('marca la opción del valor; sin valor, la de todas', () => {
    expect(radios()[0].checked).toBeTrue();

    fixture.componentRef.setInput('value', 'costa');
    fixture.detectChanges();
    expect(radios()[2].checked).toBeTrue();
  });

  it('al elegir una opción cambia el valor, y la de todas lo quita', () => {
    const values: Array<string | null> = [];
    fixture.componentInstance.value.subscribe((value) => values.push(value));

    radios()[1].click();
    radios()[0].click();

    expect(values).toEqual(['montana', null]);
  });
});
