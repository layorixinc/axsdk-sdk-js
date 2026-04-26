import { resolveWorkletUrl } from './pcm-worklet';

export interface CaptureOptions {
  workletUrl?: string;
  sampleRate?: number;
}

export interface CaptureHandle {
  readonly ctx: AudioContext;
  readonly stream: MediaStream;
  readonly worklet: AudioWorkletNode;
  onFrame(fn: (frame: ArrayBuffer) => void): void;
  stop(): Promise<void>;
}

export class MicrophoneUnsupportedError extends Error {
  readonly code:
    | 'insecure-context'
    | 'ios-third-party-browser'
    | 'no-media-devices';
  constructor(
    code: MicrophoneUnsupportedError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'MicrophoneUnsupportedError';
    this.code = code;
  }
}

function assertMicrophoneSupported(): void {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new MicrophoneUnsupportedError(
      'insecure-context',
      'Microphone requires a secure context (HTTPS or localhost).',
    );
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' &&
      'ontouchend' in document);
  const isIOSThirdParty = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);
  if (isIOSThirdParty) {
    throw new MicrophoneUnsupportedError(
      'ios-third-party-browser',
      'On iOS, the microphone is only available in Safari. Please open this page in Safari.',
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneUnsupportedError(
      'no-media-devices',
      'navigator.mediaDevices.getUserMedia is not available in this browser.',
    );
  }
}

export async function startCapture(
  options: CaptureOptions = {},
): Promise<CaptureHandle> {
  const sampleRate = options.sampleRate ?? 24000;

  assertMicrophoneSupported();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioTracks = stream.getAudioTracks();
  const track = audioTracks[0];
  if (!track) {
    stopStream(stream);
    throw new Error('No microphone track available.');
  }

  const ctx = new AudioContext({ sampleRate });
  try {
    await ctx.audioWorklet.addModule(resolveWorkletUrl(options.workletUrl));
  } catch (err) {
    stopStream(stream);
    await closeSilently(ctx);
    throw err;
  }

  // iOS Safari starts AudioContext in `suspended`. If startCapture is being
  // called from a user gesture, this resume() lifts it; from a non-gesture
  // path, it rejects silently and the worklet stays inactive — host should
  // surface a "tap to enable" UI driven by voice.session.restored.
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }

  const source = ctx.createMediaStreamSource(new MediaStream([track]));
  const worklet = new AudioWorkletNode(ctx, 'pcm16-worklet');

  // Not connected to ctx.destination — we don't want captured audio replayed.
  source.connect(worklet);

  let frameHandler: ((frame: ArrayBuffer) => void) | null = null;
  worklet.port.onmessage = (ev) => {
    if (!frameHandler) return;
    if (ev.data instanceof ArrayBuffer) frameHandler(ev.data);
  };

  let stopped = false;

  return {
    ctx,
    stream,
    worklet,
    onFrame(fn) {
      frameHandler = fn;
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      frameHandler = null;
      try { worklet.disconnect(); } catch {}
      try { source.disconnect(); } catch {}
      stopStream(stream);
      await closeSilently(ctx);
    },
  };
}

function stopStream(stream: MediaStream): void {
  for (const t of stream.getTracks()) {
    try { t.stop(); } catch {}
  }
}

async function closeSilently(ctx: AudioContext): Promise<void> {
  try { await ctx.close(); } catch {}
}

export function isMicrophoneSupported(): boolean {
  try {
    assertMicrophoneSupported();
    return true;
  } catch {
    return false;
  }
}

export async function primeMicrophonePermission(): Promise<void> {
  if (!isMicrophoneSupported()) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    stopStream(s);
  } catch {}
}
