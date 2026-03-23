import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';

import { useStore } from 'zustand';

import { AXChatPopup } from './AXChatPopup';
import { AXButton } from './AXButton';
import { AXChatNotificationPopover } from './AXChatNotificationPopover';
import { AXChatLastMessage } from './AXChatLastMessage';
import { AXChatMessageInput } from './AXChatMessageInput';
import { AXDevTools } from './AXDevTools';
import { AXQuestionDialog } from './AXQuestionDialog';

import { AXSDK } from '@axsdk/core';
import type { TextPart } from '@axsdk/core';

export interface AXUIProps {
  children?: React.ReactNode;
}

function SpeechBubbleClosed({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        // AXButton is bottom-6 (1.5rem) with size 12vh; place bubble above it
        bottom: "calc(12vh + 1.5rem + 14px)",
        right: "1.25rem",
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
          background: "rgba(18, 18, 28, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(168, 85, 247, 0.35)",
          borderRadius: 12,
          padding: "9px 16px",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            color: "rgba(255, 255, 255, 0.92)",
            fontSize: "0.875rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
            background:
              "linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)",
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
          borderTop: "9px solid rgba(168, 85, 247, 0.35)",
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
          borderTop: "8px solid rgba(18, 18, 28, 0.92)",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
        }}
      />
    </div>
  );
}

function SpeechBubbleOpen({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        // Vertically center with AXButton center: top-6 (1.5rem) + half of 12vh = 6vh
        top: "calc(1.5rem)",
        // Place bubble to the left of the button: right-6 (1.5rem) + button width (12vh) + gap (12px)
        right: "calc(1.5rem + 6vh + 12px)",
        transform: "translateY(-50%)",
        zIndex: 10001,
        pointerEvents: "none",
        animation: visible
          ? "axbubble-open-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards"
          : "axbubble-open-out 0.2s ease-in forwards",
        opacity: visible ? undefined : 0,
      }}
    >
      {/* Bubble body */}
      <div
        style={{
          position: "relative",
          background: "rgba(18, 18, 28, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(168, 85, 247, 0.35)",
          borderRadius: 12,
          padding: "9px 16px",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            color: "rgba(255, 255, 255, 0.92)",
            fontSize: "0.875rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
            background:
              "linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {AXSDK.t("chatHide")}
        </span>

        <div
          style={{
            position: "absolute",
            right: -10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderLeft: "10px solid rgba(168, 85, 247, 0.35)",
            zIndex: -1,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderLeft: "8px solid rgba(18, 18, 28, 0.92)",
          }}
        />
      </div>
    </div>
  );
}

const DESKTOP_BREAKPOINT = 768;

