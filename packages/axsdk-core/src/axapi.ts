import { ApiClient, type RequestInterceptor, type ErrorInterceptor } from './apiclient';
import { sessionsPath } from './config';

export const api = new ApiClient({
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

export function init(ri: RequestInterceptor, ei?: ErrorInterceptor) {
  api.addRequestInterceptor(ri);
  if (ei) {
    api.addErrorInterceptor(ei);
  }
}

export async function getAppInfo() {
  return api.get('') as Promise<{ app?: { translations?: Record<string, Record<string, string>> }; version?: number }>;
}

export interface CreateSessionOptions {
  message?: string;
  sessionId?: string;
  defaultAgent?: string;
  systemPrompt?: string;
}

export async function createSession(opts: CreateSessionOptions = {}) {
  return api.post(sessionsPath(), opts);
}

export async function getMessages() {
  return api.get(`${sessionsPath()}/messages`);
}

export async function postMessage(text: string, images: string[]) {
  return api.post(`${sessionsPath()}/message`, {
    text, images,
  });
}

export async function cancelSession(sessionID: string) {
  return api.get(`${sessionsPath()}/${sessionID}/cancel`);
}

export async function getPendingCalls() {
  return api.get('/calls/pendings');
}

export async function updateCall(callID: string, status: string, result: string) {
  return api.put(`/calls/${callID}`, {
    status, result,
  });
}

export async function postAnswers(requestID: string, status: string, answers: string[]) {
  return api.post(`/questions/${requestID}/${status}`, {
    answers,
  });
}

export async function getKnowledge(options?: { group?: string; page?: number; limit?: number }) {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  return api.get('/knowledge', { params: { group: options?.group ?? '', page, limit } });
}

export async function getKnowledgeGroups() {
  return api.get('/knowledge/groups') as Promise<{ groups: { group: string; count: number }[] }>;
}

export async function searchKnowledge(options: { group?: string; regex: string; cursor?: string; limit?: number }) {
  const limit = options.limit ?? 20
  return api.get('/knowledge/search', {
    params: {
      group: options.group ?? '',
      regex: options.regex,
      cursor: options.cursor ?? '',
      limit,
    },
  });
}
