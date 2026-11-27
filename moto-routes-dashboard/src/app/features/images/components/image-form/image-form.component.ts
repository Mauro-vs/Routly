import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  IMAGE_LIMITS,
  IMAGE_OWNERS,
  Image,
  ImagePayload,
} from '../../../../core/models/image.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { ReadonlyFieldComponent } from '../../../../shared/components/form-field/readonly-field/readonly-field.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText } from '../../../../shared/forms/entity-form';
import { httpsUrl, notBlank } from '../../../../shared/utils/validators';

// Los mismos criterios que src/schemas/image.schema.js en la API.
function createImageForm() {
  return new FormGroup({
    url: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, httpsUrl, Validators.maxLength(IMAGE_LIMITS.url)],
    }),
    alt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(IMAGE_LIMITS.alt)],
    }),
  });
}

type ImageControls = ReturnType<typeof createImageForm>['controls'];

/**
 * Campos de una imagen al editarla: la dirección y el texto alternativo. El dueño no
 * se puede cambiar (se muestra, pero no se envía). Las imágenes se crean desde la
 * galería de su dueño, no con este formulario.
 */
@Component({
  selector: 'app-image-form',
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    InputDirective,
    IconComponent,
    ReadonlyFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-form.component.html',
  styleUrl: './image-form.component.css',
})
export class ImageFormComponent extends EntityForm<Image, ImagePayload, ImageControls> {
  protected readonly limits = IMAGE_LIMITS;
  protected readonly owners = IMAGE_OWNERS;

  constructor() {
    super(createImageForm());
  }

  protected fill(image: Image | null): void {
    this.form.reset({ url: image?.url ?? '', alt: image?.alt ?? '' });
  }

  // Solo se edita: crear es cosa de la galería. Al crear haría falta el dueño.
  protected toPayload(): ImagePayload | null {
    const image = this.record();
    if (!image) return null;
    return { ownerType: image.ownerType, ownerId: image.ownerId, ...this.toUpdatePayload() };
  }

  protected override toUpdatePayload(): Pick<ImagePayload, 'url' | 'alt'> {
    const { url, alt } = this.form.getRawValue();
    return { url: url.trim(), alt: editedText(alt, this.record()?.alt) };
  }
}
