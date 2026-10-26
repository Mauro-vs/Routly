import { ApiError } from '../../../../core/models/api-error.model';
import { Role } from '../../../../core/models/role.model';
import { User } from '../../../../core/models/user.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { UserFormComponent } from './user-form.component';

const DATES = {
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const;

const ROLES: Role[] = [
  { _id: 'r1', slug: 'rider-1', name: 'rider', label: 'Motero', isSystem: true, ...DATES },
  { _id: 'r2', slug: 'host-2', name: 'host', label: 'Anfitrión', isSystem: true, ...DATES },
];

const ANA: User = {
  _id: 'u1',
  slug: 'ana-u1',
  name: 'Ana',
  email: 'ana@routly.dev',
  roleId: 'r1',
  role: { _id: 'r1', name: 'rider', label: 'Motero' },
  ...DATES,
};

describe('UserFormComponent', () => {
  it('al crear, la contraseña es obligatoria y tiene al menos 8 caracteres', async () => {
    const form = await renderForm(UserFormComponent, { record: null, roles: ROLES });
    form.type('name', 'Luis');
    form.type('email', 'luis@routly.dev');
    form.type('password', 'corta');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Escribe al menos 8 caracteres.');
  });

  it('la contraseña necesita al menos una letra y un número', async () => {
    const form = await renderForm(UserFormComponent, { record: null, roles: ROLES });
    form.type('name', 'Luis');
    form.type('email', 'luis@routly.dev');
    form.type('password', 'solotexto');
    await form.submit();
    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Usa al menos una letra y un número.');

    form.type('password', '12345678');
    await form.submit();
    expect(form.saved).toEqual([]);
  });

  it('el email necesita un dominio con punto, como en la API', async () => {
    const form = await renderForm(UserFormComponent, { record: null, roles: ROLES });
    form.type('name', 'Luis');
    form.type('email', 'luis@localhost');
    form.type('password', 'segura-1234');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Escribe un correo electrónico válido.');
  });

  it('sin rol elegido no se envía roleId: la API pone rider', async () => {
    const form = await renderForm(UserFormComponent, { record: null, roles: ROLES });
    form.type('name', 'Luis');
    form.type('email', 'luis@routly.dev');
    form.type('password', 'segura-1234');
    await form.submit();

    expect(form.saved).toEqual([
      { mode: 'create', payload: { name: 'Luis', email: 'luis@routly.dev', password: 'segura-1234' } },
    ]);
  });

  it('al editar no pide ni envía la contraseña si no se va a cambiar', async () => {
    const form = await renderForm(UserFormComponent, { record: ANA, roles: ROLES });

    expect(form.field('password')).toBeNull();
    form.type('name', 'Ana María');
    await form.submit();

    expect(form.saved).toEqual([
      { mode: 'update', payload: { name: 'Ana María', email: 'ana@routly.dev', roleId: 'r1' } },
    ]);
  });

  it('al marcar "Cambiar la contraseña" la pide y la envía', async () => {
    const form = await renderForm(UserFormComponent, { record: ANA, roles: ROLES });
    form.field('changePassword')!.click();
    await form.fixture.whenStable();

    await form.submit();
    expect(form.saved).toEqual([]);

    form.type('password', 'nueva-clave-1');
    await form.submit();
    expect(form.saved[0]).toEqual({
      mode: 'update',
      payload: { name: 'Ana', email: 'ana@routly.dev', roleId: 'r1', password: 'nueva-clave-1' },
    });
  });

  it('un email repetido (409) se pinta en el email; quitar el rol a un anfitrión, en el rol', async () => {
    const form = await renderForm(UserFormComponent, { record: ANA, roles: ROLES });
    const conflict = (detail: string): ApiError =>
      new ApiError({ status: 409, type: 'client', message: detail, detail });

    form.fixture.componentInstance.showServerError(conflict('A user with this email already exists'));
    await form.fixture.whenStable();
    expect(form.field('email')!.getAttribute('aria-invalid')).toBe('true');

    form.fixture.componentInstance.showServerError(conflict('User has a host profile'));
    await form.fixture.whenStable();
    expect(form.field('roleId')!.getAttribute('aria-invalid')).toBe('true');
  });
});
