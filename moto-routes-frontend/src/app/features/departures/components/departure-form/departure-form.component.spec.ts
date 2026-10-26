import { Departure } from '../../../../core/models/departure.model';
import { Experience } from '../../../../core/models/experience.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { toLocalInput } from '../../../../shared/utils/dates';
import { DepartureFormComponent } from './departure-form.component';

const DATES = {
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const;

const EXPERIENCES = [
  { _id: 'e1', slug: 'costa-e1', title: 'Costa Brava en moto', minParticipants: 2, maxParticipants: 8 },
] as unknown as Experience[];

/** Una fecha dentro de `days` días, a las 9:00 en hora local, como la da el input. */
function localIn(days: number, hour = 9): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return toLocalInput(date.toISOString());
}

const DEPARTURE: Departure = {
  _id: 'd1',
  slug: 'costa-2026-11-08-d1',
  experienceId: 'e1',
  experience: { _id: 'e1', title: 'Costa Brava en moto', slug: 'costa-e1' },
  startAt: '2026-11-08T08:00:00.000Z',
  endAt: '2026-11-08T16:00:00.000Z',
  capacity: 6,
  price: 120,
  state: 'scheduled',
  sku: 'RTL-DEP-261108-7QX2M',
  ...DATES,
};

describe('DepartureFormComponent', () => {
  async function render(record: Departure | null = null) {
    return renderForm(DepartureFormComponent, { record, experiences: EXPERIENCES });
  }

  it('al crear, el inicio tiene que ser futuro y el fin posterior al inicio', async () => {
    const form = await render();
    form.select('experienceId', 'e1');
    form.type('startAt', localIn(-1));
    form.type('endAt', localIn(-2));
    form.type('capacity', '4');
    form.type('price', '99.9');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Elige una fecha futura.');
    expect(form.element.textContent).toContain('Tiene que ser posterior al inicio.');
  });

  it('las plazas van entre el mínimo y el máximo de la experiencia', async () => {
    const form = await render();
    form.select('experienceId', 'e1');
    await form.fixture.whenStable();
    expect(form.element.textContent).toContain('Entre 2 y 8, el mínimo y el máximo de la experiencia.');

    form.type('capacity', '9');
    await form.submit();
    expect(form.element.textContent).toContain('El valor máximo es 8.');

    form.type('capacity', '1');
    await form.submit();
    expect(form.element.textContent).toContain('El valor mínimo es 2.');
  });

  it('el precio es como mucho 100.000 €', async () => {
    const form = await render();
    form.type('price', '100001');
    await form.submit();
    expect(form.element.textContent).toContain('El valor máximo es 100000.');
  });

  const completedOption = (element: HTMLElement): HTMLOptionElement =>
    element.querySelector<HTMLOptionElement>('select[name="state"] option[value="completed"]')!;

  it('«Realizada» no se puede elegir si la salida no ha terminado', async () => {
    const form = await render(DEPARTURE);
    expect(completedOption(form.element).disabled).toBeTrue();
    expect(form.element.textContent).toContain('«Realizada» se puede marcar cuando haya terminado.');
  });

  it('«Realizada» se puede elegir cuando la salida ya ha terminado', async () => {
    const form = await render({
      ...DEPARTURE,
      startAt: '2026-01-10T08:00:00.000Z',
      endAt: '2026-01-10T16:00:00.000Z',
    });
    expect(completedOption(form.element).disabled).toBeFalse();
  });

  it('una salida realizada cuyo fin se mueve al futuro no se puede guardar así', async () => {
    const form = await render({
      ...DEPARTURE,
      state: 'completed',
      startAt: '2026-01-10T08:00:00.000Z',
      endAt: '2026-01-10T16:00:00.000Z',
    });
    form.type('startAt', localIn(20));
    form.type('endAt', localIn(20, 17));
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Solo se puede marcar como realizada cuando ya ha terminado.');
  });

  it('el estado de una salida cancelada se muestra bloqueado con su motivo', async () => {
    const form = await render({ ...DEPARTURE, state: 'cancelled' });

    expect(form.field('state')).toBeNull();
    expect(form.element.textContent).toContain('Una salida cancelada no se puede reabrir.');

    form.type('price', '99');
    await form.submit();
    expect(form.saved[0]).toEqual({
      mode: 'update',
      payload: { capacity: 6, price: 99, state: 'cancelled' },
    });
  });

  it('el precio admite como mucho dos decimales', async () => {
    const form = await render();
    form.type('price', '10.555');
    await form.submit();
    expect(form.element.textContent).toContain('Usa como mucho 2 decimales.');
  });

  it('envía las fechas en ISO (UTC) a partir de la hora local', async () => {
    const form = await render();
    const start = localIn(10);
    const end = localIn(10, 17);
    form.select('experienceId', 'e1');
    form.type('startAt', start);
    form.type('endAt', end);
    form.type('capacity', '6');
    form.type('price', '120.50');
    await form.submit();

    expect(form.saved[0]).toEqual({
      mode: 'create',
      payload: {
        experienceId: 'e1',
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        capacity: 6,
        price: 120.5,
        state: 'scheduled',
      },
    });
  });

  it('al editar muestra la experiencia y el SKU, y no los envía', async () => {
    const form = await render(DEPARTURE);

    expect(form.field('experienceId')).toBeNull();
    expect(form.element.textContent).toContain('RTL-DEP-261108-7QX2M');
    expect(form.field('startAt')!.value).toBe(toLocalInput(DEPARTURE.startAt));

    form.select('state', 'cancelled');
    await form.submit();
    // Las fechas no han cambiado: no se envían
    expect(form.saved[0]).toEqual({
      mode: 'update',
      payload: { capacity: 6, price: 120, state: 'cancelled' },
    });
  });

  it('una salida que ya pasó se puede marcar como realizada sin enviar su fecha', async () => {
    const past: Departure = {
      ...DEPARTURE,
      startAt: '2026-01-10T08:00:00.000Z',
      endAt: '2026-01-10T16:00:00.000Z',
    };
    const form = await render(past);
    form.select('state', 'completed');
    await form.submit();

    expect(form.saved[0]).toEqual({
      mode: 'update',
      payload: { capacity: 6, price: 120, state: 'completed' },
    });
  });

  it('al editar, las fechas cambiadas sí se envían', async () => {
    const form = await render(DEPARTURE);
    const start = localIn(20);
    const end = localIn(20, 17);
    form.type('startAt', start);
    form.type('endAt', end);
    await form.submit();

    expect(form.saved[0]).toEqual({
      mode: 'update',
      payload: {
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        capacity: 6,
        price: 120,
        state: 'scheduled',
      },
    });
  });
});
