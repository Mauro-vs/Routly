import { Image } from '../../../../core/models/image.model';
import { renderForm } from '../../../../shared/forms/form-test-utils';
import { ImageFormComponent } from './image-form.component';

const IMAGE: Image = {
  _id: 'i1',
  ownerType: 'route',
  ownerId: 'r1',
  url: 'https://img.routly.dev/a.jpg',
  alt: 'Calas de la Costa Brava',
  position: 0,
  isCover: true,
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ImageFormComponent', () => {
  it('muestra el dueño bloqueado y solo envía la dirección y el texto alternativo', async () => {
    const form = await renderForm(ImageFormComponent, { record: IMAGE });
    expect(form.element.textContent).toContain('El dueño de una imagen no se puede cambiar.');

    form.type('alt', 'Cala Montjoi');
    await form.submit();

    expect(form.saved).toEqual([
      { mode: 'update', payload: { url: 'https://img.routly.dev/a.jpg', alt: 'Cala Montjoi' } },
    ]);
  });

  it('rechaza una dirección sin http ni https', async () => {
    const form = await renderForm(ImageFormComponent, { record: IMAGE });
    form.type('url', 'ftp://img.routly.dev/a.jpg');
    await form.submit();

    expect(form.saved).toEqual([]);
    expect(form.element.textContent).toContain('Escribe una dirección completa');
  });
});
