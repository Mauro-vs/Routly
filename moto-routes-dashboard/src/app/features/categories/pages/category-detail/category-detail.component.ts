import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Category } from '../../../../core/models/category.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { CategoriesStore } from '../../services/categories.store';

/** Detalle de una categoría (`/categories/:slug`). */
@Component({
  selector: 'app-category-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent, ImageGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-detail.component.html',
})
export class CategoryDetailComponent extends EntityDetailPage<Category> {
  protected readonly store = inject(CategoriesStore);
  protected readonly listPath = '/categories';

  protected readonly fields = computed<FieldItem[]>(() => {
    const category = this.record();
    if (!category) return [];
    return [
      { label: 'Nombre', value: category.name },
      { label: 'Descripción', value: category.description, format: 'multiline', empty: 'Sin descripción' },
    ];
  });
}
