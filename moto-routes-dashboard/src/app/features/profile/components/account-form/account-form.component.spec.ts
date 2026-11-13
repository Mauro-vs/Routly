import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { fakeUser } from '../../../../auth/testing/auth.testing';
import { AccountFormComponent } from './account-form.component';

describe('AccountFormComponent', () => {
  let fixture: ComponentFixture<AccountFormComponent>;
  let element: HTMLElement;

  const field = (name: string): HTMLInputElement => element.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AccountFormComponent);
    fixture.componentRef.setInput('user', { ...fakeUser('rider'), profile: { city: 'Logroño' } });
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  it('se rellena con el usuario y la cabecera de la página lo encuentra por su id', () => {
    expect(field('name').value).toBe('Ana');
    expect(field('city').value).toBe('Logroño');
    expect(element.querySelector('form')?.id).toBe('profile-form');
    expect(fixture.componentInstance.saving()).toBeFalse();
  });

  it('cuenta como cambio sin guardar en cuanto se escribe', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const name = field('name');
    name.value = 'Ana Ruiz';
    name.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
