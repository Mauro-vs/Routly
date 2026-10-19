import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import { Category } from '../../../../core/models/category.model';
import { Location } from '../../../../core/models/location.model';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  ROUTE_LIMITS,
  Route,
  RouteDifficulty,
  RoutePayload,
} from '../../../../core/models/route.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { applyServerErrors, controlErrorMessage } from '../../../../shared/utils/form-errors';
import { notBlank } from '../../../../shared/utils/validators';

type FieldName =
  | 'title'
  | 'description'
  | 'categoryId'
  | 'startLocationId'
  | 'endLocationId'
  | 'difficulty'
  | 'distance'
  | 'duration';

export interface SelectOption {
  value: string;
  label: string;
}

/** Id del `<form>`: el botón de guardar de la cabecera de la página lo envía con `form="..."`. */
export const ROUTE_FORM_ID = 'route-form';

/**
 * Campos de una ruta. Valida en el cliente con los mismos criterios que la API y,
 * cuando el formulario es válido, emite `save` con los datos listos para enviar.
 * Quien lo usa guarda y, si la API rechaza algo, se lo devuelve con `showServerError`
 * para pintarlo junto a su campo.
 *
 * Los selects ofrecen las categorías y ubicaciones activas. Si la ruta que se edita
 * usa una que se ha desactivado después, también aparece (marcada como inactiva):
 * la API la acepta mientras no se cambie.
 */
@Component({
  selector: 'app-route-form',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-form.component.html',
  styleUrl: './route-form.component.css',
})
export class RouteFormComponent {
  /** La ruta que se edita. Sin ella, el formulario es para crear. */
  readonly route = input<Route | null>(null);
  readonly categories = input<readonly Category[]>([]);
  readonly locations = input<readonly Location[]>([]);
  /** Las opciones de los selects aún no han llegado. */
  readonly optionsLoading = input(false);
  readonly save = output<RoutePayload>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly formId = ROUTE_FORM_ID;
  protected readonly limits = ROUTE_LIMITS;
  protected readonly difficulties = DIFFICULTIES.map((value) => ({
    value,
    label: DIFFICULTY_LABELS[value],
  }));

  // Los mismos criterios que src/schemas/route.schema.js en la API.
  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(ROUTE_LIMITS.title)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(ROUTE_LIMITS.description)],
    }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startLocationId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endLocationId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    difficulty: new FormControl<RouteDifficulty | null>(null, Validators.required),
    distance: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    duration: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });
  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly formChanges = toSignal(this.form.events);

  protected readonly submitted = signal(false);
  /** Error que no pertenece a ningún campo concreto. */
  protected readonly formError = signal<string | null>(null);

  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const options = this.categories().map((category) => ({
      value: category._id,
      label: category.name,
    }));
    const current = this.route()?.category;
    return withCurrent(
      options,
      current && { value: current._id, label: current.name },
      !this.optionsLoading(),
    );
  });

  protected readonly locationOptions = computed<SelectOption[]>(() => {
    const options = this.locations().map((location) => ({
      value: location._id,
      label: placeLabel(location.city, location.region),
    }));
    const route = this.route();
    const loaded = !this.optionsLoading();
    return [route?.startLocation, route?.endLocation].reduce(
      (list, place) =>
        withCurrent(
          list,
          place && { value: place._id, label: placeLabel(place.city, place.region) },
          loaded,
        ),
      options,
    );
  });

  protected readonly titleCounter = computed(() => this.counter('title', ROUTE_LIMITS.title));
  protected readonly descriptionCounter = computed(() =>
    this.counter('description', ROUTE_LIMITS.description),
  );

  // Solo se rellena cuando cambia de ruta: si la misma ruta se pone al día (por
  // ejemplo, al cambiar su estado), lo que se está escribiendo no se pierde.
  private readonly routeId = computed(() => this.route()?._id ?? null);

  constructor() {
    effect(() => {
      this.routeId();
      untracked(() => this.fill(this.route()));
    });
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
    } else if (error.isConflict && error.detail?.includes('slug')) {
      // La dirección (slug) sale del título.
      applyServerErrors(this.form, {
        title: 'Ya existe una ruta con esa dirección. Cambia un poco el título.',
      });
      this.focusFirstInvalid();
    } else if (error.isConflict || error.type === 'validation') {
      this.formError.set(error.message);
    }
    // Red, tiempo de espera, 5xx y 404 ya los ha mostrado ErrorHandlerService.
  }

  protected errorOf(name: FieldName): string | null {
    this.formChanges();
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control) : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const payload = this.toPayload();
    if (payload) this.save.emit(payload);
  }

  private fill(route: Route | null): void {
    this.submitted.set(false);
    this.formError.set(null);
    if (!route) {
      this.form.reset();
      return;
    }

    this.form.reset({
      title: route.title,
      description: route.description ?? '',
      categoryId: route.categoryId,
      startLocationId: route.startLocationId,
      endLocationId: route.endLocationId,
      difficulty: route.difficulty,
      distance: route.distance,
      duration: route.duration,
    });
  }

  private toPayload(): RoutePayload | null {
    const value = this.form.getRawValue();
    const { difficulty, distance, duration } = value;
    // Con el formulario válido estos tres campos tienen valor; la comprobación es para el tipo.
    if (difficulty === null || distance === null || duration === null) return null;

    return {
      title: value.title.trim(),
      description: value.description.trim(),
      categoryId: value.categoryId,
      startLocationId: value.startLocationId,
      endLocationId: value.endLocationId,
      difficulty,
      distance,
      duration,
    };
  }

  private counter(name: 'title' | 'description', max: number): string {
    this.formChanges();
    return `${this.form.controls[name].value.length} / ${max}`;
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>(
            'input.ng-invalid, textarea.ng-invalid, select.ng-invalid',
          )
          ?.focus(),
      { injector: this.injector },
    );
  }
}

function placeLabel(city: string, region: string | undefined): string {
  return region ? `${city} (${region})` : city;
}

/**
 * Añade la opción que ya tiene la ruta si no está entre las activas. Mientras las
 * opciones no han llegado no se marca como inactiva: todavía no se sabe.
 */
function withCurrent(
  options: SelectOption[],
  current: SelectOption | null | undefined,
  markInactive: boolean,
): SelectOption[] {
  if (!current || options.some((option) => option.value === current.value)) return options;
  const label = markInactive ? `${current.label} (inactiva)` : current.label;
  return [...options, { ...current, label }];
}
