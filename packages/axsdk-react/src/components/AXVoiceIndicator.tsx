'use client';

import { useEffect, useRef, useState } from 'react';
import { AXSDK } from '@axsdk/core';
import type { VoiceState } from '@axsdk/voice';
import { useVoiceState, useVoiceUnlockNeeded } from '../voice';
import { useAXShadowRoot } from '../AXShadowRootContext';

export interface AXVoiceIndicatorProps {
  /** Match AXButton size so the badge anchors to the orb. */
  orbSize?: number | string;
  /** Enable verbose console logs for state transitions. */
  debug?: boolean;
}

type PermState = 'unknown' | 'prompt' | 'granted' | 'denied';

const KEYFRAMES_ID = 'axvoice-keyframes';

const STYLE_TEXT = `
@keyframes axv-spin { to { transform: rotate(360deg); } }
@keyframes axv-breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}
@keyframes axv-bar1 { 0%,100% { height: 22%; } 50% { height: 90%; } }
@keyframes axv-bar2 { 0%,100% { height: 90%; } 50% { height: 30%; } }
@keyframes axv-bar3 { 0%,100% { height: 50%; } 50% { height: 80%; } }
@keyframes axv-ripple {
  0% { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(2.0); opacity: 0; }
}
@keyframes axv-error-blink {
  0%, 100% { opacity: 1; }
  35% { opacity: 0.45; }
}
@keyframes axv-tooltip-in {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes axv-unlock-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.7), 0 4px 12px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.85); }
  50%      { box-shadow: 0 0 0 14px rgba(99,102,241,0), 0 4px 12px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.85); }
}
`;

function ensureStyles(root: ShadowRoot | null): void {
  if (typeof document === 'undefined') return;
  const target: Document | ShadowRoot = root ?? document;
  const existing =
    'getElementById' in target
      ? (target as Document).getElementById?.(KEYFRAMES_ID)
      : (root && root.querySelector(`#${KEYFRAMES_ID}`)) ?? null;
  if (existing) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = STYLE_TEXT;
  if (root) root.appendChild(style);
  else document.head.appendChild(style);
}

function MicIcon({ slashed = false, muted = false }: { slashed?: boolean; muted?: boolean }) {
  return (
    <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={muted ? 0.85 : 1}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      {slashed && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.4" />}
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M16 8.5a4 4 0 0 1 0 7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="55%" height="55%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Bars() {
  const barStyle: React.CSSProperties = {
    width: '14%',
    background: 'currentColor',
    borderRadius: 2,
  };
  return (
    <div
      style={{
        width: '60%',
        height: '60%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ ...barStyle, animation: 'axv-bar1 0.7s ease-in-out infinite' }} />
      <div style={{ ...barStyle, animation: 'axv-bar2 0.7s ease-in-out infinite' }} />
      <div style={{ ...barStyle, animation: 'axv-bar3 0.7s ease-in-out infinite' }} />
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: '55%',
        height: '55%',
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
        animation: 'axv-spin 0.9s linear infinite',
      }}
    />
  );
}

interface Visual {
  icon: React.ReactNode;
  bg: string;
  color: string;
  outerEffect?: React.ReactNode;
  innerAnimation?: string;
}

function getVisual(state: VoiceState, perm: PermState, needsUnlock: boolean): Visual {
  if (needsUnlock) {
    return {
      icon: <PlayIcon />,
      bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
      innerAnimation: 'axv-unlock-pulse 1.6s ease-in-out infinite',
    };
  }
  if (state === 'idle') {
    return {
      icon: <MicIcon muted />,
      bg: 'rgba(30,30,40,0.55)',
      color: 'rgba(255,255,255,0.85)',
    };
  }
  if (state === 'connecting') {
    return {
      icon: perm === 'prompt' ? <MicIcon /> : <Spinner />,
      bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
    };
  }
  if (state === 'listening') {
    return {
      icon: <MicIcon />,
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#fff',
      innerAnimation: 'axv-breathe 2.4s ease-in-out infinite',
    };
  }
  if (state === 'capturing') {
    return {
      icon: <Bars />,
      bg: 'linear-gradient(135deg, #ef4444, #f97316)',
      color: '#fff',
    };
  }
  if (state === 'speaking') {
    return {
      icon: <SpeakerIcon />,
      bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
      color: '#fff',
      outerEffect: (
        <>
          <div style={ringStyle(0)} />
          <div style={ringStyle(0.6)} />
        </>
      ),
    };
  }
  // error
  return {
    icon: <MicIcon slashed />,
    bg: 'linear-gradient(135deg, #b91c1c, #7f1d1d)',
    color: '#fff',
    innerAnimation: 'axv-error-blink 1.6s ease-in-out 1',
  };
}

function ringStyle(delay: number): React.CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(6,182,212,0.6)',
    animation: 'axv-ripple 1.6s ease-out infinite',
    animationDelay: `${delay}s`,
    pointerEvents: 'none',
  };
}

