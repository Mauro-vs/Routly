import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Category } from '../../../core/models/category.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CategoriesService } from './categories.service';
import { CategoriesStore } from './categories.store';

function category(id: string, name: string): Category {
  return {
    _id: id,
    slug: `${name.toLowerCase()}-${id}`,
    name,
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: `2026-01-0${id}T00:00:00.000Z`,
    updatedAt: `2026-01-0${id}T00:00:00.000Z`,
  };
}

describe('CategoriesStore', () => {
  let api: jasmine.SpyObj<CategoriesService>;
  let store: CategoriesStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<CategoriesService>('api', ['getAll', 'create', 'restore', 'getDeleted']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: CategoriesService, useValue: api },
        { provide: ErrorHandlerService, useValue: jasmine.createSpyObj('errors', ['handle']) },
        { provide: NotificationService, useValue: jasmine.createSpyObj('notifications', ['success']) },
      ],
    });
    store = TestBed.inject(CategoriesStore);
  });

  const names = (): string[] => store.items().map((item) => item.name);

  it('una categoría nueva queda en su sitio por nombre, como al recargar', async () => {
    api.getAll.and.resolveTo([category('1', 'Costa'), category('2', 'Montaña')]);
    await store.load();

    api.create.and.resolveTo(category('3', 'Desierto'));
    await store.create({ name: 'Desierto' });

    expect(names()).toEqual(['Costa', 'Desierto', 'Montaña']);
  });

  it('el orden no distingue mayúsculas ni tildes, y la ñ va después de la n', async () => {
    api.getAll.and.resolveTo([category('1', 'Ñandú'), category('2', 'nieve'), category('3', 'Árido')]);
    await store.load();

    api.create.and.resolveTo(category('4', 'Bosque'));
    await store.create({ name: 'Bosque' });

    expect(names()).toEqual(['Árido', 'Bosque', 'nieve', 'Ñandú']);
  });
});
