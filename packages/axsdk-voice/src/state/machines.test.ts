import { interpret } from 'robot3';
import {
  sttMachine, sttEventForState,
  type SttState, type SttEvent,
} from './stt-machine';
import {
  ttsMachine, ttsEventForState,
  type TtsState, type TtsEvent,
} from './tts-machine';
import {
  transportMachine,
  type TransportState, type TransportEvent,
} from './transport-machine';

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  }
}

const newStt = () => interpret(sttMachine, () => {});
const newTts = () => interpret(ttsMachine, () => {});
const newTransport = () => interpret(transportMachine, () => {});

// ─── STT ──────────────────────────────────────────────────────────────────

const sttStates: SttState[] = ['idle', 'connecting', 'listening', 'capturing', 'error'];
const sttEvents: SttEvent[] = ['SET_CONNECTING', 'SET_LISTENING', 'SET_CAPTURING', 'SET_ERROR', 'SET_IDLE'];

const sttTable: Record<SttState, Partial<Record<SttEvent, SttState>>> = {
  idle:       { SET_CONNECTING: 'connecting', SET_LISTENING: 'listening', SET_ERROR: 'error' },
  connecting: { SET_LISTENING: 'listening', SET_CAPTURING: 'capturing', SET_ERROR: 'error', SET_IDLE: 'idle' },
  listening:  { SET_CAPTURING: 'capturing', SET_CONNECTING: 'connecting', SET_ERROR: 'error', SET_IDLE: 'idle' },
  capturing:  { SET_LISTENING: 'listening', SET_CONNECTING: 'connecting', SET_ERROR: 'error', SET_IDLE: 'idle' },
  error:      { SET_IDLE: 'idle', SET_CONNECTING: 'connecting' },
};

const sttPathToState: Record<SttState, SttEvent[]> = {
  idle: [],
  connecting: ['SET_CONNECTING'],
  listening:  ['SET_CONNECTING', 'SET_LISTENING'],
  capturing:  ['SET_CONNECTING', 'SET_CAPTURING'],
  error:      ['SET_ERROR'],
};

function moveSttTo(s: ReturnType<typeof newStt>, target: SttState) {
  for (const e of sttPathToState[target]) s.send(e);
  if (s.machine.current !== target) {
    throw new Error(`Failed to seed STT to ${target} (got ${s.machine.current})`);
  }
}

for (const from of sttStates) {
  for (const event of sttEvents) {
    const s = newStt();
    moveSttTo(s, from);
    const expected = sttTable[from][event];
    s.send(event);
    const actual = s.machine.current;
    if (expected) {
      assert(actual === expected, `STT (${from}) -[${event}]-> expected ${expected}, got ${actual}`);
    } else {
      assert(actual === from, `STT (${from}) -[${event}]-> rejected, expected stay ${from}, got ${actual}`);
    }
  }
}

// STT — initial state
{
  const s = newStt();
  assert(s.machine.current === 'idle', 'STT initial state is idle');
}

// STT — eventForState round-trip integrity
for (const target of sttStates) {
  if (target === 'idle') continue;
  const s = newStt();
  // Reach target via shortest seed path then send the same event
  moveSttTo(s, target);
  assert(s.machine.current === target, `STT seed to ${target} via path`);
  // sttEventForState[target] should be the canonical event for entering target
  const event = sttEventForState[target];
  // From idle, sending eventForState[target] should reach target
  const s2 = newStt();
  s2.send(event);
  // Note: 'capturing' from idle has no direct transition; only 'connecting'/'listening'/'error' do
  if (sttTable.idle[event]) {
    assert(s2.machine.current === sttTable.idle[event], `STT idle -[${event}]-> ${sttTable.idle[event]}`);
  }
}

// ─── TTS ──────────────────────────────────────────────────────────────────

const ttsStates: TtsState[] = ['idle', 'queued', 'speaking', 'error'];
const ttsEvents: TtsEvent[] = ['SET_QUEUED', 'SET_SPEAKING', 'SET_ERROR', 'SET_IDLE'];

const ttsTable: Record<TtsState, Partial<Record<TtsEvent, TtsState>>> = {
  idle:     { SET_QUEUED: 'queued', SET_SPEAKING: 'speaking', SET_ERROR: 'error' },
  queued:   { SET_SPEAKING: 'speaking', SET_IDLE: 'idle', SET_ERROR: 'error' },
  speaking: { SET_QUEUED: 'queued', SET_IDLE: 'idle', SET_ERROR: 'error' },
  error:    { SET_IDLE: 'idle', SET_QUEUED: 'queued' },
};

const ttsPathToState: Record<TtsState, TtsEvent[]> = {
  idle: [],
  queued:   ['SET_QUEUED'],
  speaking: ['SET_SPEAKING'],
  error:    ['SET_ERROR'],
};

function moveTtsTo(t: ReturnType<typeof newTts>, target: TtsState) {
  for (const e of ttsPathToState[target]) t.send(e);
  if (t.machine.current !== target) {
    throw new Error(`Failed to seed TTS to ${target} (got ${t.machine.current})`);
  }
}

for (const from of ttsStates) {
  for (const event of ttsEvents) {
    const t = newTts();
    moveTtsTo(t, from);
    const expected = ttsTable[from][event];
    t.send(event);
    const actual = t.machine.current;
    if (expected) {
      assert(actual === expected, `TTS (${from}) -[${event}]-> expected ${expected}, got ${actual}`);
    } else {
      assert(actual === from, `TTS (${from}) -[${event}]-> rejected, expected stay ${from}, got ${actual}`);
    }
  }
}

