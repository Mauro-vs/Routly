import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HasUnsavedChanges, warnBeforeUnload } from './unsaved-changes.guard';

@Component({ template: '' })
class PageWithForm implements HasUnsavedChanges {
  dirty = false;

  constructor() {
    warnBeforeUnload(this);
  }

  hasUnsavedChanges(): boolean {
    return this.dirty;
  }
}

/**
 * Karma trata cualquier `beforeunload` en su ventana como una recarga y corta los tests,
 * así que no se dispara el evento: se llama al listener que la página registra.
 */
function render(): { page: PageWithForm; unload: () => boolean; destroy: () => void } {
  const add = spyOn(window, 'addEventListener').and.callThrough();
  const remove = spyOn(window, 'removeEventListener').and.callThrough();
  const fixture = TestBed.createComponent(PageWithForm);
  const call = add.calls.all().find(({ args }) => args[0] === 'beforeunload');
  const listener = call!.args[1] as (event: BeforeUnloadEvent) => void;

  return {
    page: fixture.componentInstance,
    unload: () => {
      const event = { preventDefault: jasmine.createSpy('preventDefault') };
      listener(event as unknown as BeforeUnloadEvent);
      return event.preventDefault.calls.any();
    },
    destroy: () => {
      fixture.destroy();
      expect(remove).toHaveBeenCalledWith('beforeunload', listener);
    },
  };
}

describe('warnBeforeUnload', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('con cambios sin guardar, recargar o cerrar la pestaña pide el aviso del navegador', () => {
    const { page, unload } = render();
    page.dirty = true;
    expect(unload()).toBeTrue();
  });

  it('sin cambios, o después de guardar, deja salir sin aviso', () => {
    const { page, unload } = render();
    expect(unload()).toBeFalse();

    page.dirty = true;
    page.dirty = false;
    expect(unload()).toBeFalse();
  });

  it('al salir de la página deja de escuchar', () => {
    render().destroy();
  });
});
