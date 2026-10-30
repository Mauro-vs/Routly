import { Injectable, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CollectionLabels } from '../../shared/utils/labels';
import { ApiError } from '../models/api-error.model';
import { BaseEntity } from '../models/entity.model';
import { toApiError } from '../utils/api-error.mapper';
import { EntityApi, EntityStore } from './entity.store';
import { ErrorHandlerService } from './error-handler.service';
import { NavBadgeService } from './nav-badge.service';
import { NotificationService } from './notification.service';
import { SessionResetService } from './session-reset.service';

interface Item extends BaseEntity {
  name: string;
}

interface ItemPayload {
  name: string;
}

function item(id: string, isActive = true, createdAt = '2026-01-01T00:00:00.000Z'): Item {
  return {
    _id: id,
    slug: `item-${id}`,
    name: `Item ${id}`,
    status: isActive ? 'active' : 'inactive',
    isActive,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

const serverError = (): ApiError =>
  new ApiError({ status: 500, type: 'server', message: 'Error del servidor' });
const notFound = (): ApiError => new ApiError({ status: 404, type: 'client', message: 'No existe' });

/** Una promesa que se resuelve o se rechaza desde el test, para ver el estado intermedio. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('EntityStore', () => {
  let api: jasmine.SpyObj<Required<EntityApi<Item, ItemPayload>>>;
  let errors: jasmine.SpyObj<ErrorHandlerService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let store: TestStore;

  @Injectable()
  class TestStore extends EntityStore<Item, ItemPayload> {
    protected readonly api = api;
    protected readonly listPath = '/items';
    readonly labels: CollectionLabels = { singular: 'ruta', plural: 'rutas', gender: 'f' };

    displayName(entity: Item): string {
      return entity.name;
    }
  }

  beforeEach(() => {
    api = jasmine.createSpyObj<Required<EntityApi<Item, ItemPayload>>>('api', [
      'getAll',
      'getByActive',
      'getDeleted',
      'getById',
      'getBySlug',
      'create',
      'update',
      'setActive',
      'remove',
      'restore',
    ]);
    errors = jasmine.createSpyObj<ErrorHandlerService>('errors', ['handle']);
    errors.handle.and.callFake((error: unknown) => toApiError(error));
    notifications = jasmine.createSpyObj<NotificationService>('notifications', [
      'confirm',
      'undoable',
      'success',
    ]);
    notifications.success.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TestStore,
        { provide: ErrorHandlerService, useValue: errors },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    store = TestBed.inject(TestStore);
  });

  describe('al cerrar sesión', () => {
    it('se apunta a SessionResetService y vuelve al estado inicial', async () => {
      api.getAll.and.resolveTo([item('1')]);
      api.getDeleted.and.resolveTo([item('2')]);
      await store.load();
      await store.loadDeleted();
      store.status.set('inactive');

      TestBed.inject(SessionResetService).resetAll();

      expect(store.items()).toEqual([]);
      expect(store.loaded()).toBeFalse();
      expect(store.deleted()).toEqual([]);
      expect(store.deletedLoaded()).toBeFalse();
      expect(store.status()).toBe('all');
    });

    it('una carga que estaba en camino no vuelve a llenarlo', async () => {
      const list = deferred<Item[]>();
      const trash = deferred<Item[]>();
      api.getAll.and.returnValue(list.promise);
      api.getDeleted.and.returnValue(trash.promise);

      const loading = Promise.all([store.load(), store.loadDeleted()]);
      store.reset();
      list.resolve([item('1')]);
      trash.resolve([item('2')]);
      await loading;

      expect(store.items()).toEqual([]);
      expect(store.loaded()).toBeFalse();
      expect(store.deleted()).toEqual([]);
    });
  });

  async function loadWith(items: Item[]): Promise<void> {
    api.getAll.and.resolveTo(items);
    await store.load();
  }

  it('carga el listado y calcula los contadores', async () => {
    await loadWith([item('1'), item('2', false), item('3')]);

    expect(store.loaded()).toBeTrue();
    expect(store.loading()).toBeFalse();
    expect(store.total()).toBe(3);
    expect(store.activeCount()).toBe(2);
    expect(store.inactiveCount()).toBe(1);
  });

  it('guarda el error si la carga falla y no marca el listado como cargado', async () => {
    api.getAll.and.rejectWith(serverError());
    await store.load();

    expect(store.loaded()).toBeFalse();
    expect(store.error()?.type).toBe('server');
    expect(errors.handle).toHaveBeenCalledTimes(1);
  });

  describe('setActive (actualización optimista)', () => {
    it('cambia el estado al instante y lo confirma con la respuesta', async () => {
      await loadWith([item('1')]);
      const pending = deferred<Item>();
      api.setActive.and.returnValue(pending.promise);

      const result = store.setActive(store.items()[0], false);

      // Antes de que conteste la API ya se ve inactivo.
      expect(store.items()[0].isActive).toBeFalse();
      expect(store.items()[0].status).toBe('inactive');
      expect(store.isBusy('1')).toBeTrue();

      pending.resolve({ ...item('1', false), name: 'Desde el servidor' });
      expect((await result).ok).toBeTrue();
      expect(store.items()[0].name).toBe('Desde el servidor');
      expect(store.isBusy('1')).toBeFalse();
    });

    it('vuelve al estado anterior si la API falla y avisa del error', async () => {
      await loadWith([item('1')]);
      api.setActive.and.rejectWith(serverError());
      api.getById.and.resolveTo(item('1'));

      const result = await store.setActive(store.items()[0], false);

      expect(result.ok).toBeFalse();
      expect(store.items()[0].isActive).toBeTrue();
      expect(errors.handle).toHaveBeenCalledTimes(1);
    });

    it('tras un 5xx comprueba el registro por id, por si el cambio sí se aplicó', async () => {
      await loadWith([item('1')]);
      api.setActive.and.rejectWith(serverError());
      api.getById.and.resolveTo(item('1', false));

      await store.setActive(store.items()[0], false);
      await Promise.resolve();

      expect(api.getById).toHaveBeenCalledOnceWith('1');
      expect(store.items()[0].isActive).toBeFalse();
    });

    it('si el registro ya no existe, vuelve a pedir el listado', async () => {
      await loadWith([item('1'), item('2')]);
      api.setActive.and.rejectWith(notFound());
      api.getAll.and.resolveTo([item('2')]);

      await store.setActive(store.items()[0], false);
      await Promise.resolve();

      expect(api.getAll).toHaveBeenCalledTimes(2);
    });

    it('ignora un segundo cambio mientras el primero está en curso', async () => {
      await loadWith([item('1')]);
      const pending = deferred<Item>();
      api.setActive.and.returnValue(pending.promise);

      const first = store.setActive(store.items()[0], false);
      await store.setActive(store.items()[0], true);

      expect(api.setActive).toHaveBeenCalledTimes(1);
      pending.resolve(item('1', false));
      await first;
    });
  });

  describe('refreshByActive (filtro por estado)', () => {
    it('sustituye solo los registros de ese estado y mantiene el orden por fecha', async () => {
      await loadWith([
        item('1', true, '2026-03-01T00:00:00.000Z'),
        item('2', false, '2026-02-01T00:00:00.000Z'),
        item('3', true, '2026-01-01T00:00:00.000Z'),
      ]);
      // En el servidor la 3 ya no está activa y hay una activa nueva, la 4.
      api.getByActive.and.resolveTo([
        item('4', true, '2026-04-01T00:00:00.000Z'),
        item('1', true, '2026-03-01T00:00:00.000Z'),
      ]);

      await store.refreshByActive(true);

      expect(api.getByActive).toHaveBeenCalledOnceWith(true);
      expect(store.items().map((entry) => entry._id)).toEqual(['4', '1', '2']);
    });

    it('no pide nada si el listado aún no se ha cargado', async () => {
      await store.refreshByActive(false);
      expect(api.getByActive).not.toHaveBeenCalled();
    });
  });

  describe('papelera', () => {
    // Como en la API: un eliminado conserva su estado y lo marca deletedAt
    const trashed = (id: string): Item => ({
      ...item(id, false),
      deletedAt: '2026-10-01T00:00:00.000Z',
    });

    async function loadTrashWith(items: Item[]): Promise<void> {
      api.getDeleted.and.resolveTo(items);
      await store.loadDeleted();
    }

    it('carga los eliminados y los cuenta', async () => {
      await loadTrashWith([trashed('8'), trashed('9')]);

      expect(store.deletedLoaded()).toBeTrue();
      expect(store.deletedCount()).toBe(2);
    });

    it('guarda el error si la carga de la papelera falla', async () => {
      api.getDeleted.and.rejectWith(serverError());
      await store.loadDeleted();

      expect(store.deletedLoaded()).toBeFalse();
      expect(store.deletedError()?.type).toBe('server');
    });

    it('al eliminar, el registro pasa del listado a la papelera', async () => {
      await loadWith([item('1'), item('2')]);
      await loadTrashWith([]);
      api.remove.and.resolveTo();

      await store.remove(store.items()[0]);

      expect(store.items().map((entry) => entry._id)).toEqual(['2']);
      expect(store.deleted().map((entry) => entry._id)).toEqual(['1']);
      // Conserva su estado, como en la API: solo cambia deletedAt
      expect(store.deleted()[0].status).toBe('active');
      expect(store.deleted()[0].deletedAt).not.toBeNull();
    });

    it('restaurar saca el registro de la papelera al instante y lo devuelve al listado', async () => {
      await loadWith([item('1')]);
      await loadTrashWith([trashed('9')]);
      const pending = deferred<Item>();
      api.restore.and.returnValue(pending.promise);

      const result = store.restoreFromTrash(store.deleted()[0], false);

      // Antes de que conteste la API ya no está en la papelera.
      expect(store.deletedCount()).toBe(0);
      expect(store.isBusy('9')).toBeTrue();

      pending.resolve(item('9', false));
      expect((await result).ok).toBeTrue();
      expect(api.restore).toHaveBeenCalledOnceWith('9', false);
      expect(store.items().map((entry) => entry._id)).toContain('9');
    });

    it('sin indicar el estado, restaura como estaba y el aviso dice cómo ha vuelto', async () => {
      await loadTrashWith([trashed('9')]);
      api.restore.and.resolveTo(item('9', true));

      await store.restoreAndNotify(store.deleted()[0]);

      expect(api.restore).toHaveBeenCalledOnceWith('9', undefined);
      expect(notifications.success).toHaveBeenCalledOnceWith(jasmine.stringContaining('restaurad'));
      expect(notifications.success.calls.mostRecent().args[0]).toContain('y activ');
    });

    it('restaura como activa cuando se pide', async () => {
      await loadTrashWith([trashed('9')]);
      api.restore.and.resolveTo(item('9', true));

      await store.restoreFromTrash(store.deleted()[0], true);

      expect(api.restore).toHaveBeenCalledOnceWith('9', true);
    });

    it('si la API falla, el registro vuelve a la papelera y se avisa', async () => {
      await loadTrashWith([trashed('8'), trashed('9')]);
      api.restore.and.rejectWith(serverError());

      const result = await store.restoreFromTrash(store.deleted()[1], false);

      expect(result.ok).toBeFalse();
      expect(store.deleted().map((entry) => entry._id)).toEqual(['8', '9']);
      expect(errors.handle).toHaveBeenCalledTimes(1);
    });

    it('si ya estaba restaurado (409), vuelve a pedir la papelera', async () => {
      await loadTrashWith([trashed('9')]);
      api.restore.and.rejectWith(
        new ApiError({ status: 409, type: 'client', message: 'Conflicto' }),
      );
      api.getDeleted.and.resolveTo([]);

      await store.restoreFromTrash(store.deleted()[0], false);
      await Promise.resolve();

      expect(api.getDeleted).toHaveBeenCalledTimes(2);
      expect(store.deletedCount()).toBe(0);
    });

    it('si no se puede restaurar por una referencia eliminada (409), vuelve a la papelera', async () => {
      await loadTrashWith([trashed('9')]);
      api.restore.and.rejectWith(
        new ApiError({
          status: 409,
          type: 'client',
          message: 'No se puede restaurar',
          detail: 'Cannot restore: categoryId references a deleted category',
        }),
      );

      const result = await store.restoreFromTrash(store.deleted()[0], false);

      expect(result.ok).toBeFalse();
      expect(api.getDeleted).toHaveBeenCalledTimes(1);
      expect(store.deleted().map((entry) => entry._id)).toEqual(['9']);
    });

    it('deshacer un borrado también lo quita de la papelera', async () => {
      await loadWith([item('1')]);
      await loadTrashWith([]);
      const removed = store.items()[0];
      api.remove.and.resolveTo();
      api.restore.and.resolveTo(removed);

      await store.remove(removed);
      await store.restore(removed);

      expect(store.deletedCount()).toBe(0);
      expect(store.total()).toBe(1);
    });
  });

  describe('getBySlug', () => {
    it('deja el registro en selected', async () => {
      api.getBySlug.and.resolveTo(item('1'));
      expect((await store.getBySlug('item-1'))?._id).toBe('1');
      expect(store.selected()?._id).toBe('1');
    });

    it('ante un 404 pide volver al listado y devuelve null', async () => {
      api.getBySlug.and.rejectWith(notFound());

      expect(await store.getBySlug('no-existe')).toBeNull();
      expect(errors.handle).toHaveBeenCalledOnceWith(
        jasmine.any(ApiError),
        jasmine.objectContaining({ notFoundRedirect: '/items' }),
      );
    });
  });

  describe('escrituras', () => {
    it('create añade el registro al principio', async () => {
      await loadWith([item('1')]);
      api.create.and.resolveTo(item('2'));

      const result = await store.create({ name: 'Nuevo' });

      expect(result.ok).toBeTrue();
      expect(store.items().map((entry) => entry._id)).toEqual(['2', '1']);
      expect(store.saving()).toBeFalse();
    });

    it('create devuelve el error para pintarlo en el formulario', async () => {
      const validation = new ApiError({
        status: 400,
        type: 'validation',
        message: 'Revisa los campos',
        fieldErrors: { name: 'Este campo es obligatorio.' },
      });
      api.create.and.rejectWith(validation);

      const result = await store.create({ name: '' });

      expect(result).toEqual({ ok: false, error: validation });
      expect(errors.handle).toHaveBeenCalledOnceWith(validation, { inline: true });
    });

    it('update sustituye el registro en el listado', async () => {
      await loadWith([item('1'), item('2')]);
      api.update.and.resolveTo({ ...item('2'), name: 'Editado' });

      await store.update('2', { name: 'Editado' });

      expect(store.items()[1].name).toBe('Editado');
    });

    it('remove quita el registro y restore lo devuelve', async () => {
      await loadWith([item('1'), item('2')]);
      const removed = store.items()[0];
      api.remove.and.resolveTo();
      api.restore.and.resolveTo(removed);

      await store.remove(removed);
      expect(store.items().map((entry) => entry._id)).toEqual(['2']);

      await store.restore(removed);
      // Sin isActive: la API lo devuelve como estaba
      expect(api.restore).toHaveBeenCalledOnceWith('1');
      expect(store.total()).toBe(2);
    });

    it('remove deja el registro donde estaba si la API falla', async () => {
      await loadWith([item('1')]);
      api.remove.and.rejectWith(serverError());

      const result = await store.remove(store.items()[0]);

      expect(result.ok).toBeFalse();
      expect(store.total()).toBe(1);
    });
  });

  describe('filtro por estado', () => {
    it('visible muestra todos, solo los activos o solo los inactivos', async () => {
      await loadWith([item('1'), item('2', false), item('3')]);
      api.getByActive.and.callFake(async (isActive) =>
        [item('1'), item('2', false), item('3')].filter((entry) => entry.isActive === isActive),
      );

      store.setStatus('inactive');
      expect(store.visible().map((entry) => entry._id)).toEqual(['2']);

      store.setStatus('active');
      expect(store.visible().map((entry) => entry._id)).toEqual(['1', '3']);
      expect(api.getByActive).toHaveBeenCalledWith(true);
    });

    it('al volver a "todos" pide el listado completo', async () => {
      await loadWith([item('1')]);
      api.getAll.calls.reset();

      store.setStatus('all');

      expect(store.visible().length).toBe(1);
      expect(api.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('contador del menú', () => {
    it('publica el total con el id de la sección (listPath sin la barra)', async () => {
      const badges = TestBed.inject(NavBadgeService);
      await loadWith([item('1'), item('2', false)]);
      TestBed.tick();

      expect(badges.count('items')).toBe(2);
    });

    it('sin el listado cargado, restaurar desde la papelera suma uno al contador', async () => {
      const badges = TestBed.inject(NavBadgeService);
      badges.set('items', 3);
      const target = { ...item('9', false), deletedAt: '2026-10-01T00:00:00.000Z' };
      api.getDeleted.and.resolveTo([target]);
      api.restore.and.resolveTo(item('9'));
      await store.loadDeleted();

      await store.restoreFromTrash(target, true);

      expect(badges.count('items')).toBe(4);
    });
  });

  describe('borrado con confirmación', () => {
    it('no elimina nada si no se confirma', async () => {
      await loadWith([item('1')]);
      notifications.confirm.and.resolveTo(false);

      const removed = await store.confirmAndRemove(store.items()[0]);

      expect(removed).toBeFalse();
      expect(api.remove).not.toHaveBeenCalled();
      expect(notifications.confirm.calls.mostRecent().args[0].title).toBe('¿Eliminar «Item 1»?');
    });

    it('elimina, ofrece deshacer y lo restaura si se pulsa', async () => {
      await loadWith([item('1')]);
      const target = store.items()[0];
      notifications.confirm.and.resolveTo(true);
      notifications.undoable.and.resolveTo(true);
      api.remove.and.resolveTo();
      api.restore.and.resolveTo(target);

      const removed = await store.confirmAndRemove(target);
      // El deshacer no se espera: termina en segundo plano.
      await new Promise((resolve) => setTimeout(resolve));

      expect(removed).toBeTrue();
      expect(notifications.undoable).toHaveBeenCalledOnceWith('Ruta eliminada.');
      expect(api.restore).toHaveBeenCalledOnceWith('1');
      expect(notifications.success).toHaveBeenCalledOnceWith('Ruta restaurada.');
    });

    it('restaurar desde la papelera avisa con el estado elegido', async () => {
      const target = { ...item('1', false), deletedAt: '2026-10-01T00:00:00.000Z' };
      api.getDeleted.and.resolveTo([target]);
      api.restore.and.resolveTo(item('1'));
      await store.loadDeleted();

      await store.restoreAndNotify(target, true);

      expect(notifications.success).toHaveBeenCalledOnceWith('Ruta restaurada y activa.');
      expect(store.deletedCount()).toBe(0);
    });
  });
});
