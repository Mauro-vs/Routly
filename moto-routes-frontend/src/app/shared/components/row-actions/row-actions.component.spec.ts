import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RowActionsComponent } from './row-actions.component';

describe('RowActionsComponent', () => {
  let fixture: ComponentFixture<RowActionsComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(RowActionsComponent);
    fixture.componentRef.setInput('label', 'Costa Brava');
    fixture.componentRef.setInput('detailPath', ['/routes', 'costa-brava']);
    fixture.componentRef.setInput('editPath', ['/routes', 'costa-brava', 'edit']);
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  const deleteButton = (): HTMLButtonElement => element.querySelector('button')!;

  it('cada botón de icono lleva el nombre del registro', () => {
    const names = [...element.querySelectorAll('a, button')].map((node) => node.getAttribute('aria-label'));
    expect(names).toEqual(['Ver Costa Brava', 'Editar Costa Brava', 'Eliminar Costa Brava']);
  });

  it('eliminar avisa al pulsarlo', () => {
    const removed = jasmine.createSpy('remove');
    fixture.componentInstance.remove.subscribe(removed);

    deleteButton().click();

    expect(removed).toHaveBeenCalledTimes(1);
  });

  it('con un motivo, eliminar no hace nada pero se puede enfocar y explica por qué', async () => {
    const removed = jasmine.createSpy('remove');
    fixture.componentInstance.remove.subscribe(removed);
    fixture.componentRef.setInput('deleteLockedReason', 'Tiene experiencias.');
    await fixture.whenStable();

    deleteButton().click();

    expect(removed).not.toHaveBeenCalled();
    expect(deleteButton().disabled).toBeFalse();
    expect(deleteButton().getAttribute('aria-disabled')).toBe('true');
    const tipId = deleteButton().getAttribute('aria-describedby');
    expect(tipId && element.querySelector(`#${tipId}`)?.textContent?.trim()).toBe('Tiene experiencias.');
  });
});
