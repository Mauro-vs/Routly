import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PasswordFormComponent } from './password-form.component';

describe('PasswordFormComponent', () => {
  let fixture: ComponentFixture<PasswordFormComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;

  function type(name: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(PasswordFormComponent);
    await fixture.whenStable();
    element = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('una contraseña a medio escribir cuenta como cambio sin guardar', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    type('currentPassword', 'clave-vieja-1');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });

  it('una contraseña nueva sin número no se envía', async () => {
    type('currentPassword', 'clave-vieja-1');
    type('newPassword', 'solotexto');
    type('repeat', 'solotexto');
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone(() => true);
    expect(element.textContent).toContain('Usa al menos una letra y un número.');
  });
});
