import { EventBus } from './eventbus';
import { chatStore } from './store';
import { processAXHandler } from './axhandler';
import * as api from './axapi';

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

export async function handleAXSDKCall(properties: unknown) {
  const { sessionID, call } = properties as { sessionID: string; call: Call };
  const session = chatStore.getState().session;


  let status: string = 'completed';
  let result: string = '';
  try {
    const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
    result = await processAXHandler(call.command, args);
  }
  catch (e) {
    console.error('axHandler: error:', e);
    status = 'failed';
    result = `ERROR: ${e}`;
  }

  await api.updateCall(call.id, status, result);
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
