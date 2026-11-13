import { Host } from '../../../../core/models/host.model';
import { User } from '../../../../core/models/user.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { HostFormComponent } from './host-form.component';

const DATES = {
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const;

const USERS: User[] = [
  {
    _id: 'u1',
    slug: 'ana-u1',
    name: 'Ana',
    email: 'ana@routly.dev',
    roleId: 'r2',
    role: { _id: 'r2', name: 'host', label: 'Anfitrión' },
    ...DATES,
  },
];

const HOST: Host = {
  _id: 'h1',
  slug: 'ana-rutas-h1',
  userId: 'u1',
  user: { _id: 'u1', name: 'Ana', email: 'ana@routly.dev' },
  name: 'Ana Rutas',
  ...DATES,
};

describe('HostFormComponent', () => {
  it('al crear hay que elegir el usuario, que se ofrece con su rol', async () => {
    const form = await renderForm(HostFormComponent, { record: null, users: USERS });
    expect(form.element.textContent).toContain('Ana (Anfitrión)');

    form.type('name', 'Ana Rutas');
    await form.submit();
    expect(form.saved).toEqual([]);

    form.select('userId', 'u1');
    await form.submit();
    expect(form.saved).toEqual([
      { mode: 'create', payload: { userId: 'u1', name: 'Ana Rutas', biography: undefined } },
    ]);
  });

  it('al editar el usuario se muestra bloqueado y no se envía', async () => {
    const form = await renderForm(HostFormComponent, { record: HOST, users: USERS });

    expect(form.field('userId')).toBeNull();
    expect(form.element.textContent).toContain('Ana · ana@routly.dev');

    form.type('biography', 'Guía en los Pirineos');
    await form.submit();
    expect(form.saved).toEqual([
      { mode: 'update', payload: { name: 'Ana Rutas', biography: 'Guía en los Pirineos' } },
    ]);
  });
});
