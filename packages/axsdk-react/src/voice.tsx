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
  ttsPlaybackRate?: number;
  reconnectOnce?: boolean;
  baseUrl?: string;
  wsUrl?: string;
  ttsUrl?: string;
  workletUrl?: string;
}

export function resolveVoiceConfig(
  override: AXVoiceConfig | null | undefined,
): AXVoiceConfig | null {
  if (override) return override;
  const cfgVoice = (AXSDK.config as { voice?: AXVoiceConfig } | undefined)?.voice;
  return cfgVoice ?? null;
}

interface VoiceModule {
  VoicePlugin: new (config?: VoicePluginConfig) => VoicePluginType;
}

// React path attaches plugin directly, bypassing the SDK plugin registry.
let _activePlugin: VoicePluginType | null = null;

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
  const resolved = resolveVoiceConfig(config);

  useEffect(() => {
    if (!resolved) return;
    let cancelled = false;
    let instance: VoicePluginType | null = null;

    void (async () => {
      try {
        const mod = await loadVoice();
        if (cancelled) return;
        instance = new mod.VoicePlugin({
          stt: resolved.stt,
          tts: resolved.tts,
          mode: resolved.mode,
          vad: resolved.vad,
          autoActivateWhileChatOpen: resolved.autoActivateWhileChatOpen,
          primeMicOnAttach: resolved.primeMicOnAttach,
          resumeOnRestore: resolved.resumeOnRestore,
          debug: resolved.debug,
          ttsVoice: resolved.ttsVoice,
          ttsPlaybackRate: resolved.ttsPlaybackRate,
          reconnectOnce: resolved.reconnectOnce,
          baseUrl: resolved.baseUrl,
          wsUrl: resolved.wsUrl,
          ttsUrl: resolved.ttsUrl,
          workletUrl: resolved.workletUrl,
        });
        instance.attach(AXSDK as never);
        if (cancelled) {
          instance.detach();
          return;
        }
        _activePlugin = instance;
        setPlugin(instance);

        const onRemote = (p: { voice: Partial<VoicePluginConfig> }) => {
          if (!instance) return;
          if (resolved.debug) console.log('[useVoicePlugin] applying remote voiceConfig', p.voice);
          instance.update(p.voice);
        };
        AXSDK.eventBus().on('voice.config.remote', onRemote);
        ;(instance as unknown as { __remoteOff?: () => void }).__remoteOff = () =>
          AXSDK.eventBus().off('voice.config.remote', onRemote);
      } catch (err) {
        console.error('[AXUI voice] failed to load @axsdk/voice. Install it as a peer dep.', err);
      }
    })();

    return () => {
      cancelled = true;
      const off = (instance as unknown as { __remoteOff?: () => void } | null)?.__remoteOff;
      if (off) off();
      instance?.detach();
      if (_activePlugin === instance) _activePlugin = null;
      setPlugin(null);
    };
    // Nested objects (vad/ttsVoice/workletUrl) intentionally not tracked — host must remount or call plugin.update() to re-apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolved?.baseUrl,
    resolved?.wsUrl,
    resolved?.ttsUrl,
    resolved?.stt,
    resolved?.tts,
    resolved?.mode,
    resolved?.autoActivateWhileChatOpen,
    resolved?.workletUrl,
    resolved?.ttsPlaybackRate,
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

export function useVoiceUnlockNeeded(): boolean {
  const [needsUnlock, setNeedsUnlock] = useState(false);
  useEffect(() => {
    const bus = AXSDK.eventBus();
    const onGesture = () => setNeedsUnlock(true);
    const onPlaybackStarted = () => setNeedsUnlock(false);
    bus.on('voice.tts.gesture_required', onGesture);
    bus.on('voice.tts.playback.started', onPlaybackStarted);
    return () => {
      bus.off('voice.tts.gesture_required', onGesture);
      bus.off('voice.tts.playback.started', onPlaybackStarted);
    };
  }, []);
  return needsUnlock;
}

export function getVoicePlugin(): VoicePluginType | null {
  if (_activePlugin) return _activePlugin;
  type WithPlugin = { plugin?: (name: string) => unknown };
  const fn = (AXSDK as unknown as WithPlugin).plugin;
  if (typeof fn !== 'function') return null;
  const p = fn.call(AXSDK, '@axsdk/voice');
  return (p as VoicePluginType | null) ?? null;
}
