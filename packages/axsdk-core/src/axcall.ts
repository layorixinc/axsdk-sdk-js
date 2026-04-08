import { EventBus } from './eventbus';
import { chatStore } from './store';
import { processAXHandler } from './axhandler';
import * as api from './axapi';
import { isPromise } from './lib'

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

    let status: string = 'completed';
    let result: string | [string, Promise<void> | (() => void)];
    try {
      const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
      result = await processAXHandler(call.command, args);
    }
    catch (e) {
      console.error('axHandler: error:', e);
      status = 'failed';
      result = `ERROR: ${e}`;
    }

    if (typeof result === 'string') {
      await api.updateCall(call.id, status, result);
    } else {
      await api.updateCall(call.id, status, result[0]);
      if(!!result[1]) {
        if(isPromise(result[1])) await result[1];
        else if(typeof result[1] === 'function') result[1]();
      }
    }
  } catch (e) {
    console.error('handleAXSDKCall: error:', e);
  }
}

let pollingInterval: ReturnType<typeof setInterval> | undefined = undefined;

async function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

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
