// Ad-hoc VAD harness runnable with `bun src/vad.test.ts`. Not a real test
// runner — the monorepo doesn't ship one. Exits non-zero on any failure.

import { Vad } from './vad';

const FRAME_SAMPLES = 2400;  // 100 ms @ 24 kHz

function silence(): ArrayBuffer {
  return new Int16Array(FRAME_SAMPLES).buffer;
}

function tone(amp: number): ArrayBuffer {
  const buf = new Int16Array(FRAME_SAMPLES);
  for (let i = 0; i < FRAME_SAMPLES; i++) {
    // Sine at 440 Hz; amp is in [0..1] of Int16 range
    buf[i] = Math.round(Math.sin((i / 24000) * 2 * Math.PI * 440) * 32767 * amp);
  }
  return buf.buffer;
}

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

// Scenario 1: all silence — nothing forwarded, never starts.
{
  const vad = new Vad();
  let totalForwarded = 0;
  let started = 0;
  for (let i = 0; i < 20; i++) {
    const r = vad.process(silence());
    totalForwarded += r.forward.length;
    if (r.started) started++;
  }
  assert(totalForwarded === 0, 's1: no frames should forward during silence');
  assert(started === 0, 's1: no rising edge during silence');
}

// Scenario 2: steady voiced tone → start event, frames flow, preroll included.
{
  const vad = new Vad({ prerollMs: 200, speechHangMs: 200, minUtteranceMs: 100 });
  // Pre-roll: 2 silent frames; then 10 voiced.
  let starts = 0;
  let forwarded = 0;
  for (let i = 0; i < 2; i++) {
    const r = vad.process(silence());
    forwarded += r.forward.length;
    if (r.started) starts++;
  }
  for (let i = 0; i < 10; i++) {
    const r = vad.process(tone(0.5));
    forwarded += r.forward.length;
    if (r.started) starts++;
  }
  assert(starts === 1, 's2: exactly one rising edge');
  // 10 voiced + 2 preroll frames forwarded once the minimum was hit
  assert(forwarded >= 10, `s2: expected ≥10 forwarded, got ${forwarded}`);
  assert(forwarded <= 12, `s2: expected ≤12 forwarded (preroll capped), got ${forwarded}`);
}

// Scenario 3: voiced → silent transitions to hangover, then ends.
{
  const vad = new Vad({ prerollMs: 0, speechHangMs: 200, minUtteranceMs: 100 });
  let ends = 0;
  let lastDuration = 0;
  for (let i = 0; i < 5; i++) vad.process(tone(0.5));
  for (let i = 0; i < 10; i++) {
    const r = vad.process(silence());
    if (r.ended) {
      ends++;
      lastDuration = r.durationMs ?? 0;
    }
  }
  assert(ends === 1, 's3: exactly one falling edge');
  assert(lastDuration >= 500, `s3: duration should cover voiced+hangover (got ${lastDuration})`);
}

// Scenario 4: sub-minimum burst is dropped.
{
  const vad = new Vad({ prerollMs: 0, speechHangMs: 100, minUtteranceMs: 300 });
  let forwarded = 0;
  let ends = 0;
  // One voiced frame (100 ms), then silence.
  forwarded += vad.process(tone(0.5)).forward.length;
  for (let i = 0; i < 5; i++) {
    const r = vad.process(silence());
    forwarded += r.forward.length;
    if (r.ended) ends++;
  }
  assert(ends === 1, 's4: utterance must still close');
  assert(forwarded === 0, `s4: sub-minimum burst dropped (got ${forwarded})`);
}

// Scenario 5: disabled VAD passes everything through.
{
  const vad = new Vad({ enabled: false });
  let forwarded = 0;
  for (let i = 0; i < 5; i++) forwarded += vad.process(silence()).forward.length;
  assert(forwarded === 5, 's5: disabled VAD must be pass-through');
}

console.log('vad: all scenarios passed');
