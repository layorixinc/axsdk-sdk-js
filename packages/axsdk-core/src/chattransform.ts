import type { ChatMessage, ChatMessagePayload, MessagePart, MessageTime, MessageInfo, MessageError } from './types/chat';
import { errorStore, chatStore, type ApiError } from './store';

export function setError(id: string, error: MessageError) {
  errorStore.getState().removeError(id)
  errorStore.getState().addError({
    id: id,
    timestamp: Date.now(),
    url: `axsdk://${id}`,
    method: 'message',
    status: error.data?.statusCode,
    statusText: error?.name ?? '',
    message: error.data?.message ?? '',
    requestBody: undefined,
    responseBody: error.data?.responseBody
  } as ApiError)
}

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
    const prevMessage = messages.find(x => x.info?.id == item.info.id);
    const prevParts: MessagePart[] = prevMessage?.parts ?? [];
    for (const part of item.parts) {
      const prevPart = prevParts.find(x => x.id == part.id) as (MessagePart & { text?: string }) | undefined;
      let partText = (part as (MessagePart & { text?: string })).text ?? ''
      if (prevPart) {
        const prevPartText = (prevPart as (MessagePart & { text?: string })).text ?? ''
        if(prevPartText.length > partText.length) {
          (part as (MessagePart & { text?: string })).text = prevPartText;
        }
      }
    }
    item.parts = item.parts.sort((a, b) => a.id.localeCompare(b.id));
    const timestamp = item.info.time.completed ? new Date(item.info.time.completed) : new Date(item.info.time.created);
    const updatedMessage = { ...item, timestamp };
    chatState.updateMessage(updatedMessage);

    if(item.info?.error) {
      setError(item.info.id, item.info.error as unknown as MessageError)
    }
  }
}

export async function updateFromSessionStatus(payload: unknown) {
  const chatState = chatStore.getState();
  const session = chatState.session;
  if (!session) {
    return;
  }
  const data = payload as { status: { type: string, message: string }; sessionID: string };
  if (session.id !== data.sessionID) {
    return;
  }
  const status = data.status.type;
  chatState.setSession({ ...session, status });

  const GOOD_STATUS = ['', 'idle', 'busy']
  if(!GOOD_STATUS.includes(data.status.type)) {
    const id = data.sessionID
    errorStore.getState().removeError(id)
    errorStore.getState().addError({
      id: id,
      timestamp: Date.now(),
      url: `axsdk://${id}`,
      method: 'session',
      status: 500,
      statusText: data.status.type ?? '',
      message: data.status.message ?? '',
      requestBody: undefined,
      responseBody: data.status.message
    } as ApiError)
  }
  return status;
}

export async function updateFromSessionError(payload: unknown) {
  const data = payload as {
    sessionID?: string;
    code?: string;
    message?: string;
    name?: string;
    statusCode?: number;
    responseBody?: unknown;
  };
  const id = data.sessionID ?? `session-error-${Date.now()}`;
  errorStore.getState().removeError(id);
  errorStore.getState().addError({
    id,
    timestamp: Date.now(),
    url: `axsdk://${id}`,
    method: 'session',
    status: data.statusCode ?? 500,
    statusText: data.code ?? data.name ?? 'session.error',
    message: data.message ?? '',
    requestBody: undefined,
    responseBody: data.responseBody ?? data.message,
  } as ApiError);
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

  if(data.info?.error) {
    setError(data.info.id, data.info.error as unknown as MessageError)
  }
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