export function AXUI({ children }: AXUIProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ questionIndex: number; selectedOption: number; label: string } | null>(null);
  const [submitLog, setSubmitLog] = useState<string | null>(null);
  const [inputTopOffset, setInputTopOffset] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const messageInputWrapperRef = useRef<HTMLDivElement | null>(null);

  const { isOpen, setIsOpen, chatWasEverOpened, setChatWasEverOpened, messages, questions, setQuestions, session } = useStore(AXSDK.getChatStore());
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
      setNotifDismissed(false);
    } else {
      setNotifDismissed(true);
    }
  }, [isOpen, setChatWasEverOpened, setNotifDismissed]);

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
        if (text) return text;
      }
    }
  }, [messages]);

  const latestUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.info.role !== 'user') continue;
      const text = msg.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as TextPart).text ?? '')
        .join('')
        .trim();
      if (text) return text;
    }
    return undefined;
  }, [messages]);

  useEffect(() => {
    setNotifDismissed(false);
  }, [latestUserMessage, latestAssistantMessage]);

  const notifVisible = (!!latestUserMessage || !!latestAssistantMessage) && !notifDismissed;

  // Measure input wrapper top position to align notification popover.
  // Re-measure whenever isOpen changes so we capture the on-screen position
  // after the slide-in transition completes (the container uses translateY).
  useEffect(() => {
    const wrapper = messageInputWrapperRef.current;
    if (!wrapper || !isOpen) return;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      // distance from the bottom of viewport to the top of the input wrapper
      setInputTopOffset(window.innerHeight - rect.top + 8);
    };

    // Small delay to let the CSS transition finish before measuring.
    // After measuring, also trigger scroll-to-bottom on the notification popover
    // and focus on the message input.
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

  // On initial mount, if isOpen is already true (e.g. after page refresh),
  // the [isOpen] effect above won't fire a transition-triggered measurement.
  // This effect runs once at mount and handles that case.
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
    // Inject keyframe animations into the document head once
    const styleId = "axbubble-keyframes";
    if (!document.getElementById(styleId)) {
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
        @keyframes axbubble-open-in {
          from { opacity: 0; transform: translateY(-50%) translateX(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0) scale(1); }
        }
        @keyframes axbubble-open-out {
          from { opacity: 1; transform: translateY(-50%) translateX(0) scale(1); }
          to   { opacity: 0; transform: translateY(-50%) translateX(6px) scale(0.95); }
        }
        @keyframes axbubble-clear-in {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes axbubble-clear-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(6px) scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }

    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.zIndex = "9999";
    el.style.width = "0px";
    el.style.height = "0px";
    document.body.appendChild(el);
    setPortalTarget(el);

    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleSend = (text: string) => {
    AXSDK.sendMessage(text);
  }
  function handleClear() {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
  }

  if (!portalTarget) return null;

  const content = <div>
    {children}
    {false && <AXChatPopup visible={isOpen} onSendMessage={handleSend}></AXChatPopup>}
    <SpeechBubbleClosed visible={!isOpen && !chatWasEverOpened} />
    {false &&<SpeechBubbleOpen visible={isOpen} />}
    {isOpen ? (
      <AXChatLastMessage
        message={latestAssistantMessage}
        userMessage={latestUserMessage}
        visible={notifVisible}
        onClose={() => setNotifDismissed(true)}
        onOpen={() => setIsOpen(true)}
        isBusy={isBusy}
        isOpen={isOpen}
        isDesktop={isDesktop}
        inputBottomOffset={inputTopOffset ?? undefined}
        scrollToBottomTrigger={scrollTrigger}
      />
    ) : (
      <AXChatNotificationPopover
        message={latestAssistantMessage}
        userMessage={latestUserMessage}
        visible={notifVisible}
        onClose={() => setNotifDismissed(true)}
        onOpen={() => setIsOpen(true)}
        isBusy={isBusy}
        isDesktop={isDesktop}
        inputBottomOffset={inputTopOffset ?? undefined}
        scrollToBottomTrigger={scrollTrigger}
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
          marginRight: isOpen && isDesktop ? "1.25rem" : undefined,
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
          focusTrigger={focusTrigger}
          guideText={
            !messages.length ? AXSDK.t("chatEmpty") :
            session?.status === "busy" ? AXSDK.t("chatBusyGuide") :
            session?.status === "idle" || !session?.status ? AXSDK.t("chatIdleGuide") :
            undefined
          }
        />
      </div>
    </div>

    {questions && (
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, width: '100%', maxWidth: '420px' }}>
        {AXSDK.config?.debug && lastAnswer && (
          <div style={{ marginBottom: '0.5rem', padding: '0.4rem 0.8rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '999px', color: '#c4b5fd', fontSize: '0.75rem', display: 'inline-block' }}>
            Selected: <strong>{lastAnswer.label}</strong>
          </div>
        )}
        {AXSDK.config?.debug && submitLog && (
          <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.7rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
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
    <AXButton size="12vh" onClick={handleClick} isOpen={isOpen} status={session?.status} />
    <div style={{
      textAlign: 'center',
      fontSize: '0.65rem',
      color: 'rgba(0, 0, 0, 1)',
      letterSpacing: '0.04em',
      marginTop: '0.25rem',
      userSelect: 'none',
      position: 'fixed',
      bottom: '0.25rem',
      right: '0.25rem'
    }}>
      {AXSDK.t('poweredBy')}
    </div>
    <AXDevTools debug={AXSDK.config?.debug} messages={messages} />
  </div>

  return ReactDOM.createPortal(content, portalTarget);
}
