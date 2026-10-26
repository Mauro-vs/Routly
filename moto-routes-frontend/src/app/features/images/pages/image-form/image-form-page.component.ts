import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { ImagePayload } from '../../../../core/models/image.model';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { FormSubmit } from '../../../../shared/forms/entity-form';
import { ImageFormComponent } from '../../components/image-form/image-form.component';
import { ImagesStore } from '../../services/images.store';

/**
 * Editar una imagen (`/images/:id/edit`): su dirección y su texto alternativo. No hay
 * página de crear: las imágenes se añaden desde la galería de su dueño.
 */
@Component({
  selector: 'app-image-form-page',
  imports: [FormPageComponent, ImageFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-form-page
      [heading]="heading()"
      [labels]="store.labels"
      [isEdit]="true"
      [loading]="!record()"
      [failed]="loadFailed()"
      [saving]="store.saving()"
      [cancelPath]="detailPath()"
      [active]="record()?.isActive ?? true"
      (activeChange)="setActive($event)"
      (retry)="open()"
    >
      <app-image-form [record]="record()" (save)="save($event)" />
    </ui-form-page>
  `,
})
export class ImageFormPageComponent implements HasUnsavedChanges {
  /** `id` de la URL. */
  readonly id = input.required<string>();

  protected readonly store = inject(ImagesStore);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly breadcrumbs = inject(BreadcrumbService);
  private readonly form = viewChild(ImageFormComponent);

  protected readonly record = computed(() => {
    const selected = this.store.selected();
    return selected?._id === this.id() ? selected : null;
  });
  protected readonly loadFailed = computed(
    () => !this.record() && !this.store.loading() && this.store.error() !== null,
  );
  protected readonly heading = computed(() => {
    const image = this.record();
    return image ? this.store.displayName(image) : 'Editar imagen';
  });
  protected readonly detailPath = computed(() => ['/images', this.id()]);

  private leaving = false;

  constructor() {
    effect(() => {
      this.id();
      untracked(() => void this.open());
    });
  }

  hasUnsavedChanges(): boolean {
    return (this.form()?.dirty() ?? false) && !this.leaving;
  }

  protected async open(): Promise<void> {
    const image = await this.store.getOne(this.id());
    if (image) this.breadcrumbs.set(this.store.displayName(image));
  }

  protected setActive(isActive: boolean): void {
    const image = this.record();
    if (image) void this.store.setActive(image, isActive);
  }

  protected async save(submit: FormSubmit<ImagePayload>): Promise<void> {
    const image = this.record();
    if (!image || submit.mode !== 'update' || this.store.saving()) return;

    const result = await this.store.update(image._id, submit.payload);
    if (!result.ok) {
      this.form()?.showServerError(result.error);
      return;
    }

    this.form()?.markSaved();
    void this.notifications.success('Cambios guardados.');
    this.leaving = true;
    void this.router.navigate(this.detailPath());
  }
}
