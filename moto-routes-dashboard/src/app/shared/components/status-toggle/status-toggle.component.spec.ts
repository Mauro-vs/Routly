import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusToggleComponent } from './status-toggle.component';

describe('StatusToggleComponent', () => {
  let fixture: ComponentFixture<StatusToggleComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(StatusToggleComponent);
    fixture.componentRef.setInput('active', true);
    fixture.componentRef.setInput('label', 'Admin');
    fixture.componentRef.setInput('labels', { singular: 'rol', plural: 'roles', gender: 'm' });
    await fixture.whenStable();
  });

  const toggle = (): HTMLButtonElement => fixture.nativeElement.querySelector('[role="switch"]');

  it('escribe el estado al lado y lo concierta con la colección', () => {
    expect(fixture.nativeElement.textContent.trim()).toBe('Activo');
    expect(toggle().getAttribute('aria-label')).toBe('Rol activo: Admin');
  });

  it('bloqueado no cambia y enlaza su explicación', async () => {
    const changed = jasmine.createSpy('activeChange');
    fixture.componentInstance.activeChange.subscribe(changed);
    fixture.componentRef.setInput('lockedReason', 'Los roles base no se pueden desactivar.');
    await fixture.whenStable();

    toggle().click();

    expect(changed).not.toHaveBeenCalled();
    expect(toggle().getAttribute('aria-disabled')).toBe('true');
    expect(toggle().getAttribute('aria-describedby')).toMatch(/^tip-/);
  });
});
