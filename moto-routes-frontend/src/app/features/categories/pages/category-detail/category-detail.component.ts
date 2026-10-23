import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Category } from '../../../../core/models/category.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { CategoriesStore } from '../../services/categories.store';

/** Detalle de una categoría (`/categories/:slug`). */
@Component({
  selector: 'app-category-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [labels]="store.labels"
      [record]="record()"
      [failed]="loadFailed()"
      [identifier]="identifier()"
      [editPath]="editPath()"
      [busy]="busy()"
      (activeChange)="setActive($event)"
      (remove)="remove()"
      (retry)="retry()"
    >
      <ui-detail-section heading="Datos">
        <ui-field-list [items]="fields()" />
      </ui-detail-section>
    </ui-detail-page>
  `,
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
