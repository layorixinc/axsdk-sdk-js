import EventEmitter from 'eventemitter3';

export interface VoiceTransportEvents {
  ready: void;
  delta: { text: string };
  finalized: { text: string };
  error: { message: string };
  close: { code?: number; reason?: string };
}

export interface VoiceTransport {
  readonly ready: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  sendAudio(pcm16le: ArrayBuffer): void;
  synthesize(text: string, opts?: { voice?: string }): Promise<Blob>;
  synthesizeStream?(
    text: string,
    opts?: { voice?: string },
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }>;
  on<K extends keyof VoiceTransportEvents>(
    event: K,
    fn: (payload: VoiceTransportEvents[K]) => void,
  ): void;
  off<K extends keyof VoiceTransportEvents>(
    event: K,
    fn: (payload: VoiceTransportEvents[K]) => void,
  ): void;
}

export interface OpenAIRealtimeTransportConfig {
  wsUrl: string;
  ttsUrl: string;
  apiKey?: string;
  appId?: string;
  ttsVoice?: string;
  reconnectOnce?: boolean;
}

type InternalEvent =
  | { kind: 'ready' }
  | { kind: 'delta'; text: string }
  | { kind: 'finalized'; text: string }
  | { kind: 'error'; message: string }
  | { kind: 'close'; code?: number; reason?: string };

export class OpenAIRealtimeTransport implements VoiceTransport {
  readonly #config: Required<OpenAIRealtimeTransportConfig>;
  readonly #emitter = new EventEmitter();
  #ws: WebSocket | null = null;
  #ready = false;
  #reconnectUsed = false;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #closed = false;

  constructor(config: OpenAIRealtimeTransportConfig) {
    this.#config = {
      ttsVoice: 'alloy',
      reconnectOnce: true,
      apiKey: '',
      appId: '',
      ...config,
    };
  }

  get ready(): boolean {
    return this.#ready;
  }

  async open(): Promise<void> {
    this.#closed = false;
    this.#reconnectUsed = false;
    await this.#connect();
  }

  async close(): Promise<void> {
    this.#closed = true;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    const ws = this.#ws;
    this.#ws = null;
    this.#ready = false;
    if (ws) {
      try { ws.close(); } catch {}
    }
  }

  sendAudio(pcm16le: ArrayBuffer): void {
    const ws = this.#ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(pcm16le);
  }

  async synthesize(text: string, opts?: { voice?: string }): Promise<Blob> {
    const res = await this.#fetchTts(text, opts);
    return await res.blob();
  }

  async synthesizeStream(
    text: string,
    opts?: { voice?: string },
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }> {
    const res = await this.#fetchTts(text, opts);
    if (!res.body) throw new Error('TTS response has no body');
    return {
      stream: res.body,
      contentType: res.headers.get('Content-Type') ?? 'audio/mpeg',
    };
  }

  async #fetchTts(
    text: string,
    opts?: { voice?: string },
  ): Promise<Response> {
    const voice = opts?.voice ?? this.#config.ttsVoice;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.#config.apiKey) headers['x-api-key'] = this.#config.apiKey;
    if (this.#config.appId) headers['x-app-id'] = this.#config.appId;
    const res = await fetch(this.#config.ttsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`TTS ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return res;
  }

  on<K extends keyof VoiceTransportEvents>(
    event: K,
    fn: (payload: VoiceTransportEvents[K]) => void,
  ): void {
    this.#emitter.on(event, fn as (...args: unknown[]) => void);
  }

  off<K extends keyof VoiceTransportEvents>(
    event: K,
    fn: (payload: VoiceTransportEvents[K]) => void,
  ): void {
    this.#emitter.off(event, fn as (...args: unknown[]) => void);
  }

  #emit(ev: InternalEvent): void {
    switch (ev.kind) {
      case 'ready':
        this.#emitter.emit('ready');
        break;
      case 'delta':
        this.#emitter.emit('delta', { text: ev.text });
        break;
      case 'finalized':
        this.#emitter.emit('finalized', { text: ev.text });
        break;
      case 'error':
        this.#emitter.emit('error', { message: ev.message });
        break;
      case 'close':
        this.#emitter.emit('close', { code: ev.code, reason: ev.reason });
        break;
    }
  }

  async #connect(): Promise<void> {
    const ws = new WebSocket(this.#buildWsUrl());
    ws.binaryType = 'arraybuffer';
    this.#ws = ws;
    this.#ready = false;

    ws.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (typeof data !== 'string') return;
      let parsed: unknown;
      try { parsed = JSON.parse(data); } catch { return; }
      const msg = parsed as { type?: string; text?: string; message?: string };
      switch (msg.type) {
        case 'ready':
          this.#ready = true;
          this.#reconnectUsed = false;
          this.#emit({ kind: 'ready' });
          break;
        case 'delta':
          if (typeof msg.text === 'string') this.#emit({ kind: 'delta', text: msg.text });
          break;
        case 'completed':
          if (typeof msg.text === 'string') this.#emit({ kind: 'finalized', text: msg.text });
          break;
        case 'error':
          this.#emit({ kind: 'error', message: msg.message ?? 'transport error' });
          break;
      }
    });

    ws.addEventListener('error', () => {
      this.#emit({ kind: 'error', message: 'socket error' });
    });

    ws.addEventListener('close', (event: CloseEvent) => {
      this.#ready = false;
      this.#ws = null;
      this.#emit({ kind: 'close', code: event.code, reason: event.reason });
      if (this.#closed || !this.#config.reconnectOnce || this.#reconnectUsed) {
        return;
      }
      this.#reconnectUsed = true;
      this.#reconnectTimer = setTimeout(() => {
        this.#reconnectTimer = null;
        if (this.#closed) return;
        void this.#connect().catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.#emit({ kind: 'error', message });
        });
      }, 2000);
    });

    await this.#waitForOpen(ws);
  }

  // Browsers can't set arbitrary headers on WebSocket upgrades — auth must go
  // through the URL. Proxy reads these via `url.searchParams`.
  #buildWsUrl(): string {
    if (!this.#config.apiKey && !this.#config.appId) return this.#config.wsUrl;
    const url = new URL(this.#config.wsUrl);
    if (this.#config.apiKey) url.searchParams.set('api_key', this.#config.apiKey);
    if (this.#config.appId) url.searchParams.set('app_id', this.#config.appId);
    return url.toString();
  }

  #waitForOpen(ws: WebSocket): Promise<void> {
    if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        reject(new Error('WebSocket failed to open'));
      };
      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
    });
  }
}
