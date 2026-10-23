import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ListPageComponent, StatusCounts } from './list-page.component';

const USERS = { singular: 'usuario', plural: 'usuarios', gender: 'm' } as const;

describe('ListPageComponent', () => {
  let fixture: ComponentFixture<ListPageComponent>;

  async function render(counts: StatusCounts, total: number, extra: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ListPageComponent);
    const inputs: Record<string, unknown> = {
      title: 'Usuarios',
      labels: USERS,
      icon: 'users',
      loaded: true,
      counts,
      total,
      pageSize: 12,
      status: 'all',
      page: 1,
      createPath: '/users/new',
      trashPath: '/users/trash',
      ...extra,
    };
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('el filtro por estado lleva los contadores y concierta con la colección', async () => {
    const element = await render({ all: 4, active: 3, inactive: 1 }, 4);

    const options = [...element.querySelectorAll('ui-segmented button')].map((button) =>
      button.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(options).toEqual(['Todos 4', 'Activos 3', 'Inactivos 1']);
    expect(element.querySelector('ui-page-header p')?.textContent?.trim()).toBe('4 usuarios.');
  });

  it('sin registros, invita a crear el primero', async () => {
    const element = await render({ all: 0, active: 0, inactive: 0 }, 0);

    expect(element.querySelector('.empty__title')?.textContent?.trim()).toBe('Todavía no hay usuarios');
    expect(element.querySelector('.empty__actions a')?.textContent?.trim()).toBe('Nuevo usuario');
  });

  it('si el filtro lo deja vacío, ofrece ver todos', async () => {
    const element = await render({ all: 3, active: 3, inactive: 0 }, 0, { status: 'inactive' });

    expect(element.querySelector('.empty__title')?.textContent?.trim()).toBe('No hay usuarios inactivos');
    (element.querySelector('.empty__actions button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.status()).toBe('all');
  });

  it('si la carga falla, muestra el error con reintentar', async () => {
    const element = await render({ all: 0, active: 0, inactive: 0 }, 0, { failed: true });
    const retried = jasmine.createSpy('retry');
    fixture.componentInstance.retry.subscribe(retried);

    expect(element.querySelector('ui-error-state')).not.toBeNull();
    (element.querySelector('ui-error-state button') as HTMLButtonElement).click();
    expect(retried).toHaveBeenCalled();
  });
});
