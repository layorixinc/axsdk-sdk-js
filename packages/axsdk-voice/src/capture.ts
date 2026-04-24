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

export async function startCapture(
  options: CaptureOptions = {},
): Promise<CaptureHandle> {
  const sampleRate = options.sampleRate ?? 24000;

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

export async function primeMicrophonePermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    stopStream(s);
  } catch {}
}
