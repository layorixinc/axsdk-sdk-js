'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AXChat } from './AXChat';
import type { AXChatHandle } from './AXChat';
import { AXChatMessageInput } from './AXChatMessageInput';
import { useStore } from 'zustand';
import { AXSDK } from '@axsdk/core';

export interface AXChatPopupProps {
  visible: boolean;
  children?: React.ReactNode;
  onSendMessage?: (message: string, position: { x: number; y: number }) => void;
  /** Called when the input gains focus or the user starts typing — used to hide the chatClear bubble. */
  onInputFocusOrChange?: () => void;
}

function ClearBubble({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <div
      aria-hidden={!visible}
      onClick={onClick}
      style={{
        position: "absolute",
        // Position below the top of the input wrapper; the buttons row starts at ~0 and is ~3rem tall
        bottom: "calc(0.25rem)",
        // Align with the left side of the card where the Clear button sits (1rem card padding + center of ~3rem button)
        left: "calc(1rem + 1.5rem)",
        transform: "translateX(-50%)",
        zIndex: 10004,
        pointerEvents: visible ? "auto" : "none",
        cursor: "pointer",
        animation: visible
          ? "axbubble-clear-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards"
          : "axbubble-clear-out 0.2s ease-in forwards",
        opacity: visible ? undefined : 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -10,
          left: "1rem",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderBottom: "9px solid rgba(255, 255, 255, 0.7)",
          zIndex: -1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -8,
          left: "1rem",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: "8px solid rgba(18, 18, 28, 0.92)",
          filter: "drop-shadow(0 -2px 2px rgba(0,0,0,0.3))",
        }}
      />

      <div
        style={{
          background: "rgba(18, 18, 28, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
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
          {AXSDK.t("chatClear")}
        </span>
      </div>
    </div>
  );
}

type AnimState = "open" | "opening" | "closing" | "closed";

export function AXChatPopup({ visible, children, onSendMessage, onInputFocusOrChange }: AXChatPopupProps) {
  const [animState, setAnimState] = useState<AnimState>(visible ? "open" : "closed");
  const [clearBubbleVisible, setClearBubbleVisible] = useState(false);
  const isInitialMount = useRef(true);
  const prevVisible = useRef(visible);
  const chatRef = useRef<AXChatHandle>(null);

  const scrollChatToBottom = useCallback(() => {
    chatRef.current?.scrollToBottom();
  }, []);

  const { session, messages } = useStore(AXSDK.getChatStore());

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (visible) {
        AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.open' });
      }
      return;
    }

    if (visible === prevVisible.current) return;
    prevVisible.current = visible;

    if (visible) {
      setAnimState("opening");
      setClearBubbleVisible(true);
    } else {
      setAnimState((prev) =>
        prev !== "closed" ? "closing" : "closed"
      );
      setClearBubbleVisible(false);
    }

    if (visible) {
      AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.open' });
    } else {
      AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.close' });
    }
  }, [visible]);

  useEffect(() => {
    if (animState === "opening" || animState === "open" || animState === "closing") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [animState]);

  function handleAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (animState === "opening") {
      setAnimState("open");
    } else if (animState === "closing") {
      setAnimState("closed");
    }
  }

  function handleSend(message: string) {
    onSendMessage?.(message, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }
  function handleClear() {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
  }

  const isHidden = animState === "closed";

  const animationStyle: React.CSSProperties = (() => {
    if (animState === "opening") {
      return { animation: "axchat-open 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards" };
    }
    if (animState === "closing") {
      return { animation: "axchat-close 0.35s cubic-bezier(0.55, 0, 1, 0.45) forwards" };
    }
    if (animState === "open") {
      return { clipPath: "inset(0% 0% 0% 0%)" };
    }
    return { clipPath: "inset(100% 0% 0% 100%)" };
  })();

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      aria-hidden={isHidden}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        // Use "clip" instead of "hidden": clips visually without blocking scroll event routing
        overflow: "clip",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        visibility: isHidden ? "hidden" : "visible",
        pointerEvents: isHidden ? "none" : "auto",
        ...animationStyle,
      }}
    >
      {children}

      {animState !== "closed" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            style={{
              flex: 2,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingTop: "1.5rem",
            }}
          >
            <AXChat ref={chatRef} messages={messages} />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "min(680px, 90vw)",
                animation: "axchat-input-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                paddingBottom: "1.5rem"
              }}
            >
              <ClearBubble
                visible={clearBubbleVisible}
                onClick={() => setClearBubbleVisible(false)}
              />
              <AXChatMessageInput
                placeholder={AXSDK.t("chatInput")}
                onSend={handleSend}
                onClear={handleClear}
                autoFocus
                onAutoFocus={() => { setClearBubbleVisible(true); }}
                onFocus={() => { scrollChatToBottom(); onInputFocusOrChange?.(); setClearBubbleVisible(false); }}
                onInputChange={() => { scrollChatToBottom(); onInputFocusOrChange?.(); setClearBubbleVisible(false); }}
                guideText={
                  !messages.length ? AXSDK.t("chatEmpty") :
                  session?.status === "busy" ? AXSDK.t("chatBusyGuide") :
                  session?.status === "idle" || !session?.status ? AXSDK.t("chatIdleGuide") :
                  undefined
                }
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes axhint-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes axchat-input-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes axbubble-clear-in {
          from { opacity: 0; transform: translateX(0%) translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0%) translateY(0) scale(1); }
        }
        @keyframes axbubble-clear-out {
          from { opacity: 1; transform: translateX(0%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(0%) translateY(6px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
