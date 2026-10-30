import { Injectable, inject } from '@angular/core';

import { AuthResponse, AuthUser } from '../../../auth/auth.models';
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
 * del menú cambie a la vez y, con la contraseña, para guardar el token nuevo: el anterior ya
 * no sirve.
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
    const session = await this.api.patch<AuthResponse>('/profile/me/password', change);
    if (!this.store.login(session)) throw invalidResponseError();
  }
}
