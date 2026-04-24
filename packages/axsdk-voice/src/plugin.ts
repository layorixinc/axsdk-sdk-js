import type { ChatMessage, ChatSession } from '@axsdk/core';
import type EventEmitter from 'eventemitter3';
import {
  primeMicrophonePermission,
  startCapture,
  type CaptureHandle,
} from './capture';
import { DEFAULT_VAD_CONFIG, Vad, type VadConfig } from './vad';
import { startSileroCapture, type SileroCaptureHandle } from './silero-capture';
import { TtsPlayer } from './tts-player';
import type { VoiceTransport } from './transport';

export type VoiceMode = 'assistant' | 'echo';
export type VoiceSource = 'microphone' | 'desktop';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'capturing'
  | 'speaking'
  | 'error';

export interface VoicePluginConfig {
  transport: VoiceTransport;
  stt?: boolean;
  tts?: boolean;
  mode?: VoiceMode;
  source?: VoiceSource;
  workletUrl?: string;
  vad?: Partial<VadConfig>;
  autoActivateWhileChatOpen?: boolean;
  primeMicOnAttach?: boolean;
  debug?: boolean;
}

export interface VoiceEventMap {
  'voice.state': { status: VoiceState };
  'voice.vad.speech.started': { at: number };
  'voice.vad.speech.ended': { at: number; durationMs: number };
  'voice.transcript.delta': { text: string };
  'voice.transcript.finalized': { text: string };
  'voice.tts.queued': { messageId: string; text: string };
  'voice.tts.playback.started': { messageId: string };
  'voice.tts.playback.ended': { messageId: string };
  'voice.tts.gesture_required': { messageId: string };
  'voice.error': {
    scope: 'capture' | 'transport' | 'tts';
    message: string;
  };
}

interface ChatStoreShape {
  isOpen: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
}

interface ChatStoreApi {
  getState(): ChatStoreShape;
  subscribe(listener: (state: ChatStoreShape, prev: ChatStoreShape) => void): () => void;
}

interface AxsdkLike {
  eventBus(): EventEmitter;
  getChatStore(): ChatStoreApi;
}

const FALLBACK_IDLE_MS = 800;

export class VoicePlugin {
  readonly #transport: VoiceTransport;
  #config: Required<
    Omit<VoicePluginConfig, 'transport' | 'vad' | 'workletUrl'>
  > & {
    workletUrl: string | undefined;
    vad: VadConfig;
  };

  #axsdk: AxsdkLike | null = null;
  #unsubscribe: (() => void) | null = null;
  #capture: CaptureHandle | null = null;
  #sileroCapture: SileroCaptureHandle | null = null;
  #vad: Vad | null = null;
  #ttsPlayer: TtsPlayer | null = null;
  #state: VoiceState = 'idle';

  #prevIsOpen = false;
  #prevStatus: string | undefined = undefined;
  #spokenIds = new Set<string>();
  #pausedByVisibility = false;
  #visibilityHandler: (() => void) | null = null;

