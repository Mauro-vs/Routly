import { Type, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormSubmit } from './entity-form';

/** Lo que devuelve `renderForm`: el formulario y unas acciones para probarlo como un usuario. */
export interface FormHarness<C> {
  fixture: ComponentFixture<C>;
  element: HTMLElement;
  /** Lo que ha emitido `save`, en orden. */
  saved: FormSubmit<unknown>[];
  type(name: string, value: string): void;
  select(name: string, value: string): void;
  submit(): Promise<void>;
  field(name: string): HTMLInputElement | null;
}

/**
 * Pinta un formulario de colección con sus inputs y lo deja listo para escribir en
 * él y enviarlo. Solo para los specs.
 */
export async function renderForm<C extends { save: { subscribe(fn: (value: FormSubmit<unknown>) => void): unknown } }>(
  component: Type<C>,
  inputs: Record<string, unknown>,
): Promise<FormHarness<C>> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  const saved: FormSubmit<unknown>[] = [];
  fixture.componentInstance.save.subscribe((submit) => saved.push(submit));
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;

  const field = (name: string): HTMLInputElement | null =>
    element.querySelector<HTMLInputElement>(`[name="${name}"]`);

  return {
    fixture,
    element,
    saved,
    field,
    type(name, value) {
      const input = field(name)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    },
    select(name, value) {
      const select = field(name)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
    },
    async submit() {
      element.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    },
  };
}
