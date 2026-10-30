import { Bike } from '../../../../core/models/bike.model';
import { Experience } from '../../../../core/models/experience.model';
import { Host } from '../../../../core/models/host.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { ExperienceFormComponent } from './experience-form.component';

const BIKE = { _id: 'b1', brand: 'BMW', model: 'R 1250 GS', nickname: 'La Tramuntana' } as unknown as Bike;
const HOSTS = [
  { _id: 'h1', name: 'Lucía' },
  { _id: 'h2', name: 'Pablo' },
] as unknown as Host[];

const EXPERIENCE = {
  _id: 'e1',
  hostId: 'h1',
  host: { _id: 'h1', name: 'Lucía', slug: 'lucia' },
  routeId: 'r1',
  route: { _id: 'r1', title: 'Tramuntana', slug: 'tramuntana' },
  title: 'Al amanecer',
  language: 'es',
  duration: 5,
  minParticipants: 2,
  maxParticipants: 8,
  guideBikeId: 'b1',
  guideBike: BIKE,
} as unknown as Experience;

describe('La moto del guía en una experiencia', () => {
  const render = (record: Experience | null = EXPERIENCE) =>
    renderForm(ExperienceFormComponent, { record, hosts: HOSTS, guideBikes: [BIKE] });

  it('ofrece "Sin moto" y las motos del anfitrión, con la actual elegida', async () => {
    const form = await render();
    const select = form.field('guideBikeId') as unknown as HTMLSelectElement;

    expect(select.value).toBe('b1');
    expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual([
      'Sin moto',
      'La Tramuntana',
    ]);
  });

  it('al cambiar de anfitrión la moto se vacía y se piden las del nuevo', async () => {
    const form = await render();
    const asked: string[] = [];
    form.fixture.componentInstance.hostChange.subscribe((id) => asked.push(id));

    form.select('hostId', 'h2');
    await form.fixture.whenStable();

    expect((form.field('guideBikeId') as unknown as HTMLSelectElement).value).toBe('');
    expect(asked).toEqual(['h2']);
  });

  it('la moto guardada deja de ofrecerse con otro anfitrión', async () => {
    const form = await render();
    form.fixture.componentRef.setInput('guideBikes', []);

    form.select('hostId', 'h2');
    await form.fixture.whenStable();

    const select = form.field('guideBikeId') as unknown as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual(['Sin moto']);
  });

  it('quitar la moto envía null: la API la borra', async () => {
    const form = await render();

    form.select('guideBikeId', '');
    await form.submit();

    expect(form.saved[0]?.payload).toEqual(jasmine.objectContaining({ guideBikeId: null }));
  });

  it('sin moto y sin haberla tenido, no se envía', async () => {
    const form = await render({ ...EXPERIENCE, guideBikeId: undefined, guideBike: null });

    await form.submit();

    expect(Object.keys(form.saved[0]?.payload as object)).not.toContain('guideBikeId');
  });
});
