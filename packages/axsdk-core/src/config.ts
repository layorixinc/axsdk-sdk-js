export type ApiVersion = 'v1' | 'v2';

export const Config = {
  baseURL: 'https://api.axsdk.ai',
  basePath: '/axsdk',
  apiVersion: 'v1' as ApiVersion,
};

export function sessionsPath(): string {
  return Config.apiVersion === 'v2' ? '/v2/sessions' : '/sessions';
}
