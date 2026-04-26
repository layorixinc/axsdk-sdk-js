import { createMachine, state, transition, type Transition } from 'robot3';

export type TtsState =
  | 'idle'
  | 'queued'
  | 'speaking'
  | 'error';

export type TtsEvent =
  | 'SET_QUEUED'
  | 'SET_SPEAKING'
  | 'SET_ERROR'
  | 'SET_IDLE';

const t = (event: TtsEvent, target: TtsState) =>
  transition(event, target) as Transition<TtsEvent>;

export const ttsMachine = createMachine({
  idle: state(
    t('SET_QUEUED', 'queued'),
    t('SET_SPEAKING', 'speaking'),
    t('SET_ERROR', 'error'),
  ),
  queued: state(
    t('SET_SPEAKING', 'speaking'),
    t('SET_IDLE', 'idle'),
    t('SET_ERROR', 'error'),
  ),
  speaking: state(
    t('SET_QUEUED', 'queued'),
    t('SET_IDLE', 'idle'),
    t('SET_ERROR', 'error'),
  ),
  error: state(
    t('SET_IDLE', 'idle'),
    t('SET_QUEUED', 'queued'),
  ),
});

export const ttsEventForState: Record<TtsState, TtsEvent> = {
  idle: 'SET_IDLE',
  queued: 'SET_QUEUED',
  speaking: 'SET_SPEAKING',
  error: 'SET_ERROR',
};
