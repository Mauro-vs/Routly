import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { Category, CategoryPayload } from '../../../../core/models/category.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { CategoryFormComponent } from '../../components/category-form/category-form.component';
import { CategoriesStore } from '../../services/categories.store';

/** Crear (`/categories/new`) y editar (`/categories/:slug/edit`) una categoría. */
@Component({
  selector: 'app-category-form-page',
  imports: [FormPageComponent, CategoryFormComponent, ImageGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-form-page.component.html',
})
export class CategoryFormPageComponent extends EntityFormPage<Category, CategoryPayload> {
  protected readonly store = inject(CategoriesStore);
  protected readonly listPath = '/categories';
  protected readonly form = viewChild(CategoryFormComponent);
}
