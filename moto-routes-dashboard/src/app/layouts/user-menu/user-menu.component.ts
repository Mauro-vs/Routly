import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../auth/auth.store';
import { SessionService } from '../../auth/session.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { initials } from '../../shared/utils/initials';

/**
 * Menú del usuario: quién ha entrado, su perfil, el tema y cerrar sesión. Va sobre la banda
 * oscura, en la barra superior del panel y en la de la zona de usuario.
 */
@Component({
  selector: 'app-user-menu',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
  host: {
    '(document:click)': 'closeOutside($event)',
    '(document:keydown.escape)': 'closeAndReturnFocus()',
  },
})
export class UserMenuComponent {
  private readonly store = inject(AuthStore);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly theme = inject(ThemeService);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly open = signal(false);
  protected readonly user = this.store.user;
  protected readonly photo = computed(() => this.user()?.coverImage?.url ?? null);
  protected readonly letters = computed(() => initials(this.user()?.name ?? ''));

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected openAndFocus(event: Event): void {
    event.preventDefault();
    this.open.set(true);
    afterNextRender(() => this.items()[0]?.focus(), { injector: this.injector });
  }

  protected move(event: Event, step: number): void {
    event.preventDefault();
    const items = this.items();
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[(current + step + items.length) % items.length]?.focus();
  }

  protected moveTo(event: Event, index: number): void {
    event.preventDefault();
    this.items().at(index)?.focus();
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected closeAndReturnFocus(): void {
    if (!this.open()) return;
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected logout(): void {
    this.close();
    void this.session.logout();
  }

  protected async logoutEverywhere(): Promise<void> {
    this.close();
    const confirmed = await this.notifications.confirm({
      title: '¿Cerrar sesión en todos los dispositivos?',
      text: 'Tendrás que volver a entrar en cada uno, también en este.',
      confirmText: 'Cerrar todas',
    });
    if (confirmed) void this.session.logout(true);
  }

  private items(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }
}