function tooltipText(
  state: VoiceState,
  perm: PermState,
  errorMsg: string | null,
  needsUnlock: boolean,
): string {
  if (needsUnlock) return AXSDK.t('voiceUnlockPrompt');
  if (state === 'error') {
    if (errorMsg && /permission|denied|notallowed/i.test(errorMsg)) {
      return AXSDK.t('voicePermissionDenied');
    }
    return errorMsg || AXSDK.t('voiceError');
  }
  if (state === 'idle') return AXSDK.t('voiceIdle');
  if (state === 'connecting') {
    return perm === 'prompt'
      ? AXSDK.t('voicePermissionWaiting')
      : AXSDK.t('voiceConnecting');
  }
  if (state === 'listening') return AXSDK.t('voiceListening');
  if (state === 'capturing') return AXSDK.t('voiceCapturing');
  if (state === 'speaking') return AXSDK.t('voiceSpeaking');
  return '';
}

function shouldAutoShowTooltip(state: VoiceState, perm: PermState, needsUnlock: boolean): boolean {
  if (needsUnlock) return true;
  if (state === 'error') return true;
  if (state === 'connecting' && perm === 'prompt') return true;
  return false;
}

export function AXVoiceIndicator({ orbSize = '12vh', debug = false }: AXVoiceIndicatorProps) {
  const shadowRoot = useAXShadowRoot();
  const state = useVoiceState();
  const [perm, setPerm] = useState<PermState>('unknown');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const needsUnlock = useVoiceUnlockNeeded();
  const prevStateRef = useRef<VoiceState>('idle');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureStyles(shadowRoot);
  }, [shadowRoot]);

  // Indicator runs with pointer-events: none so clicks fall through to the
  // AXButton orb. That also blocks mouseenter on the indicator itself, so we
  // attach hover listeners to the parent (AXButton's overlay wrapper) which
  // does receive pointer events.
  useEffect(() => {
    const el = rootRef.current;
    const parent = el?.parentElement;
    if (!parent) return;
    const enter = () => setHover(true);
    const leave = () => setHover(false);
    parent.addEventListener('mouseenter', enter);
    parent.addEventListener('mouseleave', leave);
    return () => {
      parent.removeEventListener('mouseenter', enter);
      parent.removeEventListener('mouseleave', leave);
    };
  }, []);

  useEffect(() => {
    if (debug && prevStateRef.current !== state) {
      console.log('[AXVoiceIndicator] state →', state, 'perm:', perm, 'needsUnlock:', needsUnlock);
    }
    prevStateRef.current = state;
  }, [state, perm, needsUnlock, debug]);

  useEffect(() => {
    let cancelled = false;
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const permsApi = nav?.permissions as
      | { query: (d: { name: PermissionName }) => Promise<PermissionStatus> }
      | undefined;
    if (!permsApi?.query) {
      if (debug) console.log('[AXVoiceIndicator] Permissions API unavailable');
      return;
    }
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (cancelled || !status) return;
      const next = status.state as PermState;
      setPerm(next);
      if (debug) console.log('[AXVoiceIndicator] permission →', next);
    };
    void permsApi
      .query({ name: 'microphone' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        setPerm(s.state as PermState);
        if (debug) console.log('[AXVoiceIndicator] initial permission:', s.state);
        s.addEventListener?.('change', onChange);
      })
      .catch((err) => {
        if (debug) console.log('[AXVoiceIndicator] permission query failed:', err);
      });
    return () => {
      cancelled = true;
      status?.removeEventListener?.('change', onChange);
    };
  }, [debug]);

  useEffect(() => {
    const bus = AXSDK.eventBus();
    const onError = (p: { scope: string; message: string }) => {
      if (p.scope !== 'capture' && p.scope !== 'transport') return;
      setErrorMsg(p.message);
      if (debug) console.log('[AXVoiceIndicator] voice.error', p);
    };
    bus.on('voice.error', onError);
    return () => {
      bus.off('voice.error', onError);
    };
  }, [debug]);

  const activeError = state === 'error' ? errorMsg : null;

  const visual = getVisual(state, perm, needsUnlock);
  const orbCSS = typeof orbSize === 'number' ? `${orbSize}px` : orbSize;
  const badgeSize = needsUnlock
    ? `calc(${orbCSS} * 0.55)`
    : `calc(${orbCSS} * 0.45)`;
  const tooltip = tooltipText(state, perm, activeError, needsUnlock);
  const showTooltip = hover || shouldAutoShowTooltip(state, perm, needsUnlock);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        width: badgeSize,
        height: badgeSize,
        pointerEvents: 'none',
      }}
      aria-label={tooltip}
      role="status"
    >
      {visual.outerEffect}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: visual.bg,
          color: visual.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.85)',
          animation: visual.innerAnimation,
        }}
      >
        {visual.icon}
      </div>

      {showTooltip && tooltip && (
        <div
          style={{
            position: 'absolute',
            right: `calc(100% + 10px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--ax-bg-popover, rgba(20, 20, 30, 0.92))',
            color: 'var(--ax-text-primary, #fff)',
            border: '1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: '0.75em',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
            animation: 'axv-tooltip-in 0.18s ease-out',
            pointerEvents: 'none',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
