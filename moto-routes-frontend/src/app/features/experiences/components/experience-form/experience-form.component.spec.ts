import { ApiError } from '../../../../core/models/api-error.model';
import { Experience } from '../../../../core/models/experience.model';
import { Host } from '../../../../core/models/host.model';
import { Route } from '../../../../core/models/route.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { ExperienceFormComponent } from './experience-form.component';

const DATES = {
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const;

const HOSTS = [
  { _id: 'h1', slug: 'pablo-h1', userId: 'u1', user: null, name: 'Pablo', ...DATES },
] satisfies Host[];
const ROUTES = [{ _id: 'r1', slug: 'costa-r1', title: 'Costa Brava' }] as unknown as Route[];

const EXPERIENCE: Experience = {
  _id: 'e1',
  slug: 'costa-e1',
  hostId: 'h1',
  host: { _id: 'h1', name: 'Pablo', slug: 'pablo-h1' },
  routeId: 'r1',
  route: { _id: 'r1', title: 'Costa Brava', slug: 'costa-r1' },
  title: 'Costa Brava en moto',
  description: 'Calas y curvas',
  language: 'nl',
  duration: 6,
  minParticipants: 2,
  maxParticipants: 8,
  ...DATES,
};

describe('ExperienceFormComponent', () => {
  async function render(record: Experience | null = null) {
    return renderForm(ExperienceFormComponent, { record, hosts: HOSTS, routes: ROUTES });
  }

  it('el mínimo de participantes no puede superar al máximo', async () => {
    const form = await render();
    form.select('routeId', 'r1');
    form.select('hostId', 'h1');
    form.type('title', 'Costa Brava en moto');
    form.type('duration', '6');
    form.type('minParticipants', '5');
    form.type('maxParticipants', '3');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('No puede ser menor que el mínimo de participantes.');

    form.type('maxParticipants', '8');
    await form.submit();
    expect(form.saved[0]).toEqual({
      mode: 'create',
      payload: {
        hostId: 'h1',
        routeId: 'r1',
        title: 'Costa Brava en moto',
        description: undefined,
        meetingPoint: undefined,
        language: 'es',
        duration: 6,
        minParticipants: 5,
        maxParticipants: 8,
      },
    });
  });

  it('las plazas tienen que ser números enteros, como mucho 100', async () => {
    const form = await render();
    form.type('maxParticipants', '120');
    form.type('minParticipants', '1.5');
    await form.submit();

    expect(form.element.textContent).toContain('El valor máximo es 100.');
    expect(form.element.textContent).toContain('Escribe un número entero.');
  });

  it('la duración es mayor que 0 y como mucho 720 horas', async () => {
    const form = await render();
    form.type('duration', '0');
    await form.submit();
    expect(form.element.textContent).toContain('Tiene que ser mayor que 0.');

    form.type('duration', '721');
    await form.submit();
    expect(form.element.textContent).toContain('El valor máximo es 720.');
  });

  it('el título necesita al menos 2 caracteres', async () => {
    const form = await render();
    form.type('title', 'C');
    await form.submit();
    expect(form.element.textContent).toContain('Escribe al menos 2 caracteres.');
  });

  it('un idioma que no está en la lista se conserva como opción', async () => {
    const form = await render(EXPERIENCE);
    expect(form.field('language')!.value).toBe('nl');
    expect(form.element.textContent).toContain('NL');
  });

  it('al editar puede vaciar la descripción', async () => {
    const form = await render(EXPERIENCE);
    form.type('description', '');
    await form.submit();

    const submit = form.saved[0];
    expect(submit.mode).toBe('update');
    expect(submit.payload).toEqual(jasmine.objectContaining({ description: '', meetingPoint: undefined }));
  });

  it('bajar el máximo por debajo de una salida (409) se pinta en el máximo', async () => {
    const form = await render(EXPERIENCE);
    const detail = 'maxParticipants is lower than the capacity of an existing departure';
    form.fixture.componentInstance.showServerError(
      new ApiError({ status: 409, type: 'client', message: 'Hay salidas con más plazas que ese máximo.', detail }),
    );
    await form.fixture.whenStable();

    expect(form.field('maxParticipants')!.getAttribute('aria-invalid')).toBe('true');
    expect(form.element.textContent).toContain('Hay salidas con más plazas que ese máximo.');
  });
});
