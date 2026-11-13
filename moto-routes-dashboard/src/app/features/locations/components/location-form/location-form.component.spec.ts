import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Location } from '../../../../core/models/location.model';
import { FormSubmit } from '../../../../shared/forms/entity-form';
import { LocationFormComponent } from './location-form.component';

const PALMA: Location = {
  _id: '1',
  slug: 'palma-1',
  city: 'Palma',
  region: 'Islas Baleares',
  country: 'España',
  latitude: 39.5696,
  longitude: 2.6502,
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LocationFormComponent', () => {
  let fixture: ComponentFixture<LocationFormComponent>;
  let element: HTMLElement;
  let saved: FormSubmit<unknown>[];

  async function render(record: Location | null = null): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(LocationFormComponent);
    fixture.componentRef.setInput('record', record);
    saved = [];
    fixture.componentInstance.save.subscribe((submit) => saved.push(submit));
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  function type(name: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('al crear propone España como país y no envía coordenadas vacías', async () => {
    await render();
    expect(element.querySelector<HTMLInputElement>('[name="country"]')!.value).toBe('España');

    type('city', 'Sóller');
    await submit();

    expect(saved).toEqual([
      { mode: 'create', payload: { city: 'Sóller', region: undefined, country: 'España' } },
    ]);
  });

  it('la latitud sin la longitud no se envía y se explica', async () => {
    await render();
    type('city', 'Sóller');
    type('latitude', '39.76');
    await submit();

    expect(saved).toEqual([]);
    expect(element.textContent).toContain('Indica la latitud y la longitud, o ninguna de las dos.');
  });

  it('rechaza una latitud fuera de rango', async () => {
    await render();
    type('city', 'Sóller');
    type('latitude', '120');
    type('longitude', '2');
    await submit();

    expect(saved).toEqual([]);
    expect(element.textContent).toContain('El valor máximo es 90.');
  });

  it('con las dos coordenadas las envía como números', async () => {
    await render();
    type('city', 'Sóller');
    type('latitude', '39.7667');
    type('longitude', '2.7153');
    await submit();

    expect(saved[0]).toEqual({
      mode: 'create',
      payload: { city: 'Sóller', region: undefined, country: 'España', latitude: 39.7667, longitude: 2.7153 },
    });
  });

  it('al editar, vaciar las dos coordenadas las quita (las envía a null)', async () => {
    await render(PALMA);
    type('latitude', '');
    type('longitude', '');
    await submit();

    expect(saved).toEqual([
      {
        mode: 'update',
        payload: {
          city: 'Palma',
          region: 'Islas Baleares',
          country: 'España',
          latitude: null,
          longitude: null,
        },
      },
    ]);
  });

  it('al editar una ubicación sin coordenadas, dejarlas vacías no envía nada', async () => {
    await render({ ...PALMA, latitude: undefined, longitude: undefined });
    await submit();

    expect(saved[0]).toEqual({
      mode: 'update',
      payload: { city: 'Palma', region: 'Islas Baleares', country: 'España' },
    });
  });
});
