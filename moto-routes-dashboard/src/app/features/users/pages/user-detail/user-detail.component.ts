import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';

import { EXPERIENCE_LEVEL_LABELS } from '../../../../core/models/profile.model';
import { User } from '../../../../core/models/user.model';
import { BikeCardComponent } from '../../../../shared/components/bike-card/bike-card.component';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { UsersStore } from '../../services/users.store';

/** Detalle de un usuario (`/users/:slug`). La contraseña nunca llega de la API. */
@Component({
  selector: 'app-user-detail',
  imports: [
    BikeCardComponent,
    DetailPageComponent,
    DetailSectionComponent,
    FieldListComponent,
    ImageGalleryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [subtitle]="record()?.email ?? ''"
      [thumbnail]="record()?.coverImage?.url ?? null"
      [labels]="store.labels"
      [record]="record()"
      [failed]="loadFailed()"
      [identifier]="identifier()"
      [editPath]="editPath()"
      [busy]="busy()"
      [toggleLockedReason]="lockedToggle()"
      [deleteLockedReason]="lockedDelete()"
      (activeChange)="setActive($event)"
      (remove)="remove()"
      (retry)="retry()"
    >
      <ui-detail-section heading="Perfil">
        <ui-field-list [columns]="2" [items]="profile()" />
      </ui-detail-section>
      <ui-detail-section heading="Contacto de emergencia">
        <ui-field-list [columns]="2" [items]="emergency()" />
      </ui-detail-section>
      <ui-detail-section heading="Acceso" description="El rol decide lo que puede hacer en la plataforma.">
        <ui-field-list [columns]="2" [items]="access()" />
      </ui-detail-section>
      <ui-detail-section heading="Garaje">
        @for (bike of store.bikes.items(); track bike._id) {
          <ui-bike-card class="bike" [bike]="bike" [link]="['/bikes', bike.slug]" />
        } @empty {
          <p class="muted">{{ store.bikes.loading() ? 'Cargando sus motos…' : 'No tiene motos en su garaje.' }}</p>
        }
      </ui-detail-section>
      @if (record(); as owner) {
        <app-image-gallery
          ownerType="user"
          [ownerId]="owner._id"
          [ownerLabel]="title()"
          (coverChange)="refreshCover()"
        />
      }
    </ui-detail-page>
  `,
  styles: `
    .bike + .bike {
      margin-top: var(--space-3);
    }
  `,
})
export class UserDetailComponent extends EntityDetailPage<User> {
  protected readonly store = inject(UsersStore);
  protected readonly listPath = '/users';

  protected readonly profile = computed<FieldItem[]>(() => {
    const user = this.record();
    if (!user) return [];
    const level = user.profile?.experienceLevel;
    return [
      { label: 'Nombre', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Ciudad', value: user.profile?.city },
      { label: 'Teléfono', value: user.profile?.phone },
      { label: 'Fecha de nacimiento', value: user.profile?.birthDate, format: 'date' },
      { label: 'Experiencia en moto', value: level && EXPERIENCE_LEVEL_LABELS[level] },
      { label: 'Sobre mí', value: user.profile?.bio, wide: true, format: 'multiline' },
    ];
  });

  protected readonly emergency = computed<FieldItem[]>(() => {
    const contact = this.record()?.profile?.emergencyContact;
    return [
      { label: 'Nombre', value: contact?.name },
      { label: 'Teléfono', value: contact?.phone },
    ];
  });

  protected readonly lockedToggle = computed(() => {
    const user = this.record();
    return user ? this.store.toggleLockedReason(user) : null;
  });

  protected readonly lockedDelete = computed(() => {
    const user = this.record();
    return user ? this.store.deleteLockedReason(user) : null;
  });

  protected readonly access = computed<FieldItem[]>(() => {
    const user = this.record();
    if (!user) return [];
    return [
      {
        label: 'Rol',
        value: user.role?.label,
        relation: true,
        link: user.role ? ['/roles', 'id', user.role._id] : null,
      },
      { label: 'Contraseña', value: 'Guardada cifrada. No se puede ver, solo cambiar.' },
    ];
  });

  constructor() {
    super();
    const userId = computed(() => this.record()?._id ?? '');
    effect(() => {
      const id = userId();
      // Sin seguir sus signals: si no, cada carga volvería a lanzar este efecto.
      if (id) untracked(() => this.store.loadBikes(id));
    });
  }
}
