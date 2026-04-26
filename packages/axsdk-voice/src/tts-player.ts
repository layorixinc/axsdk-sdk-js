import EventEmitter from 'eventemitter3';
import type { VoiceTransport } from './transport';

export interface TtsPlayerEvents {
  queued: { messageId: string; text: string };
  'playback.started': { messageId: string };
  'playback.ended': { messageId: string };
  error: { messageId: string; message: string };
  gesture_required: { messageId: string };
}

export interface TtsJob {
  id: string;
  text: string;
  voice?: string;
}

export class TtsPlayer {
  readonly #transport: VoiceTransport;
  readonly #emitter = new EventEmitter();
  readonly #queue: TtsJob[] = [];
  readonly #spoken = new Set<string>();
  readonly #deferred: Array<{ job: TtsJob; blob: Blob }> = [];
  #audio: HTMLAudioElement | null = null;
  #activeObjectUrl: string | null = null;
  #playing = false;
  #disposed = false;
  #unlocked = false;
  #playbackRate = 1;
  #cancelInflight: (() => void) | null = null;

  constructor(transport: VoiceTransport, opts?: { playbackRate?: number }) {
    this.#transport = transport;
    if (opts?.playbackRate && opts.playbackRate > 0) {
      this.#playbackRate = opts.playbackRate;
    }
  }

  setPlaybackRate(rate: number): void {
    if (!(rate > 0)) return;
    this.#playbackRate = rate;
    if (this.#audio) this.#audio.playbackRate = rate;
  }

  #applyPlaybackRate(audio: HTMLAudioElement): void {
    audio.playbackRate = this.#playbackRate;
    const onLoaded = () => {
      audio.playbackRate = this.#playbackRate;
    };
    audio.addEventListener('loadedmetadata', onLoaded, { once: true });
  }

  get needsUnlock(): boolean {
    return this.#deferred.length > 0 && !this.#unlocked;
  }

  get isActive(): boolean {
    return this.#playing || this.#queue.length > 0 || this.#deferred.length > 0;
  }

