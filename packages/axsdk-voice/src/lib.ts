export { VoicePlugin, voicePlugin, VOICE_PLUGIN_VERSION, deriveVoiceState } from './plugin';
export type {
  VoicePluginConfig,
  VoiceMode,
  VoiceSource,
  VoiceState,
  SttState,
  TtsState,
  VoiceEventMap,
} from './plugin';

export type { VadConfig } from './vad';
export { DEFAULT_VAD_CONFIG } from './vad';

export { OpenAIRealtimeTransport } from './transport';
export type {
  VoiceTransport,
  VoiceTransportEvents,
  VoiceTransportContext,
  OpenAIRealtimeTransportConfig,
} from './transport';

export { primeMicrophonePermission } from './capture';
