import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BaseEntity } from '../../core/models/entity.model';
import { ApiService } from '../../core/services/api.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { SkeletonComponent } from '../components/skeleton/skeleton.component';

/**
 * `/<colección>/id/:id`: lleva al detalle de un registro del que solo se conoce el
 * `_id`. Algunas relaciones llegan sin slug (el rol de un usuario, el usuario de un
 * anfitrión, el dueño de una imagen): se pide el registro por su id a la API y se
 * sustituye esta dirección por la de su detalle.
 */
@Component({
  selector: 'app-record-redirect',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-busy="true" aria-label="Abriendo el registro">
      <ui-skeleton width="320px" height="30px" />
    </div>
  `,
})
export class RecordRedirectComponent {
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly router = inject(Router);
  /** La colección es el primer tramo de la URL: `routes`, `users`... */
  private readonly collection = inject(ActivatedRoute).snapshot.pathFromRoot
    .flatMap((route) => route.url.map((segment) => segment.path))
    .at(0);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.open(id));
    });
  }

  private async open(id: string): Promise<void> {
    const listPath = `/${this.collection}`;
    try {
      const record = await this.api.get<BaseEntity>(`${listPath}/${encodeURIComponent(id)}`);
      void this.router.navigate([listPath, record.slug], { replaceUrl: true });
    } catch (error) {
      // Si no existe, ErrorHandlerService avisa y vuelve al listado.
      this.errors.handle(error, { notFoundRedirect: listPath });
    }
  }
}