  speak(job: TtsJob): void {
    if (this.#disposed) return;
    if (this.#spoken.has(job.id)) return;
    if (this.#queue.some((j) => j.id === job.id)) return;
    this.#spoken.add(job.id);
    this.#queue.push(job);
    this.#emitter.emit('queued', { messageId: job.id, text: job.text });
    void this.#pump();
  }

  clear(): void {
    this.#queue.length = 0;
    this.#deferred.length = 0;
  }

  stop(): void {
    this.#queue.length = 0;
    this.#deferred.length = 0;
    if (this.#audio && !this.#audio.paused) {
      try { this.#audio.pause(); } catch {}
      this.#audio.currentTime = 0;
      this.#audio.removeAttribute('src');
    }
    this.#releaseObjectUrl();
    if (this.#cancelInflight) {
      const cancel = this.#cancelInflight;
      this.#cancelInflight = null;
      cancel();
    }
    this.#playing = false;
  }

  async unlock(): Promise<void> {
    if (this.#disposed) return;
    // Already unlocked with no backlog — skip the silent-WAV path so we don't clobber an in-flight MediaSource.
    if (this.#unlocked && this.#deferred.length === 0) return;
    if (!this.#audio) this.#audio = document.createElement('audio');
    const audio = this.#audio;

    // Silent-WAV → src-swap pattern lost gesture context on some engines; play the deferred blob directly instead.
    if (this.#deferred.length > 0) {
      const first = this.#deferred.shift();
      if (first) {
        try {
          this.#releaseObjectUrl();
          this.#activeObjectUrl = URL.createObjectURL(first.blob);
          audio.src = this.#activeObjectUrl;
          this.#applyPlaybackRate(audio);
          await audio.play();
          audio.playbackRate = this.#playbackRate;
          this.#unlocked = true;
          this.#emitter.emit('playback.started', { messageId: first.job.id });
          await new Promise<void>((resolve) => {
            const cleanup = () => {
              audio.removeEventListener('ended', onEnded);
              audio.removeEventListener('error', onError);
              this.#cancelInflight = null;
            };
            const onEnded = () => {
              cleanup();
              this.#emitter.emit('playback.ended', { messageId: first.job.id });
              resolve();
            };
            const onError = () => {
              cleanup();
              this.#emitter.emit('error', { messageId: first.job.id, message: 'audio playback failed' });
              resolve();
            };
            audio.addEventListener('ended', onEnded, { once: true });
            audio.addEventListener('error', onError, { once: true });
            this.#cancelInflight = () => { cleanup(); resolve(); };
          });
          this.#releaseObjectUrl();
        } catch (err) {
          this.#deferred.unshift(first);
          this.#unlocked = false;
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`unlock failed: ${message}`);
        }
      }
      while (this.#deferred.length > 0) {
        const item = this.#deferred.shift();
        if (!item) break;
        try {
          await this.#playBlob(item.job.id, item.blob);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.#emitter.emit('error', { messageId: item.job.id, message });
        }
      }
      return;
    }

    const prev = audio.src;
    try {
      audio.src = silentWavDataUrl();
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      this.#unlocked = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`unlock failed: ${message}`);
    } finally {
      if (prev && prev !== audio.src) audio.removeAttribute('src');
    }
  }

  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#queue.length = 0;
    if (this.#audio) {
      try { this.#audio.pause(); } catch {}
      this.#audio.removeAttribute('src');
      this.#audio = null;
    }
    this.#releaseObjectUrl();
    this.#playing = false;
    this.#emitter.removeAllListeners();
  }

  on<K extends keyof TtsPlayerEvents>(
    event: K,
    fn: (payload: TtsPlayerEvents[K]) => void,
  ): void {
    this.#emitter.on(event, fn as (...args: unknown[]) => void);
  }

  off<K extends keyof TtsPlayerEvents>(
    event: K,
    fn: (payload: TtsPlayerEvents[K]) => void,
  ): void {
    this.#emitter.off(event, fn as (...args: unknown[]) => void);
  }

  async #pump(): Promise<void> {
    if (this.#playing || this.#disposed) return;
    const job = this.#queue.shift();
    if (!job) return;
    this.#playing = true;
    try {
      if (canStreamMpeg() && this.#transport.synthesizeStream) {
        const { stream, contentType } = await this.#transport.synthesizeStream(
          job.text,
          { voice: job.voice },
        );
        if (this.#disposed) return;
        await this.#playStream(job.id, stream, contentType);
      } else {
        const blob = await this.#transport.synthesize(job.text, { voice: job.voice });
        if (this.#disposed) return;
        await this.#playBlob(job.id, blob);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#emitter.emit('error', { messageId: job.id, message });
    } finally {
      this.#playing = false;
      if (!this.#disposed) void this.#pump();
    }
  }

  async #playStream(
    messageId: string,
    stream: ReadableStream<Uint8Array>,
    contentType: string,
  ): Promise<void> {
    if (!this.#audio) this.#audio = document.createElement('audio');
    const audio = this.#audio;

    const mime = normalizeMpegMime(contentType);
    if (!isMediaSourceSupported(mime)) {
      const blob = await drainStreamToBlob(stream, mime);
      await this.#playBlob(messageId, blob);
      return;
    }

    const ms = new MediaSource();
    this.#releaseObjectUrl();
    this.#activeObjectUrl = URL.createObjectURL(ms);
    audio.src = this.#activeObjectUrl;
    this.#applyPlaybackRate(audio);

    await new Promise<void>((resolve) => {
      if (ms.readyState === 'open') return resolve();
      ms.addEventListener('sourceopen', () => resolve(), { once: true });
    });

    let sb: SourceBuffer;
    try {
      sb = ms.addSourceBuffer(mime);
    } catch {
      const blob = await drainStreamToBlob(stream, mime);
      this.#releaseObjectUrl();
      audio.removeAttribute('src');
      await this.#playBlob(messageId, blob);
      return;
    }

    let startedPlaying = false;
    let streamError: Error | null = null;
    const pendingChunks: Uint8Array[] = [];
    // pendingChunks gets drained into SourceBuffer; allChunks preserves the full stream for the unlock-deferred blob.
    const allChunks: Uint8Array[] = [];
    let streamDone = false;

    const tryFlush = () => {
      if (sb.updating) return;
      const next = pendingChunks.shift();
      if (next) {
        try {
          sb.appendBuffer(
            next.buffer.slice(next.byteOffset, next.byteOffset + next.byteLength) as ArrayBuffer,
          );
        } catch (err) {
          streamError = err instanceof Error ? err : new Error(String(err));
        }
      } else if (streamDone && ms.readyState === 'open') {
        try { ms.endOfStream(); } catch {}
      }
    };
    sb.addEventListener('updateend', tryFlush);

    const reader = stream.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamDone = true;
          tryFlush();
          return;
        }
        if (value) {
          allChunks.push(value);
          pendingChunks.push(value);
          tryFlush();
          if (!startedPlaying) {
            startedPlaying = true;
            try {
              await audio.play();
              audio.playbackRate = this.#playbackRate;
              this.#unlocked = true;
              this.#emitter.emit('playback.started', { messageId });
            } catch (err) {
              if (isAutoplayBlocked(err)) {
                while (true) {
                  const next = await reader.read();
                  if (next.done) break;
                  if (next.value) allChunks.push(next.value);
                }
                const blob = combineChunksToBlob(allChunks, mime);
                this.#deferred.push({ job: { id: messageId, text: '' }, blob });
                this.#emitter.emit('gesture_required', { messageId });
                this.#releaseObjectUrl();
                audio.removeAttribute('src');
                return;
              }
              throw err;
            }
          }
        }
      }
    };

    await pump();

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        this.#cancelInflight = null;
      };
      const onEnded = () => {
        cleanup();
        this.#emitter.emit('playback.ended', { messageId });
        resolve();
      };
      const onError = () => {
        cleanup();
        this.#emitter.emit('error', { messageId, message: 'audio playback failed' });
        resolve();
      };
      audio.addEventListener('ended', onEnded, { once: true });
      audio.addEventListener('error', onError, { once: true });
      this.#cancelInflight = () => { cleanup(); resolve(); };
      if (streamError) {
        this.#emitter.emit('error', { messageId, message: streamError.message });
        cleanup();
        resolve();
      }
    });

    this.#releaseObjectUrl();
  }

  async #playBlob(messageId: string, blob: Blob): Promise<void> {
    if (!this.#audio) this.#audio = document.createElement('audio');
    this.#releaseObjectUrl();
    this.#activeObjectUrl = URL.createObjectURL(blob);
    const audio = this.#audio;
    audio.src = this.#activeObjectUrl;
    this.#applyPlaybackRate(audio);

    try {
      await audio.play();
      audio.playbackRate = this.#playbackRate;
    } catch (err) {
      if (isAutoplayBlocked(err)) {
        this.#deferred.push({ job: { id: messageId, text: '' }, blob });
        this.#emitter.emit('gesture_required', { messageId });
        return;
      }
      this.#emitter.emit('error', {
        messageId,
        message: err instanceof Error ? err.message : String(err),
      });
      this.#releaseObjectUrl();
      return;
    }

    this.#unlocked = true;
    await new Promise<void>((resolve) => {
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        this.#cancelInflight = null;
      };
      const onEnded = () => {
        cleanup();
        this.#emitter.emit('playback.ended', { messageId });
        resolve();
      };
      const onError = () => {
        cleanup();
        this.#emitter.emit('error', { messageId, message: 'audio playback failed' });
        resolve();
      };
      audio.addEventListener('ended', onEnded, { once: true });
      audio.addEventListener('error', onError, { once: true });
      this.#cancelInflight = () => { cleanup(); resolve(); };
      this.#emitter.emit('playback.started', { messageId });
    });

    this.#releaseObjectUrl();
  }

