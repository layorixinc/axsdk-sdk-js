export type ApiVersion = 'v1' | 'v2';

export const Config = {
  baseURL: 'https://api.axsdk.ai',
  basePath: '/axsdk',
  apiVersion: 'v1' as ApiVersion,
};

export function apiPrefix(): string {
  return Config.apiVersion === 'v2' ? '/v2' : '';
}

export function sessionsPath(): string {
  return `${apiPrefix()}/sessions`;
}

export function callsPath(): string {
  return `${apiPrefix()}/calls`;
}

export function eventPath(): string {
  return `${apiPrefix()}/event`;
}

export function questionsPath(): string {
  return `${apiPrefix()}/questions`;
}
