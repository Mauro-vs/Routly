import { Directive, Signal, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { BaseEntity } from '../../core/models/entity.model';
import { BreadcrumbService } from '../../core/services/breadcrumb.service';
import { EntityStore, StoreResult } from '../../core/services/entity.store';
import { NotificationService } from '../../core/services/notification.service';
import { EntityFormHandle, FormSubmit } from '../forms/entity-form';
import { agree, capitalize } from '../utils/labels';

/**
 * Base de las páginas de crear (`/<colección>/new`) y editar (`/<colección>/:slug/edit`).
 * Al editar pide el registro por su slug; al guardar llama al store y, si la API
 * rechaza algo, se lo devuelve al formulario para que lo pinte junto al campo. Si
 * sale bien, va al detalle del registro.
 *
 * Cada página declara su `store`, su `listPath` y el formulario (`viewChild`).
 */
@Directive()
export abstract class EntityFormPage<T extends BaseEntity, TPayload>
  implements HasUnsavedChanges
{
  /** `slug` de la URL. No llega al crear. */
  readonly slug = input<string>();

  protected abstract readonly store: EntityStore<T, TPayload>;
  protected abstract readonly listPath: string;
  /** El formulario de la página: `viewChild(CategoryFormComponent)`. */
  protected abstract readonly form: Signal<EntityFormHandle | undefined>;

  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly breadcrumbs = inject(BreadcrumbService);

  protected readonly isEdit = computed(() => !!this.slug());
  /** El registro que se edita. Al crear es null aunque el store conserve el último abierto. */
  protected readonly record = computed(() => {
    const selected = this.store.selected();
    return this.isEdit() && selected?.slug === this.slug() ? selected : null;
  });
  protected readonly saving = computed(() => this.store.saving());
  /** Al editar, el registro aún no ha llegado. */
  protected readonly loading = computed(() => this.isEdit() && !this.record());
  /** La carga ha fallado por algo que no es un 404 (ese caso vuelve solo al listado). */
  protected readonly loadFailed = computed(
    () => this.loading() && !this.store.loading() && this.store.error() !== null,
  );
  /** Al crear, el estado se decide aquí y se aplica al guardar. */
  private readonly activeOnCreate = signal(true);
  protected readonly isActive = computed(() => this.record()?.isActive ?? this.activeOnCreate());
  /** "Cancelar" vuelve al detalle al editar, y al listado al crear. */
  protected readonly cancelPath = computed(() => {
    const record = this.record();
    return record ? [this.listPath, record.slug] : this.listPath;
  });
  protected readonly heading = computed(() => {
    const record = this.record();
    if (record) return this.store.displayName(record);
    const { singular, gender } = this.store.labels;
    return this.isEdit()
      ? `Editar ${singular}`
      : `${agree(gender, 'Nueva', 'Nuevo')} ${singular}`;
  });

  private leaving = false;

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.open(slug));
    });
  }

  hasUnsavedChanges(): boolean {
    return (this.form()?.dirty() ?? false) && !this.leaving;
  }

  protected setActive(isActive: boolean): void {
    const record = this.record();
    if (record) void this.store.setActive(record, isActive);
    else this.activeOnCreate.set(isActive);
  }

  protected async save(submit: FormSubmit<TPayload>): Promise<void> {
    if (this.saving()) return;

    const current = this.record();
    let result: StoreResult<T>;
    if (submit.mode === 'update' && current) {
      result = await this.store.update(current._id, submit.payload);
    } else if (submit.mode === 'create') {
      result = await this.store.create(submit.payload);
    } else {
      return;
    }

    if (!result.ok) {
      this.form()?.showServerError(result.error);
      return;
    }

    // La API crea siempre registros activos: si se pidió inactivo, hace falta otra llamada.
    if (!current && !this.activeOnCreate()) await this.store.setActive(result.data, false);

    this.form()?.markSaved();
    const { singular, gender } = this.store.labels;
    void this.notifications.success(
      current
        ? 'Cambios guardados.'
        : `${capitalize(singular)} ${agree(gender, 'creada', 'creado')}.`,
    );
    // El slug puede cambiar al editar (sale del nombre): se usa el que devuelve la API.
    this.leaving = true;
    void this.router.navigate([this.listPath, result.data.slug]);
  }

  /** La galería ha cambiado la imagen principal: se pone al día el registro. */
  protected refreshCover(): void {
    void this.store.refreshSelected();
  }

  protected retry(): void {
    void this.open(this.slug());
  }

  private async open(slug: string | undefined): Promise<void> {
    if (!slug) {
      this.store.clearSelected();
      return;
    }

    const record = await this.store.getBySlug(slug);
    if (record) this.breadcrumbs.set(this.store.displayName(record));
  }
}
