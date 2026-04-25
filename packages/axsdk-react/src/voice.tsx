'use client';

import { useEffect, useState } from 'react';
import { AXSDK } from '@axsdk/core';
import type {
  VadConfig,
  VoiceMode,
  VoicePlugin as VoicePluginType,
  VoicePluginConfig,
  VoiceState,
} from '@axsdk/voice';

export interface AXVoiceConfig {
  stt?: boolean;
  tts?: boolean;
  mode?: VoiceMode;
  vad?: Partial<VadConfig>;
  autoActivateWhileChatOpen?: boolean;
  primeMicOnAttach?: boolean;
  resumeOnRestore?: boolean;
  debug?: boolean;
  ttsVoice?: string;
  reconnectOnce?: boolean;
  baseUrl?: string;
  wsUrl?: string;
  ttsUrl?: string;
}

interface VoiceModule {
  VoicePlugin: new (config?: VoicePluginConfig) => VoicePluginType;
}

let _cached: Promise<VoiceModule> | null = null;
function loadVoice(): Promise<VoiceModule> {
  if (!_cached) {
    const pkg = '@axsdk/voice';
    _cached = import(/* @vite-ignore */ pkg) as unknown as Promise<VoiceModule>;
  }
  return _cached;
}

export function useVoicePlugin(config: AXVoiceConfig | null | undefined): VoicePluginType | null {
  const [plugin, setPlugin] = useState<VoicePluginType | null>(null);

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    let instance: VoicePluginType | null = null;

    void (async () => {
      try {
        const mod = await loadVoice();
        if (cancelled) return;
        instance = new mod.VoicePlugin({
          stt: config.stt,
          tts: config.tts,
          mode: config.mode,
          vad: config.vad,
          autoActivateWhileChatOpen: config.autoActivateWhileChatOpen,
          primeMicOnAttach: config.primeMicOnAttach,
          resumeOnRestore: config.resumeOnRestore,
          debug: config.debug,
          ttsVoice: config.ttsVoice,
          reconnectOnce: config.reconnectOnce,
          baseUrl: config.baseUrl,
          wsUrl: config.wsUrl,
          ttsUrl: config.ttsUrl,
        });
        instance.attach(AXSDK as never);
        if (cancelled) {
          instance.detach();
          return;
        }
        setPlugin(instance);
      } catch (err) {
        console.error('[AXUI voice] failed to load @axsdk/voice. Install it as a peer dep.', err);
      }
    })();

    return () => {
      cancelled = true;
      instance?.detach();
      setPlugin(null);
    };
    // Deps: structural primitives only. Nested objects like `vad` / `ttsVoice`
    // / `workletUrl` are not tracked here — changing them after mount won't
    // restart the plugin. Detach + remount the component if you need those
    // to re-apply, or call plugin.update() for stt/tts toggles (which are
    // still tracked here as the common case).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config?.baseUrl,
    config?.wsUrl,
    config?.ttsUrl,
    config?.stt,
    config?.tts,
    config?.mode,
    config?.autoActivateWhileChatOpen,
  ]);

  return plugin;
}

export function useVoiceState(initial: VoiceState = 'idle'): VoiceState {
  const [state, setState] = useState<VoiceState>(initial);
  useEffect(() => {
    const bus = AXSDK.eventBus();
    const handler = (p: { status: VoiceState }) => setState(p.status);
    bus.on('voice.state', handler);
    return () => {
      bus.off('voice.state', handler);
    };
  }, []);
  return state;
}
