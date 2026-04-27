'use client';

import { useEffect, useRef, useState } from 'react';
import { AXSDK } from '@axsdk/core';
import type { SttState } from '@axsdk/voice';
import { useSttState, useVoiceUnlockNeeded } from '../voice';
import { useAXShadowRoot } from '../AXShadowRootContext';

export interface AXVoiceIndicatorProps {
  orbSize?: number | string;
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
  source: 'stt' | 'unlock' | 'error' | 'idle';
}

function getVisual(stt: SttState, perm: PermState, needsUnlock: boolean): Visual {
  if (needsUnlock) {
    return {
      icon: <PlayIcon />,
      bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
      innerAnimation: 'axv-unlock-pulse 1.6s ease-in-out infinite',
      source: 'unlock',
    };
  }
  if (stt === 'error') {
    return {
      icon: <MicIcon slashed />,
      bg: 'linear-gradient(135deg, #b91c1c, #7f1d1d)',
      color: '#fff',
      innerAnimation: 'axv-error-blink 1.6s ease-in-out 1',
      source: 'error',
    };
  }
  if (stt === 'capturing') {
    return {
      icon: <Bars />,
      bg: 'linear-gradient(135deg, #ef4444, #f97316)',
      color: '#fff',
      source: 'stt',
    };
  }
  if (stt === 'listening') {
    return {
      icon: <MicIcon />,
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#fff',
      innerAnimation: 'axv-breathe 2.4s ease-in-out infinite',
      source: 'stt',
    };
  }
  if (stt === 'connecting') {
    return {
      icon: perm === 'prompt' ? <MicIcon /> : <Spinner />,
      bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
      source: 'stt',
    };
  }
  return {
    icon: <MicIcon muted />,
    bg: 'rgba(30,30,40,0.55)',
    color: 'rgba(255,255,255,0.85)',
    source: 'idle',
  };
}

function tooltipText(
  stt: SttState,
  perm: PermState,
  errorMsg: string | null,
  errorCode: string | null,
  needsUnlock: boolean,
): string {
  if (needsUnlock) return AXSDK.t('voiceUnlockPrompt');
  if (stt === 'error') {
    if (errorCode === 'ios-third-party-browser') return AXSDK.t('voiceMicIosThirdParty');
    if (errorCode === 'insecure-context') return AXSDK.t('voiceMicInsecure');
    if (errorCode === 'no-media-devices') return AXSDK.t('voiceMicUnavailable');
    if (errorCode === 'permission-denied') return AXSDK.t('voicePermissionDenied');
    if (errorMsg && /permission|denied|notallowed/i.test(errorMsg)) {
      return AXSDK.t('voicePermissionDenied');
    }
    return errorMsg || AXSDK.t('voiceError');
  }
  if (stt === 'connecting' && perm === 'prompt') return AXSDK.t('voicePermissionWaiting');
  return '';
}

