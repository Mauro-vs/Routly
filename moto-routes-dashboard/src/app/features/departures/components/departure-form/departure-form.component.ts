import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Bike, bikeName } from '../../../../core/models/bike.model';
import {
  DEPARTURE_LIMITS,
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
import { SelectOption, withCurrent } from '../../../../shared/forms/select-options';
import { fromLocalInput, toLocalInput } from '../../../../shared/utils/dates';
import {
  endAfterStart,
  futureDate,
  integer,
  maxDecimals,
} from '../../../../shared/utils/validators';

/** El fin (valor de un `datetime-local`) ya ha pasado. Vacío no cuenta como terminada. */
function hasEnded(end: string): boolean {
  return end !== '' && new Date(end).getTime() <= Date.now();
}

const STATES = Object.entries(DEPARTURE_STATE_LABELS).map(([value, label]) => ({
  value: value as DepartureState,
  label,
}));

// Los mismos criterios que src/schemas/departure.schema.js en la API.
function createDepartureForm() {
  return new FormGroup(
    {
      experienceId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      guideBikeId: new FormControl('', { nonNullable: true }),
      startAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      endAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      capacity: new FormControl<number | null>(null, [Validators.required, Validators.min(1), integer]),
      price: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(0),
        Validators.max(DEPARTURE_LIMITS.price),
        maxDecimals(2),
      ]),
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
          <select uiInput class="select" name="experienceId" formControlName="experienceId" (change)="experienceChanged($event)">
            <option value="" disabled>Elige una experiencia</option>
            @for (option of experienceOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </ui-form-field>
      }

      <ui-form-field label="Moto del guía" [optional]="true" [hint]="guideHint()" [error]="errorOf('guideBikeId')">
        <select uiInput class="select" name="guideBikeId" formControlName="guideBikeId">
          <option value="">La de la experiencia</option>
          @for (option of guideOptions(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </ui-form-field>

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
            <input uiInput type="number" name="price" inputmode="decimal" min="0" [max]="limits.price" step="0.01" formControlName="price" />
            <span aria-hidden="true">€</span>
          </div>
        </ui-form-field>
      </div>

      @if (stateLocked()) {
        <ui-readonly-field label="Estado de la salida" [hint]="cancelledReason">
          {{ stateLabels.cancelled }}
        </ui-readonly-field>
      } @else {
        <ui-form-field label="Estado de la salida" [hint]="stateHint()" [error]="errorOf('state')">
          <select uiInput class="select" name="state" formControlName="state">
            @for (option of states; track option.value) {
              <option [value]="option.value" [disabled]="option.value === 'completed' && !finished()">
                {{ option.label }}
              </option>
            }
          </select>
        </ui-form-field>
      }
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
  /** Las motos activas y públicas del anfitrión de la experiencia elegida. */
  readonly guideBikes = input<readonly Bike[]>([]);
  readonly guideBikesLoading = input(false);
  /** Se ha elegido otra experiencia: hay que pedir las motos de su anfitrión. */
  readonly experienceChange = output<string>();

  protected readonly states = STATES;
  protected readonly stateLabels = DEPARTURE_STATE_LABELS;
  protected readonly limits = DEPARTURE_LIMITS;
  protected readonly cancelledReason = 'Una salida cancelada no se puede reabrir.';
  protected override readonly errorMessages = {
    notFinished: () => 'Solo se puede marcar como realizada cuando ya ha terminado.',
  };

  protected readonly experienceOptions = computed<SelectOption[]>(() =>
    this.experiences().map((experience) => ({ value: experience._id, label: experience.title })),
  );

  /** La experiencia elegida (o la de la salida, al editar), si se conoce. */
  private readonly experience = computed(() => {
    this.changes();
    const id = this.record()?.experienceId ?? this.form.controls.experienceId.value;
    return this.experiences().find((experience) => experience._id === id) ?? null;
  });

  /** Las plazas van entre el mínimo y el máximo de participantes de la experiencia. */
  protected readonly capacityRange = computed(() => {
    const experience = this.experience();
    return experience ? { min: experience.minParticipants, max: experience.maxParticipants } : null;
  });

  protected readonly capacityHint = computed(() => {
    const range = this.capacityRange();
    return range === null
      ? ''
      : `Entre ${range.min} y ${range.max}, el mínimo y el máximo de la experiencia.`;
  });

  /** La salida ya ha terminado (según el fin del formulario): solo entonces es «Realizada». */
  protected readonly finished = computed(() => {
    this.changes();
    return hasEnded(this.form.controls.endAt.value);
  });

  /** Una salida cancelada no se reabre: su estado se muestra bloqueado. */
  protected readonly stateLocked = computed(
    () => this.isEdit() && this.record()?.state === 'cancelled',
  );

  protected readonly stateHint = computed(() =>
    this.finished()
      ? 'Lo que ha pasado o va a pasar con ella.'
      : 'Lo que va a pasar con ella. «Realizada» se puede marcar cuando haya terminado.',
  );

  protected readonly guideOptions = computed<SelectOption[]>(() => {
    const options = this.guideBikes().map((bike) => ({ value: bike._id, label: bikeName(bike) }));
    const record = this.record();
    const current = record?.guideBikeId ? record.guideBike : null;
    return withCurrent(
      options,
      current && { value: current._id, label: bikeName(current) },
      !this.guideBikesLoading(),
      'f',
    );
  });

  protected readonly guideHint = computed(() => {
    this.changes();
    if (!this.form.controls.experienceId.value) return 'Elige antes una experiencia.';
    return this.guideBikesLoading() ? 'Cargando las motos del anfitrión…' : '';
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

    const { experienceId, startAt, endAt, capacity, state } = this.form.controls;
    // Las plazas, entre el mínimo y el máximo de la experiencia (si se sabe cuáles son).
    capacity.addValidators((control: AbstractControl): ValidationErrors | null => {
      const range = untracked(() => this.capacityRange());
      if (!range) return null;
      return Validators.min(range.min)(control) ?? Validators.max(range.max)(control);
    });

    // «Realizada» solo si la salida ya terminó (también si se mueve el fin al futuro).
    // Se lee el fin del formulario en el momento: al cambiarlo, el estado se revalida
    // en el acto, antes de que se pueda enviar.
    state.addValidators((control: AbstractControl): ValidationErrors | null =>
      control.value === 'completed' && !hasEnded(endAt.value) ? { notFinished: true } : null,
    );
    endAt.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => state.updateValueAndValidity({ emitEvent: false }));

    effect(() => {
      this.capacityRange();
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

  /** La moto es del anfitrión de la experiencia: al cambiarla, la elegida ya no vale. */
  protected experienceChanged(event: Event): void {
    this.form.controls.guideBikeId.setValue('');
    // Del propio select: el formulario puede no haberse enterado aún del cambio.
    this.experienceChange.emit((event.target as HTMLSelectElement).value);
  }

  protected fill(departure: Departure | null): void {
    this.form.reset({
      experienceId: departure?.experienceId ?? '',
      guideBikeId: departure?.guideBikeId ?? '',
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
      ...(value.guideBikeId ? { guideBikeId: value.guideBikeId } : {}),
    };
  }

  // Las fechas solo se envían si cambian: la API exige que un inicio que llega sea
  // futuro, y así una salida que ya pasó se puede editar o marcar como realizada.
  // Se comparan como las muestra el campo (al minuto): una fecha guardada con segundos
  // que no se toca no cuenta como cambiada.
  protected override toUpdatePayload(): Partial<DeparturePayload> | null {
    const payload = this.toPayload();
    if (!payload) return null;
    const { startAt, endAt, capacity, price, state, guideBikeId } = payload;
    const value = this.form.getRawValue();
    const record = this.record();
    const unchanged = (input: string, saved: string | undefined): boolean =>
      saved !== undefined && input === toLocalInput(saved);
    return {
      ...(unchanged(value.startAt, record?.startAt) ? {} : { startAt }),
      ...(unchanged(value.endAt, record?.endAt) ? {} : { endAt }),
      capacity,
      price,
      state,
      ...(guideBikeId ? { guideBikeId } : record?.guideBikeId ? { guideBikeId: null } : {}),
    };
  }
}