  #releaseObjectUrl(): void {
    if (this.#activeObjectUrl) {
      try { URL.revokeObjectURL(this.#activeObjectUrl); } catch {}
      this.#activeObjectUrl = null;
    }
  }
}

async function drainStreamToBlob(
  stream: ReadableStream<Uint8Array>,
  mime: string,
): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return combineChunksToBlob(chunks, mime);
}

// Copies through a fresh ArrayBuffer so the Blob ctor sees a concrete
// ArrayBuffer (not ArrayBufferLike) under strict TS.
function combineChunksToBlob(chunks: Uint8Array[], mime: string): Blob {
  const totalBytes = chunks.reduce((a, b) => a + b.byteLength, 0);
  const combined = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Blob([combined.buffer as ArrayBuffer], { type: mime });
}

function normalizeMpegMime(ct: string): string {
  const base = ct.split(';')[0]?.trim().toLowerCase() ?? '';
  if (base === 'audio/mp3') return 'audio/mpeg';
  return base || 'audio/mpeg';
}

function canStreamMpeg(): boolean {
  return (
    typeof MediaSource !== 'undefined' &&
    typeof MediaSource.isTypeSupported === 'function' &&
    MediaSource.isTypeSupported('audio/mpeg')
  );
}

function isMediaSourceSupported(mime: string): boolean {
  if (typeof MediaSource === 'undefined') return false;
  try { return MediaSource.isTypeSupported(mime); } catch { return false; }
}

function isAutoplayBlocked(err: unknown): boolean {
  if (!(err instanceof DOMException || err instanceof Error)) return false;
  const name = (err as { name?: string }).name ?? '';
  const message = err.message ?? '';
  return (
    name === 'NotAllowedError' ||
    /user (gesture|activation)/i.test(message) ||
    /autoplay/i.test(message)
  );
}

// 44-byte RIFF header, 0 data bytes — the shortest valid WAV. Used by
// unlock() to cheaply satisfy the browser's gesture-required check.
function silentWavDataUrl(): string {
  const header = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
    0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
    0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
    0x00, 0x00, 0x00, 0x00,
  ]);
  let bin = '';
  for (const b of header) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}
