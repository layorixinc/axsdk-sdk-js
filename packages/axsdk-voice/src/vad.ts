export type VadEngine = 'rms' | 'silero';

export interface VadConfig {
  engine: VadEngine;
  enabled: boolean;
  rmsThreshold: number;
  speechHangMs: number;
  prerollMs: number;
  minUtteranceMs: number;
  // Silero-only: probability threshold (0..1) for classifying a frame as speech.
  sileroPositiveThreshold: number;
  sileroNegativeThreshold: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  engine: 'rms',
  enabled: true,
  rmsThreshold: 0.015,
  speechHangMs: 400,
  prerollMs: 200,
  minUtteranceMs: 120,
  sileroPositiveThreshold: 0.5,
  sileroNegativeThreshold: 0.35,
};

export type VadStateName = 'silent' | 'voiced' | 'hangover';

export interface VadResult {
  forward: ArrayBuffer[];
  started: boolean;
  ended: boolean;
  durationMs?: number;
  state: VadStateName;
  rms: number;
}

interface PendingUtterance {
  pending: ArrayBuffer[];
  durationMs: number;
  committed: boolean;
}

// State machine: silent → voiced → hangover → silent.
// Frames below rmsThreshold in `silent` accumulate in a preroll ring buffer.
// Rising edge flushes the ring into the utterance. Hangover keeps forwarding
// the trailing tail for speechHangMs so consonants aren't clipped. Bursts
// shorter than minUtteranceMs are dropped entirely.
export class Vad {
  readonly #config: VadConfig;
  readonly #frameMs: number;
  readonly #prerollFrames: number;
  readonly #hangFrames: number;

  #state: VadStateName = 'silent';
  #hangFramesLeft = 0;
  readonly #preroll: ArrayBuffer[] = [];
  #utterance: PendingUtterance | null = null;

  constructor(config: Partial<VadConfig> = {}, frameMs = 100) {
    this.#config = { ...DEFAULT_VAD_CONFIG, ...config };
    this.#frameMs = frameMs;
    this.#prerollFrames = Math.max(0, Math.round(this.#config.prerollMs / frameMs));
    this.#hangFrames = Math.max(0, Math.round(this.#config.speechHangMs / frameMs));
  }

  process(frame: ArrayBuffer): VadResult {
    const rms = rmsInt16(frame);

    if (!this.#config.enabled) {
      return {
        forward: [frame],
        started: false,
        ended: false,
        state: 'voiced',
        rms,
      };
    }

    const isVoiced = rms >= this.#config.rmsThreshold;
    let started = false;
    let ended = false;
    let durationMs: number | undefined;
    const forward: ArrayBuffer[] = [];

    switch (this.#state) {
      case 'silent': {
        if (isVoiced) {
          started = true;
          this.#state = 'voiced';
          this.#hangFramesLeft = this.#hangFrames;
          this.#utterance = { pending: [], durationMs: 0, committed: false };
          for (const buf of this.#preroll) this.#utterance.pending.push(buf);
          this.#preroll.length = 0;
          this.#addFrameToUtterance(frame, forward);
        } else {
          this.#pushPreroll(frame);
        }
        break;
      }
      case 'voiced': {
        this.#addFrameToUtterance(frame, forward);
        if (!isVoiced) {
          this.#state = 'hangover';
          this.#hangFramesLeft = this.#hangFrames;
        } else {
          this.#hangFramesLeft = this.#hangFrames;
        }
        break;
      }
      case 'hangover': {
        this.#appendHangoverFrame(frame, forward);
        if (isVoiced) {
          this.#state = 'voiced';
          this.#hangFramesLeft = this.#hangFrames;
        } else {
          this.#hangFramesLeft -= 1;
          if (this.#hangFramesLeft <= 0) {
            ended = true;
            durationMs = this.#utterance!.durationMs;
            if (!this.#utterance!.committed) forward.length = 0;
            this.#utterance = null;
            this.#state = 'silent';
          }
        }
        break;
      }
    }

    return { forward, started, ended, durationMs, state: this.#state, rms };
  }

  reset(): void {
    this.#state = 'silent';
    this.#hangFramesLeft = 0;
    this.#preroll.length = 0;
    this.#utterance = null;
  }

  get state(): VadStateName {
    return this.#state;
  }

  #pushPreroll(frame: ArrayBuffer): void {
    if (this.#prerollFrames === 0) return;
    this.#preroll.push(frame);
    while (this.#preroll.length > this.#prerollFrames) this.#preroll.shift();
  }

  #addFrameToUtterance(frame: ArrayBuffer, forward: ArrayBuffer[]): void {
    const u = this.#utterance;
    if (!u) return;
    u.durationMs += this.#frameMs;
    if (u.committed) {
      forward.push(frame);
      return;
    }
    u.pending.push(frame);
    if (u.durationMs >= this.#config.minUtteranceMs) {
      u.committed = true;
      for (const buf of u.pending) forward.push(buf);
      u.pending.length = 0;
    }
  }

  // Hangover frames never promote the utterance — if it wasn't committed by
  // now, it was a blip and will be discarded when the countdown expires.
  #appendHangoverFrame(frame: ArrayBuffer, forward: ArrayBuffer[]): void {
    const u = this.#utterance;
    if (!u) return;
    u.durationMs += this.#frameMs;
    if (u.committed) forward.push(frame);
    else u.pending.push(frame);
  }
}

export function rmsInt16(buffer: ArrayBuffer): number {
  const view = new Int16Array(buffer);
  if (view.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < view.length; i++) {
    const v = view[i];
    if (v === undefined) continue;
    const n = v / 32768;
    sumSq += n * n;
  }
  return Math.sqrt(sumSq / view.length);
}
