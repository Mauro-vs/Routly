import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { REVIEW_TARGETS, ReviewPhoto } from '../../../../core/models/review.model';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { RatingStarsComponent } from '../../../../shared/components/rating-summary/rating-stars.component';
import { ReviewsStore } from '../../services/reviews.store';

/**
 * Detalle de una opinión (`/reviews/:id`): lo que ha escrito, sus fotos en grande y de quién y
 * sobre qué es. No se edita (es lo que ha escrito alguien): se oculta, se borra o se le quita
 * una foto.
 */
@Component({
  selector: 'app-review-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent, IconComponent, RatingStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [subtitle]="subtitle()"
      [labels]="store.labels"
      [record]="record()"
      [failed]="loadFailed()"
      [busy]="busy()"
      (activeChange)="setActive($event)"
      (remove)="remove()"
      (retry)="open()"
    >
      @if (record(); as review) {
        <section class="card text" aria-label="Lo que ha escrito">
          <p class="stars"><ui-rating-stars [value]="review.rating" /> <strong>{{ review.rating }} de 5</strong></p>
          @if (review.title) {
            <h2>{{ review.title }}</h2>
          }
          @if (review.comment) {
            <p class="comment">{{ review.comment }}</p>
          } @else {
            <p class="muted">Solo ha puntuado, sin comentario.</p>
          }
          @if (!review.isActive) {
            <p class="hidden-note"><ui-icon name="eye-slash" /> Oculta: no sale en la web ni cuenta para la nota.</p>
          }
        </section>

        <ui-detail-section
          heading="Fotos"
          [description]="review.photos.length ? 'Quitar una foto la borra para siempre: no pasa por la papelera.' : ''"
        >
          @if (review.photos.length > 0) {
            <ul class="photos">
              @for (photo of review.photos; track photo._id; let i = $index) {
                <li>
                  <a [href]="photo.url" target="_blank" rel="noopener" [attr.aria-label]="'Abrir la foto ' + (i + 1) + ' en otra pestaña'">
                    <img [src]="photo.url" alt="" [width]="photo.width" [height]="photo.height" loading="lazy" decoding="async" />
                  </a>
                  <button type="button" class="btn btn--danger btn--sm" (click)="removePhoto(photo)" [attr.aria-label]="'Quitar la foto ' + (i + 1)">
                    <ui-icon name="trash" /> Quitar
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">Sin fotos.</p>
          }
        </ui-detail-section>
      }
      <ui-detail-section heading="Datos">
        <ui-field-list [columns]="2" [items]="data()" />
      </ui-detail-section>
    </ui-detail-page>
  `,
  styles: `
    .text {
      display: grid;
      gap: 8px;
      padding: 20px;
    }

    .stars {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.25rem;
    }

    h2 {
      font-size: var(--text-lg);
    }

    .comment {
      max-width: 70ch;
      line-height: 1.6;
      white-space: pre-line;
    }

    .hidden-note {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-warning);
      font-size: var(--text-sm);
    }

    .photos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .photos li {
      display: grid;
      gap: 8px;
      justify-items: start;
    }

    .photos img {
      display: block;
      width: 100%;
      height: 220px;
      border-radius: var(--radius-md);
      object-fit: cover;
      background: var(--color-surface-2);
    }
  `,
})
export class ReviewDetailComponent {
  /** `id` de la URL. */
  readonly id = input.required<string>();

  protected readonly store = inject(ReviewsStore);
  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbService);

  protected readonly record = computed(() => {
    const selected = this.store.selected();
    return selected?._id === this.id() ? selected : null;
  });
  protected readonly loadFailed = computed(
    () => (!this.record() && !this.store.loading() && this.store.error()) || null,
  );
  protected readonly busy = computed(() => this.store.isBusy(this.id()));
  protected readonly title = computed(() => {
    const review = this.record();
    return review ? this.store.displayName(review) : '';
  });
  protected readonly subtitle = computed(() => {
    const review = this.record();
    if (!review) return '';
    const about = review.target ? `sobre ${review.target.name}` : 'sobre algo que ya no existe';
    return `De ${review.user?.name ?? 'un usuario eliminado'}, ${about}`;
  });

  protected readonly data = computed<FieldItem[]>(() => {
    const review = this.record();
    if (!review) return [];
    const target = REVIEW_TARGETS[review.targetType];
    const edited = review.updatedAt !== review.createdAt;
    return [
      {
        label: target.label,
        value: review.target?.name,
        relation: true,
        gender: review.targetType === 'experience' ? 'f' : 'm',
        link: review.target ? [target.path, review.target.slug] : null,
      },
      { label: 'Autor', value: review.user?.name, relation: true, link: review.user ? ['/users', 'id', review.user._id] : null },
      { label: 'Escrita', value: review.createdAt, format: 'datetime' },
      { label: 'Última edición', value: edited ? review.updatedAt : null, format: 'datetime', empty: 'Sin editar' },
      { label: 'Ha hecho la salida', value: review.verified ? 'Sí, verificada' : 'Sin verificar (aún no hay reservas)' },
      { label: 'Fotos', value: review.photos.length, format: 'number' },
    ];
  });

  constructor() {
    effect(() => {
      this.id();
      untracked(() => void this.open());
    });
  }

  protected async open(): Promise<void> {
    const review = await this.store.getOne(this.id());
    if (review) this.breadcrumbs.set(this.store.displayName(review));
  }

  protected setActive(isActive: boolean): void {
    const review = this.record();
    if (review) void this.store.setActive(review, isActive);
  }

  protected async remove(): Promise<void> {
    const review = this.record();
    if (review && (await this.store.confirmAndRemove(review))) {
      void this.router.navigateByUrl('/reviews');
    }
  }

  protected removePhoto(photo: ReviewPhoto): void {
    const review = this.record();
    if (review) void this.store.confirmAndRemovePhoto(review, photo);
  }
}