function openInSafari(): void {
  try {
    const stripped = window.location.href.replace(/^https?:\/\//, '');
    window.location.href = `x-safari-https://${stripped}`;
  } catch {}
}

const PERSISTENT_ENV_CODES = new Set([
  'insecure-context',
  'ios-third-party-browser',
  'no-media-devices',
]);

function isSuppressedCode(code: string | null): boolean {
  if (!code || !PERSISTENT_ENV_CODES.has(code)) return false;
  try {
    return sessionStorage.getItem(`ax-tooltip-shown:${code}`) === '1';
  } catch {
    return false;
  }
}

function markShown(code: string): void {
  if (!PERSISTENT_ENV_CODES.has(code)) return;
  try {
    sessionStorage.setItem(`ax-tooltip-shown:${code}`, '1');
  } catch {}
}

type AutoShowKind =
  | { kind: 'none' }
  | { kind: 'persistent'; key: string }
  | { kind: 'timed'; key: string; baseDuration: number };

function computeAutoShow(
  stt: SttState,
  perm: PermState,
  needsUnlock: boolean,
  errorCode: string | null,
  hasError: boolean,
): AutoShowKind {
  if (needsUnlock) return { kind: 'persistent', key: 'unlock' };
  if (hasError) {
    const code = errorCode || 'generic';
    if (isSuppressedCode(code)) return { kind: 'none' };
    const isPermDenied = code === 'permission-denied';
    return { kind: 'timed', key: `err:${code}`, baseDuration: isPermDenied ? 8000 : 6000 };
  }
  if (stt === 'connecting' && perm === 'prompt') return { kind: 'persistent', key: 'perm-wait' };
  if (stt === 'connecting') return { kind: 'persistent', key: 'stt-connecting' };
  return { kind: 'none' };
}

export function AXVoiceIndicator({ orbSize = '12vh', debug = false }: AXVoiceIndicatorProps) {
  const shadowRoot = useAXShadowRoot();
  const stt = useSttState();
  const [perm, setPerm] = useState<PermState>('unknown');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const [tooltipForceShow, setTooltipForceShow] = useState(false);
  const needsUnlock = useVoiceUnlockNeeded();
  const prevSttRef = useRef<SttState>('idle');
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const hoverLeaveTimerRef = useRef<number | null>(null);
  const lastAutoKeyRef = useRef<string | null>(null);
  const seenCountRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    ensureStyles(shadowRoot);
  }, [shadowRoot]);

  // pointer-events:none on the indicator blocks its own mouseenter — listen on the parent instead.
  useEffect(() => {
    const el = rootRef.current;
    const parent = el?.parentElement;
    if (!parent) return;
    const enter = () => {
      if (hoverLeaveTimerRef.current !== null) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      setHover(true);
    };
    const leave = () => {
      if (hoverLeaveTimerRef.current !== null) clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = window.setTimeout(() => {
        setHover(false);
        hoverLeaveTimerRef.current = null;
      }, 200);
    };
    parent.addEventListener('mouseenter', enter);
    parent.addEventListener('mouseleave', leave);
    return () => {
      parent.removeEventListener('mouseenter', enter);
      parent.removeEventListener('mouseleave', leave);
      if (hoverLeaveTimerRef.current !== null) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
    };
  }, []);

  const hasError = stt === 'error';

  useEffect(() => {
    const result = computeAutoShow(stt, perm, needsUnlock, errorCode, hasError);
    const newKey = result.kind === 'none' ? null : result.key;
    if (newKey === lastAutoKeyRef.current) return;
    lastAutoKeyRef.current = newKey;

    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (result.kind === 'none') {
      setTooltipForceShow(false);
      return;
    }
    if (result.kind === 'persistent') {
      setTooltipForceShow(true);
      return;
    }
    const count = (seenCountRef.current.get(result.key) ?? 0) + 1;
    seenCountRef.current.set(result.key, count);
    const duration = count === 1 ? result.baseDuration : 2500;
    const code = result.key.startsWith('err:') ? result.key.slice(4) : null;
    setTooltipForceShow(true);
    hideTimerRef.current = window.setTimeout(() => {
      setTooltipForceShow(false);
      hideTimerRef.current = null;
      // Allow re-trigger if the same error key fires again later.
      lastAutoKeyRef.current = null;
      if (code) markShown(code);
    }, duration);
  }, [stt, perm, needsUnlock, errorCode, hasError]);

  useEffect(() => {
    const bus = AXSDK.eventBus();
    const onIntent = () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setTooltipForceShow(true);
      hideTimerRef.current = window.setTimeout(() => {
        setTooltipForceShow(false);
        hideTimerRef.current = null;
      }, 4000);
    };
    bus.on('voice.user-intent', onIntent);
    return () => {
      bus.off('voice.user-intent', onIntent);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!debug) return;
    if (prevSttRef.current !== stt) {
      console.log('[AXVoiceIndicator] stt →', stt, 'perm:', perm, 'needsUnlock:', needsUnlock);
      prevSttRef.current = stt;
    }
  }, [stt, perm, needsUnlock, debug]);

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
    const onError = (p: { scope: string; message: string; code?: string }) => {
      if (p.scope !== 'capture') return;
      setErrorMsg(p.message);
      setErrorCode(p.code ?? null);
      if (debug) console.log('[AXVoiceIndicator] voice.error', p);
    };
    bus.on('voice.error', onError);
    return () => {
      bus.off('voice.error', onError);
    };
  }, [debug]);

  const activeError = hasError ? errorMsg : null;

  const visual = getVisual(stt, perm, needsUnlock);
  const orbCSS = typeof orbSize === 'number' ? `${orbSize}px` : orbSize;
  const badgeSize = needsUnlock
    ? `calc(${orbCSS} * 0.55)`
    : `calc(${orbCSS} * 0.45)`;
  const activeCode = hasError ? errorCode : null;
  const tooltip = tooltipText(stt, perm, activeError, activeCode, needsUnlock);
  const suppressed = isSuppressedCode(activeCode);
  const showTooltip = !suppressed && (hover || tooltipForceShow);

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
          className="axv-tooltip"
          onClick={
            activeCode === 'ios-third-party-browser'
              ? (e) => {
                  e.stopPropagation();
                  openInSafari();
                }
              : undefined
          }
          style={{
            position: 'absolute',
            right: `calc(100% + 10px)`,
            bottom: '50%',
            transform: 'translateY(50%) translateY(-1.5em)',
            zIndex: 10010,
            background: 'var(--ax-bg-popover, rgba(20, 20, 30, 0.92))',
            color: 'var(--ax-text-primary, #fff)',
            border: '1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))',
            borderRadius: 'var(--ax-tooltip-radius, 12px)',
            padding: 'var(--ax-tooltip-padding, 10px 14px)',
            fontSize: 'var(--ax-tooltip-font-size, 0.95em)',
            lineHeight: 1.35,
            width: 'max-content',
            minWidth: 'min(220px, 90vw)',
            maxWidth: `min(380px, calc(95vw - ${orbCSS} - 1em))`,
            whiteSpace: 'normal',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textAlign: 'left',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: 'var(--ax-tooltip-shadow, 0 4px 16px rgba(0,0,0,0.45))',
            animation: 'axv-tooltip-in 0.18s ease-out',
            cursor: activeCode === 'ios-third-party-browser' ? 'pointer' : 'default',
            pointerEvents: activeCode === 'ios-third-party-browser' ? 'auto' : 'none',
            textDecoration: activeCode === 'ios-third-party-browser' ? 'underline' : 'none',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
