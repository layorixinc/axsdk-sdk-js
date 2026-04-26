import type { ChatMessage, ChatSession } from '@axsdk/core';
import type EventEmitter from 'eventemitter3';
import { interpret } from 'robot3';
import {
  isMicrophoneSupported,
  MicrophoneUnsupportedError,
  primeMicrophonePermission,
  startCapture,
  type CaptureHandle,
} from './capture';
import { DEFAULT_VAD_CONFIG, Vad, type VadConfig } from './vad';
import { startSileroCapture, type SileroCaptureHandle } from './silero-capture';
import { TtsPlayer } from './tts-player';
import {
  OpenAIRealtimeTransport,
  type VoiceTransport,
  type VoiceTransportContext,
} from './transport';
import { sttMachine, sttEventForState, type SttState } from './state/stt-machine';
import { ttsMachine, ttsEventForState, type TtsState } from './state/tts-machine';

export type { SttState, TtsState };
export type VoiceMode = 'assistant' | 'echo';
export type VoiceSource = 'microphone' | 'desktop';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'capturing'
  | 'speaking'
  | 'error';

export function deriveVoiceState(stt: SttState, tts: TtsState): VoiceState {
  if (stt === 'error' || tts === 'error') return 'error';
  if (tts === 'speaking') return 'speaking';
  if (stt === 'capturing') return 'capturing';
  if (stt === 'listening') return 'listening';
  if (stt === 'connecting') return 'connecting';
  if (tts === 'queued') return 'connecting';
  return 'idle';
}

export interface VoicePluginConfig {
  stt?: boolean;
  tts?: boolean;
  mode?: VoiceMode;
  source?: VoiceSource;
  workletUrl?: string;
  vad?: Partial<VadConfig>;
  autoActivateWhileChatOpen?: boolean;
  primeMicOnAttach?: boolean;
  ttsVoice?: string;
  reconnectOnce?: boolean;
  baseUrl?: string;
  wsUrl?: string;
  ttsUrl?: string;
  ttsPlaybackRate?: number;
  ttsMaxChars?: number;
  transportFactory?: (context: () => VoiceTransportContext) => VoiceTransport;
  /**
   * What to do when attach() finds the chat already open (e.g., a Zustand-
   * persisted session restored on page reload).
   *
   * - `true` (default, backward-compatible) — auto-start capture immediately.
   *   On iOS / strict browsers this can fail because AudioContext starts in
   *   `suspended` state without a user gesture.
   * - `false` — emit `voice.session.restored` and wait. Host shows a "Resume
   *   voice?" prompt; on click, calls `plugin.resume()` inside the gesture.
   *   This is the recommended setting for user-friendly mobile UX.
   */
  resumeOnRestore?: boolean;
  debug?: boolean;
}

export interface VoiceEventMap {
  'voice.state': { status: VoiceState };
  'voice.stt.state': { status: SttState };
  'voice.tts.state': { status: TtsState };
  'voice.vad.speech.started': { at: number };
  'voice.vad.speech.ended': { at: number; durationMs: number };
  'voice.transcript.delta': { text: string };
  'voice.transcript.finalized': { text: string };
  'voice.tts.queued': { messageId: string; text: string };
  'voice.tts.playback.started': { messageId: string };
  'voice.tts.playback.ended': { messageId: string };
  'voice.tts.gesture_required': { messageId: string };
  'voice.session.restored': { sessionId?: string };
  'voice.error': {
    scope: 'capture' | 'transport' | 'tts';
    message: string;
    code?:
      | 'insecure-context'
      | 'ios-third-party-browser'
      | 'no-media-devices'
      | 'permission-denied'
      | 'unknown';
  };
}

interface ChatStoreShape {
  isOpen: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
  latestAssistantWithText?: ChatMessage | null;
}

interface ChatStoreApi {
  getState(): ChatStoreShape;
  subscribe(listener: (state: ChatStoreShape, prev: ChatStoreShape) => void): () => void;
}

interface AppStateShape {
  appAuthToken: string | undefined;
  appUserId: string | undefined;
  getAppUserId(): string;
}

