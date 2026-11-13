import { Bike } from '../../../../core/models/bike.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { BikeFormComponent } from './bike-form.component';

const bike: Bike = {
  _id: 'b1',
  userId: 'u1',
  brand: 'Honda',
  model: 'CRF1100L',
  version: 'Adventure Sports',
  type: 'adventure',
  cc: 1084,
  hp: 102,
  license: 'A',
  modifications: [{ type: 'exhaust', title: 'Akrapovic', date: '2025-04-12T00:00:00.000Z' }],
  isPrimary: true,
  isPublic: true,
  slug: 'honda-crf',
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('BikeFormComponent', () => {
  it('marca, modelo y tipo son obligatorios', async () => {
    const form = await renderForm(BikeFormComponent, {});

    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Este campo es obligatorio.');
  });

  it('al crear envía solo lo escrito, y nunca el carnet', async () => {
    const form = await renderForm(BikeFormComponent, {});
    form.type('brand', ' Yamaha ');
    form.type('model', 'MT-07');
    form.select('type', 'naked');
    form.type('cc', '689');

    await form.submit();

    expect(form.saved).toEqual([
      {
        mode: 'create',
        payload: { brand: 'Yamaha', model: 'MT-07', type: 'naked', isPublic: true, cc: 689 },
      },
    ]);
  });

  it('una cilindrada fuera de los límites no se envía', async () => {
    const form = await renderForm(BikeFormComponent, {});
    form.type('brand', 'Yamaha');
    form.type('model', 'MT-07');
    form.select('type', 'naked');
    form.type('cc', '10');

    await form.submit();

    expect(form.saved).toEqual([]);
  });

  it('al editar, un campo vaciado va como null y las modificaciones van enteras', async () => {
    const form = await renderForm(BikeFormComponent, { record: bike });
    form.type('version', '');
    form.type('hp', '');

    await form.submit();

    expect(form.saved).toEqual([
      {
        mode: 'update',
        payload: {
          brand: 'Honda',
          model: 'CRF1100L',
          type: 'adventure',
          isPublic: true,
          modifications: [{ type: 'exhaust', title: 'Akrapovic', date: '2025-04-12' }],
          version: null,
          cc: 1084,
          hp: null,
        },
      },
    ]);
  });

  it('muestra el carnet que da la API, sin campo para editarlo', async () => {
    const form = await renderForm(BikeFormComponent, { record: bike });

    expect(form.element.textContent).toContain('Lo calcula la API');
    expect(form.field('license')).toBeNull();
  });

  it('se añaden y se quitan modificaciones', async () => {
    const form = await renderForm(BikeFormComponent, { record: { ...bike, modifications: [] } });
    const button = (text: string): HTMLButtonElement =>
      Array.from(form.element.querySelectorAll('button')).find((item) => item.textContent?.includes(text)) as HTMLButtonElement;

    button('Añadir modificación').click();
    await form.fixture.whenStable();
    expect(form.element.querySelectorAll('.mod').length).toBe(1);

    await form.submit();
    expect(form.saved).toEqual([]);

    button('Quitar').click();
    await form.fixture.whenStable();
    expect(form.element.querySelectorAll('.mod').length).toBe(0);
  });
});
