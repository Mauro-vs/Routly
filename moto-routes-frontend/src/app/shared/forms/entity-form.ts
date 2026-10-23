import {
  Directive,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup } from '@angular/forms';

import { ApiError } from '../../core/models/api-error.model';
import { BaseRecord } from '../../core/models/entity.model';
import { ErrorMessage, applyServerErrors, controlErrorMessage } from '../utils/form-errors';

/** Id del `<form>`: el botón de guardar de la cabecera lo envía con `form="..."`. */
export const ENTITY_FORM_ID = 'entity-form';

/**
 * Lo que emite un formulario al enviarse: al crear, todos los datos; al editar, solo
 * los que se pueden cambiar (la API rechaza con 400 los que no, como el SKU).
 */
export type FormSubmit<TPayload> =
  | { mode: 'create'; payload: TPayload }
  | { mode: 'update'; payload: Partial<TPayload> };

type Controls = Record<string, AbstractControl>;

/** Lo que la página necesita del formulario. */
export interface EntityFormHandle {
  dirty(): boolean;
  markSaved(): void;
  showServerError(error: ApiError): void;
}

/**
 * Base de los formularios de las colecciones (`components/<x>-form`). Valida en el
 * cliente con los mismos criterios que la API y, si el formulario es válido, emite
 * `save`. La página guarda y, si la API rechaza algo, se lo devuelve con
 * `showServerError` para pintarlo junto a su campo.
 *
 * Cada formulario hereda de aquí, crea su FormGroup y dice cómo se rellena (`fill`)
 * y qué se envía (`toPayload` y, si al editar no se envía todo, `toUpdatePayload`):
 *
 *   export class CategoryFormComponent extends EntityForm<Category, CategoryPayload, CategoryControls> {
 *     constructor() { super(createCategoryForm()); }
 *     …
 *   }
 */
@Directive()
export abstract class EntityForm<T extends BaseRecord, TPayload, TControls extends Controls>
  implements EntityFormHandle
{
  /** El registro que se edita. Sin él, el formulario es para crear. */
  readonly record = input<T | null>(null);
  readonly save = output<FormSubmit<TPayload>>();

  protected readonly formId = ENTITY_FORM_ID;
  protected readonly submitted = signal(false);
  /** Error que no pertenece a ningún campo concreto. */
  protected readonly formError = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.record() !== null);
  /** Textos propios para algún validador, por ejemplo el de un `pattern`. */
  protected readonly errorMessages: Record<string, ErrorMessage> = {};

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  // Los formularios reactivos no son signals: este pulso avisa de cada cambio. Un
  // computed que lo lee se recalcula cuando cambia cualquier campo.
  protected readonly changes: Signal<unknown>;

  protected constructor(protected readonly form: FormGroup<TControls>) {
    this.changes = toSignal(form.events);

    // Solo se rellena cuando cambia de registro: si el mismo registro se pone al día
    // (por ejemplo, al cambiar su estado), lo que se está escribiendo no se pierde.
    const recordId = computed(() => this.record()?._id ?? null);
    effect(() => {
      recordId();
      untracked(() => {
        this.submitted.set(false);
        this.formError.set(null);
        this.fill(this.record());
      });
    });
  }

  /** Pone en el formulario los datos del registro, o lo deja vacío para crear. */
  protected abstract fill(record: T | null): void;

  /** Los datos para crear. Solo se llama con el formulario válido. */
  protected abstract toPayload(): TPayload | null;

  /** Los datos para editar. Por defecto, los mismos que para crear. */
  protected toUpdatePayload(): Partial<TPayload> | null {
    return this.toPayload();
  }

  /**
   * El campo en el que se pinta un 409, por ejemplo el nombre si ya existe otro igual.
   * null: el mensaje va arriba del formulario.
   */
  protected conflictField(_error: ApiError): string | null {
    return null;
  }

  /** Hay cambios sin guardar. */
  dirty(): boolean {
    return this.form.dirty;
  }

  /** Después de guardar: el formulario deja de tener cambios pendientes. */
  markSaved(): void {
    this.form.markAsPristine();
  }

  /** Reparte el error de la API: en su campo si se puede, y si no, sobre el formulario. */
  showServerError(error: ApiError): void {
    if (error.fieldErrors) {
      const unmatched = Object.values(applyServerErrors(this.form, error.fieldErrors));
      if (unmatched.length > 0) this.formError.set(unmatched.join(' '));
      this.focusFirstInvalid();
      return;
    }

    if (error.isConflict) {
      const field = this.conflictField(error);
      if (field && this.form.get(field)) {
        applyServerErrors(this.form, { [field]: error.message });
        this.focusFirstInvalid();
      } else {
        this.formError.set(error.message);
      }
      return;
    }

    if (error.type === 'validation') this.formError.set(error.message);
    // Red, tiempo de espera, 5xx y 404 ya los ha mostrado ErrorHandlerService.
  }

  /** El error de un campo, cuando ya se ha tocado o se ha intentado enviar. */
  protected errorOf(name: keyof TControls & string): string | null {
    this.changes();
    const control = this.form.controls[name];
    return control.touched || this.submitted()
      ? controlErrorMessage(control, this.errorMessages)
      : null;
  }

  /** "37 / 120": lo escrito en un campo de texto frente a su máximo. */
  protected counter(name: keyof TControls & string, max: number): string {
    this.changes();
    const value: unknown = this.form.controls[name].value;
    return `${typeof value === 'string' ? value.length : 0} / ${max}`;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    if (this.isEdit()) {
      const payload = this.toUpdatePayload();
      if (payload) this.save.emit({ mode: 'update', payload });
    } else {
      const payload = this.toPayload();
      if (payload) this.save.emit({ mode: 'create', payload });
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, select.ng-invalid')
          ?.focus(),
      { injector: this.injector },
    );
  }
}

/**
 * Al editar, un campo opcional: el texto recortado. Si queda vacío se envía vacío
 * para borrar lo que había, y si ya estaba vacío no se envía.
 */
export function editedText(value: string, previous: string | undefined): string | undefined {
  const text = value.trim();
  return text === '' && !previous ? undefined : text;
}

/**
 * Texto recortado, o `undefined` si queda vacío: al crear, un campo opcional vacío
 * no se envía.
 */
export function optionalText(value: string): string | undefined {
  const text = value.trim();
  return text === '' ? undefined : text;
}
