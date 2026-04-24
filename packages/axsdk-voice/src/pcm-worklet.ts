export const PCM_WORKLET_DEFAULT_URL = '/pcm-worklet.js';

export function resolveWorkletUrl(url?: string): string {
  return url && url.length > 0 ? url : PCM_WORKLET_DEFAULT_URL;
}
