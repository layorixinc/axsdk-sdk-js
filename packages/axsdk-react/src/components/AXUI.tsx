'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';

import { useStore } from 'zustand';

import { AXAnswerPanel } from './AXAnswerPanel';
import { AXBottomSearchBar } from './AXBottomSearchBar';
import { AXButton, type AXCornerPosition } from './AXButton';
import { AXPoweredBy } from './AXPoweredBy';
import { AXChatNotificationPopover } from './AXChatNotificationPopover';
import { AXChatLastMessage } from './AXChatLastMessage';
import { AXChatMessageInput } from './AXChatMessageInput';
import { AXDevTools } from './AXDevTools';
import { AXQuestionDialog } from './AXQuestionDialog';
import { AXSearchBar } from './AXSearchBar';
import { AXSearchOnboarding } from './AXSearchOnboarding';
import { extractMessageText, findLatestUserMessage } from './AXAnswerPanelSelectors';
import { isAXUIAnswerPanelVisible, isAXUISearchOnboardingVisible } from './AXUIFocus';
import { AXVoiceIndicator } from './AXVoiceIndicator';
import {
  resolveAXUITarget,
  resolveAXUIVariant,
  type AXUIConfig,
  type AXUITargetReference,
  type AXUITargets,
  type AXUIVariant,
} from './AXUITargets';

import { AXSDK } from '@axsdk/core';
import type { TextPart } from '@axsdk/core';

import type { AXTheme } from '../theme';
import { AXThemeProvider } from '../AXThemeContext';
import { useAXTheme } from '../AXThemeContext';
import { useAXShadowRoot } from '../AXShadowRootContext';
import { injectCSSVariables } from '../cssVariables';
import {
  useVoicePlugin,
  resolveVoiceConfig,
  useVoiceUnlockNeeded,
  useTtsPending,
  useTtsState,
  getVoicePlugin,
  type AXVoiceConfig,
} from '../voice';

export type { AXTheme };
export type { AXVoiceConfig };

export interface AXUIProps {
  children?: React.ReactNode;
  theme?: AXTheme;
  voice?: AXVoiceConfig;
  variant?: AXUIVariant;
  targets?: AXUITargets;
  ui?: AXUIConfig;
  position?: AXCornerPosition;
  defaultPosition?: AXCornerPosition;
  onPositionChange?: (position: AXCornerPosition) => void;
}

function AXMoveControls({ position, setPosition }: { position: AXCornerPosition; setPosition: (p: AXCornerPosition) => void }) {
  const { theme } = useAXTheme();
  const isTopPos = position.startsWith('top');
  const isLeftPos = position.endsWith('left');
  const vertical: 'top' | 'bottom' = isTopPos ? 'top' : 'bottom';
  const horizontal: 'left' | 'right' = isLeftPos ? 'left' : 'right';

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    [vertical]: '1em',
    [horizontal]: '1em',
    width: '12vh',
    height: '12vh',
    pointerEvents: 'none',
    zIndex: 10004,
  };

  const innerVertical: 'top' | 'bottom' = isTopPos ? 'bottom' : 'top';
  const innerHorizontal: 'left' | 'right' = isLeftPos ? 'left' : 'right';

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    const startX = e.clientX;
    const startY = e.clientY;
    const threshold = 50;
    let settled = false;
    const onMove = (ev: PointerEvent) => {
      if (settled) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < threshold && ady < threshold) return;
      settled = true;
      const dir: 'up' | 'down' | 'left' | 'right' =
        adx > ady ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      const v: 'top' | 'bottom' = dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : (isTopPos ? 'top' : 'bottom');
      const h: 'left' | 'right' = dir === 'left' ? 'left' : dir === 'right' ? 'right' : (isLeftPos ? 'left' : 'right');
      const next = `${v}-${h}` as AXCornerPosition;
      if (next !== position) setPosition(next);
      cleanup();
    };
    const onUp = () => {
      if (!settled) {
        const order: AXCornerPosition[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
        const idx = order.indexOf(position);
        const next = order[(idx + 1) % order.length] ?? 'bottom-right';
        if (next !== position) setPosition(next);
      }
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return (
    <div style={containerStyle}>
      <div
        role="button"
        aria-label="Drag to move"
        title="Drag to move"
        onPointerDown={startDrag}
        style={{
          position: 'absolute',
          [innerVertical]: -10,
          [innerHorizontal]: -10,
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.4))',
          background: 'var(--ax-bg-popover, rgba(20, 20, 30, 0.85))',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'var(--ax-text-primary, rgba(255,255,255,0.92))',
          cursor: 'grab',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          userSelect: 'none',
          transition: 'transform 0.15s ease',
          ...theme.styles?.moveHandle?.handle,
        }}
        onPointerEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)'; }}
        onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={theme.styles?.moveHandle?.icon}>
          <path d="M5 9l-3 3 3 3" />
          <path d="M9 5l3-3 3 3" />
          <path d="M15 19l-3 3-3-3" />
          <path d="M19 9l3 3-3 3" />
          <path d="M2 12h20" />
          <path d="M12 2v20" />
        </svg>
      </div>
    </div>
  );
}

