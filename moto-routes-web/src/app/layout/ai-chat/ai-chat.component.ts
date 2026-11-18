import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AiApiService, AiError } from '../../core/ai/ai-api.service';
import { AiChatContextService } from '../../core/ai/ai-chat-context.service';
import { ChatMessage } from '../../core/ai/ai.models';
import { isAbortError } from '../../core/api/api-error';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { MarkdownBlock, parseMarkdown } from '../../shared/utils/chat-markdown';

/** Lo que admite el servidor: 20 mensajes de 2.000 caracteres */
const MAX_MESSAGES = 20;
export const MAX_LENGTH = 2000;
/** La conversación se recuerda mientras dure la pestaña (sessionStorage), por experiencia */
const STORAGE_KEY = 'routly-chat';

const GENERAL_SUGGESTIONS = ['Una ruta fácil para empezar', '¿Qué salidas hay este mes?', 'Algo de costa por menos de 150 €'];
const DETAIL_SUGGESTIONS = ['¿Qué tiempo hará?', '¿Dónde puedo comer en la ruta?', '¿Vale con el carnet A2?'];

interface ChatEntry extends ChatMessage {
  /** El texto de la respuesta, ya en piezas (párrafos, listas, enlaces) */
  blocks?: MarkdownBlock[];
}

/**
 * El asistente de la web: un botón flotante que abre el chat, en todas las páginas. En el detalle
 * de una experiencia sabe de cuál se habla (AiChatContextService) y lo dice arriba.
 *
 * La respuesta llega en streaming (POST /ai/chat) y se va pintando según llega; mientras el
 * asistente consulta algo, se enseña qué ("Buscando experiencias..."). Lo que escribe se pinta por
 * piezas (shared/utils/chat-markdown.ts), nunca como HTML.
 */
