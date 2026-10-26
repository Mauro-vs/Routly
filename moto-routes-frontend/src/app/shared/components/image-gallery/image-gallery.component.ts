import {
  ChangeDetectionStrategy,
  Component,
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
import { RouterLink } from '@angular/router';

import {
  IMAGE_LIMITS,
  Image,
  ImageOwnerType,
  ImagePayload,
} from '../../../core/models/image.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ImagesService } from '../../../core/services/images.service';
import { NotificationService } from '../../../core/services/notification.service';
import { applyServerErrors, controlErrorMessage } from '../../utils/form-errors';
import { httpsUrl, notBlank } from '../../utils/validators';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { InputDirective } from '../form-field/input.directive';
import { IconComponent } from '../icon/icon.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { TipComponent } from '../tip/tip.component';
import { ToggleComponent } from '../toggle/toggle.component';

// Lo que dura el resalte de una imagen que se acaba de mover (como la animación en CSS).
const MOVED_TIME = 700;

/**
 * Galería de un dueño (una ruta, un usuario...) en su página de detalle: sus
 * imágenes, activas e inactivas, en el orden de `position`. Permite añadir por URL,
 * marcar la principal, cambiar el orden, activar o desactivar y eliminar (con
 * deshacer). El texto alternativo se cambia en la página de edición de la imagen.
 *
 * Respeta las reglas de la API: una imagen inactiva no puede ser la principal; si la
 * principal se desactiva o se elimina, la API elige la siguiente. Por eso, después de
 * cada cambio se vuelve a pedir la galería.
 *
 * Está en `shared` porque la usan los detalles de seis colecciones, y llama a la API
 * con `ImagesService`, que está en `core` por eso mismo (una feature no importa de
 * otra). El selector es `app-` porque así se acordó en el diseño del panel.
 *
 *   <app-image-gallery ownerType="route" [ownerId]="ruta._id" [ownerLabel]="ruta.title" />
 */
@Component({
  selector: 'app-image-gallery',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ErrorStateComponent,
    FormFieldComponent,
    IconComponent,
    InputDirective,
    SkeletonComponent,
    StatusBadgeComponent,
    TipComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.css',
})
export class ImageGalleryComponent {
  readonly ownerType = input.required<ImageOwnerType>();
  readonly ownerId = input.required<string>();
  /** Nombre del dueño, para los nombres accesibles: "Imágenes de Costa Brava". */
  readonly ownerLabel = input.required<string>();
  /** La imagen principal ha cambiado: el detalle pone al día su miniatura. */
  readonly coverChange = output<void>();

  private readonly imagesApi = inject(ImagesService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly notifications = inject(NotificationService);

  protected readonly images = signal<Image[]>([]);
  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);
  /** Hay un cambio en curso: los demás controles esperan a que termine. */
  protected readonly busy = signal(false);
  /** La imagen que se acaba de mover, que se resalta un momento. */
  protected readonly moved = signal<string | null>(null);
  protected readonly limits = IMAGE_LIMITS;

  protected readonly summary = computed(() => {
    const count = this.images().length;
    if (count === 0) return 'La primera que añadas será la principal.';
    const total = count === 1 ? '1 imagen' : `${count} imágenes`;
    return `${total}. La principal es la que se ve como portada o foto.`;
  });

  // Formulario de añadir: la dirección y su texto alternativo.
  protected readonly addForm = new FormGroup({
    url: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, httpsUrl, Validators.maxLength(IMAGE_LIMITS.url)],
    }),
    alt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(IMAGE_LIMITS.alt)],
    }),
  });
  private readonly addChanges = toSignal(this.addForm.events);
  private readonly addSubmitted = signal(false);
  protected readonly adding = signal(false);

  constructor() {
    effect(() => {
      this.ownerType();
      this.ownerId();
      untracked(() => void this.load());
    });
  }

  /** Nombre de una imagen para los avisos y los botones: su texto alternativo. */
  protected nameOf(image: Image, index: number): string {
    return image.alt || `Imagen ${index + 1}`;
  }

  /** Por qué no se puede marcar como principal. null: se puede. */
  protected coverReason(image: Image): string | null {
    if (image.isCover) return 'Ya es la imagen principal.';
    if (!image.isActive) return 'Una imagen inactiva no puede ser la principal.';
    return null;
  }

  protected addError(name: 'url' | 'alt'): string | null {
    this.addChanges();
    const control = this.addForm.controls[name];
    return control.touched || this.addSubmitted() ? controlErrorMessage(control) : null;
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      this.images.set(
        await this.imagesApi.getByOwner(this.ownerType(), this.ownerId()),
      );
      this.loaded.set(true);
    } catch (error) {
      this.errors.handle(error);
      this.failed.set(true);
    }
  }

  protected async add(): Promise<void> {
    this.addSubmitted.set(true);
    this.addForm.markAllAsTouched();
    if (this.addForm.invalid || this.adding()) return;

    const { url, alt } = this.addForm.getRawValue();
    const payload: ImagePayload = {
      ownerType: this.ownerType(),
      ownerId: this.ownerId(),
      url: url.trim(),
      ...(alt.trim() ? { alt: alt.trim() } : {}),
    };

    this.adding.set(true);
    try {
      await this.imagesApi.create(payload);
      this.addForm.reset();
      this.addSubmitted.set(false);
      void this.notifications.success('Imagen añadida.');
      await this.reload();
    } catch (error) {
      const apiError = this.errors.handle(error, { inline: true });
      if (apiError.fieldErrors) {
        const unmatched = applyServerErrors(this.addForm, apiError.fieldErrors);
        if (Object.keys(unmatched).length > 0) void this.notifications.errorToast(apiError.message);
      } else if (apiError.type === 'validation' || apiError.isConflict) {
        void this.notifications.errorToast(apiError.message);
      }
    } finally {
      this.adding.set(false);
    }
  }

  protected async setCover(image: Image): Promise<void> {
    if (this.coverReason(image)) return;
    await this.run(() => this.imagesApi.update(image._id, { isCover: true }));
  }

  protected async setActive(image: Image, isActive: boolean): Promise<void> {
    await this.run(() => this.imagesApi.setActive(image._id, isActive));
  }

  /** Sube o baja una imagen un puesto. Se reescriben las posiciones que cambian. */
  protected async move(index: number, step: -1 | 1): Promise<void> {
    const order = [...this.images()];
    const target = index + step;
    if (target < 0 || target >= order.length) return;

    const [image] = order.splice(index, 1);
    order.splice(target, 0, image);
    await this.run(async () => {
      for (const [position, item] of order.entries()) {
        if (item.position !== position) {
          await this.imagesApi.update(item._id, { position });
        }
      }
    });
    this.highlight(image._id);
  }

  protected async remove(image: Image, index: number): Promise<void> {
    const name = this.nameOf(image, index);
    const confirmed = await this.notifications.confirm({
      title: `¿Eliminar «${name}»?`,
      text: 'Deja de verse en la galería. Podrás deshacerlo justo después.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    const removed = await this.run(() => this.imagesApi.remove(image._id));
    if (!removed) return;

    const undo = await this.notifications.undoable('Imagen eliminada.');
    if (!undo) return;
    // Sin isActive: la API la devuelve como estaba (y vuelve a ser la principal si lo era)
    const restored = await this.run(() => this.imagesApi.restore(image._id));
    if (restored) void this.notifications.success('Imagen restaurada.');
  }

  /** Hace un cambio, vuelve a pedir la galería y dice si ha salido bien. */
  private async run(change: () => Promise<unknown>): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    try {
      await change();
      return true;
    } catch (error) {
      // El aviso lo da ErrorHandlerService; la galería se pone al día al volver a pedirla.
      this.errors.handle(error);
      return false;
    } finally {
      // Aunque falle a medias (al reordenar son varias llamadas), se vuelve a pedir.
      await this.reload();
      this.busy.set(false);
    }
  }

  /** Vuelve a pedir la galería y avisa si ha cambiado la imagen principal. */
  private async reload(): Promise<void> {
    const before = this.coverId();
    await this.load();
    if (this.coverId() !== before) this.coverChange.emit();
  }

  private coverId(): string | null {
    return this.images().find((image) => image.isCover)?._id ?? null;
  }

  private highlight(id: string): void {
    this.moved.set(id);
    setTimeout(() => {
      if (this.moved() === id) this.moved.set(null);
    }, MOVED_TIME);
  }
}
