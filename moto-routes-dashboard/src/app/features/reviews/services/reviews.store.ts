import { Injectable, inject } from '@angular/core';

import { Review, ReviewPayload, ReviewPhoto } from '../../../core/models/review.model';
import { EntityStore, StoreResult } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OptionList } from '../../../core/services/option-list';
import { CollectionLabels } from '../../../shared/utils/labels';
import { ReviewsService } from './reviews.service';

/** Cómo se nombra la colección en los textos del panel. */
export const REVIEW_LABELS: CollectionLabels = { singular: 'opinión', plural: 'opiniones', gender: 'f' };

/** Hasta dónde se usa el título como nombre (títulos, avisos, botones). */
const NAME_LENGTH = 60;

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, '')}…`;
}

/**
 * Estado de las opiniones con signals. Carga, filtro por estado (activa = visible en la web,
 * inactiva = oculta), borrado y papelera vienen de EntityStore. Aquí se añade quitar una foto
 * y las opciones del filtro "Sobre". No se crean ni se editan: lo que alguien ha escrito no se
 * cambia, se oculta o se borra.
 */
@Injectable({ providedIn: 'root' })
export class ReviewsStore extends EntityStore<Review, ReviewPayload> {
  protected readonly api = inject(ReviewsService);
  protected readonly listPath = '/reviews';
  protected override readonly notFoundMessage = 'Esa opinión ya no existe.';
  readonly labels = REVIEW_LABELS;

  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly notifier = inject(NotificationService);
  /** Las experiencias y los anfitriones, para el filtro "Sobre". */
  readonly targetOptions = new OptionList(() => this.api.getTargetOptions(), this.errorHandler);

  /** «Su título» o, sin título, de quién es: "Opinión de Laura". */
  displayName(review: Review): string {
    const title = review.title?.trim();
    if (title) return shorten(title, NAME_LENGTH);
    return `Opinión de ${review.user?.name ?? 'un usuario eliminado'}`;
  }

  /** Pide confirmación y quita una foto (su archivo se borra: no va a la papelera). */
  async confirmAndRemovePhoto(review: Review, photo: ReviewPhoto): Promise<StoreResult<Review> | null> {
    const confirmed = await this.notifier.confirm({
      title: '¿Quitar esta foto?',
      text: 'Se borra para siempre: las fotos no pasan por la papelera.',
      confirmText: 'Quitar foto',
      danger: true,
    });
    if (!confirmed) return null;
    try {
      const updated = await this.api.removePhoto(review._id, photo._id);
      this.replace(updated);
      void this.notifier.success('Foto quitada.');
      return { ok: true, data: updated };
    } catch (error) {
      const apiError = this.errorHandler.handle(error, { notFoundMessage: 'Esa foto ya no existe.' });
      // Ya no estaba (alguien la quitó antes): se pone al día la opinión abierta
      if (apiError.isNotFound) void this.refreshSelected();
      return { ok: false, error: apiError };
    }
  }
}
