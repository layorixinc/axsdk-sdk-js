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

/**
 * Resolve voice config from AXSDK.init({ voice }) when no explicit override is
 * passed. Returning `null` means voice is disabled.
 */
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

// Module-level handle to the active VoicePlugin. useVoicePlugin sets this
// when the instance is ready; getVoicePlugin reads it. We can't rely on
// AXSDK.plugin('@axsdk/voice') because the React path attaches the plugin
// directly (without the SDK plugin-registry install flow).
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

        // Server-provided voiceConfig may arrive after the plugin is
        // constructed (during AXSDK.init's getAppInfo). Apply via update()
        // when it shows up. If it had already arrived before this effect,
        // resolveVoiceConfig above would have read the merged values from
        // AXSDK.config.voice already.
        const onRemote = (p: { voice: Partial<VoicePluginConfig> }) => {
          if (!instance) return;
          if (resolved.debug) console.log('[useVoicePlugin] applying remote voiceConfig', p.voice);
          instance.update(p.voice);
        };
        AXSDK.eventBus().on('voice.config.remote', onRemote);
        // Fold the cleanup into the cancelled flag path below.
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
    // Deps: structural primitives only. Nested objects like `vad` / `ttsVoice`
    // / `workletUrl` are not tracked here — changing them after mount won't
    // restart the plugin. Detach + remount the component if you need those
    // to re-apply, or call plugin.update() for stt/tts toggles (which are
    // still tracked here as the common case).
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

/**
 * Returns true while the browser's autoplay policy is blocking TTS playback
 * and the next user gesture must call `unlockAudio()`. Driven by
 * `voice.tts.gesture_required` (sets) / `voice.tts.playback.started` (clears).
 */
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

/** Look up the active VoicePlugin. Prefers the module-level handle set by
 * `useVoicePlugin`; falls back to the SDK plugin registry for hosts that
 * install voice via `AXSDK.use(voicePlugin())`. */
export function getVoicePlugin(): VoicePluginType | null {
  if (_activePlugin) return _activePlugin;
  type WithPlugin = { plugin?: (name: string) => unknown };
  const fn = (AXSDK as unknown as WithPlugin).plugin;
  if (typeof fn !== 'function') return null;
  const p = fn.call(AXSDK, '@axsdk/voice');
  return (p as VoicePluginType | null) ?? null;
}