@Component({
  selector: 'app-ai-chat',
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.raised]': 'context() !== null', '(document:keydown.escape)': 'close()' },
  template: `
    @if (isOpen()) {
      <section class="panel" role="dialog" aria-modal="false" aria-labelledby="chat-titulo">
        <header class="panel-head on-band">
          <div>
            <h2 id="chat-titulo"><ui-icon name="sparkle" /> Asistente Routly</h2>
            <p class="context">
              @if (context(); as context) {
                Sobre: {{ context.title }}
              } @else {
                Te ayuda a elegir salida
              }
            </p>
          </div>
          <div class="head-actions">
            @if (messages().length > 0) {
              <button type="button" class="icon-btn" (click)="reset()" title="Empezar de nuevo" aria-label="Empezar de nuevo">
                <ui-icon name="arrows-clockwise" />
              </button>
            }
            <button type="button" class="icon-btn" (click)="close()" aria-label="Cerrar el asistente"><ui-icon name="x" /></button>
          </div>
        </header>

        <div class="messages" #scroller aria-live="polite">
          @if (messages().length === 0) {
            <div class="welcome">
              <p>Hola. Pregúntame por rutas, fechas, el tiempo o dónde parar. Uso los datos de Routly y no me invento nada.</p>
              <div class="suggestions">
                @for (suggestion of suggestions(); track suggestion) {
                  <button type="button" class="chip" (click)="send(suggestion)">{{ suggestion }}</button>
                }
              </div>
            </div>
          }
          @for (message of messages(); track $index) {
            @if (message.role === 'user') {
              <p class="bubble user">{{ message.content }}</p>
            } @else {
              <div class="bubble assistant">
                @for (block of message.blocks; track $index) {
                  <p [class.item]="block.kind === 'item'">
                    @for (part of block.parts; track $index) {
                      @switch (part.kind) {
                        @case ('bold') {<strong>{{ part.text }}</strong>}
                        @case ('link') {
                          @if (part.internal) {
                            <a [routerLink]="part.href">{{ part.text }}</a>
                          } @else {
                            <a [href]="part.href" target="_blank" rel="noopener noreferrer nofollow">{{ part.text }}</a>
                          }
                        }
                        @default {<span>{{ part.text }}</span>}
                      }
                    }
                  </p>
                }
              </div>
            }
          }
          @if (status(); as status) {
            <p class="status" role="status"><span class="dots" aria-hidden="true"></span> {{ status }}</p>
          }
          @if (error(); as error) {
            <p class="error" role="alert">
              {{ error }}
              <button type="button" class="link" (click)="retry()">Reintentar</button>
            </p>
          }
        </div>

        <form class="composer" (submit)="$event.preventDefault(); send(input.value); input.value = ''">
          <label class="sr-only" for="chat-pregunta">Tu pregunta</label>
          <textarea
            #input
            id="chat-pregunta"
            rows="1"
            [attr.maxlength]="maxLength"
            placeholder="Escribe tu pregunta"
            (keydown.enter)="onEnter($event, input)"
          ></textarea>
          @if (streaming()) {
            <button type="button" class="send" (click)="stop()" aria-label="Parar la respuesta"><ui-icon name="stop-circle" /></button>
          } @else {
            <button type="submit" class="send" aria-label="Enviar"><ui-icon name="paper-plane-right" /></button>
          }
        </form>
        <p class="disclaimer">Respuestas generadas con IA: comprueba los datos en la ficha antes de reservar.</p>
      </section>
    }

    <button type="button" class="launcher" [attr.aria-expanded]="isOpen()" (click)="toggle()">
      <ui-icon [name]="isOpen() ? 'x' : 'chat-circle-dots'" />
      <span>{{ isOpen() ? 'Cerrar' : 'Pregúntame' }}</span>
    </button>
  `,
  styles: `
    :host {
      --chat-bottom: var(--space-4);
      position: fixed;
      right: var(--space-4);
      bottom: calc(var(--chat-bottom) + env(safe-area-inset-bottom));
      z-index: 40;
      display: grid;
      justify-items: end;
      gap: var(--space-3);
    }

    /* En el móvil, el detalle tiene su barra de reserva abajo: el botón va encima */
    @media (max-width: 860px) {
      :host(.raised) {
        --chat-bottom: 88px;
      }
    }

    .launcher {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 52px;
      padding: 0 var(--space-5);
      border: 0;
      border-radius: var(--radius-pill);
      background: var(--color-band);
      color: var(--color-on-band);
      box-shadow: var(--shadow-3);
      font: inherit;
      font-weight: 750;
      cursor: pointer;
    }

    .launcher ui-icon {
      font-size: 22px;
      color: var(--color-accent);
    }

    .panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      width: min(400px, calc(100vw - 2 * var(--space-4)));
      height: min(600px, calc(100dvh - var(--chat-bottom) - 96px));
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-3);
    }

    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
    }

    h2 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 17px;
      font-weight: 850;
    }

    h2 ui-icon {
      color: var(--color-accent);
    }

    .context {
      font-size: var(--text-sm);
      color: var(--color-on-band-muted);
    }

    .head-actions {
      display: flex;
      gap: var(--space-1);
    }

    .icon-btn {
      display: inline-grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      font-size: 20px;
      cursor: pointer;
    }

    .icon-btn:hover {
      background: rgb(255 255 255 / 0.1);
    }

    .messages {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .welcome {
      display: grid;
      gap: var(--space-3);
      color: var(--color-text-muted);
    }

    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .chip {
      min-height: 36px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-surface-2);
      color: var(--color-text);
      font: inherit;
      font-size: var(--text-sm);
      text-align: left;
      cursor: pointer;
    }

    .bubble {
      max-width: 88%;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-lg);
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .user {
      align-self: flex-end;
      background: var(--color-primary);
      color: var(--color-on-primary);
      white-space: pre-wrap;
    }

    .assistant {
      align-self: flex-start;
      display: grid;
      gap: var(--space-2);
      background: var(--color-surface-2);
    }

    .assistant .item {
      position: relative;
      padding-left: var(--space-4);
    }

    .assistant .item::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 0.65em;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .assistant a {
      color: var(--color-primary);
      font-weight: 700;
    }

    .status {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .dots {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
      animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dots {
        animation: none;
      }
    }

    .error {
      font-size: var(--text-sm);
      color: var(--color-danger);
    }

    .link {
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-primary);
      font: inherit;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }

    .composer {
      display: flex;
      align-items: flex-end;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4) var(--space-2);
      border-top: 1px solid var(--color-border);
    }

    textarea {
      flex: 1;
      min-height: 44px;
      max-height: 120px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-bg);
      color: var(--color-text);
      font: inherit;
      resize: none;
      field-sizing: content;
    }

    .send {
      display: inline-grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--radius-md);
      background: var(--color-accent);
      color: var(--color-on-accent);
      font-size: 22px;
      cursor: pointer;
    }

    .disclaimer {
      padding: 0 var(--space-4) var(--space-3);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    @media (max-width: 560px) {
      .launcher span {
        display: none;
      }

      .launcher {
        width: 52px;
        padding: 0;
        justify-content: center;
      }
    }
  `,
})
export class AiChatComponent {
  private readonly api = inject(AiApiService);
  private readonly chat = inject(AiChatContextService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private controller: AbortController | null = null;

  protected readonly maxLength = MAX_LENGTH;
  protected readonly isOpen = this.chat.open;
  protected readonly context = this.chat.context;
  protected readonly messages = signal<ChatEntry[]>([]);
  protected readonly streaming = signal(false);
  /** Lo que está haciendo el asistente ("Pensando...", "Buscando experiencias...") */
  protected readonly status = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly suggestions = computed(() => (this.context() ? DETAIL_SUGGESTIONS : GENERAL_SUGGESTIONS));
  /** De qué va la conversación: cada experiencia tiene la suya, y la general la suya */
  private readonly conversationKey = computed(() => `${STORAGE_KEY}:${this.context()?.slug ?? 'general'}`);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());

