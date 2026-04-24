// Silero-based capture path. Replaces the capture.ts + vad.ts pair when
// engine: 'silero' is selected. @ricky0123/vad-web is loaded dynamically so
// hosts that don't opt in pay zero bundle cost.

export interface SileroCaptureOptions {
  positiveThreshold: number;
  negativeThreshold: number;
  onSpeechStarted: () => void;
  onSpeechEnded: () => void;
  onFrame: (pcm16le24k: ArrayBuffer) => void;
}

export interface SileroCaptureHandle {
  stop(): Promise<void>;
}

type MicVADStatic = {
  new: (opts: {
    positiveSpeechThreshold?: number;
    negativeSpeechThreshold?: number;
    redemptionFrames?: number;
    minSpeechFrames?: number;
    preSpeechPadFrames?: number;
    onSpeechStart?: () => void;
    onSpeechEnd?: (audio: Float32Array) => void;
    onVADMisfire?: () => void;
    onFrameProcessed?: (
      probabilities: { isSpeech: number; notSpeech: number },
      frame: Float32Array,
    ) => void;
  }) => Promise<{
    start: () => void;
    pause: () => void;
    destroy: () => void;
  }>;
};

export async function startSileroCapture(
  options: SileroCaptureOptions,
): Promise<SileroCaptureHandle> {
  let mod: { MicVAD: MicVADStatic };
  try {
    // Obfuscated from the TS module resolver — @ricky0123/vad-web is an
    // *optional* peer dep. Hosts that want Silero install it themselves.
    const pkg = '@ricky0123/vad-web';
    mod = (await import(/* @vite-ignore */ pkg)) as unknown as { MicVAD: MicVADStatic };
  } catch (err) {
    throw new Error(
      'Silero VAD requires @ricky0123/vad-web. Install it with `bun add @ricky0123/vad-web` (or npm/yarn). ' +
        (err instanceof Error ? err.message : String(err)),
    );
  }

  let inSpeech = false;
  const vad = await mod.MicVAD.new({
    positiveSpeechThreshold: options.positiveThreshold,
    negativeSpeechThreshold: options.negativeThreshold,
    onSpeechStart: () => {
      inSpeech = true;
      options.onSpeechStarted();
    },
    onSpeechEnd: () => {
      inSpeech = false;
      options.onSpeechEnded();
    },
    onVADMisfire: () => {
      if (inSpeech) {
        inSpeech = false;
        options.onSpeechEnded();
      }
    },
    onFrameProcessed: (probs, frame) => {
      if (probs.isSpeech >= options.positiveThreshold) {
        options.onFrame(floatFrame16kToPcm24k(frame));
      }
    },
  });

  vad.start();

  let stopped = false;
  return {
    async stop() {
      if (stopped) return;
      stopped = true;
      try { vad.pause(); } catch {}
      try { vad.destroy(); } catch {}
    },
  };
}

// 16 kHz Float32 → 24 kHz Int16 LE. Linear interpolation is good enough for
// the kind of audio we're sending upstream (OpenAI resamples internally
// anyway); the goal is just to hit the format the wire expects.
function floatFrame16kToPcm24k(float16k: Float32Array): ArrayBuffer {
  const inLen = float16k.length;
  const outLen = Math.floor((inLen * 3) / 2);
  const out = new Int16Array(outLen);
  const ratio = (inLen - 1) / (outLen - 1 || 1);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, inLen - 1);
    const t = srcIdx - lo;
    const a = float16k[lo] ?? 0;
    const b = float16k[hi] ?? 0;
    let sample = a + (b - a) * t;
    if (sample > 1) sample = 1;
    else if (sample < -1) sample = -1;
    out[i] = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
  }
  return out.buffer;
}
