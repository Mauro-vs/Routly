import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  DEPARTURE_STATE_LABELS,
  Departure,
  DeparturePayload,
  DepartureState,
} from '../../../../core/models/departure.model';
import { Experience } from '../../../../core/models/experience.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { ReadonlyFieldComponent } from '../../../../shared/components/form-field/readonly-field.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm } from '../../../../shared/forms/entity-form';
import { SelectOption } from '../../../../shared/forms/select-options';
import { fromLocalInput, toLocalInput } from '../../../../shared/utils/dates';
import {
  endAfterStart,
  futureDate,
  integer,
  maxDecimals,
} from '../../../../shared/utils/validators';

const STATES = Object.entries(DEPARTURE_STATE_LABELS).map(([value, label]) => ({
  value: value as DepartureState,
  label,
}));

// Los mismos criterios que src/schemas/departure.schema.js en la API.
function createDepartureForm() {
  return new FormGroup(
    {
      experienceId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      startAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      endAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      capacity: new FormControl<number | null>(null, [Validators.required, Validators.min(1), integer]),
      price: new FormControl<number | null>(null, [Validators.required, Validators.min(0), maxDecimals(2)]),
      state: new FormControl<DepartureState>('scheduled', { nonNullable: true }),
    },
    { validators: endAfterStart('startAt', 'endAt') },
  );
}

type DepartureControls = ReturnType<typeof createDepartureForm>['controls'];

/**
 * Campos de una salida: de qué experiencia es, cuándo, cuántas plazas y a qué precio.
 *
 * - Las fechas se escriben en la hora local y se envían en ISO (UTC).
 * - Al crear, el inicio tiene que ser futuro; el fin, siempre posterior al inicio.
 * - Las plazas no pueden superar el máximo de participantes de la experiencia.
 * - Al editar, la experiencia y el SKU se muestran pero no se envían: no cambian nunca.
 */
@Component({
  selector: 'app-departure-form',
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    InputDirective,
    IconComponent,
    ReadonlyFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [id]="formId" class="card panel form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }

      @if (record(); as departure) {
        <div class="form-row">
          <ui-readonly-field label="Experiencia" hint="La experiencia de una salida no se puede cambiar.">
            {{ departure.experience?.title ?? 'Experiencia eliminada' }}
          </ui-readonly-field>
          <ui-readonly-field label="SKU" hint="Lo genera la API y no cambia nunca.">
            <span class="mono" translate="no">{{ departure.sku }}</span>
          </ui-readonly-field>
        </div>
      } @else {
        <ui-form-field
          label="Experiencia"
          [hint]="experiencesLoading() ? 'Cargando experiencias…' : ''"
          [error]="errorOf('experienceId')"
        >
          <select uiInput class="select" name="experienceId" formControlName="experienceId">
            <option value="" disabled>Elige una experiencia</option>
            @for (option of experienceOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </ui-form-field>
      }

      <div class="form-row">
        <ui-form-field
          label="Inicio"
          [hint]="isEdit() ? 'En tu hora local.' : 'En tu hora local. Tiene que ser una fecha futura.'"
          [error]="errorOf('startAt')"
        >
          <input uiInput type="datetime-local" name="startAt" formControlName="startAt" />
        </ui-form-field>
        <ui-form-field label="Fin" [error]="errorOf('endAt') ?? datesError()">
          <input uiInput type="datetime-local" name="endAt" formControlName="endAt" />
        </ui-form-field>
      </div>

      <div class="form-row">
        <ui-form-field label="Plazas" [hint]="capacityHint()" [error]="errorOf('capacity')">
          <input uiInput type="number" name="capacity" inputmode="numeric" min="1" step="1" formControlName="capacity" />
        </ui-form-field>
        <ui-form-field label="Precio por persona" [error]="errorOf('price')">
          <div class="affix">
            <input uiInput type="number" name="price" inputmode="decimal" min="0" step="0.01" formControlName="price" />
            <span aria-hidden="true">€</span>
          </div>
        </ui-form-field>
      </div>

      <ui-form-field label="Estado de la salida" hint="Lo que ha pasado o va a pasar con ella." [error]="errorOf('state')">
        <select uiInput class="select" name="state" formControlName="state">
          @for (option of states; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </ui-form-field>
    </form>
  `,
  styles: `
    .mono {
      font-family: var(--font-mono);
    }
  `,
})
export class DepartureFormComponent extends EntityForm<
  Departure,
  DeparturePayload,
  DepartureControls
> {
  readonly experiences = input<readonly Experience[]>([]);
  readonly experiencesLoading = input(false);

  protected readonly states = STATES;

  protected readonly experienceOptions = computed<SelectOption[]>(() =>
    this.experiences().map((experience) => ({ value: experience._id, label: experience.title })),
  );

  /** El máximo de participantes de la experiencia elegida, si se conoce. */
  protected readonly maxCapacity = computed(() => {
    this.changes();
    const id = this.record()?.experienceId ?? this.form.controls.experienceId.value;
    return this.experiences().find((experience) => experience._id === id)?.maxParticipants ?? null;
  });

  protected readonly capacityHint = computed(() => {
    const max = this.maxCapacity();
    return max === null ? '' : `Como mucho ${max}, el máximo de la experiencia.`;
  });

  protected readonly datesError = computed(() => {
    this.changes();
    const end = this.form.controls.endAt;
    return (end.touched || this.submitted()) && this.form.hasError('dateOrder')
      ? 'Tiene que ser posterior al inicio.'
      : null;
  });

  constructor() {
    super(createDepartureForm());

    const { experienceId, startAt, capacity } = this.form.controls;
    // Las plazas, como mucho las de la experiencia (si se sabe cuáles son).
    capacity.addValidators((control: AbstractControl): ValidationErrors | null => {
      const max = untracked(() => this.maxCapacity());
      return Validators.max(max ?? Number.POSITIVE_INFINITY)(control);
    });

    effect(() => {
      this.maxCapacity();
      capacity.updateValueAndValidity({ emitEvent: false });
    });

    // Al editar, la experiencia no se envía y el inicio puede estar ya en el pasado.
    effect(() => {
      if (this.isEdit()) {
        experienceId.disable({ emitEvent: false });
        startAt.removeValidators(futureDate);
      } else {
        experienceId.enable({ emitEvent: false });
        startAt.addValidators(futureDate);
      }
      startAt.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected fill(departure: Departure | null): void {
    this.form.reset({
      experienceId: departure?.experienceId ?? '',
      startAt: departure ? toLocalInput(departure.startAt) : '',
      endAt: departure ? toLocalInput(departure.endAt) : '',
      capacity: departure?.capacity ?? null,
      price: departure?.price ?? null,
      state: departure?.state ?? 'scheduled',
    });
  }

  protected toPayload(): DeparturePayload | null {
    const value = this.form.getRawValue();
    const { capacity, price } = value;
    // Con el formulario válido tienen valor; la comprobación es para el tipo.
    if (capacity === null || price === null) return null;

    return {
      experienceId: value.experienceId,
      startAt: fromLocalInput(value.startAt),
      endAt: fromLocalInput(value.endAt),
      capacity,
      price,
      state: value.state,
    };
  }

  protected override toUpdatePayload(): Partial<DeparturePayload> | null {
    const payload = this.toPayload();
    if (!payload) return null;
    const { startAt, endAt, capacity, price, state } = payload;
    return { startAt, endAt, capacity, price, state };
  }
}