interface AppStoreApi {
  getState(): AppStateShape;
  subscribe(listener: (state: AppStateShape, prev: AppStateShape) => void): () => void;
}

interface AxsdkConfigShape {
  apiKey?: string;
  appId?: string;
  baseUrl?: string;
  basePath?: string;
}

interface AxsdkLike {
  config?: AxsdkConfigShape;
  eventBus(): EventEmitter;
  getChatStore(): ChatStoreApi;
  getAppStore(): AppStoreApi;
  getEndpoint?(): { baseUrl: string; basePath: string };
  t?(id: string): string;
}

const DEFAULT_BASE_URL = 'https://api.axsdk.ai';
const DEFAULT_BASE_PATH = '/axsdk';

function resolveCoreBaseUrl(
  cfg: AxsdkConfigShape | undefined,
  endpoint: { baseUrl: string; basePath: string } | null,
): string {
  const rawBase = cfg?.baseUrl ?? endpoint?.baseUrl ?? DEFAULT_BASE_URL;
  const rawPath = cfg?.basePath ?? endpoint?.basePath ?? DEFAULT_BASE_PATH;
  const base = rawBase.replace(/\/+$/, '');
  const path = (rawPath.startsWith('/') ? rawPath : `/${rawPath}`).replace(/\/+$/, '');
  return base + path;
}

const FALLBACK_IDLE_MS = 800;

export class VoicePlugin {
  #transport: VoiceTransport | null = null;
  #config: Required<
    Omit<VoicePluginConfig, 'vad' | 'workletUrl' | 'baseUrl' | 'wsUrl' | 'ttsUrl' | 'transportFactory' | 'ttsVoice' | 'ttsPlaybackRate' | 'ttsMaxChars'>
  > & {
    workletUrl: string | undefined;
    vad: VadConfig;
    baseUrl: string | undefined;
    wsUrl: string | undefined;
    ttsUrl: string | undefined;
    ttsVoice: string | undefined;
    ttsPlaybackRate: number | undefined;
    ttsMaxChars: number;
    transportFactory: VoicePluginConfig['transportFactory'];
  };

  #axsdk: AxsdkLike | null = null;
  #unsubscribe: (() => void) | null = null;
  #unsubscribeAuth: (() => void) | null = null;
  #unsubscribeConfig: (() => void) | null = null;
  #capture: CaptureHandle | null = null;
  #sileroCapture: SileroCaptureHandle | null = null;
  #startingCapture = false;
  #reconnectDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #vad: Vad | null = null;
  #ttsPlayer: TtsPlayer | null = null;
  #sttService = interpret(sttMachine, () => {});
  #ttsService = interpret(ttsMachine, () => {});
  get #sttState(): SttState { return this.#sttService.machine.current as SttState; }
  get #ttsState(): TtsState { return this.#ttsService.machine.current as TtsState; }
  #lastDerived: VoiceState = 'idle';

  #prevIsOpen = false;
  #prevStatus: string | undefined = undefined;
  #prevSessionId: string | undefined = undefined;
  #spokenIds = new Set<string>();
  #pausedByVisibility = false;
  #visibilityHandler: (() => void) | null = null;

  #lastAssistantId: string | null = null;
  #lastAssistantText = '';
  #fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  #deferredCloseAfterSpeak = false;

