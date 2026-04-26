import { interpret } from 'robot3';
import { sttMachine, sttEventForState, type SttState } from './stt-machine';
import { ttsMachine, ttsEventForState, type TtsState } from './tts-machine';
import { transportMachine, type TransportState } from './transport-machine';

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  }
}

function newStt() {
  return interpret(sttMachine, () => {});
}
function newTts() {
  return interpret(ttsMachine, () => {});
}
function newTransport() {
  return interpret(transportMachine, () => {});
}

// STT — initial idle
{
  const s = newStt();
  assert(s.machine.current === 'idle', 'STT starts idle');
}

// STT — happy path: idle → connecting → listening → capturing → listening → idle
{
  const s = newStt();
  s.send('SET_CONNECTING'); assert(s.machine.current === 'connecting', 'idle → connecting');
  s.send('SET_LISTENING');  assert(s.machine.current === 'listening',  'connecting → listening');
  s.send('SET_CAPTURING');  assert(s.machine.current === 'capturing',  'listening → capturing');
  s.send('SET_LISTENING');  assert(s.machine.current === 'listening',  'capturing → listening');
  s.send('SET_IDLE');       assert(s.machine.current === 'idle',       'listening → idle');
}

// STT — error sticks until reset to idle
{
  const s = newStt();
  s.send('SET_CONNECTING');
  s.send('SET_ERROR');      assert(s.machine.current === 'error', 'connecting → error');
  s.send('SET_LISTENING');  assert(s.machine.current === 'error', 'error → listening dropped');
  s.send('SET_CAPTURING');  assert(s.machine.current === 'error', 'error → capturing dropped');
  s.send('SET_IDLE');       assert(s.machine.current === 'idle',  'error → idle ok');
}

// STT — connecting → idle valid
{
  const s = newStt();
  s.send('SET_CONNECTING');
  s.send('SET_IDLE');
  assert(s.machine.current === 'idle', 'connecting → idle ok');
}

// STT — eventForState round-trip
{
  const s = newStt();
  for (const target of ['connecting', 'listening', 'capturing'] as SttState[]) {
    s.send(sttEventForState[target]);
  }
  assert(s.machine.current === 'capturing', 'eventForState round-trip ends at capturing');
}

// TTS — initial idle
{
  const t = newTts();
  assert(t.machine.current === 'idle', 'TTS starts idle');
}

// TTS — happy path: idle → queued → speaking → idle
{
  const t = newTts();
  t.send('SET_QUEUED');   assert(t.machine.current === 'queued',   'idle → queued');
  t.send('SET_SPEAKING'); assert(t.machine.current === 'speaking', 'queued → speaking');
  t.send('SET_IDLE');     assert(t.machine.current === 'idle',     'speaking → idle');
}

// TTS — chained queue: speaking → queued → speaking
{
  const t = newTts();
  t.send('SET_QUEUED');
  t.send('SET_SPEAKING');
  t.send('SET_QUEUED');   assert(t.machine.current === 'queued',   'speaking → queued (next item)');
  t.send('SET_SPEAKING'); assert(t.machine.current === 'speaking', 'queued → speaking again');
}

// TTS — error path
{
  const t = newTts();
  t.send('SET_SPEAKING');
  t.send('SET_ERROR');    assert(t.machine.current === 'error', 'speaking → error');
  t.send('SET_SPEAKING'); assert(t.machine.current === 'error', 'error → speaking dropped');
  t.send('SET_QUEUED');   assert(t.machine.current === 'queued', 'error → queued ok (recovery)');
}

// TTS — eventForState round-trip
{
  const t = newTts();
  for (const target of ['queued', 'speaking', 'idle'] as TtsState[]) {
    t.send(ttsEventForState[target]);
  }
  assert(t.machine.current === 'idle', 'eventForState round-trip ends at idle');
}

// Transport — initial closed
{
  const tr = newTransport();
  assert(tr.machine.current === 'closed', 'Transport starts closed');
}

// Transport — happy path: closed → connecting → ready → closed
{
  const tr = newTransport();
  tr.send('OPEN');     assert(tr.machine.current === 'connecting',  'closed → connecting');
  tr.send('WS_READY'); assert(tr.machine.current === 'ready',       'connecting → ready');
  tr.send('CLOSE');    assert(tr.machine.current === 'closed',      'ready → closed');
}

// Transport — error during connecting
{
  const tr = newTransport();
  tr.send('OPEN');
  tr.send('WS_ERROR'); assert(tr.machine.current === 'closed', 'connecting → closed on error');
}

// Transport — reconnect cycle
{
  const tr = newTransport();
  tr.send('OPEN');
  tr.send('WS_READY');
  tr.send('SCHEDULE_RECONNECT'); assert(tr.machine.current === 'reconnecting', 'ready → reconnecting');
  tr.send('RECONNECT_FIRE');     assert(tr.machine.current === 'connecting',   'reconnecting → connecting');
  tr.send('WS_READY');           assert(tr.machine.current === 'ready',        'connecting → ready again');
}

// Transport — close during reconnecting cancels
{
  const tr = newTransport();
  tr.send('OPEN');
  tr.send('WS_READY');
  tr.send('SCHEDULE_RECONNECT');
  tr.send('CLOSE');             assert(tr.machine.current === 'closed', 'reconnecting → closed on CLOSE');
}

// Transport — closed state ignores stray events
{
  const tr = newTransport();
  const initial = tr.machine.current as TransportState;
  tr.send('WS_READY');
  tr.send('WS_ERROR');
  tr.send('WS_CLOSED');
  assert(tr.machine.current === initial, 'closed state stays closed under stray events');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('All FSM tests passed');