// TTS — initial state
{
  const t = newTts();
  assert(t.machine.current === 'idle', 'TTS initial state is idle');
}

// TTS — eventForState lookup
for (const s of ttsStates) {
  assert(typeof ttsEventForState[s] === 'string', `ttsEventForState[${s}] is defined`);
}

// ─── Transport ────────────────────────────────────────────────────────────

const transportStates: TransportState[] = ['closed', 'connecting', 'ready', 'reconnecting'];
const transportEvents: TransportEvent[] = [
  'OPEN', 'WS_READY', 'WS_ERROR', 'WS_CLOSED', 'CLOSE',
  'SCHEDULE_RECONNECT', 'RECONNECT_FIRE',
];

const transportTable: Record<TransportState, Partial<Record<TransportEvent, TransportState>>> = {
  closed:       { OPEN: 'connecting' },
  connecting:   { WS_READY: 'ready', WS_ERROR: 'closed', WS_CLOSED: 'closed', SCHEDULE_RECONNECT: 'reconnecting', CLOSE: 'closed' },
  ready:        { WS_ERROR: 'closed', WS_CLOSED: 'closed', SCHEDULE_RECONNECT: 'reconnecting', CLOSE: 'closed', OPEN: 'connecting' },
  reconnecting: { RECONNECT_FIRE: 'connecting', OPEN: 'connecting', CLOSE: 'closed' },
};

const transportPathToState: Record<TransportState, TransportEvent[]> = {
  closed: [],
  connecting:   ['OPEN'],
  ready:        ['OPEN', 'WS_READY'],
  reconnecting: ['OPEN', 'WS_READY', 'SCHEDULE_RECONNECT'],
};

function moveTransportTo(tr: ReturnType<typeof newTransport>, target: TransportState) {
  for (const e of transportPathToState[target]) tr.send(e);
  if (tr.machine.current !== target) {
    throw new Error(`Failed to seed Transport to ${target} (got ${tr.machine.current})`);
  }
}

for (const from of transportStates) {
  for (const event of transportEvents) {
    const tr = newTransport();
    moveTransportTo(tr, from);
    const expected = transportTable[from][event];
    tr.send(event);
    const actual = tr.machine.current;
    if (expected) {
      assert(actual === expected, `Transport (${from}) -[${event}]-> expected ${expected}, got ${actual}`);
    } else {
      assert(actual === from, `Transport (${from}) -[${event}]-> rejected, expected stay ${from}, got ${actual}`);
    }
  }
}

// Transport — initial state
{
  const tr = newTransport();
  assert(tr.machine.current === 'closed', 'Transport initial state is closed');
}

// ─── Cross-machine integration sanity ────────────────────────────────────

// STT: full lifecycle simulating attach → capture → utterance → silence → detach
{
  const s = newStt();
  s.send('SET_CONNECTING'); assert(s.machine.current === 'connecting', 'lifecycle: connecting');
  s.send('SET_LISTENING');  assert(s.machine.current === 'listening',  'lifecycle: listening (transport ready)');
  s.send('SET_CAPTURING');  assert(s.machine.current === 'capturing',  'lifecycle: capturing (VAD start)');
  s.send('SET_LISTENING');  assert(s.machine.current === 'listening',  'lifecycle: listening again (VAD end)');
  s.send('SET_CAPTURING');  assert(s.machine.current === 'capturing',  'lifecycle: capturing again');
  s.send('SET_LISTENING');  assert(s.machine.current === 'listening',  'lifecycle: listening third');
  s.send('SET_IDLE');       assert(s.machine.current === 'idle',       'lifecycle: idle (detach)');
}

// TTS: speak → start → end → speak again → start → error → recover
{
  const t = newTts();
  t.send('SET_QUEUED');   assert(t.machine.current === 'queued',   'tts: speak 1 queued');
  t.send('SET_SPEAKING'); assert(t.machine.current === 'speaking', 'tts: speak 1 playing');
  t.send('SET_IDLE');     assert(t.machine.current === 'idle',     'tts: speak 1 ended');
  t.send('SET_QUEUED');   assert(t.machine.current === 'queued',   'tts: speak 2 queued');
  t.send('SET_SPEAKING'); assert(t.machine.current === 'speaking', 'tts: speak 2 playing');
  t.send('SET_ERROR');    assert(t.machine.current === 'error',    'tts: speak 2 errored');
  t.send('SET_IDLE');     assert(t.machine.current === 'idle',     'tts: error recovered to idle');
  t.send('SET_QUEUED');   assert(t.machine.current === 'queued',   'tts: speak 3 after recovery');
}

// Transport: attach → ready → drop → reconnect → ready → close
{
  const tr = newTransport();
  tr.send('OPEN');               assert(tr.machine.current === 'connecting',  'transport: opening');
  tr.send('WS_READY');           assert(tr.machine.current === 'ready',       'transport: ready');
  tr.send('WS_CLOSED');          assert(tr.machine.current === 'closed',      'transport: closed by network');
  // imperative reconnect path: OPEN again
  tr.send('OPEN');               assert(tr.machine.current === 'connecting',  'transport: reopening');
  tr.send('WS_READY');           assert(tr.machine.current === 'ready',       'transport: ready 2');
  tr.send('SCHEDULE_RECONNECT'); assert(tr.machine.current === 'reconnecting','transport: scheduled retry');
  tr.send('RECONNECT_FIRE');     assert(tr.machine.current === 'connecting',  'transport: retry firing');
  tr.send('CLOSE');              assert(tr.machine.current === 'closed',      'transport: explicit close');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('All FSM tests passed');
