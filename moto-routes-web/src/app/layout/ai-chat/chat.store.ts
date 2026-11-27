import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { ChatEvent, ChatMessage } from '../../core/ai/ai.models';
import { isAbortError } from '../../core/api/api-error';
import { AI_URL, ApiService, StreamError } from '../../core/api/api.service';
import { MarkdownBlock, parseMarkdown } from '../../shared/utils/chat-markdown';

/** Lo que admite el servidor: 20 mensajes de 2.000 caracteres */
const MAX_MESSAGES = 20;
export const MAX_LENGTH = 2000;
/** La conversación se recuerda mientras dure la pestaña (sessionStorage), por experiencia */
const STORAGE_KEY = 'routly-chat';

const GENERAL_SUGGESTIONS = ['Una ruta fácil para empezar', '¿Qué salidas hay este mes?', 'Algo de costa por menos de 150 €'];
const DETAIL_SUGGESTIONS = ['¿Qué tiempo hará?', '¿Dónde puedo comer en la ruta?', '¿Vale con el carnet A2?'];

const MESSAGES = {
  network: 'No hemos podido conectar con el asistente. Comprueba tu conexión.',
  busy: 'Has hecho muchas preguntas seguidas. Espera un poco y vuelve a intentarlo.',
  unavailable: 'El asistente no está disponible ahora mismo.',
  failed: 'El asistente ha fallado. Vuelve a intentarlo.',
};

/** La experiencia de la que va el chat: la del detalle que se está viendo. */
export interface ChatContext {
  slug: string;
  title: string;
}

export interface ChatEntry extends ChatMessage {
  /** El texto de la respuesta, ya en piezas (párrafos, listas, enlaces) */
  blocks?: MarkdownBlock[];
}

/**
 * El estado del asistente, para toda la web (el chat flotante vive en el armazón, fuera de las
 * páginas). Lo usan el chat (AiChatComponent) y el detalle de una experiencia, que dice de qué
 * experiencia se habla (setContext) y lo abre con una pregunta (ask).
 *
 * La respuesta llega en streaming (POST /ai/chat, por ApiService.stream) y se va pintando según
 * llega. "Parar" corta la respuesta (y el servidor deja de pedir a la IA).
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ApiService);
  private controller: AbortController | null = null;

  readonly context = signal<ChatContext | null>(null);
  readonly open = signal(false);
  /** Una pregunta para mandar nada más abrir (desde el bloque Routly IA) */
  readonly pendingQuestion = signal<string | null>(null);

  readonly messages = signal<ChatEntry[]>([]);
  readonly streaming = signal(false);
  /** Lo que está haciendo el asistente ("Pensando...", "Buscando experiencias...") */
  readonly status = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly suggestions = computed(() => (this.context() ? DETAIL_SUGGESTIONS : GENERAL_SUGGESTIONS));
  /** De qué va la conversación: cada experiencia tiene la suya, y la general la suya */
  private readonly conversationKey = computed(() => `${STORAGE_KEY}:${this.context()?.slug ?? 'general'}`);

  constructor() {
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
      const question = this.pendingQuestion();
      if (!question || !this.open()) return;
      untracked(() => {
        this.pendingQuestion.set(null);
        void this.send(question);
      });
    });
  }

  /** El detalle dice de qué experiencia se habla (null al salir). */
  setContext(context: ChatContext | null): void {
    this.context.set(context);
  }

  /** Abre el chat y, si se le da, manda esa pregunta. */
  ask(question?: string): void {
    this.pendingQuestion.set(question ?? null);
    this.open.set(true);
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  close(): void {
    this.open.set(false);
  }

  /** "Empezar de nuevo" */
  reset(): void {
    this.stop();
    this.error.set(null);
    this.messages.set([]);
    save(this.conversationKey(), []);
  }

  /** "Parar": se queda lo que haya llegado */
  stop(): void {
    this.controller?.abort();
    this.controller = null;
    this.streaming.set(false);
    this.status.set(null);
  }

  /** Vuelve a mandar la última pregunta (la que falló) */
  retry(): void {
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

    let answer = '';
    let failed: string | null = null;
    const onEvent = (event: ChatEvent): void => {
      if (event.event === 'tool') this.status.set(event.data.label);
      else if (event.event === 'delta') {
        answer += event.data.text;
        this.status.set(null);
        this.showAnswer(answer);
      } else if (event.event === 'error') failed = event.data.message;
    };

    try {
      const body = { messages: history, experienceSlug: this.context()?.slug };
      await this.api.stream<ChatEvent>(`${AI_URL}/chat`, body, onEvent, controller.signal);
    } catch (error) {
      // Parado a mano: se queda lo que haya llegado
      if (!isAbortError(error) && !controller.signal.aborted) failed = chatErrorMessage(error);
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
  }

  // La respuesta en curso: la última burbuja del asistente (o una nueva)
  private showAnswer(text: string): void {
    this.messages.update((messages) => {
      const entry: ChatEntry = { role: 'assistant', content: text, blocks: parseMarkdown(text) };
      return messages.at(-1)?.role === 'assistant' ? [...messages.slice(0, -1), entry] : [...messages, entry];
    });
  }
}

/** Por qué no ha podido ni empezar la respuesta, en español. */
function chatErrorMessage(error: unknown): string {
  if (!(error instanceof StreamError)) return MESSAGES.failed;
  if (error.status === 0) return MESSAGES.network;
  if (error.status === 429) return MESSAGES.busy;
  if (error.status === 503) return MESSAGES.unavailable;
  return MESSAGES.failed;
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
