import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Review } from '../../reviews.models';
import { StarsComponent } from '../../../../shared/ui/stars/stars.component';
import { formatLongDate, formatRelativeDate } from '../../../../shared/utils/relative-date';

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
  templateUrl: './review-item.component.html',
  styleUrl: './review-item.component.css',
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
