import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import {
  CATEGORY_LIMITS,
  Category,
  CategoryPayload,
} from '../../../../core/models/category.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { minTrimmed, notBlank } from '../../../../shared/utils/validators';

// Los mismos criterios que src/schemas/category.schema.js en la API.
function createCategoryForm() {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(2), Validators.maxLength(CATEGORY_LIMITS.name)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(CATEGORY_LIMITS.description)],
    }),
  });
}

type CategoryControls = ReturnType<typeof createCategoryForm>['controls'];

/** Campos de una categoría: el nombre y una descripción opcional. */
@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent extends EntityForm<Category, CategoryPayload, CategoryControls> {
  protected readonly limits = CATEGORY_LIMITS;

  constructor() {
    super(createCategoryForm());
  }

  protected fill(category: Category | null): void {
    this.form.reset({
      name: category?.name ?? '',
      description: category?.description ?? '',
    });
  }

  protected toPayload(): CategoryPayload {
    const { name, description } = this.form.getRawValue();
    return { name: name.trim(), description: optionalText(description) };
  }

  protected override toUpdatePayload(): Partial<CategoryPayload> {
    const { name, description } = this.form.getRawValue();
    return { name: name.trim(), description: editedText(description, this.record()?.description) };
  }

  // El único 409 al guardar es un nombre repetido.
  protected override conflictField(_error: ApiError): string {
    return 'name';
  }
}
