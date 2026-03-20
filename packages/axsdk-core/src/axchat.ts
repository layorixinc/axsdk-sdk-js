import type { ChatSession, MessagePart } from './types';
import * as api from './axapi';
import { getSSEService, type SSE } from './sse';
import { appStore, chatStore } from './store';
import { EventBus } from './eventbus';
import { updateFromMessages,
  updateFromSessionStatus, updateFromSessionUpdate,
  updateFromMessageUpdate, updateFromMessagePartUpdate, updateFromMessagePartDelta } from './chattransform';
import AXSDK from './axsdk';

let sse: SSE | undefined = undefined;
let messagePollingInterval: ReturnType<typeof setInterval> | undefined = undefined;

async function startMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }

  async function loadMessages() {
    try {
      const session = chatStore.getState().session;
      if (!session) {
        return;
      }
      const { messages } = await api.getMessages() as { messages: unknown };
      updateFromMessages(messages);
    } catch (error) {
      console.error('AXSDK: Error polling messages:', error);
    }
  }
  await loadMessages();

  messagePollingInterval = setInterval(async () => {
    await loadMessages();
  }, 30000);
}

function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = undefined;
  }
}

// @ts-ignore
async function handleChatOpen(properties: unknown) {
  const session = chatStore.getState().session;
  if (!session) {
    return;
  }
  EventBus.emit('message.chat', { type: 'axsdk.chat.session', data: { sessionID: session.id } });

  await startMessagePolling();
}

// @ts-ignore
async function handleChatClose(properties: unknown) {
  stopMessagePolling();
}

async function handleChatSession(properties: unknown) {
  const { sessionID } = properties as { sessionID: string };
  const appState = appStore.getState();
  if (!appState.apiKey) {
    console.warn('AXSDK: not initialized');
    return;
  }

  sse = getSSEService({
    apiKey: appState.apiKey,
    appId: appState.appId,
    appUserId: appStore.getState().getAppUserId(),
    sessionId: sessionID,
    headers: AXSDK.headers(),
  });
  sse?.start();
}

async function handleChatMessage(properties: unknown) {
  let session = chatStore.getState().session;
  if (!session) {
    const data = await api.createSession() as { session: ChatSession };
    session = data.session;
    chatStore.getState().setSession(session);
    EventBus.emit('message.chat', { type: 'axsdk.chat.session', data: { sessionID: session.id } });
  }
  const { text, images } = properties as { text: string, images: string[] };
  await api.postMessage(text, images);
}

async function handleSessionStatus(properties: unknown) {
  const status = await updateFromSessionStatus(properties);

  if (status == 'idle') {
    //EventBus.emit("message.ui", { type: "axsdk.chat.maximize", data: {} })
  }
  else {
    //EventBus.emit("message.ui", { type: "axsdk.chat.minimize", data: {} })
  }
}

async function handleSessionUpdate(properties: unknown) {
  updateFromSessionUpdate(properties);
}
async function handleMessageUpdate(properties: unknown) {
  updateFromMessageUpdate(properties);
}
async function handleMessagePartUpdate(properties: unknown) {
  const data = properties as { part: MessagePart };
  if(data.part.type == 'tool' && data.part.tool?.startsWith("AX") ) {
    if(data.part.state.status == 'running') {
      const call = {
        id: data.part.callID,
        sessionID: data.part.sessionID,
        messageID: data.part.messageID,
        command: data.part.tool,
        args: data.part.state.input,
        status: undefined
      }
      EventBus.emit('axsdk.call.execute', { sessionID: data.part.sessionID, call });
    }
  }
  updateFromMessagePartUpdate(properties);
}
async function handleMessagePartDelta(properties: unknown) {
  updateFromMessagePartDelta(properties);
}
async function handleChatCancel() {
  const session = chatStore.getState().session;
  if (!session) {
    return;
  }
  await api.cancelSession(session.id);
}

async function handleMessage(properties: unknown) {
  const { type, data } = properties as { type: string, data: unknown };

  if (type === 'axsdk.chat.open') {
    return handleChatOpen(data);
  }
  else if (type === 'axsdk.chat.close') {
    return handleChatClose(data);
  }
  else if (type === 'axsdk.chat.session') {
    return handleChatSession(data);
  }
  else if (type === 'axsdk.chat.message') {
    return handleChatMessage(data);
  }
  else if (type === 'axsdk.chat.cancel') {
    return handleChatCancel();
  }
  else if (type === 'session.status') {
    return handleSessionStatus(data);
  }
  else if (type === 'session.updated') {
    return handleSessionUpdate(data);
  }
  else if (type === 'message.updated') {
    return handleMessageUpdate(data);
  }
  else if (type === 'message.part.updated') {
    return handleMessagePartUpdate(data);
  }
  else if (type === 'message.part.delta') {
    return handleMessagePartDelta(data);
  }
}

export async function start() {
  EventBus.on('message.chat', handleMessage);

  const session = chatStore.getState().session;
  if (session) {
    EventBus.emit('message.chat', { type: 'axsdk.chat.session', data: { sessionID: session.id } });
  }
}

export async function stop() {
  EventBus.off('message.chat', handleMessage);

  stopMessagePolling();
}
