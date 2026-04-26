import { createMachine, state, transition, type Transition } from 'robot3';

export type SttState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'capturing'
  | 'error';

export type SttEvent =
  | 'SET_CONNECTING'
  | 'SET_LISTENING'
  | 'SET_CAPTURING'
  | 'SET_ERROR'
  | 'SET_IDLE';

const t = (event: SttEvent, target: SttState) =>
  transition(event, target) as Transition<SttEvent>;

export const sttMachine = createMachine({
  idle: state(
    t('SET_CONNECTING', 'connecting'),
    t('SET_LISTENING', 'listening'),
    t('SET_ERROR', 'error'),
  ),
  connecting: state(
    t('SET_LISTENING', 'listening'),
    t('SET_CAPTURING', 'capturing'),
    t('SET_ERROR', 'error'),
    t('SET_IDLE', 'idle'),
  ),
  listening: state(
    t('SET_CAPTURING', 'capturing'),
    t('SET_CONNECTING', 'connecting'),
    t('SET_ERROR', 'error'),
    t('SET_IDLE', 'idle'),
  ),
  capturing: state(
    t('SET_LISTENING', 'listening'),
    t('SET_CONNECTING', 'connecting'),
    t('SET_ERROR', 'error'),
    t('SET_IDLE', 'idle'),
  ),
  error: state(
    t('SET_IDLE', 'idle'),
    t('SET_CONNECTING', 'connecting'),
  ),
});

export const sttEventForState: Record<SttState, SttEvent> = {
  idle: 'SET_IDLE',
  connecting: 'SET_CONNECTING',
  listening: 'SET_LISTENING',
  capturing: 'SET_CAPTURING',
  error: 'SET_ERROR',
};