function SpeechBubbleClosed({ visible, position }: { visible: boolean; position: AXCornerPosition }) {
  const isTopPos = position.startsWith('top');
  const isLeftPos = position.endsWith('left');
  const vKey = isTopPos ? 'top' : 'bottom';
  const hKey = isLeftPos ? 'left' : 'right';
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        [vKey]: "calc(12vh + 1.5em + 14px)",
        [hKey]: "1.25em",
        zIndex: 10001,
        pointerEvents: "none",
        animation: visible
          ? "axbubble-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards"
          : "axbubble-out 0.2s ease-in forwards",
        opacity: visible ? undefined : 0,
      }}
    >
      <div
        style={{
          background: "var(--ax-bg-popover)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))",
          borderRadius: 12,
          padding: "9px 16px",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            color: "var(--ax-text-primary)",
            fontSize: "0.875em",
            fontWeight: 500,
            letterSpacing: "0.01em",
            background: "var(--ax-text-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {AXSDK.t("chatAskMe")}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          [vKey]: -10,
          [hKey]: "calc(12vh / 2 - 9px)",
          width: 0,
          height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          [isTopPos ? "borderBottom" : "borderTop"]: "9px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))",
          zIndex: -1,
        }}
      />
      <div
        style={{
          position: "absolute",
          [vKey]: -8,
          [hKey]: "calc(12vh / 2 - 8px)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          [isTopPos ? "borderBottom" : "borderTop"]: "8px solid var(--ax-bg-popover)",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
        }}
      />
    </div>
  );
}

const DESKTOP_BREAKPOINT = 768;

type AXUIRegionName = 'searchBar' | 'answerPanel';

interface AXUIExternalRegionPortalProps {
  host: HTMLElement;
  region: AXUIRegionName;
  theme?: AXTheme;
  children: React.ReactNode;
}

