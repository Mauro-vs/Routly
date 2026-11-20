import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { AuthUser } from '../../../auth/auth.models';
import { isSessionResponse } from '../../../auth/auth.service';
import { AuthStore } from '../../../auth/auth.store';
import { ProfilePayload } from '../../../core/models/profile.model';
import { ApiService } from '../../../core/services/api.service';
import { invalidResponseError } from '../../../core/utils/api-error.mapper';

export interface OwnUserPayload {
  name: string;
  email: string;
  profile?: ProfilePayload;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/**
 * El perfil del usuario de la sesión. Tras cada cambio pone al día AuthStore, para que el nombre
 * del menú cambie a la vez y, con la contraseña, para guardar el nuevo plazo de la sesión: auth
 * deja cookies nuevas y las anteriores ya no sirven.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);
  private readonly store = inject(AuthStore);

  async update(payload: OwnUserPayload): Promise<AuthUser> {
    const user = await this.api.patch<AuthUser>('/profile/me', payload);
    this.store.setUser(user);
    return user;
  }

  async changePassword(change: PasswordChange): Promise<void> {
    // En el servicio de auth: cierra las demás sesiones y deja esta con cookies nuevas.
    const session = await this.api.patch<unknown>(`${environment.authUrl}/password`, change);
    if (!isSessionResponse(session) || !this.store.extend(session.refreshExpiresIn)) {
      throw invalidResponseError();
    }
  }
}