  // VAD owns 'capturing'; transport ready only nudges STT to 'listening' if STT was actually starting up.
  readonly #onReady = () => {
    const hasCapture = this.#capture !== null || this.#sileroCapture !== null;
    if (!hasCapture) return;
    if (this.#sttState === 'capturing') return;
    this.#setSttState('listening');
  };
  readonly #onDelta = ({ text }: { text: string }) => {
    this.#emit('voice.transcript.delta', { text });
  };
  readonly #onFinalized = ({ text }: { text: string }) => {
    this.#emit('voice.transcript.finalized', { text });
    if (this.#config.mode === 'echo') {
      if (this.#config.tts) {
        const cleaned = stripThinking(text).trim();
        if (cleaned) {
          this.#ttsPlayer?.speak({
            id: `echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: this.#clipTts(cleaned),
          });
        }
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
    const hasCapture = this.#capture !== null || this.#sileroCapture !== null;
    if (hasCapture && this.#sttState !== 'idle') this.#setSttState('connecting');
  };

  constructor(config: VoicePluginConfig = {}) {
    this.#config = normalizeConfig(config);
  }

  get state(): VoiceState {
    return deriveVoiceState(this.#sttState, this.#ttsState);
  }

  get sttState(): SttState {
    return this.#sttState;
  }

  get ttsState(): TtsState {
    return this.#ttsState;
  }

  async unlockAudio(): Promise<void> {
    try {
      await this.#ttsPlayer?.unlock();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#emit('voice.error', { scope: 'tts', message });
    }
  }

  async primePermissions(): Promise<void> {
    if (this.#config.stt && !this.#capture && !this.#sileroCapture) {
      try { await primeMicrophonePermission(); } catch {}
    }
    if (this.#config.tts) {
      try { await this.#ttsPlayer?.unlock(); } catch {}
    }
  }

  attach(axsdk: AxsdkLike): void {
    if (this.#axsdk) {
      this.#debug('attach called twice — detaching previous instance first');
      this.detach();
    }
    this.#axsdk = axsdk;

    const contextProvider = (): VoiceTransportContext => {
      const cfg = axsdk.config;
      const app = axsdk.getAppStore().getState();
      const chat = axsdk.getChatStore().getState();
      const endpoint = axsdk.getEndpoint?.() ?? null;
      const baseUrl = this.#config.baseUrl
        ?? resolveCoreBaseUrl(cfg, endpoint);
      return {
        baseUrl,
        wsUrl: this.#config.wsUrl,
        ttsUrl: this.#config.ttsUrl,
        apiKey: cfg?.apiKey,
        appId: cfg?.appId,
        appAuthToken: app.appAuthToken,
        appUserId: app.getAppUserId(),
        appUserSessionId: chat.session?.id,
      };
    };

    this.#transport = this.#config.transportFactory
      ? this.#config.transportFactory(contextProvider)
      : new OpenAIRealtimeTransport({
          context: contextProvider,
          ttsVoice: this.#config.ttsVoice,
          reconnectOnce: this.#config.reconnectOnce,
        });
    const transport = this.#transport;

    this.#ttsPlayer = new TtsPlayer(transport, {
      playbackRate: this.#config.ttsPlaybackRate,
    });
    this.#ttsPlayer.on('queued', (p) => {
      this.#emit('voice.tts.queued', p);
      if (this.#ttsState === 'idle') this.#setTtsState('queued');
    });
    this.#ttsPlayer.on('playback.started', (p) => {
      this.#setTtsState('speaking');
      this.#emit('voice.tts.playback.started', p);
    });
    this.#ttsPlayer.on('playback.ended', (p) => {
      this.#emit('voice.tts.playback.ended', p);
      setTimeout(() => {
        if (!this.#ttsPlayer?.isActive) this.#setTtsState('idle');
      }, 0);
      if (this.#deferredCloseAfterSpeak) {
        this.#deferredCloseAfterSpeak = false;
        void this.#stopCapture();
      }
    });
    this.#ttsPlayer.on('error', ({ messageId, message }) => {
      this.#emit('voice.error', {
        scope: 'tts',
        message: `${messageId}: ${message}`,
      });
      setTimeout(() => {
        if (!this.#ttsPlayer?.isActive) this.#setTtsState('idle');
      }, 0);
    });
    this.#ttsPlayer.on('gesture_required', ({ messageId }) => {
      this.#emit('voice.tts.gesture_required', { messageId });
      this.#setTtsState('queued');
    });

    const store = axsdk.getChatStore();
    const initial = store.getState();
    this.#prevIsOpen = initial.isOpen;
    this.#prevStatus = initial.session?.status;
    this.#prevSessionId = initial.session?.id;

    this.#unsubscribe = store.subscribe((state) => {
      this.#onStoreUpdate(state);
    });

    const appStore = axsdk.getAppStore();
    let prevAuth = appStore.getState().appAuthToken;
    let prevUserId = appStore.getState().appUserId;
    const reconnect = () => {
      void transport.reconnect().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.#emit('voice.error', { scope: 'transport', message });
      });
    };
    const reconnectDebounced = () => {
      if (this.#reconnectDebounceTimer) clearTimeout(this.#reconnectDebounceTimer);
      this.#reconnectDebounceTimer = setTimeout(() => {
        this.#reconnectDebounceTimer = null;
        reconnect();
      }, 100);
    };
    this.#unsubscribeAuth = appStore.subscribe((state) => {
      const authChanged = state.appAuthToken !== prevAuth;
      const userChanged = state.appUserId !== prevUserId;
      if (!authChanged && !userChanged) return;
      prevAuth = state.appAuthToken;
      prevUserId = state.appUserId;
      reconnect();
    });

    const bus = axsdk.eventBus();
    const onConfigChanged = () => reconnectDebounced();
    bus.on('config.changed', onConfigChanged);
    this.#unsubscribeConfig = () => bus.off('config.changed', onConfigChanged);

    transport.on('ready', this.#onReady);
    transport.on('delta', this.#onDelta);
    transport.on('finalized', this.#onFinalized);
    transport.on('error', this.#onTransportError);
    transport.on('close', this.#onTransportClose);

    if (this.#config.stt && !isMicrophoneSupported()) {
      try {
        // re-throw via assert path inside startCapture would be too late; do it now
        // so the indicator/tooltip surfaces the localized message immediately.
        const probe = new MicrophoneUnsupportedError(
          (typeof window !== 'undefined' && window.isSecureContext === false)
            ? 'insecure-context'
            : (/iPad|iPhone|iPod/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') &&
               /CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : ''))
              ? 'ios-third-party-browser'
              : 'no-media-devices',
          'Microphone unavailable in this environment.',
        );
        this.#emit('voice.error', {
          scope: 'capture',
          message: probe.message,
          code: probe.code,
        });
        this.#setSttState('error');
      } catch {}
    } else if (this.#config.primeMicOnAttach) {
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

    if (this.#prevIsOpen) {
      this.#emit('voice.session.restored', {
        sessionId: initial.session?.id,
      });
      if (this.#shouldAutoStart() && this.#config.resumeOnRestore) {
        void this.#startCapture();
      }
    }
  }

  /**
   * Manually start capture. Intended to be called from inside a user gesture
   * handler (e.g., a "Resume voice" button onClick) — running inside a
   * gesture lets browsers grant the mic + un-suspend the AudioContext on
   * iOS Safari without prompting twice.
   *
   * No-op if capture is already running, the chat is closed, or stt is off.
   * Use this together with `resumeOnRestore: false` and the
   * `voice.session.restored` event to provide the recommended mobile UX.
   */
  async resume(): Promise<void> {
    if (this.#capture || this.#sileroCapture) return;
    if (!this.#config.stt) return;
    const store = this.#axsdk?.getChatStore();
    if (!store?.getState().isOpen) return;
    await this.#startCapture();
  }

  detach(): void {
    this.#axsdk = null;
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
    if (this.#unsubscribeAuth) {
      this.#unsubscribeAuth();
      this.#unsubscribeAuth = null;
    }
    if (this.#unsubscribeConfig) {
      this.#unsubscribeConfig();
      this.#unsubscribeConfig = null;
    }
    if (this.#reconnectDebounceTimer) {
      clearTimeout(this.#reconnectDebounceTimer);
      this.#reconnectDebounceTimer = null;
    }
    if (this.#visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.#visibilityHandler);
      this.#visibilityHandler = null;
    }
    this.#pausedByVisibility = false;
    const transport = this.#transport;
    if (transport) {
      transport.off('ready', this.#onReady);
      transport.off('delta', this.#onDelta);
      transport.off('finalized', this.#onFinalized);
      transport.off('error', this.#onTransportError);
      transport.off('close', this.#onTransportClose);
    }

    void this.#stopCapture();
    if (this.#ttsPlayer) {
      void this.#ttsPlayer.dispose();
      this.#ttsPlayer = null;
    }
    this.#clearFallbackTimer();
    this.#spokenIds.clear();
    this.#transport = null;
    this.#setSttState('idle');
    this.#setTtsState('idle');
  }

  update(partial: Partial<VoicePluginConfig>): void {
    const next = normalizeConfig({ ...this.#config, ...partial });
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

    if (next.ttsPlaybackRate && next.ttsPlaybackRate !== prev.ttsPlaybackRate) {
      this.#ttsPlayer?.setPlaybackRate(next.ttsPlaybackRate);
    }
  }

  #onStoreUpdate(state: ChatStoreShape): void {
    const isOpen = state.isOpen;
    const status = state.session?.status;
    const sessionId = state.session?.id;

    if (sessionId !== this.#prevSessionId) {
      this.#prevSessionId = sessionId;
      const transport = this.#transport;
      if (transport) {
        void transport.reconnect().catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.#emit('voice.error', { scope: 'transport', message });
        });
      }
    }

    if (isOpen !== this.#prevIsOpen) {
      this.#prevIsOpen = isOpen;
      if (isOpen) {
        this.#deferredCloseAfterSpeak = false;
        if (this.#shouldAutoStart()) void this.#startCapture();
      } else {
        const ttsActive = !!this.#ttsPlayer?.isActive;
        if (ttsActive) {
          void this.#stopMicOnly();
          this.#deferredCloseAfterSpeak = true;
        } else {
          void this.#stopCapture();
        }
        this.#clearFallbackTimer();
      }
    }

    if (status !== this.#prevStatus) {
      const prev = this.#prevStatus;
      this.#prevStatus = status;
      if (this.#config.debug) console.log('[axsdk-voice] session status', { prev, status });
      if (this.#ttsPlayer) {
        this.#ttsPlayer.stop();
      }
      this.#clearFallbackTimer();
      if (this.#ttsState !== 'idle') this.#setTtsState('idle');
      if (prev === 'busy' && status === 'idle' && state.session) {
        this.#maybeSpeakLatestAssistant(state);
      }
    }

    this.#armFallbackTimer(state);
  }

  #shouldAutoStart(): boolean {
    return Boolean(this.#config.stt && this.#config.autoActivateWhileChatOpen);
  }

  async #startCapture(): Promise<void> {
    if (this.#capture || this.#sileroCapture || this.#startingCapture) return;
    if (!this.#config.stt) return;
    const transport = this.#transport;
    if (!transport) return;
    this.#startingCapture = true;
    this.#setSttState('connecting');
    try {
      if (!transport.ready) {
        await transport.open();
      }
      if (this.#config.vad.engine === 'silero') {
        await this.#startSilero();
      } else {
        await this.#startRms();
      }
      if (this.#sttState !== 'capturing') this.#setSttState('listening');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err instanceof MicrophoneUnsupportedError
        ? err.code
        : (/permission|denied|notallowed/i.test(message) ? 'permission-denied' : 'unknown');
      this.#emit('voice.error', { scope: 'capture', message, code });
      this.#setSttState('error');
      await this.#stopCapture();
    } finally {
      this.#startingCapture = false;
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
    const transport = this.#transport;
    if (!transport) return;
    this.#sileroCapture = await startSileroCapture({
      positiveThreshold: this.#config.vad.sileroPositiveThreshold,
      negativeThreshold: this.#config.vad.sileroNegativeThreshold,
      onSpeechStarted: () => {
        if (this.#ttsState === 'speaking') this.#ttsPlayer?.stop();
        this.#emit('voice.vad.speech.started', { at: Date.now() });
        this.#setSttState('capturing');
      },
      onSpeechEnded: () => {
        this.#emit('voice.vad.speech.ended', { at: Date.now(), durationMs: 0 });
        this.#setSttState(transport.ready ? 'listening' : 'connecting');
      },
      onFrame: (pcm) => transport.sendAudio(pcm),
    });
  }

  async #stopMicOnly(): Promise<void> {
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
    if (this.#sttState !== 'error') this.#setSttState('idle');
  }

  async #stopCapture(): Promise<void> {
    await this.#stopMicOnly();
    try { await this.#transport?.close(); } catch {}
  }

  #handleFrame(frame: ArrayBuffer): void {
    if (!this.#vad) return;
    const transport = this.#transport;
    if (!transport) return;
    const result = this.#vad.process(frame);
    if (result.started) {
      // Barge-in: abort current TTS so the user is heard without overlap.
      if (this.#ttsState === 'speaking') this.#ttsPlayer?.stop();
      this.#emit('voice.vad.speech.started', { at: Date.now() });
      this.#setSttState('capturing');
    }
    for (const buf of result.forward) transport.sendAudio(buf);
    if (result.ended) {
      this.#emit('voice.vad.speech.ended', {
        at: Date.now(),
        durationMs: result.durationMs ?? 0,
      });
      this.#setSttState(transport.ready ? 'listening' : 'connecting');
    }
  }

  #maybeSpeakLatestAssistant(state: ChatStoreShape): void {
    const debug = this.#config.debug;
    if (!this.#config.tts) {
      if (debug) console.log('[axsdk-voice] speak skip: tts disabled');
      return;
    }
    if (this.#config.mode !== 'assistant') {
      if (debug) console.log('[axsdk-voice] speak skip: mode is', this.#config.mode);
      return;
    }
    const cacheState = state.latestAssistantWithText;
    const last = findSpeakableAssistant(state);
    if (!last) {
      if (debug) console.log('[axsdk-voice] speak skip: no speakable assistant', {
        cache: cacheState === undefined ? 'undefined' : cacheState === null ? 'null' : cacheState.info.id,
        messages: state.messages?.length ?? 0,
      });
      return;
    }
    const text = extractAssistantText(last);
    if (!text) {
      if (debug) console.log('[axsdk-voice] speak skip: extracted text empty', { id: last.info.id });
      return;
    }
    const id = last.info.id;
    if (this.#spokenIds.has(id)) {
      if (debug) console.log('[axsdk-voice] speak skip: already spoken', { id, textLen: text.length });
      return;
    }
    this.#spokenIds.add(id);
    if (debug) console.log('[axsdk-voice] speak dispatch', { id, textLen: text.length });
    this.#ttsPlayer?.speak({ id, text: this.#clipTts(text) });
  }

  #clipTts(text: string): string {
    const max = this.#config.ttsMaxChars;
    const suffix = this.#axsdk?.t?.('voiceTtsClipped') ?? '';
    return clipForTts(text, max, suffix);
  }

  #armFallbackTimer(state: ChatStoreShape): void {
    const debug = this.#config.debug;
    if (!this.#config.tts || this.#config.mode !== 'assistant') return;
    const last = findSpeakableAssistant(state);
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
    if (debug) console.log('[axsdk-voice] fallback armed', { id: snapshotId, textLen: text.length });
    this.#fallbackTimer = setTimeout(() => {
      this.#fallbackTimer = null;
      const store = this.#axsdk?.getChatStore();
      if (!store) return;
      const stateNow = store.getState() as ChatStoreShape;
      if (stateNow.session?.status === 'busy') {
        if (debug) console.log('[axsdk-voice] fallback skip: still busy', { id: snapshotId });
        return;
      }
      const lastNow = findSpeakableAssistant(stateNow);
      if (!lastNow || lastNow.info.id !== snapshotId) {
        if (debug) console.log('[axsdk-voice] fallback skip: target changed', {
          expected: snapshotId,
          got: lastNow?.info.id ?? null,
        });
        return;
      }
      if (debug) console.log('[axsdk-voice] fallback fire', { id: snapshotId });
      this.#maybeSpeakLatestAssistant(stateNow);
    }, FALLBACK_IDLE_MS);
  }

  #clearFallbackTimer(): void {
    if (this.#fallbackTimer) {
      clearTimeout(this.#fallbackTimer);
      this.#fallbackTimer = null;
    }
  }

  #setSttState(next: SttState): void {
    const prev = this.#sttState;
    if (prev === next) return;
    this.#sttService.send(sttEventForState[next]);
    const after = this.#sttState;
    if (after === prev) return;
    this.#debug(`[stt] ${prev} → ${after}`);
    this.#emit('voice.stt.state', { status: after });
    this.#emitDerived();
  }

  #setTtsState(next: TtsState): void {
    const prev = this.#ttsState;
    if (prev === next) return;
    this.#ttsService.send(ttsEventForState[next]);
    const after = this.#ttsState;
    if (after === prev) return;
    this.#debug(`[tts] ${prev} → ${after}`);
    this.#emit('voice.tts.state', { status: after });
    this.#emitDerived();
  }

  #emitDerived(): void {
    const derived = deriveVoiceState(this.#sttState, this.#ttsState);
    if (derived === this.#lastDerived) return;
    this.#lastDerived = derived;
    this.#emit('voice.state', { status: derived });
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
): Required<
  Omit<VoicePluginConfig, 'vad' | 'workletUrl' | 'baseUrl' | 'wsUrl' | 'ttsUrl' | 'transportFactory' | 'ttsVoice' | 'ttsPlaybackRate' | 'ttsMaxChars'>
> & {
  workletUrl: string | undefined;
  vad: VadConfig;
  baseUrl: string | undefined;
  wsUrl: string | undefined;
  ttsUrl: string | undefined;
  ttsVoice: string | undefined;
  ttsPlaybackRate: number | undefined;
  ttsMaxChars: number;
  transportFactory: VoicePluginConfig['transportFactory'];
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
    resumeOnRestore: input.resumeOnRestore ?? true,
    debug: input.debug ?? false,
    ttsVoice: input.ttsVoice,
    reconnectOnce: input.reconnectOnce ?? true,
    baseUrl: input.baseUrl,
    wsUrl: input.wsUrl,
    ttsUrl: input.ttsUrl,
    ttsPlaybackRate: input.ttsPlaybackRate,
    ttsMaxChars: input.ttsMaxChars ?? 200,
    transportFactory: input.transportFactory,
  };
}

function findSpeakableAssistant(state: ChatStoreShape): ChatMessage | null {
  const candidate = state.latestAssistantWithText;
  if (candidate !== undefined) {
    if (!candidate) return null;
    if (extractAssistantText(candidate)) return candidate;
    const idx = state.messages.indexOf(candidate);
    for (let i = idx - 1; i >= 0; i--) {
      const m = state.messages[i];
      if (m?.info.role === 'assistant' && extractAssistantText(m)) return m;
    }
    return null;
  }
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (!m || m.info.role !== 'assistant') continue;
    if (extractAssistantText(m)) return m;
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
  return stripThinking(chunks.join(' ')).trim();
}

function clipForTts(text: string, maxChars: number, suffix: string): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0) return text;
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const wsMatch = slice.match(/\s+\S*$/);
  const cut = wsMatch ? wsMatch.index ?? maxChars : maxChars;
  const safeCut = cut < maxChars * 0.5 ? maxChars : cut;
  const head = text.slice(0, safeCut).trimEnd();
  return suffix ? `${head} ${suffix}` : head;
}

function stripThinking(text: string): string {
  // Strip closed <think>/<thinking> blocks (case-insensitive, multi-line) and
  // any unclosed trailing block — the latter happens while streaming deltas.
  return text
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*$/i, '')
    .replace(/\s{2,}/g, ' ');
}

// Adapter for the @axsdk/core plugin system (AXSDK.use / unload / plugin).
// Returns the underlying VoicePlugin instance as the plugin API so host code
// can still call unlockAudio(), update(), etc. via AXSDK.plugin('@axsdk/voice').
export function voicePlugin(config: VoicePluginConfig = {}): {
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

export const VOICE_PLUGIN_VERSION = '0.2.2';