    // Al cambiar de experiencia (o salir del detalle), su conversación
    effect(() => {
      const key = this.conversationKey();
      untracked(() => {
        this.stop();
        this.error.set(null);
        this.messages.set(restore(key));
      });
    });

    // Una pregunta pedida desde el detalle ("¿Qué tiempo hará?"): se manda al abrir
    effect(() => {
      const question = this.chat.pendingQuestion();
      if (!question || !this.isOpen()) return;
      untracked(() => {
        this.chat.pendingQuestion.set(null);
        void this.send(question);
      });
    });
  }

  protected toggle(): void {
    this.chat.open.update((open) => !open);
  }

  protected close(): void {
    this.chat.open.set(false);
  }

  protected reset(): void {
    this.stop();
    this.error.set(null);
    this.messages.set([]);
    save(this.conversationKey(), []);
  }

  protected stop(): void {
    this.controller?.abort();
    this.controller = null;
    this.streaming.set(false);
    this.status.set(null);
  }

  protected onEnter(event: Event, input: HTMLTextAreaElement): void {
    // Enter manda; Mayúsculas + Enter, salto de línea
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    void this.send(input.value);
    input.value = '';
  }

  /** Vuelve a mandar la última pregunta (la que falló) */
  protected retry(): void {
    const history = this.messages();
    const last = history.at(-1);
    if (last?.role !== 'user') return;
    this.messages.set(history.slice(0, -1));
    void this.send(last.content);
  }

  async send(text: string): Promise<void> {
    const question = text.trim().slice(0, MAX_LENGTH);
    if (!question || this.streaming()) return;

    this.error.set(null);
    this.messages.update((messages) => [...messages, { role: 'user', content: question }]);
    const history = this.messages()
      .slice(-MAX_MESSAGES)
      .map(({ role, content }) => ({ role, content }));
    const key = this.conversationKey();

    const controller = new AbortController();
    this.controller = controller;
    this.streaming.set(true);
    this.status.set('Pensando');
    this.scrollToEnd();

    let answer = '';
    let failed: string | null = null;
    try {
      await this.api.chat(
        { messages: history, experienceSlug: this.context()?.slug },
        (event) => {
          if (event.event === 'tool') this.status.set(event.data.label);
          else if (event.event === 'delta') {
            answer += event.data.text;
            this.status.set(null);
            this.showAnswer(answer);
          } else if (event.event === 'error') failed = event.data.message;
        },
        controller.signal,
      );
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        // Parado a mano: se queda lo que haya llegado
      } else {
        failed = error instanceof AiError ? error.message : 'El asistente ha fallado. Vuelve a intentarlo.';
      }
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        this.streaming.set(false);
        this.status.set(null);
      }
    }

    if (failed && !answer) this.error.set(failed);
    else if (failed) this.showAnswer(`${answer}\n\n(La respuesta se ha cortado.)`);
    save(key, this.messages());
    this.scrollToEnd();
  }

  // La respuesta en curso: la última burbuja del asistente (o una nueva)
  private showAnswer(text: string): void {
    this.messages.update((messages) => {
      const entry: ChatEntry = { role: 'assistant', content: text, blocks: parseMarkdown(text) };
      return messages.at(-1)?.role === 'assistant' ? [...messages.slice(0, -1), entry] : [...messages, entry];
    });
    this.scrollToEnd();
  }

  private scrollToEnd(): void {
    queueMicrotask(() => {
      const element = this.scroller()?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}

// sessionStorage puede no estar (modo privado, bloqueado): sin él, la conversación no se recuerda
function restore(key: string): ChatEntry[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? '[]') as ChatMessage[];
    return saved
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
      .map((message) => (message.role === 'assistant' ? { ...message, blocks: parseMarkdown(message.content) } : message));
  } catch {
    return [];
  }
}

function save(key: string, messages: ChatEntry[]): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(messages.slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content }))));
  } catch {
    // Sin almacenamiento: no pasa nada
  }
}
