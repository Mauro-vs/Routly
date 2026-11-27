import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ChatStore, MAX_LENGTH } from './chat.store';

/**
 * El asistente de la web: un botón flotante que abre el chat, en todas las páginas. En el detalle
 * de una experiencia sabe de cuál se habla y lo dice arriba. Todo el estado y la petición están en
 * su store (chat.store.ts): este componente solo pinta y le pasa lo que se pulsa.
 *
 * La respuesta llega en streaming (POST /ai/chat) y se va pintando según llega; mientras el
 * asistente consulta algo, se enseña qué ("Buscando experiencias..."). Lo que escribe se pinta por
 * piezas (shared/utils/chat-markdown.ts), nunca como HTML.
 */
@Component({
  selector: 'app-ai-chat',
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.raised]': 'chat.context() !== null', '(document:keydown.escape)': 'chat.close()' },
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.css',
})
export class AiChatComponent {
  protected readonly chat = inject(ChatStore);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  protected readonly maxLength = MAX_LENGTH;

  constructor() {
    // Cada mensaje nuevo, o cada trozo de respuesta: abajo del todo
    effect(() => {
      this.chat.messages();
      this.chat.status();
      queueMicrotask(() => {
        const element = this.scroller()?.nativeElement;
        if (element) element.scrollTop = element.scrollHeight;
      });
    });
  }

  protected onEnter(event: Event, input: HTMLTextAreaElement): void {
    // Enter manda; Mayúsculas + Enter, salto de línea
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    void this.chat.send(input.value);
    input.value = '';
  }
}
