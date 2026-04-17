import { nanoid } from 'nanoid';
import { chatStore, type DeferredCall } from './store';
import * as api from './axapi';

export interface DeferOptions {
  timeout: number;
  hints?: Record<string, unknown>;
}

export type DeferFn = (options: DeferOptions) => string;

// register 시 옵션 임시 보관 (bind 전까지만 사용, 메모리 only)
const pendingOptions = new Map<string, DeferOptions>();

// 타임아웃 타이머 (메모리 only)
const timeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();

// complete 함수 registry — AX_PROXY를 외부에서 주입받음
let resolveCompleteFn:
  | ((command: string) => ((args: Record<string, unknown>, hints: Record<string, unknown>) => Promise<string | null>) | undefined)
  | undefined;

export function setCompleteResolver(
  resolver: (command: string) => ((args: Record<string, unknown>, hints: Record<string, unknown>) => Promise<string | null>) | undefined,
) {
  resolveCompleteFn = resolver;
}

export function register(options: DeferOptions): string {
  const deferId = `__defer_${nanoid()}`;
  pendingOptions.set(deferId, options);
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
    timeout: options.timeout,
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
    const completeFn = resolveCompleteFn?.(`${call.command}_complete`);
    if (!completeFn) continue;

    try {
      const result = await completeFn(call.args, call.hints ?? {});
      if (result !== null) {
        await completeCall(call.deferId, result);
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

  // 즉시 한 번 체크 — 리로드 사이에 이미 완료되었을 수 있음
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
