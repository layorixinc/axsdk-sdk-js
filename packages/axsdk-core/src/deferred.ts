import { nanoid } from 'nanoid';
import { chatStore, type DeferredCall } from './store';
import * as api from './axapi';

const DEFAULT_TIMEOUT = 30000;

export interface DeferOptions {
  timeout?: number;
  hints?: Record<string, unknown>;
}

export type DeferFn = (options?: DeferOptions) => string;

const pendingOptions = new Map<string, DeferOptions>();

const timeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();

type Handler = (command: string, args: Record<string, unknown>) => Promise<unknown>;
let handlerFn: Handler | undefined;

export function setHandler(handler: Handler) {
  handlerFn = handler;
}

export function register(options?: DeferOptions): string {
  const deferId = `__defer_${nanoid()}`;
  pendingOptions.set(deferId, options ?? {});
  return deferId;
}

export function hasByCallId(callId: string): boolean {
  const calls = chatStore.getState().deferredCalls;
  return calls.some((c) => c.callId === callId);
}

export function bind(
  deferId: string,
  callInfo: { callId: string; command: string; args: Record<string, unknown> },
): void {
  const options = pendingOptions.get(deferId);
  if (!options) {
    console.error(`DeferredCallManager: unknown deferId ${deferId}`);
    return;
  }
  pendingOptions.delete(deferId);

  const deferredCall: DeferredCall = {
    deferId,
    callId: callInfo.callId,
    command: callInfo.command,
    args: callInfo.args,
    hints: options.hints,
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
    registeredAt: Date.now(),
  };

  chatStore.getState().addDeferredCall(deferredCall);
  startTimeout(deferredCall);
  startWatchingIfNeeded();
}

async function completeCall(deferId: string, result: string): Promise<void> {
  const calls = chatStore.getState().deferredCalls;
  const call = calls.find((c) => c.deferId === deferId);
  if (!call) return;

  clearTimeout(timeoutTimers.get(deferId));
  timeoutTimers.delete(deferId);

  try {
    await api.updateCall(call.callId, 'completed', result);
  } catch (e) {
    console.error('DeferredCallManager: updateCall failed', e);
  }

  chatStore.getState().removeDeferredCall(deferId);
  stopWatchingIfEmpty();
}

function startTimeout(call: DeferredCall): void {
  const remaining = call.timeout - (Date.now() - call.registeredAt);

  if (remaining <= 0) {
    handleTimeout(call);
    return;
  }

  const timer = setTimeout(() => handleTimeout(call), remaining);
  timeoutTimers.set(call.deferId, timer);
}

async function handleTimeout(call: DeferredCall): Promise<void> {
  timeoutTimers.delete(call.deferId);

  try {
    await api.updateCall(
      call.callId,
      'failed',
      `Timeout: ${call.command} did not complete within ${call.timeout}ms`,
    );
  } catch (e) {
    console.error('DeferredCallManager: timeout updateCall failed', e);
  }

  chatStore.getState().removeDeferredCall(call.deferId);
  stopWatchingIfEmpty();
}

let watchingActive = false;
let pollingTimer: ReturnType<typeof setInterval> | undefined;

async function checkAll(): Promise<void> {
  const calls = chatStore.getState().deferredCalls;

  for (const call of calls) {
    if (!handlerFn) continue;

    try {
      const result = await handlerFn(`${call.command}_complete`, { ...call.args, hints: call.hints ?? {} });
      if (result !== null && result !== undefined) {
        await completeCall(call.deferId, result as string);
      }
    } catch (e) {
      console.error(`DeferredCallManager: ${call.command}_complete error`, e);
    }
  }
}

function startWatchingIfNeeded(): void {
  if (watchingActive) return;
  watchingActive = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', checkAll);
    window.addEventListener('hashchange', checkAll);
    window.addEventListener('load', checkAll);
  }

  pollingTimer = setInterval(checkAll, 2000);
}

function stopWatchingIfEmpty(): void {
  const calls = chatStore.getState().deferredCalls;
  if (calls.length > 0) return;

  watchingActive = false;

  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', checkAll);
    window.removeEventListener('hashchange', checkAll);
    window.removeEventListener('load', checkAll);
  }

  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = undefined;
  }
}

export function restore(): void {
  const calls = chatStore.getState().deferredCalls;
  if (calls.length === 0) return;

  for (const call of calls) {
    startTimeout(call);
  }

  startWatchingIfNeeded();

  checkAll();
}

export function stop(): void {
  for (const timer of timeoutTimers.values()) {
    clearTimeout(timer);
  }
  timeoutTimers.clear();
  pendingOptions.clear();

  watchingActive = false;
  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', checkAll);
    window.removeEventListener('hashchange', checkAll);
    window.removeEventListener('load', checkAll);
  }
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = undefined;
  }
}
