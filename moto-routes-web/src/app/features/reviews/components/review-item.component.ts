import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Review } from '../../../core/reviews/reviews.models';
import { StarsComponent } from '../../../shared/ui/stars/stars.component';
import { formatLongDate, formatRelativeDate } from '../../../shared/utils/relative-date';

/** A partir de cuántos caracteres un comentario se corta con "Leer más" */
export const LONG_COMMENT = 320;

/**
 * Una opinión: estrellas, título, comentario (cortado si es largo), autor, cuándo y las
 * miniaturas de sus fotos. La mía lleva además "Editar" y "Borrar".
 */
@Component({
  selector: 'app-review-item',
  imports: [StarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article [attr.aria-labelledby]="'opinion-' + review()._id">
      <header>
        <ui-stars [value]="review().rating" />
        <h3 [id]="'opinion-' + review()._id">{{ review().title || defaultTitle() }}</h3>
      </header>
      @if (review().comment; as comment) {
        <p class="comment">{{ expanded() || !isLong() ? comment : comment.slice(0, cut) + '…' }}</p>
        @if (isLong()) {
          <button type="button" class="link-button" [attr.aria-expanded]="expanded()" (click)="expanded.set(!expanded())">
            {{ expanded() ? 'Leer menos' : 'Leer más' }}
          </button>
        }
      }
      @if (review().photos.length > 0) {
        <ul class="thumbs" aria-label="Fotos de la opinión">
          @for (photo of review().photos; track photo._id; let i = $index) {
            <li>
              <button type="button" (click)="openPhoto.emit(i)" [attr.aria-label]="'Ver la foto ' + (i + 1) + ' de ' + review().photos.length + ' en grande'">
                <img [src]="photo.url" alt="" loading="lazy" decoding="async" width="72" height="72" />
              </button>
            </li>
          }
        </ul>
      }
      <footer>
        <span class="author">{{ mine() ? 'Tu opinión' : (review().user?.name ?? 'Un rider') }}</span>
        <time [attr.datetime]="review().createdAt" [title]="longDate()">{{ when() }}</time>
        @if (edited()) {<span class="edited">(editada)</span>}
        @if (mine()) {
          <span class="actions">
            <button type="button" class="link-button" (click)="edit.emit()">Editar</button>
            <button type="button" class="link-button danger" (click)="remove.emit()">Borrar</button>
          </span>
        }
      </footer>
    </article>
  `,
  styles: `
    article {
      display: grid;
      gap: var(--space-2);
      padding-block: var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }

    header {
      display: grid;
      gap: var(--space-1);
      font-size: 17px;
    }

    h3 {
      font-size: 17px;
      font-weight: 750;
    }

    .comment {
      max-width: 68ch;
      line-height: 1.55;
      white-space: pre-line;
    }

    .thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-1) 0 0;
      padding: 0;
      list-style: none;
    }

    .thumbs button {
      display: block;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      cursor: zoom-in;
    }

    .thumbs img {
      display: block;
      width: 72px;
      height: 72px;
      border-radius: var(--radius-md);
      object-fit: cover;
    }

    .thumbs button:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .author {
      font-weight: 700;
      color: var(--color-text);
    }

    .actions {
      display: inline-flex;
      gap: var(--space-4);
      margin-left: auto;
    }
  `,
})
export class ReviewItemComponent {
  readonly review = input.required<Review>();
  /** Es la mía: sale "Editar" y "Borrar" */
  readonly mine = input(false);
  readonly openPhoto = output<number>();
  readonly edit = output<void>();
  readonly remove = output<void>();

  protected readonly cut = LONG_COMMENT;
  protected readonly expanded = signal(false);
  protected readonly isLong = computed(() => (this.review().comment?.length ?? 0) > LONG_COMMENT + 40);
  protected readonly when = computed(() => formatRelativeDate(this.review().createdAt));
  protected readonly longDate = computed(() => formatLongDate(this.review().createdAt));
  // Editada si se ha cambiado bastante después (no por un segundo de diferencia al crearla)
  protected readonly edited = computed(
    () => new Date(this.review().updatedAt).getTime() - new Date(this.review().createdAt).getTime() > 60_000,
  );
  protected readonly defaultTitle = computed(() => ['', 'Muy mala', 'Mala', 'Normal', 'Buena', 'Excelente'][this.review().rating]);
}
