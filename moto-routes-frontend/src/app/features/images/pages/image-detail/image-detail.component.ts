import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';

import { IMAGE_OWNERS, Image, imageOwnerPath } from '../../../../core/models/image.model';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImagesStore } from '../../services/images.store';

/**
 * Detalle de una imagen (`/images/:id`). Las imágenes no tienen slug: se abren por
 * su `_id`. El orden y la imagen principal se cambian desde la galería de su dueño.
 */
@Component({
  selector: 'app-image-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [subtitle]="record()?.isCover ? 'Imagen principal' : ''"
      [labels]="store.labels"
      [record]="record()"
      [failed]="loadFailed()"
      [editPath]="editPath()"
      [busy]="busy()"
      (activeChange)="setActive($event)"
      (remove)="remove()"
      (retry)="open()"
    >
      @if (record(); as image) {
        <section class="card preview" aria-label="Vista previa">
          <img [src]="image.url" [alt]="image.alt ?? ''" width="960" height="600" />
        </section>
      }
      <ui-detail-section heading="Datos">
        <ui-field-list [items]="data()" />
      </ui-detail-section>
      <ui-detail-section heading="Dueño y orden" description="El orden y la principal se cambian desde la galería del dueño.">
        <ui-field-list [columns]="2" [items]="owner()" />
      </ui-detail-section>
    </ui-detail-page>
  `,
  styles: `
    .preview {
      overflow: hidden;
      padding: 8px;
    }

    .preview img {
      display: block;
      width: 100%;
      max-height: 420px;
      border-radius: var(--radius-md);
      object-fit: contain;
      background: var(--color-surface-2);
    }
  `,
})
export class ImageDetailComponent {
  /** `id` de la URL. */
  readonly id = input.required<string>();

  protected readonly store = inject(ImagesStore);
  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbService);

  protected readonly record = computed(() => {
    const selected = this.store.selected();
    return selected?._id === this.id() ? selected : null;
  });
  protected readonly loadFailed = computed(
    () => !this.record() && !this.store.loading() && this.store.error() !== null,
  );
  protected readonly busy = computed(() => this.store.isBusy(this.id()));
  protected readonly editPath = computed(() => ['/images', this.id(), 'edit']);
  protected readonly title = computed(() => {
    const image = this.record();
    return image ? this.store.displayName(image) : '';
  });

  protected readonly data = computed<FieldItem[]>(() => {
    const image = this.record();
    if (!image) return [];
    return [
      { label: 'Dirección', value: image.url, href: image.url },
      { label: 'Texto alternativo', value: image.alt, empty: 'Sin texto alternativo' },
    ];
  });

  protected readonly owner = computed<FieldItem[]>(() => {
    const image = this.record();
    if (!image) return [];
    return [
      { label: 'Dueño', value: IMAGE_OWNERS[image.ownerType].label, link: imageOwnerPath(image) },
      { label: 'Id del dueño', value: image.ownerId, format: 'mono' },
      { label: 'Posición en la galería', value: image.position + 1, format: 'number' },
      { label: 'Principal', value: image.isCover ? 'Sí' : 'No' },
    ];
  });

  constructor() {
    effect(() => {
      this.id();
      untracked(() => void this.open());
    });
  }

  protected async open(): Promise<void> {
    const image = await this.store.getOne(this.id());
    if (image) this.breadcrumbs.set(this.store.displayName(image));
  }

  protected setActive(isActive: boolean): void {
    const image: Image | null = this.record();
    if (image) void this.store.setActive(image, isActive);
  }

  protected async remove(): Promise<void> {
    const image = this.record();
    if (image && (await this.store.confirmAndRemove(image))) {
      void this.router.navigateByUrl('/images');
    }
  }
}
