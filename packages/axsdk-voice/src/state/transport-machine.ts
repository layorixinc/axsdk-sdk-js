import { createMachine, state, transition, type Transition } from 'robot3';

export type TransportState =
  | 'closed'
  | 'connecting'
  | 'ready'
  | 'reconnecting';

export type TransportEvent =
  | 'OPEN'
  | 'WS_READY'
  | 'WS_ERROR'
  | 'WS_CLOSED'
  | 'CLOSE'
  | 'SCHEDULE_RECONNECT'
  | 'RECONNECT_FIRE';

const t = (event: TransportEvent, target: TransportState) =>
  transition(event, target) as Transition<TransportEvent>;

export const transportMachine = createMachine({
  closed: state(
    t('OPEN', 'connecting'),
  ),
  connecting: state(
    t('WS_READY', 'ready'),
    t('WS_ERROR', 'closed'),
    t('WS_CLOSED', 'closed'),
    t('SCHEDULE_RECONNECT', 'reconnecting'),
    t('CLOSE', 'closed'),
  ),
  ready: state(
    t('WS_ERROR', 'closed'),
    t('WS_CLOSED', 'closed'),
    t('SCHEDULE_RECONNECT', 'reconnecting'),
    t('CLOSE', 'closed'),
    t('OPEN', 'connecting'),
  ),
  reconnecting: state(
    t('RECONNECT_FIRE', 'connecting'),
    t('OPEN', 'connecting'),
    t('CLOSE', 'closed'),
  ),
});
