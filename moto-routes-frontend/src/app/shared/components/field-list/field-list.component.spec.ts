import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FieldItem, FieldListComponent, formatFieldValue } from './field-list.component';

// Intl separa con espacios no rompibles: se comparan como espacios normales.
const plain = (text: string | null): string | null => text && text.replace(/\s/g, ' ');

describe('formatFieldValue', () => {
  it('sin valor devuelve null', () => {
    expect(formatFieldValue({ label: 'Región', value: null })).toBeNull();
    expect(formatFieldValue({ label: 'Región', value: undefined })).toBeNull();
    expect(formatFieldValue({ label: 'Región', value: '' })).toBeNull();
  });

  it('formatea números con su unidad y precios en euros', () => {
    expect(plain(formatFieldValue({ label: 'Distancia', value: 1200, format: 'number', unit: 'km' }))).toBe(
      '1200 km',
    );
    expect(plain(formatFieldValue({ label: 'Precio', value: 49.9, format: 'money' }))).toBe('49,90 €');
  });

  it('un cero es un valor, no "sin datos"', () => {
    expect(formatFieldValue({ label: 'Duración', value: 0, format: 'number' })).toBe('0');
  });

  it('las fechas se escriben en español', () => {
    expect(formatFieldValue({ label: 'Creada', value: '2026-09-30T10:00:00.000Z', format: 'date' })).toContain(
      '2026',
    );
  });
});

describe('FieldListComponent', () => {
  async function render(items: FieldItem[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(FieldListComponent);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('pinta cada dato con su etiqueta en un <dl>', async () => {
    const element = await render([
      { label: 'Ciudad', value: 'Palma' },
      { label: 'Región', value: null },
    ]);

    const terms = [...element.querySelectorAll('dt')].map((dt) => dt.textContent?.trim());
    const values = [...element.querySelectorAll('dd')].map((dd) => dd.textContent?.trim());
    expect(terms).toEqual(['Ciudad', 'Región']);
    expect(values).toEqual(['Palma', 'Sin datos']);
  });

  it('una relación eliminada se muestra como "Eliminada" y no rompe la página', async () => {
    const element = await render([
      { label: 'Categoría', value: null, relation: true, link: null, gender: 'f' },
    ]);

    expect(element.querySelector('dd')?.textContent?.trim()).toBe('Eliminada');
  });

  it('una relación con datos enlaza a su detalle', async () => {
    const element = await render([
      { label: 'Categoría', value: 'Montaña', relation: true, link: ['/categories', 'montana'] },
    ]);

    const link = element.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Montaña');
    expect(link?.getAttribute('href')).toBe('/categories/montana');
  });

  it('las fechas van en un <time> con el valor ISO', async () => {
    const element = await render([
      { label: 'Inicio', value: '2026-09-30T10:00:00.000Z', format: 'datetime' },
    ]);

    expect(element.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-30T10:00:00.000Z');
  });
});
