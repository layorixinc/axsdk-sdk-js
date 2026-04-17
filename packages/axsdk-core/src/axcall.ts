import { EventBus } from './eventbus';
import { chatStore } from './store';
import { processAXHandler } from './axhandler';
import * as api from './axapi';
import * as DeferredCallManager from './deferred';
import type { DeferFn } from './deferred';

interface Call {
  id: string;
  sessionID: string;
  messageID: string;
  command: string;
  args: Record<string, unknown>;
  status: string;
  result: string;
  createdAt: string;
  updatedAt: string;
}

const CALL_ID_TTL_MS = 30 * 60 * 1000;
const processedCallIds = new Map<string, number>();

function purgeExpiredCallIds(): void {
  const now = Date.now();
  for (const [id, timestamp] of processedCallIds) {
    if (now - timestamp > CALL_ID_TTL_MS) {
      processedCallIds.delete(id);
    }
  }
}

export async function handleAXSDKCall(properties: unknown) {
  const { sessionID, call } = properties as { sessionID: string; call: Call };

  try {
    purgeExpiredCallIds();

    const now = Date.now();
    const cachedAt = processedCallIds.get(call.id);
    if (cachedAt !== undefined && now - cachedAt <= CALL_ID_TTL_MS) {
      return;
    }
    processedCallIds.set(call.id, now);

    // deferred 상태인 call의 재실행 방지 (리로드 후 폴링 대응)
    if (DeferredCallManager.hasByCallId(call.id)) {
      return;
    }

    let status: string = 'completed';
    let result: string;
    try {
      const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
      const defer: DeferFn = (options) => {
        const deferId = DeferredCallManager.register(options);
        DeferredCallManager.bind(deferId, { callId: call.id, command: call.command, args });
        return deferId;
      };
      result = await processAXHandler(call.command, args, defer);
    }
    catch (e) {
      console.error('axHandler: error:', e);
      status = 'failed';
      result = `ERROR: ${e}`;
    }

    // tool 함수가 bind()를 호출했으면 store에 이미 저장됨 → updateCall skip
    if (DeferredCallManager.hasByCallId(call.id)) {
      return;
    }

    await api.updateCall(call.id, status, result);
  } catch (e) {
    console.error('handleAXSDKCall: error:', e);
  }
}

let pollingInterval: ReturnType<typeof setInterval> | undefined = undefined;

async function loadPendingCalls() {
  try {
    const session = chatStore.getState().session;
    if (!session) {
      return;
    }
    const { calls } = await api.getPendingCalls() as { calls: unknown[] };
    for (const call of calls) {
      EventBus.emit('axsdk.call.execute', { sessionID: session.id, call });
    }
  } catch (error) {
    console.error('AXSDK: Error polling calls:', error);
  }
}

async function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  await loadPendingCalls();

  pollingInterval = setInterval(async () => {
    await loadPendingCalls();
  }, 30000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = undefined;
  }
}

export async function start() {
  await startPolling();

  EventBus.on('axsdk.call.execute', handleAXSDKCall);
}

export async function stop() {
  EventBus.off('axsdk.call.execute', handleAXSDKCall);

  stopPolling();
}
