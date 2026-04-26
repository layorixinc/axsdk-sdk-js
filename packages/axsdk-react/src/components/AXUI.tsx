'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';

import { useStore } from 'zustand';

import { AXButton } from './AXButton';
import { AXChatNotificationPopover } from './AXChatNotificationPopover';
import { AXChatLastMessage } from './AXChatLastMessage';
import { AXChatMessageInput } from './AXChatMessageInput';
import { AXDevTools } from './AXDevTools';
import { AXQuestionDialog } from './AXQuestionDialog';
import { AXVoiceIndicator } from './AXVoiceIndicator';

import { AXSDK } from '@axsdk/core';
import type { TextPart } from '@axsdk/core';

import type { AXTheme } from '../theme';
import { AXThemeProvider } from '../AXThemeContext';
import { useAXShadowRoot } from '../AXShadowRootContext';
import { injectCSSVariables } from '../cssVariables';
import {
  useVoicePlugin,
  resolveVoiceConfig,
  useVoiceUnlockNeeded,
  getVoicePlugin,
  type AXVoiceConfig,
} from '../voice';

export type { AXTheme };
export type { AXVoiceConfig };

export interface AXUIProps {
  children?: React.ReactNode;
  theme?: AXTheme;
  voice?: AXVoiceConfig;
}

function SpeechBubbleClosed({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      style={{
      position: "fixed",
      bottom: "calc(12vh + 1.5em + 14px)",
        right: "1.25em",
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
          bottom: -10,
          right: "calc(12vh / 2 - 9px)",
          width: 0,
          height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "9px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))",
          zIndex: -1,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -8,
          right: "calc(12vh / 2 - 8px)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid var(--ax-bg-popover)",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
        }}
      />
    </div>
  );
}

const DESKTOP_BREAKPOINT = 768;

export function AXUI({ children, theme, voice }: AXUIProps) {
  const shadowRoot = useAXShadowRoot();
  useVoicePlugin(voice ?? null);
  const effectiveVoice = resolveVoiceConfig(voice);
  const voiceNeedsUnlock = useVoiceUnlockNeeded();
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const [dismissedNotification, setDismissedNotification] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ questionIndex: number; selectedOption: number; label: string } | null>(null);
  const [submitLog, setSubmitLog] = useState<string | null>(null);
  const [inputTopOffset, setInputTopOffset] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const messageInputWrapperRef = useRef<HTMLDivElement | null>(null);

  const { isOpen, setIsOpen, chatWasEverOpened, setChatWasEverOpened, messages, questions, setQuestions, session } = useStore(AXSDK.getChatStore());
  const appInfoReady = useStore(AXSDK.getAppStore(), (s) => s.appInfoReady);
  const isBusy = session?.status === 'busy';

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentStatus = session?.status;
    if ((prevStatusRef.current === 'idle' || !prevStatusRef.current) && currentStatus === 'busy') {
      setIsOpen(false);
    }
    prevStatusRef.current = currentStatus;
  }, [session?.status, setIsOpen]);

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

  const latestUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.info.role !== 'user') continue;
      const text = msg.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as TextPart).text ?? '')
        .join('')
        .trim();
      if (text) return msg;
    }
    return undefined;
  }, [messages]);

  const userMessageText = latestUserMessage && latestUserMessage.parts && latestUserMessage.parts.length &&
    latestUserMessage.parts
      .filter((p): p is TextPart => p.type === "text")
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  const userMessage = latestUserMessage?.info?.id && { id: latestUserMessage?.info?.id, text: userMessageText || '' } || undefined;

  const notifVisible = (!!assistantMessageText || !!userMessageText) && !dismissedNotification

  useEffect(() => {
    const wrapper = messageInputWrapperRef.current;
    if (!wrapper || !isOpen) return;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      setInputTopOffset(window.innerHeight - rect.top + 8);
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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timerId = setTimeout(() => {
      const wrapper = messageInputWrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setInputTopOffset(window.innerHeight - rect.top + 8);
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
  const handleClick = () => {
    if (!appInfoReady) return;
    // Unlock-only branch: don't also toggle chat — the same tap would close it as a side effect.
    if (effectiveVoice && voiceNeedsUnlock) {
      const plugin = getVoicePlugin();
      if (effectiveVoice.debug) console.log('[AXUI voice] orb click → unlockAudio()');
      void plugin?.unlockAudio().catch((err) => {
        if (effectiveVoice.debug) console.warn('[AXUI voice] unlockAudio() failed', err);
      });
      return;
    }
    if (effectiveVoice && !hasPrimedVoiceRef.current) {
      hasPrimedVoiceRef.current = true;
      const plugin = getVoicePlugin();
      if (effectiveVoice.debug) console.log('[AXUI voice] first orb click → primePermissions()');
      void plugin?.primePermissions().catch((err) => {
        if (effectiveVoice.debug) console.warn('[AXUI voice] primePermissions() failed', err);
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSend = (text: string) => {
    AXSDK.getErrorStore().getState().clearErrors();
    AXSDK.sendMessage(text);
  }
  function handleClear() {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
  }

  if (!portalTarget) return null;

  const content = <AXThemeProvider theme={theme}>
    <div>
    {children}
    <AXDevTools debug={AXSDK.config?.debug} messages={messages} />
    <SpeechBubbleClosed visible={!isOpen && !chatWasEverOpened} />
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
      />
    ) : (
      <AXChatNotificationPopover
        message={assistantMessage}
        userMessage={userMessage}
        visible={notifVisible}
        onClose={() => setDismissedNotification(true)}
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
        flexDirection: "column",
        alignItems: isOpen && isDesktop ? "flex-end" : "center",
        zIndex: 10000,
        pointerEvents: "none",
        transition: "transform 0.3s ease",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
      }}
    >
      <div style={{ flex: 3 }} />
      <div
        ref={messageInputWrapperRef}
        style={{
          flex: 1,
          width: isOpen && isDesktop ? "min(420px, 40vw)" : "min(680px, 90vw)",
          marginRight: isOpen && isDesktop ? "1.25em" : undefined,
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
      overlay={effectiveVoice ? <AXVoiceIndicator orbSize="12vh" debug={effectiveVoice.debug} /> : undefined}
    />
    <div style={{
      textAlign: 'center',
      fontSize: '0.65em',
      color: 'rgba(0, 0, 0, 1)',
      letterSpacing: '0.04em',
      marginTop: '0.25em',
      userSelect: 'none',
      position: 'fixed',
      bottom: '0.25em',
      right: '0.25em'
    }}>
      <a
        href="https://axsdk.ai"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {AXSDK.t('poweredBy')}
      </a>
    </div>
    </div>
  </AXThemeProvider>;

  return ReactDOM.createPortal(content, portalTarget);
}