  #lastAssistantId: string | null = null;
  #lastAssistantText = '';
  #fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  // VAD rising edge owns the `capturing` transition — `ready` must not force
  // it, otherwise the UI would think we're uploading voice when the mic is
  // still silent.
  readonly #onReady = () => {
    if (this.#state === 'capturing' || this.#state === 'speaking') return;
    this.#setState('listening');
  };
  readonly #onDelta = ({ text }: { text: string }) => {
    this.#emit('voice.transcript.delta', { text });
  };
  readonly #onFinalized = ({ text }: { text: string }) => {
    this.#emit('voice.transcript.finalized', { text });
    if (this.#config.mode === 'echo') {
      if (this.#config.tts) {
        this.#ttsPlayer?.speak({
          id: `echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text,
        });
      }
      return;
    }
    // Reusing the same event AXSDK.sendMessage emits so the finalized
    // utterance flows through the normal chat pipeline.
    this.#axsdk?.eventBus().emit('message.chat', {
      type: 'axsdk.chat.message',
      data: { text, images: [] },
    });
  };
  readonly #onTransportError = ({ message }: { message: string }) => {
    this.#emit('voice.error', { scope: 'transport', message });
  };
  readonly #onTransportClose = () => {
    if (this.#state !== 'idle') this.#setState('listening');
  };

  constructor(config: VoicePluginConfig) {
    this.#transport = config.transport;
    this.#config = normalizeConfig(config);
  }

  get state(): VoiceState {
    return this.#state;
  }

  async unlockAudio(): Promise<void> {
    try {
      await this.#ttsPlayer?.unlock();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#emit('voice.error', { scope: 'tts', message });
    }
  }

  attach(axsdk: AxsdkLike): void {
    if (this.#axsdk) {
      this.#debug('attach called twice — detaching previous instance first');
      this.detach();
    }
    this.#axsdk = axsdk;

    this.#ttsPlayer = new TtsPlayer(this.#transport);
    this.#ttsPlayer.on('queued', (p) => this.#emit('voice.tts.queued', p));
    this.#ttsPlayer.on('playback.started', (p) => {
      this.#setState('speaking');
      this.#emit('voice.tts.playback.started', p);
    });
    this.#ttsPlayer.on('playback.ended', (p) => {
      this.#emit('voice.tts.playback.ended', p);
      const hasCapture = this.#capture !== null || this.#sileroCapture !== null;
      this.#setState(hasCapture ? 'listening' : 'idle');
    });
    this.#ttsPlayer.on('error', ({ messageId, message }) =>
      this.#emit('voice.error', {
        scope: 'tts',
        message: `${messageId}: ${message}`,
      }),
    );
    this.#ttsPlayer.on('gesture_required', ({ messageId }) =>
      this.#emit('voice.tts.gesture_required', { messageId }),
    );

    const store = axsdk.getChatStore();
    const initial = store.getState();
    this.#prevIsOpen = initial.isOpen;
    this.#prevStatus = initial.session?.status;

    this.#unsubscribe = store.subscribe((state) => {
      this.#onStoreUpdate(state);
    });

    this.#transport.on('ready', this.#onReady);
    this.#transport.on('delta', this.#onDelta);
    this.#transport.on('finalized', this.#onFinalized);
    this.#transport.on('error', this.#onTransportError);
    this.#transport.on('close', this.#onTransportClose);

    if (this.#config.primeMicOnAttach) {
      void primeMicrophonePermission();
    }

    if (typeof document !== 'undefined') {
      this.#visibilityHandler = () => {
        if (document.hidden) {
          if (this.#capture || this.#sileroCapture) {
            this.#pausedByVisibility = true;
            void this.#stopCapture();
          }
        } else if (this.#pausedByVisibility) {
          this.#pausedByVisibility = false;
          const store = this.#axsdk?.getChatStore();
          if (store?.getState().isOpen && this.#shouldAutoStart()) {
            void this.#startCapture();
          }
        }
      };
      document.addEventListener('visibilitychange', this.#visibilityHandler);
    }

    if (this.#prevIsOpen && this.#shouldAutoStart()) {
      void this.#startCapture();
    }
  }

  detach(): void {
    this.#axsdk = null;
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
    if (this.#visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.#visibilityHandler);
      this.#visibilityHandler = null;
    }
    this.#pausedByVisibility = false;
    this.#transport.off('ready', this.#onReady);
    this.#transport.off('delta', this.#onDelta);
    this.#transport.off('finalized', this.#onFinalized);
    this.#transport.off('error', this.#onTransportError);
    this.#transport.off('close', this.#onTransportClose);

    void this.#stopCapture();
    if (this.#ttsPlayer) {
      void this.#ttsPlayer.dispose();
      this.#ttsPlayer = null;
    }
    this.#clearFallbackTimer();
    this.#spokenIds.clear();
    this.#setState('idle');
  }

  update(partial: Partial<VoicePluginConfig>): void {
    const next = normalizeConfig({ ...this.#config, ...partial, transport: this.#transport });
    const prev = this.#config;
    this.#config = next;

    if (prev.stt && !next.stt) {
      void this.#stopCapture();
    } else if (!prev.stt && next.stt && this.#shouldAutoStart()) {
      if (this.#axsdk?.getChatStore().getState().isOpen) {
        void this.#startCapture();
      }
    }

    if (prev.tts && !next.tts) {
      this.#ttsPlayer?.clear();
    }
  }

  #onStoreUpdate(state: ChatStoreShape): void {
    const isOpen = state.isOpen;
    const status = state.session?.status;

    if (isOpen !== this.#prevIsOpen) {
      this.#prevIsOpen = isOpen;
      if (isOpen) {
        if (this.#shouldAutoStart()) void this.#startCapture();
      } else {
        void this.#stopCapture();
        this.#clearFallbackTimer();
      }
    }

    if (status !== this.#prevStatus) {
      const prev = this.#prevStatus;
      this.#prevStatus = status;
      if (prev === 'busy' && status === 'idle') {
        this.#maybeSpeakLatestAssistant(state.messages);
      }
    }

    this.#armFallbackTimer(state.messages);
  }

  #shouldAutoStart(): boolean {
    return Boolean(this.#config.stt && this.#config.autoActivateWhileChatOpen);
  }

  async #startCapture(): Promise<void> {
    if (this.#capture || this.#sileroCapture) return;
    if (!this.#config.stt) return;
    this.#setState('connecting');
    try {
      if (!this.#transport.ready) {
        await this.#transport.open();
      }
      if (this.#config.vad.engine === 'silero') {
        await this.#startSilero();
      } else {
        await this.#startRms();
      }
      this.#setState('listening');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#emit('voice.error', { scope: 'capture', message });
      this.#setState('error');
      await this.#stopCapture();
    }
  }

  async #startRms(): Promise<void> {
    this.#vad = new Vad(this.#config.vad);
    this.#capture = await startCapture({
      workletUrl: this.#config.workletUrl,
    });
    this.#capture.onFrame((frame) => this.#handleFrame(frame));
  }

  async #startSilero(): Promise<void> {
    this.#sileroCapture = await startSileroCapture({
      positiveThreshold: this.#config.vad.sileroPositiveThreshold,
      negativeThreshold: this.#config.vad.sileroNegativeThreshold,
      onSpeechStarted: () => {
        if (this.#state === 'speaking') this.#ttsPlayer?.stop();
        this.#emit('voice.vad.speech.started', { at: Date.now() });
        this.#setState('capturing');
      },
      onSpeechEnded: () => {
        this.#emit('voice.vad.speech.ended', { at: Date.now(), durationMs: 0 });
        this.#setState(this.#transport.ready ? 'listening' : 'connecting');
      },
      onFrame: (pcm) => this.#transport.sendAudio(pcm),
    });
  }

  async #stopCapture(): Promise<void> {
    if (this.#capture) {
      await this.#capture.stop();
      this.#capture = null;
    }
    if (this.#sileroCapture) {
      await this.#sileroCapture.stop();
      this.#sileroCapture = null;
    }
    this.#vad?.reset();
    this.#vad = null;
    try { await this.#transport.close(); } catch {}
    if (this.#state !== 'error') this.#setState('idle');
  }

  #handleFrame(frame: ArrayBuffer): void {
    if (!this.#vad) return;
    const result = this.#vad.process(frame);
    if (result.started) {
      // Barge-in: abort current TTS so the user is heard without overlap.
      if (this.#state === 'speaking') this.#ttsPlayer?.stop();
      this.#emit('voice.vad.speech.started', { at: Date.now() });
      this.#setState('capturing');
    }
    for (const buf of result.forward) this.#transport.sendAudio(buf);
    if (result.ended) {
      this.#emit('voice.vad.speech.ended', {
        at: Date.now(),
        durationMs: result.durationMs ?? 0,
      });
      this.#setState(this.#transport.ready ? 'listening' : 'connecting');
    }
  }

  #maybeSpeakLatestAssistant(messages: ChatMessage[]): void {
    if (!this.#config.tts) return;
    if (this.#config.mode !== 'assistant') return;
    const last = findLatestAssistant(messages);
    if (!last) return;
    const text = extractAssistantText(last);
    if (!text) return;
    const id = last.info.id;
    if (this.#spokenIds.has(id)) return;
    this.#spokenIds.add(id);
    this.#ttsPlayer?.speak({ id, text });
  }

  // Fallback path for hosts that don't emit session.status busy/idle — fires
  // TTS when the latest assistant message stops receiving deltas.
  #armFallbackTimer(messages: ChatMessage[]): void {
    if (!this.#config.tts || this.#config.mode !== 'assistant') return;
    const last = findLatestAssistant(messages);
    if (!last) return;
    const text = extractAssistantText(last);
    if (!text) return;
    if (this.#spokenIds.has(last.info.id)) return;

    const changed =
      last.info.id !== this.#lastAssistantId || text !== this.#lastAssistantText;
    this.#lastAssistantId = last.info.id;
    this.#lastAssistantText = text;

    if (!changed) return;
    this.#clearFallbackTimer();
    const snapshotId = last.info.id;
    this.#fallbackTimer = setTimeout(() => {
      this.#fallbackTimer = null;
      const store = this.#axsdk?.getChatStore();
      if (!store) return;
      const stateNow = store.getState();
      if (stateNow.session?.status === 'busy') return;
      const lastNow = findLatestAssistant(stateNow.messages);
      if (!lastNow || lastNow.info.id !== snapshotId) return;
      this.#maybeSpeakLatestAssistant(stateNow.messages);
    }, FALLBACK_IDLE_MS);
  }

  #clearFallbackTimer(): void {
    if (this.#fallbackTimer) {
      clearTimeout(this.#fallbackTimer);
      this.#fallbackTimer = null;
    }
  }

  #setState(next: VoiceState): void {
    if (this.#state === next) return;
    this.#state = next;
    this.#emit('voice.state', { status: next });
  }

  #emit<K extends keyof VoiceEventMap>(event: K, payload: VoiceEventMap[K]): void {
    this.#axsdk?.eventBus().emit(event, payload);
  }

  #debug(msg: string): void {
    if (this.#config.debug) console.log('[voice]', msg);
  }
}

function normalizeConfig(
  input: VoicePluginConfig,
): Required<Omit<VoicePluginConfig, 'transport' | 'vad' | 'workletUrl'>> & {
  workletUrl: string | undefined;
  vad: VadConfig;
} {
  return {
    stt: input.stt ?? true,
    tts: input.tts ?? true,
    mode: input.mode ?? 'assistant',
    source: input.source ?? 'microphone',
    workletUrl: input.workletUrl,
    vad: { ...DEFAULT_VAD_CONFIG, ...(input.vad ?? {}) },
    autoActivateWhileChatOpen: input.autoActivateWhileChatOpen ?? true,
    primeMicOnAttach: input.primeMicOnAttach ?? true,
    debug: input.debug ?? false,
  };
}

function findLatestAssistant(messages: ChatMessage[]): ChatMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.info.role === 'assistant') return msg;
  }
  return null;
}

function extractAssistantText(message: ChatMessage): string {
  const parts = message.parts ?? [];
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === 'text' && typeof part.text === 'string') {
      chunks.push(part.text);
    }
  }
  return chunks.join(' ').trim();
}

// Adapter for the @axsdk/core plugin system (AXSDK.use / unload / plugin).
// Returns the underlying VoicePlugin instance as the plugin API so host code
// can still call unlockAudio(), update(), etc. via AXSDK.plugin('@axsdk/voice').
export function voicePlugin(config: VoicePluginConfig): {
  readonly name: string;
  readonly version: string;
  install(ctx: { sdk: unknown }): VoicePlugin;
  uninstall(api: VoicePlugin): void;
} {
  return {
    name: '@axsdk/voice',
    version: VOICE_PLUGIN_VERSION,
    install(ctx) {
      const plugin = new VoicePlugin(config);
      plugin.attach(ctx.sdk as AxsdkLike);
      return plugin;
    },
    uninstall(api: VoicePlugin) {
      api.detach();
    },
  };
}

export const VOICE_PLUGIN_VERSION = '0.2.1';
