import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiError } from '../../../../core/models/api-error.model';
import { Category } from '../../../../core/models/category.model';
import { FormSubmit } from '../../../../shared/forms/entity-form';
import { CategoryFormComponent } from './category-form.component';

const CATEGORY: Category = {
  _id: '1',
  slug: 'montana-1',
  name: 'Montaña',
  description: 'Puertos y curvas',
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CategoryFormComponent', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;
  let element: HTMLElement;
  let saved: FormSubmit<unknown>[];

  async function render(record: Category | null = null): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(CategoryFormComponent);
    fixture.componentRef.setInput('record', record);
    saved = [];
    fixture.componentInstance.save.subscribe((submit) => saved.push(submit));
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  function type(name: string, value: string): void {
    const input = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('no envía un nombre vacío ni de una letra, y lo explica en el campo', async () => {
    await render();
    await submit();
    expect(saved).toEqual([]);
    expect(element.textContent).toContain('Este campo es obligatorio.');

    type('name', ' M ');
    await submit();
    expect(saved).toEqual([]);
    expect(element.textContent).toContain('Escribe al menos 2 caracteres.');
  });

  it('al crear envía los textos recortados y no envía una descripción vacía', async () => {
    await render();
    type('name', '  Costa  ');
    await submit();

    expect(saved).toEqual([{ mode: 'create', payload: { name: 'Costa', description: undefined } }]);
  });

  it('al editar se rellena con el registro y puede vaciar la descripción', async () => {
    await render(CATEGORY);
    expect(element.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe('Montaña');

    type('description', '   ');
    await submit();

    // null: la API borra la descripción
    expect(saved).toEqual([{ mode: 'update', payload: { name: 'Montaña', description: null } }]);
  });

  it('un nombre repetido (409) se pinta en el campo del nombre', async () => {
    await render();
    fixture.componentInstance.showServerError(
      new ApiError({ status: 409, type: 'client', message: 'Ya existe una categoría con ese nombre.' }),
    );
    await fixture.whenStable();

    const nameField = element.querySelector('[name="name"]')!;
    expect(nameField.getAttribute('aria-invalid')).toBe('true');
    expect(element.textContent).toContain('Ya existe una categoría con ese nombre.');
    expect(element.querySelector('.form-error')).toBeNull();
  });

  it('un error de campo de la API (400) se pinta en su campo', async () => {
    await render();
    fixture.componentInstance.showServerError(
      new ApiError({
        status: 400,
        type: 'validation',
        message: 'Hay campos con errores.',
        fieldErrors: { description: 'Escribe como máximo 300 caracteres.' },
      }),
    );
    await fixture.whenStable();

    expect(element.querySelector('[name="description"]')!.getAttribute('aria-invalid')).toBe('true');
    expect(element.textContent).toContain('Escribe como máximo 300 caracteres.');
  });
});
