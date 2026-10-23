import { Role } from '../../../../core/models/role.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { RoleFormComponent } from './role-form.component';

function role(fields: Partial<Role>): Role {
  return {
    _id: '1',
    slug: 'editor-1',
    name: 'editor',
    label: 'Editor',
    isSystem: false,
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...fields,
  };
}

describe('RoleFormComponent', () => {
  it('el nombre interno solo admite minúsculas, números y guiones', async () => {
    const form = await renderForm(RoleFormComponent, { record: null });
    form.type('label', 'Editor de contenido');
    form.type('name', 'Editor Contenido');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Usa solo minúsculas, números y guiones');

    form.type('name', 'content-editor');
    await form.submit();
    expect(form.saved).toEqual([
      {
        mode: 'create',
        payload: { name: 'content-editor', label: 'Editor de contenido', description: undefined },
      },
    ]);
  });

  it('en un rol base el nombre interno se muestra bloqueado y no se envía', async () => {
    const form = await renderForm(RoleFormComponent, {
      record: role({ name: 'admin', label: 'Administrador', isSystem: true }),
    });

    expect(form.field('name')).toBeNull();
    expect(form.element.textContent).toContain('Los roles base no se pueden renombrar.');

    form.type('label', 'Administración');
    await form.submit();
    expect(form.saved).toEqual([
      { mode: 'update', payload: { label: 'Administración', description: undefined } },
    ]);
  });

  it('en un rol personalizado se puede cambiar el nombre interno', async () => {
    const form = await renderForm(RoleFormComponent, { record: role({}) });
    form.type('name', 'editor-jefe');
    await form.submit();

    expect(form.saved[0]).toEqual({
      mode: 'update',
      payload: { name: 'editor-jefe', label: 'Editor', description: undefined },
    });
  });
});
