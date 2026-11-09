import { ChangeDetectionStrategy, Component, Injectable, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { BaseEntity } from '../../core/models/entity.model';
import { ListQuery } from '../../core/models/list-query.model';
import { EntityApi, EntityStore } from '../../core/services/entity.store';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { NotificationService } from '../../core/services/notification.service';
import { toApiError } from '../../core/utils/api-error.mapper';
import { CollectionLabels } from '../utils/labels';
import { EntityListPage } from './entity-list-page';

interface Item extends BaseEntity {
  name: string;
}

function item(id: string): Item {
  const date = '2026-01-01T00:00:00.000Z';
  return {
    _id: id,
    slug: `item-${id}`,
    name: `Item ${id}`,
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: date,
    updatedAt: date,
  };
}

describe('EntityListPage', () => {
  let api: jasmine.SpyObj<EntityApi<Item, unknown>>;
  let router: jasmine.SpyObj<Router>;

  @Injectable()
  class ItemsStore extends EntityStore<Item, unknown> {
    protected readonly api = api;
    protected readonly listPath = '/items';
    readonly labels: CollectionLabels = { singular: 'ruta', plural: 'rutas', gender: 'f' };

    displayName(entity: Item): string {
      return entity.name;
    }
  }

  @Component({ selector: 'test-items-list', template: '', changeDetection: ChangeDetectionStrategy.OnPush })
  class ItemsListComponent extends EntityListPage<Item> {
    protected readonly store = inject(ItemsStore);

    type(text: string): void {
      this.query.set(text);
    }

    orderBy(value: string): void {
      this.sort.set(value);
    }

    goTo(page: number): void {
      this.page.set(page);
    }

    currentPage(): number {
      return this.page();
    }
  }

  /** Lo que se espera que pida a la API, con los valores por defecto. */
  const expected = (changes: Partial<ListQuery> = {}): ListQuery => ({
    q: undefined,
    status: undefined,
    sort: '-createdAt',
    page: 1,
    limit: 12,
    filters: {},
    ...changes,
  });

  function create(params: Record<string, string> = {}): ItemsListComponent {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } });
    const fixture = TestBed.createComponent(ItemsListComponent);
    fixture.detectChanges();
    TestBed.tick();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    jasmine.clock().install();
    api = jasmine.createSpyObj<EntityApi<Item, unknown>>('api', ['getAll', 'search', 'getDeleted']);
    api.getAll.and.resolveTo([]);
    api.getDeleted.and.resolveTo([]);
    api.search.and.returnValue(of({ items: [item('1')], total: 1 }));
    router = jasmine.createSpyObj<Router>('router', ['navigate']);
    router.navigate.and.resolveTo(true);

    const errors = jasmine.createSpyObj<ErrorHandlerService>('errors', ['handle']);
    errors.handle.and.callFake((error: unknown) => toApiError(error));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ItemsStore,
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
        { provide: ErrorHandlerService, useValue: errors },
        { provide: NotificationService, useValue: jasmine.createSpyObj('notifications', ['confirm']) },
      ],
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('al abrir, pide la primera página con el orden por defecto', () => {
    create();

    expect(api.search).toHaveBeenCalledOnceWith(expected());
    expect(api.getAll).toHaveBeenCalledTimes(1);
  });

  it('la primera petición ya lleva lo que dice la URL', () => {
    api.search.and.returnValue(of({ items: [item('1')], total: 40 }));
    create({ estado: 'inactive', q: 'pirineo', orden: 'nombre', pagina: '3' });

    expect(api.search).toHaveBeenCalledOnceWith(
      expected({ q: 'pirineo', status: 'inactive', sort: 'name', page: 3 }),
    );
  });

  it('busca cuando se deja de escribir, una sola vez, y vuelve a la página 1', () => {
    const list = create({ pagina: '2' });
    api.search.calls.reset();

    list.type('pi');
    TestBed.tick();
    jasmine.clock().tick(100);
    list.type('pirineo ');
    TestBed.tick();
    jasmine.clock().tick(299);
    TestBed.tick();
    expect(api.search).not.toHaveBeenCalled();

    jasmine.clock().tick(1);
    TestBed.tick();

    expect(api.search).toHaveBeenCalledOnceWith(expected({ q: 'pirineo' }));
  });

  it('cambiar el orden vuelve a la página 1', () => {
    api.search.and.returnValue(of({ items: [item('1')], total: 40 }));
    const list = create();

    list.goTo(3);
    TestBed.tick();
    list.orderBy('nombre');
    TestBed.tick();

    expect(api.search.calls.allArgs()).toEqual([
      [expected()],
      [expected({ page: 3 })],
      [expected({ sort: 'name' })],
    ]);
  });

  it('una página que ya no existe pasa a la última', () => {
    api.search.and.returnValue(of({ items: [], total: 30 }));
    const list = create({ pagina: '9' });
    TestBed.tick();

    expect(list.currentPage()).toBe(3);
    expect(api.search).toHaveBeenCalledWith(expected({ page: 3 }));
  });

  it('refleja el estado en la URL con los nombres del panel', () => {
    const list = create();
    list.goTo(2);
    list.orderBy('nombre');
    TestBed.tick();

    const [, extras] = router.navigate.calls.mostRecent().args;
    expect(extras?.queryParams).toEqual({ estado: null, pagina: null, q: null, orden: 'nombre' });
    expect(extras?.replaceUrl).toBeTrue();
  });
});