const AX_EXTERNAL_REGION_RESET_CSS = `
.ax-portal-root[data-axsdk-region] {
  all: initial;
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  font-size: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.5;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: relative;
}
.ax-portal-root[data-axsdk-region],
.ax-portal-root[data-axsdk-region] *,
.ax-portal-root[data-axsdk-region] *::before,
.ax-portal-root[data-axsdk-region] *::after {
  box-sizing: border-box;
}
@keyframes ax-message-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes axchat-message-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ax-thinking-pulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
@keyframes axchat-thinking-bounce {
  0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-6px); }
}
@keyframes ax-tool-expand {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 300px; }
}
@keyframes ax-error-slide {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function resolveAXUIHostTarget(target: AXUITargetReference | undefined, shadowRoot: ShadowRoot | null): HTMLElement | null {
  return resolveAXUITarget(target, (id) => {
    const shadowTarget = shadowRoot?.getElementById(id);
    if (shadowTarget instanceof HTMLElement) return shadowTarget;

    return document.getElementById(id);
  });
}

function AXUIExternalRegionPortal({ host, region, theme, children }: AXUIExternalRegionPortalProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (wrapperRef.current) {
      injectCSSVariables(wrapperRef.current, theme);
    }
  }, [host, region, theme]);

  return ReactDOM.createPortal(
    <div className="ax-portal-root" data-axsdk-region={region} ref={wrapperRef}>
      <style>{AX_EXTERNAL_REGION_RESET_CSS}</style>
      {children}
    </div>,
    host,
  );
}

export function AXUI({ children, theme, voice, variant, targets, ui, position: controlledPosition, defaultPosition = 'bottom-right', onPositionChange }: AXUIProps) {
  const shadowRoot = useAXShadowRoot();
  const resolvedVariant = resolveAXUIVariant({ variant, ui });
  const searchBarTargetReference = targets?.searchBar ?? ui?.targets?.searchBar;
  const answerPanelTargetReference = targets?.answerPanel ?? ui?.targets?.answerPanel;
  useVoicePlugin(voice ?? null);
  const effectiveVoice = resolveVoiceConfig(voice);
  const voiceNeedsUnlock = useVoiceUnlockNeeded();
  const [internalPosition, setInternalPosition] = useState<AXCornerPosition>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('axsdk:position') : null;
      if (saved === 'top-left' || saved === 'top-right' || saved === 'bottom-left' || saved === 'bottom-right') return saved;
    } catch { /* ignore storage errors */ }
    const fromConfig = AXSDK.config?.defaultPosition as AXCornerPosition | undefined;
    return fromConfig ?? defaultPosition;
  });
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem('axsdk:position', internalPosition);
    } catch { /* ignore storage errors */ }
  }, [internalPosition]);
  const position = controlledPosition ?? internalPosition;
  const isTopPos = position.startsWith('top');
  const isLeftPos = position.endsWith('left');
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const [searchBarHostTarget, setSearchBarHostTarget] = useState<HTMLElement | null>(null);
  const [answerPanelHostTarget, setAnswerPanelHostTarget] = useState<HTMLElement | null>(null);
  const [dismissedNotification, setDismissedNotification] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ questionIndex: number; selectedOption: number; label: string } | null>(null);
  const [submitLog, setSubmitLog] = useState<string | null>(null);
  const [inputTopOffset, setInputTopOffset] = useState<number | null>(null);
  const [searchBarFocused, setSearchBarFocused] = useState(false);
  const [dismissedAnswerPanelMessageId, setDismissedAnswerPanelMessageId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const messageInputWrapperRef = useRef<HTMLDivElement | null>(null);

  const { isOpen, setIsOpen, chatWasEverOpened, setChatWasEverOpened, messages, questions, setQuestions, session, ttsEnabled, setTtsEnabled, searchBarInputValue, setSearchBarInputValue } = useStore(AXSDK.getChatStore());
  const [searchBarValue, setSearchBarValue] = useState(searchBarInputValue);
  const ttsPending = useTtsPending();
  const ttsState = useTtsState();
  const [ttsErrorMessage, setTtsErrorMessage] = useState<string | undefined>(undefined);
  useEffect(() => {
    const bus = AXSDK.eventBus();
    const onError = (p: { scope: string; message: string }) => {
      if (p.scope !== 'tts') return;
      setTtsErrorMessage((prev) => prev === p.message ? prev : p.message);
    };
    bus.on('voice.error', onError);
    return () => { bus.off('voice.error', onError); };
  }, []);
  const ttsControl = useMemo(() => {
    if (!effectiveVoice || effectiveVoice.tts === false) return undefined;
    return {
      enabled: ttsEnabled !== false,
      pending: ttsPending,
      state: ttsState,
      needsUnlock: voiceNeedsUnlock,
      errorMessage: ttsState === 'error' ? ttsErrorMessage : undefined,
      onToggle: () => {
        const next = ttsEnabled === false;
        if (next) {
          const plugin = getVoicePlugin();
          if (voiceNeedsUnlock) {
            if (effectiveVoice.debug) console.log('[AXUI voice] tts toggle on → unlockAudio()');
            void plugin?.unlockAudio().catch((err) => {
              if (effectiveVoice.debug) console.warn('[AXUI voice] unlockAudio() failed', err);
            });
          } else if (!hasPrimedVoiceRef.current) {
            hasPrimedVoiceRef.current = true;
            if (effectiveVoice.debug) console.log('[AXUI voice] tts toggle on → primePermissions()');
            void plugin?.primePermissions().catch((err) => {
              if (effectiveVoice.debug) console.warn('[AXUI voice] primePermissions() failed', err);
            });
          }
        }
        setTtsEnabled(next);
      },
    };
  }, [effectiveVoice, ttsEnabled, ttsPending, ttsState, ttsErrorMessage, setTtsEnabled, voiceNeedsUnlock]);
  const appInfoReady = useStore(AXSDK.getAppStore(), (s) => s.appInfoReady);
  const isBusy = session?.status === 'busy';
  const hasSession = Boolean(session);

  useEffect(() => {
    if (resolvedVariant !== 'searchBar') {
      setSearchBarHostTarget(null);
      setAnswerPanelHostTarget(null);
      return;
    }

    setSearchBarHostTarget(resolveAXUIHostTarget(searchBarTargetReference, shadowRoot));
    setAnswerPanelHostTarget(resolveAXUIHostTarget(answerPanelTargetReference, shadowRoot));
  }, [resolvedVariant, searchBarTargetReference, answerPanelTargetReference, shadowRoot]);

  useEffect(() => {
    if (resolvedVariant !== 'searchBar') {
      setSearchBarFocused(false);
    }
  }, [resolvedVariant]);

  useEffect(() => {
    setSearchBarValue(searchBarInputValue);
  }, [searchBarInputValue]);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentStatus = session?.status;
    if ((resolvedVariant === 'fab' || resolvedVariant === 'bottomSearchBar') && (prevStatusRef.current === 'idle' || !prevStatusRef.current) && currentStatus === 'busy') {
      setIsOpen(false);
    }
    prevStatusRef.current = currentStatus;
  }, [resolvedVariant, session?.status, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setChatWasEverOpened(true);
      AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.open' });
    } else {
      AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.close' });
    }
  }, [isOpen, setChatWasEverOpened]);

  const latestAssistantMessage = useMemo(() => {
    for(let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.info.role !== "assistant") {
        return undefined
      }
      if (msg.info.role === "assistant" && msg.parts && msg.parts.length > 0) {
        const text = msg.parts
          .filter((p): p is TextPart => p.type === "text")
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (text) return msg;
      }
    }
  }, [messages]);

  const assistantMessageText = latestAssistantMessage && latestAssistantMessage.parts && latestAssistantMessage.parts.length &&
    latestAssistantMessage.parts
      .filter((p): p is TextPart => p.type === "text")
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  const assistantMessage = latestAssistantMessage?.info?.id && { id: latestAssistantMessage?.info?.id, text: assistantMessageText || '' } || undefined

  const latestUserMessage = useMemo(() => findLatestUserMessage(messages), [messages]);

  const userMessageText = extractMessageText(latestUserMessage);
  const latestUserMessageId = latestUserMessage?.info?.id;
  const userMessage = latestUserMessageId && { id: latestUserMessageId, text: userMessageText || '' } || undefined;

  const notifVisible = (!!assistantMessageText || !!userMessageText) && !dismissedNotification

  useEffect(() => {
    const wrapper = messageInputWrapperRef.current;
    if (!wrapper || !isOpen) return;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      setInputTopOffset(isTopPos ? rect.bottom + 8 : window.innerHeight - rect.top + 8);
    };

    const timerId = setTimeout(() => {
      measure();
      setScrollTrigger(n => n + 1);
      setFocusTrigger(n => n + 1);
    }, 320);

    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(timerId);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, isTopPos]);

  useEffect(() => {
    if (!isOpen) return;
    const timerId = setTimeout(() => {
      const wrapper = messageInputWrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setInputTopOffset(isTopPos ? rect.bottom + 8 : window.innerHeight - rect.top + 8);
      setScrollTrigger(n => n + 1);
      setFocusTrigger(n => n + 1);
    }, 320);
    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = shadowRoot ?? document;
    const styleId = "axbubble-keyframes";
    if (!container.getElementById?.(styleId) && !(shadowRoot && shadowRoot.querySelector(`#${styleId}`))) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes axbubble-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes axbubble-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-6px) scale(0.95); }
        }
      `;
      if (shadowRoot) {
        shadowRoot.appendChild(style);
      } else {
        document.head.appendChild(style);
      }
    }

    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.zIndex = "9999";
    el.style.width = "0px";
    el.style.height = "0px";
    if (shadowRoot) {
      shadowRoot.appendChild(el);
    } else {
      el.classList.add('ax-portal-root');
      document.body.appendChild(el);
    }
    setPortalTarget(el);

    return () => {
      el.remove();
    };
  }, [shadowRoot]);

  useEffect(() => {
    if (portalTarget) {
      injectCSSVariables(portalTarget, theme);
    }
  }, [portalTarget, theme]);

  const hasPrimedVoiceRef = useRef(false);
  // A restored session already had permissions granted — skip prime to avoid disturbing in-flight TTS.
  useEffect(() => {
    if (!effectiveVoice) return;
    const bus = AXSDK.eventBus();
    const onRestored = () => { hasPrimedVoiceRef.current = true; };
    bus.on('voice.session.restored', onRestored);
    return () => { bus.off('voice.session.restored', onRestored); };
  }, [effectiveVoice]);
  const openChatFromUserIntent = () => {
    if (!appInfoReady) return;
    // Unlock-only branch: don't also toggle chat — the same tap would close it as a side effect.
    if (effectiveVoice && voiceNeedsUnlock) {
      const plugin = getVoicePlugin();
      if (effectiveVoice.debug) console.log('[AXUI voice] chat open → unlockAudio()');
      void plugin?.unlockAudio().catch((err) => {
        if (effectiveVoice.debug) console.warn('[AXUI voice] unlockAudio() failed', err);
      });
      return;
    }
    if (effectiveVoice) {
      AXSDK.eventBus().emit('voice.user-intent', undefined);
    }
    if (effectiveVoice && !hasPrimedVoiceRef.current) {
      hasPrimedVoiceRef.current = true;
      const plugin = getVoicePlugin();
      if (effectiveVoice.debug) console.log('[AXUI voice] first chat open → primePermissions()');
      void plugin?.primePermissions().catch((err) => {
        if (effectiveVoice.debug) console.warn('[AXUI voice] primePermissions() failed', err);
      });
    }
    setIsOpen(true);
  };

  const handleClick = () => {
    if (!appInfoReady) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    openChatFromUserIntent();
  };

  function handleBottomSearchBarOpenChange(open: boolean) {
    if (open) {
      openChatFromUserIntent();
      return;
    }
    setIsOpen(false);
  }

  const handleSend = (text: string) => {
    AXSDK.getErrorStore().getState().clearErrors();
    AXSDK.sendMessage(text);
  }
  const handleSearchBarSend = (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    setSearchBarValue(trimmedText);
    setSearchBarInputValue(trimmedText);
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
    handleSend(trimmedText);
  }
  function handleBottomSearchBarSend(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    setSearchBarValue(trimmedText);
    setSearchBarInputValue(trimmedText);
    handleSend(trimmedText);
  }
  function handleClear() {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
  }
  function handleBottomSearchBarClear() {
    setSearchBarValue('');
    setSearchBarInputValue('');
    handleClear();
  }

  function handleSearchBarFocusChange(focused: boolean) {
    if (focused) setSearchBarFocused(true);
  }

  function handleSearchPanelBlur(event: React.FocusEvent<HTMLElement>) {
    const nextFocusTarget = event.relatedTarget;
    if (nextFocusTarget instanceof Node && event.currentTarget.contains(nextFocusTarget)) return;
    setSearchBarFocused(false);
  }

  if (!portalTarget) return null;

  if (resolvedVariant === 'searchBar') {
    const answerPanelDismissed = !!latestUserMessageId && dismissedAnswerPanelMessageId === latestUserMessageId;
    const answerPanelVisible = isAXUIAnswerPanelVisible(session, messages) && !answerPanelDismissed;
    const searchOnboardingVisible = isAXUISearchOnboardingVisible(searchBarFocused);
    const searchBarCard = (
      <section
        aria-label="AXSDK search"
        onFocus={() => setSearchBarFocused(true)}
        onBlur={handleSearchPanelBlur}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid var(--ax-border-surface, rgba(255,255,255,0.2))',
          borderRadius: '1.25em',
          background: 'var(--ax-bg-popover)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(120,80,255,0.12)',
          color: 'var(--ax-text-primary)',
          pointerEvents: 'auto',
          overflow: 'hidden',
          ...theme?.styles?.input?.card,
        }}
      >
        <AXSearchBar
          placeholder={AXSDK.t("chatInput")}
          buttonLabel={AXSDK.t("chatSearchSubmit")}
          onSearch={handleSearchBarSend}
          value={searchBarValue}
          onValueChange={setSearchBarValue}
          clearOnSubmit={false}
          disabled={!appInfoReady || isBusy}
          onFocusChange={handleSearchBarFocusChange}
          surface="embedded"
        />
        {searchOnboardingVisible && (
          <>
            <div
              aria-hidden="true"
              style={{
                height: 0,
                borderTop: '1px solid var(--ax-border-surface, rgba(255,255,255,0.12))',
              }}
            />
            <AXSearchOnboarding
              onboardingText={AXSDK.t("chatOnboarding")}
              latestUserText={userMessageText || undefined}
              onTextSelect={handleSearchBarSend}
              layout="rows"
            />
          </>
        )}
      </section>
    );

    const answerPanelRegion = (
      <AXAnswerPanel
        messages={messages}
        isBusy={isBusy}
        emptyText={AXSDK.t("chatEmpty")}
        busyText={AXSDK.t("chatBusyGuide")}
        headerText={userMessageText || undefined}
        onClose={latestUserMessageId ? () => setDismissedAnswerPanelMessageId(latestUserMessageId) : undefined}
      />
    );

    const searchBarAttribution = (
      <AXPoweredBy
        style={{
          marginTop: '0.35em',
          color: 'var(--ax-text-muted, rgba(255,255,255,0.66))',
        }}
      />
    );

    const searchBarRegion = (
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        {searchBarCard}
        {searchBarAttribution}
      </div>
    );

    const searchBarPortal = searchBarHostTarget
      ? <AXUIExternalRegionPortal host={searchBarHostTarget} region="searchBar" theme={theme}>{searchBarRegion}</AXUIExternalRegionPortal>
      : null;
    const answerPanelPortal = answerPanelVisible && answerPanelHostTarget
      ? <AXUIExternalRegionPortal host={answerPanelHostTarget} region="answerPanel" theme={theme}>{answerPanelRegion}</AXUIExternalRegionPortal>
      : null;

    const content = <AXThemeProvider theme={theme}>
      <div>
        {children}
        <AXDevTools debug={AXSDK.config?.debug} messages={messages} />
        <div
          style={{
            position: 'fixed',
            top: '1.25em',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(680px, 90vw)',
            zIndex: 10001,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5em',
          }}
        >
          {!searchBarHostTarget && searchBarCard}
          {answerPanelVisible && !answerPanelHostTarget && (
            <div
              style={{
                width: 'min(720px, 92vw)',
                height: 'min(52vh, 520px)',
                pointerEvents: 'none',
              }}
            >
              {answerPanelRegion}
            </div>
          )}
          {!searchBarHostTarget && searchBarAttribution}
        </div>
        {answerPanelPortal}
        {searchBarPortal}
        {questions && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, width: '100%', maxWidth: '420px' }}>
            {AXSDK.config?.debug && lastAnswer && (
              <div style={{ marginBottom: '0.5em', padding: '0.4em 0.8em', background: 'color-mix(in srgb, var(--ax-color-primary, #7c3aed) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--ax-color-primary, #7c3aed) 40%, transparent)', borderRadius: '999px', color: '#c4b5fd', fontSize: '0.75em', display: 'inline-block' }}>
                Selected: <strong>{lastAnswer.label}</strong>
              </div>
            )}
            {AXSDK.config?.debug && submitLog && (
              <div style={{ marginBottom: '0.5em', padding: '0.5em 0.75em', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.7em', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {submitLog}
              </div>
            )}
            <AXQuestionDialog
              data={questions}
              onAnswer={(qi, si, label) => setLastAnswer({ questionIndex: qi, selectedOption: si, label })}
              onSubmit={(answers) => {
                setSubmitLog(JSON.stringify(answers, null, 2));
                AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.reply', data: { request: questions, status: 'reply', answers: answers.map(x => [x.customAnswer || x.label]) } });
                setQuestions(null);
              }}
              onDecline={() => {
                AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.reply', data: { request: questions, status: 'reject' } });
                setQuestions(null);
              }}
              visible={true}
            />
          </div>
        )}
      </div>
    </AXThemeProvider>;

    return ReactDOM.createPortal(content, portalTarget);
  }

  if (resolvedVariant === 'bottomSearchBar') {
    const content = <AXThemeProvider theme={theme}>
      <div>
        {children}
        <AXDevTools debug={AXSDK.config?.debug} messages={messages} />
        <AXBottomSearchBar
          open={isOpen}
          onOpenChange={handleBottomSearchBarOpenChange}
          messages={messages}
          isDesktop={isDesktop}
          isBusy={isBusy}
          appInfoReady={appInfoReady}
          searchBarValue={searchBarValue}
          onSearchBarValueChange={setSearchBarValue}
          onSearch={handleBottomSearchBarSend}
          onClear={handleBottomSearchBarClear}
          onboardingText={AXSDK.t("chatOnboarding")}
          shortcutText={AXSDK.t("chatShortcutChips")}
          showShortcutChips={hasSession}
          latestUserText={userMessageText || undefined}
          placeholder={AXSDK.t("chatInput")}
          buttonLabel={AXSDK.t("chatSearchSubmit")}
          previewTitle={AXSDK.t("chatPreviewTitle")}
          resetLabel={AXSDK.t("chatBottomSearchReset")}
          closeLabel={AXSDK.t("chatBottomSearchClose")}
          emptyText={AXSDK.t("chatEmpty")}
          busyText={AXSDK.t("chatBusyGuide")}
          ttsControl={ttsControl}
        />
        {questions && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, width: '100%', maxWidth: '420px' }}>
            {AXSDK.config?.debug && lastAnswer && (
              <div style={{ marginBottom: '0.5em', padding: '0.4em 0.8em', background: 'color-mix(in srgb, var(--ax-color-primary, #7c3aed) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--ax-color-primary, #7c3aed) 40%, transparent)', borderRadius: '999px', color: '#c4b5fd', fontSize: '0.75em', display: 'inline-block' }}>
                Selected: <strong>{lastAnswer.label}</strong>
              </div>
            )}
            {AXSDK.config?.debug && submitLog && (
              <div style={{ marginBottom: '0.5em', padding: '0.5em 0.75em', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.7em', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {submitLog}
              </div>
            )}
            <AXQuestionDialog
              data={questions}
              onAnswer={(qi, si, label) => setLastAnswer({ questionIndex: qi, selectedOption: si, label })}
              onSubmit={(answers) => {
                setSubmitLog(JSON.stringify(answers, null, 2));
                AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.reply', data: { request: questions, status: 'reply', answers: answers.map(x => [x.customAnswer || x.label]) } });
                setQuestions(null);
              }}
              onDecline={() => {
                AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.reply', data: { request: questions, status: 'reject' } });
                setQuestions(null);
              }}
              visible={true}
            />
          </div>
        )}
      </div>
    </AXThemeProvider>;

    return ReactDOM.createPortal(content, portalTarget);
  }

  const content = <AXThemeProvider theme={theme}>
    <div>
    {children}
    <AXDevTools debug={AXSDK.config?.debug} messages={messages} />
    <SpeechBubbleClosed visible={!isOpen && !chatWasEverOpened} position={position} />
    {isOpen ? (
      <AXChatLastMessage
        message={assistantMessage}
        userMessage={userMessage}
        onOpen={() => { if (appInfoReady) setIsOpen(true); }}
        visible={true}
        isBusy={isBusy}
        isOpen={isOpen}
        isDesktop={isDesktop}
        inputBottomOffset={inputTopOffset ?? undefined}
        scrollToBottomTrigger={scrollTrigger}
        idleGuideText={!isBusy ? AXSDK.t("chatIdleGuide") : undefined}
        position={position}
        ttsControl={ttsControl}
      />
    ) : (
      <AXChatNotificationPopover
        message={assistantMessage}
        userMessage={userMessage}
        visible={notifVisible}
        onClose={() => setDismissedNotification(true)}
        position={position}
        ttsControl={ttsControl}
        onOpen={() => {
          if (!appInfoReady) return;
          if (effectiveVoice) {
            const plugin = getVoicePlugin();
            if (voiceNeedsUnlock) {
              if (effectiveVoice.debug) console.log('[AXUI voice] notification open → unlockAudio()');
              void plugin?.unlockAudio().catch((err) => {
                if (effectiveVoice.debug) console.warn('[AXUI voice] unlockAudio() failed', err);
              });
            } else if (!hasPrimedVoiceRef.current) {
              hasPrimedVoiceRef.current = true;
              if (effectiveVoice.debug) console.log('[AXUI voice] notification open → primePermissions()');
              void plugin?.primePermissions().catch((err) => {
                if (effectiveVoice.debug) console.warn('[AXUI voice] primePermissions() failed', err);
              });
            }
          }
          setIsOpen(true);
        }}
        isBusy={isBusy}
        isDesktop={isDesktop}
        inputBottomOffset={inputTopOffset ?? undefined}
        scrollToBottomTrigger={scrollTrigger}
        idleGuideText={!isBusy ? AXSDK.t("chatIdleGuide") : undefined}
        busyGuideText={isBusy && !assistantMessageText ? AXSDK.t("chatBusyGuide") : undefined}
      />
    )}
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: isTopPos ? "column-reverse" : "column",
        alignItems: isOpen && isDesktop ? (isLeftPos ? "flex-start" : "flex-end") : "center",
        zIndex: 10000,
        pointerEvents: "none",
        transition: "transform 0.3s ease",
        transform: isOpen ? "translateY(0)" : (isTopPos ? "translateY(-100%)" : "translateY(100%)"),
      }}
    >
      <div style={{ flex: 3 }} />
      <div
        ref={messageInputWrapperRef}
        style={{
          flex: 1,
          width: isOpen && isDesktop ? "min(420px, 40vw)" : "min(680px, 90vw)",
          marginRight: isOpen && isDesktop && !isLeftPos ? "1.25em" : undefined,
          marginLeft: isOpen && isDesktop && isLeftPos ? "1.25em" : undefined,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          boxSizing: "border-box",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <AXChatMessageInput
          placeholder={AXSDK.t("chatInput")}
          onSend={handleSend}
          onClear={handleClear}
          autoFocus
          disabled={!appInfoReady}
          focusTrigger={focusTrigger}
          cornerSide={isLeftPos ? 'left' : 'right'}
          cornerVertical={isTopPos ? 'top' : 'bottom'}
          guideText={
            !appInfoReady ? AXSDK.t("chatInitializing") :
            !messages.length || session?.status === "idle" || !session?.status ? AXSDK.t("chatEmpty") :
            session?.status === "busy" ? AXSDK.t("chatBusyGuide") :
            undefined
          }
          onboarding={appInfoReady && (!messages.length || session?.status === "idle" || !session?.status) ? AXSDK.t("chatOnboarding") : undefined}
          onOnboardingSelect={handleSend}
        />
      </div>
    </div>

    {questions && (
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, width: '100%', maxWidth: '420px' }}>
        {AXSDK.config?.debug && lastAnswer && (
          <div style={{ marginBottom: '0.5em', padding: '0.4em 0.8em', background: 'color-mix(in srgb, var(--ax-color-primary, #7c3aed) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--ax-color-primary, #7c3aed) 40%, transparent)', borderRadius: '999px', color: '#c4b5fd', fontSize: '0.75em', display: 'inline-block' }}>
            Selected: <strong>{lastAnswer.label}</strong>
          </div>
        )}
        {AXSDK.config?.debug && submitLog && (
          <div style={{ marginBottom: '0.5em', padding: '0.5em 0.75em', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.7em', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {submitLog}
          </div>
        )}
        <AXQuestionDialog
          data={questions}
          onAnswer={(qi, si, label) => setLastAnswer({ questionIndex: qi, selectedOption: si, label })}
          onSubmit={(answers) => {
            setSubmitLog(JSON.stringify(answers, null, 2));
            AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.reply', data: { request: questions, status: 'reply', answers: answers.map(x => [x.customAnswer || x.label]) } });
            setQuestions(null);
          }}
          onDecline={() => {
            AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.reply', data: { request: questions, status: 'reject' } });
            setQuestions(null);
          }}
          visible={true}
        />
      </div>
    )}
    <AXButton
      size="12vh"
      onClick={handleClick}
      isOpen={isOpen}
      status={session?.status}
      position={position}
      overlay={effectiveVoice ? <AXVoiceIndicator orbSize="5.5vh" debug={effectiveVoice.debug} /> : undefined}
    />
    {AXSDK.config?.dragHandleEnabled !== false && (
      <AXMoveControls position={position} setPosition={(p) => {
        if (controlledPosition === undefined) setInternalPosition(p);
        onPositionChange?.(p);
      }} />
    )}
    <AXPoweredBy
      style={{
        position: 'fixed',
        bottom: '0.25em',
        right: '0.25em',
        color: 'var(--ax-text-dim, rgba(0, 0, 0, 0.65))',
        zIndex: 10001,
      }}
    />
    </div>
  </AXThemeProvider>;

  return ReactDOM.createPortal(content, portalTarget);
}
