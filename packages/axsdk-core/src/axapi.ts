import { ApiClient, type RequestInterceptor } from './apiclient';

export const api = new ApiClient({
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

export function init(ri: RequestInterceptor) {
  api.addRequestInterceptor(ri);
}

export async function health() {
  return api.get('');
}

export async function createSession() {
  return api.post('/sessions');
}

export async function getMessages() {
  return api.get('/sessions/messages');
}

export async function postMessage(text: string, images: string[]) {
  return api.post('/sessions/message', {
    text, images,
  });
}

export async function cancelSession(sessionID: string) {
  return api.get(`/sessions/${sessionID}/cancel`);
}

export async function getPendingCalls() {
  return api.get('/calls/pendings');
}

export async function updateCall(callID: string, status: string, result: string) {
  return api.put(`/calls/${callID}`, {
    status, result,
  });
}
