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
  template: `
    <button
      #trigger
      type="button"
      class="trigger"
      id="user-menu-button"
      aria-haspopup="menu"
      aria-controls="user-menu"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
      (keydown.arrowDown)="openAndFocus($event)"
    >
      <span class="avatar" aria-hidden="true">
        @if (photo(); as photo) {
          <img [src]="photo" alt="" width="32" height="32" />
        } @else {
          {{ letters() }}
        }
      </span>
      <span class="who">
        <b>{{ user()?.name }}</b>
        <small>{{ user()?.role?.label }}</small>
      </span>
      <span class="sr-only">, abrir el menú de la cuenta</span>
      <ui-icon class="caret" name="caret-right" />
    </button>

    @if (open()) {
      <div
        #panel
        class="menu"
        id="user-menu"
        role="menu"
        aria-labelledby="user-menu-button"
        (keydown.arrowDown)="move($event, 1)"
        (keydown.arrowUp)="move($event, -1)"
        (keydown.home)="moveTo($event, 0)"
        (keydown.end)="moveTo($event, -1)"
        (keydown.tab)="close()"
      >
        <a role="menuitem" routerLink="/profile" (click)="close()"><ui-icon name="user-circle" />Mi perfil</a>
        <button type="button" role="menuitem" (click)="theme.toggle()">
          <ui-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
          {{ theme.theme() === 'dark' ? 'Tema claro' : 'Tema oscuro' }}
        </button>
        <hr />
        <button type="button" role="menuitem" (click)="logout()"><ui-icon name="sign-out" />Cerrar sesión</button>
        <button type="button" role="menuitem" (click)="logoutEverywhere()">
          <ui-icon name="sign-out" />Cerrar sesión en todos los dispositivos
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-flex;
      flex: none;
    }

    .trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 44px;
      padding: 0 8px 0 4px;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-on-band);
      text-align: left;
      cursor: pointer;
      transition: background var(--motion-fast) ease;
    }

    .trigger:hover,
    .trigger[aria-expanded='true'] {
      background: var(--color-surface-2);
    }

    /* el avatar lleva el ángulo del logo: un dorsal, no un círculo */
    .avatar {
      display: grid;
      flex: none;
      place-items: center;
      width: 36px;
      height: 32px;
      overflow: hidden;
      background: var(--color-accent);
      color: var(--color-on-accent);
      font-size: 13px;
      font-weight: 800;
      clip-path: polygon(7px 0, 100% 0, calc(100% - 7px) 100%, 0 100%);
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .who {
      display: grid;
      max-width: 150px;
      line-height: 1.2;
    }

    .who b,
    .who small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .who b {
      font-size: var(--text-sm);
      font-weight: 650;
    }

    .who small {
      font-size: 11.5px;
      color: var(--color-on-band-muted);
    }

    .caret {
      font-size: 12px;
      transform: rotate(90deg);
    }

    .menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: var(--z-tooltip);
      display: grid;
      width: 270px;
      padding: 6px;
      border-radius: var(--radius-lg);
      background: var(--color-sidebar-raised);
      color: var(--color-on-band);
      box-shadow: var(--shadow-3);
      transform-origin: top right;
      transition:
        opacity var(--motion-fast) var(--motion-ease),
        transform var(--motion-fast) var(--motion-ease);

      @starting-style {
        opacity: 0;
        transform: scale(0.97);
      }
    }

    .menu a,
    .menu button {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
      padding: 6px 10px;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: inherit;
      font-size: var(--text-sm);
      font-weight: 500;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }

    .menu a:hover,
    .menu button:hover,
    .menu a:focus-visible,
    .menu button:focus-visible {
      background: rgb(255 255 255 / 0.1);
      outline: none;
    }

    .menu ui-icon {
      flex: none;
      font-size: 18px;
    }

    hr {
      width: 100%;
      margin: 6px 0;
      border: 0;
      border-top: 1px solid rgb(255 255 255 / 0.16);
    }

    @media (max-width: 720px) {
      .who,
      .caret {
        display: none;
      }

      .trigger {
        padding: 0 4px;
      }
    }

    @media (pointer: coarse) {
      .menu a,
      .menu button {
        min-height: 44px;
      }
    }
  `,
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
