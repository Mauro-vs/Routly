import { Category } from '../../../../core/models/category.model';
import { Location } from '../../../../core/models/location.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { RouteFormComponent } from './route-form.component';

const CATEGORIES = [{ _id: 'c1', slug: 'costa-c1', name: 'Costa', isActive: true }] as unknown as Category[];
const LOCATIONS = [
  { _id: 'l1', slug: 'palma-l1', city: 'Palma', country: 'España', isActive: true },
] as unknown as Location[];

describe('RouteFormComponent', () => {
  async function render() {
    const form = await renderForm(RouteFormComponent, {
      record: null,
      categories: CATEGORIES,
      locations: LOCATIONS,
    });
    form.type('title', 'Serra de Tramuntana');
    form.select('categoryId', 'c1');
    form.select('startLocationId', 'l1');
    form.select('endLocationId', 'l1');
    form.element.querySelector<HTMLInputElement>('#difficulty-medium')!.click();
    return form;
  }

  it('distancia y duración tienen que ser mayores que 0', async () => {
    const form = await render();
    form.type('distance', '0');
    form.type('duration', '0');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Tiene que ser mayor que 0.');
  });

  it('distancia y duración tienen los máximos de la API', async () => {
    const form = await render();
    form.type('distance', '5001');
    form.type('duration', '241');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('El valor máximo es 5000.');
    expect(form.element.textContent).toContain('El valor máximo es 240.');
  });

  it('el título necesita al menos 2 caracteres', async () => {
    const form = await render();
    form.type('title', ' S ');
    form.type('distance', '45');
    form.type('duration', '2');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Escribe al menos 2 caracteres.');
  });

  it('con datos válidos envía la ruta', async () => {
    const form = await render();
    form.type('distance', '45.5');
    form.type('duration', '2');
    await form.submit();

    expect(form.saved).toEqual([
      {
        mode: 'create',
        payload: {
          title: 'Serra de Tramuntana',
          description: undefined,
          difficulty: 'medium',
          distance: 45.5,
          duration: 2,
          categoryId: 'c1',
          startLocationId: 'l1',
          endLocationId: 'l1',
        },
      },
    ]);
  });
});
