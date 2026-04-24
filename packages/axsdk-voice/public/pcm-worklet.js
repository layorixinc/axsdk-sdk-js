// AudioWorklet processor: converts Float32 mono input to PCM16 LE,
// batches into ~100 ms chunks at 24 kHz, posts ArrayBuffer to main thread.
//
// At 24 kHz, 100 ms = 2400 samples = 4800 bytes.
const TARGET_SAMPLES = 2400;

class PCM16Worklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(TARGET_SAMPLES);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0]; // mono
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      // clamp + scale Float32 [-1, 1] -> Int16
      let s = channel[i];
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      this._buffer[this._offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      if (this._offset === TARGET_SAMPLES) {
        // Copy out of the worklet's reusable buffer before posting.
        const out = new Int16Array(this._buffer);
        this.port.postMessage(out.buffer, [out.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm16-worklet", PCM16Worklet);
