import type { ChatMessage, ChatMessagePayload, MessagePart, MessageTime, MessageInfo } from './types/chat';
import { chatStore } from './store';

export async function updateFromMessages(payload: unknown) {
  const data = payload as ChatMessagePayload[];
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const messages: ChatMessage[] = chatState.messages;
  for (const item of data) {
    if (item.info?.sessionID != session.id) {
      continue;
    }
    const message = (messages.find(x => x.info?.id == item.info.id) || item) as ChatMessage;
    const parts: MessagePart[] = message.parts ?? [];
    for (const updatedPart of item.parts) {
      const part = parts.find(x => x.id == updatedPart.id) as (MessagePart & { text?: string }) | undefined;
      if(part) {
        const updatedPartWithText = updatedPart as MessagePart & { text?: string };
        if((updatedPartWithText.text ?? '').length < (part.text ?? '').length) {
          part.text = updatedPartWithText.text;
        }
      } else {
        parts.push(updatedPart);
      }
    }
    message.parts = parts.sort((a, b) => a.id.localeCompare(b.id))
    const timestamp = item.info.time.completed ? new Date(item.info.time.completed) : new Date(item.info.time.created);
    const updatedMessage = { ...message, role: item.info.role, timestamp, parts, finish: item.info.finish };
    chatState.updateMessage(updatedMessage);
  }
}

export async function updateFromSessionStatus(payload: unknown) {
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const data = payload as { status: { type: string }; sessionID: string };
  if (session.id !== data.sessionID) {
    return;
  }
  const status = data.status.type;
  chatState.setSession({ ...session, status });
  return status;
}

export async function updateFromSessionUpdate(payload: unknown) {
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const data = payload as { info: { id: string; status: string; title: string; time: MessageTime } };
  if (session.id !== data.info.id) {
    return;
  }
  chatState.setSession({ ...session, status: data.info.status, title: data.info.title, time: data.info.time });
}

export async function updateFromMessageUpdate(payload: unknown) {
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const data = payload as { info: MessageInfo };
  if (session.id !== data.info.sessionID) {
    return;
  }

  const existing = chatState.messages.find(x => x.info.id === data.info.id)
    ?? { info: data.info };
  chatState.updateMessage({ ...existing, ...data });
}

export async function updateFromMessagePartUpdate(payload: unknown) {
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const data = payload as { part: MessagePart };
  if (session.id !== data.part.sessionID) {
    return;
  }
  const message = chatState.messages.find(x => x.info.id === data.part.messageID);
  if (!message) {
    return;
  }
  const parts = message.parts ?? [];
  const existingIndex = parts.findIndex(x => x.id === data.part.id);
  const updatedParts = existingIndex !== -1
    ? parts.map((p, i) => i === existingIndex ? data.part : p)
    : [...parts, data.part];
  chatState.updateMessage({ ...message, parts: updatedParts });
}

export async function updateFromMessagePartDelta(payload: unknown) {
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const data = payload as { sessionID: string; messageID: string; partID: string; field: string; delta: string };
  if (session.id !== data.sessionID) {
    return;
  }
  if (data.field !== 'text') {
    return;
  }
  const message = chatState.messages.find(x => x.info.id === data.messageID);
  if (!message) {
    return;
  }
  const parts = message.parts ?? [];
  const existingIndex = parts.findIndex(x => x.id === data.partID);
  if (existingIndex === -1) {
    return;
  }
  const existingPart = parts[existingIndex] as MessagePart & { text?: string };
  const updatedPart: MessagePart & { text?: string } = { ...existingPart, text: (existingPart.text ?? '') + data.delta };
  const updatedParts = parts.map((p, i) => i === existingIndex ? updatedPart : p);
  chatState.updateMessage({ ...message, parts: updatedParts });
}
