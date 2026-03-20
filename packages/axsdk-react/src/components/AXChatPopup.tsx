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

type AnimState = "open" | "opening" | "closing" | "closed";

export function AXChatPopup({ visible, children, onSendMessage, onInputFocusOrChange }: AXChatPopupProps) {
  // If visible is true on initial mount, start in "open" state (no animation)
  const [animState, setAnimState] = useState<AnimState>(visible ? "open" : "closed");
  const isInitialMount = useRef(true);
  const prevVisible = useRef(visible);
  const chatRef = useRef<AXChatHandle>(null);

  const scrollChatToBottom = useCallback(() => {
    chatRef.current?.scrollToBottom();
  }, []);

  const { session, messages } = useStore(AXSDK.getChatStore());

  useEffect(() => {
    // Skip the initial mount: animState is already set correctly in useState initializer
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Emit open event if starting in open state
      if (visible) {
        AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.open' });
      }
      return;
    }

    if (visible === prevVisible.current) return;
    prevVisible.current = visible;

    if (visible) {
      setAnimState("opening");
    } else {
      setAnimState((prev) =>
        prev !== "closed" ? "closing" : "closed"
      );
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

  // Height of the bottom input bar area (for positioning chat area)
  const inputBarHeight = "4rem";

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

      {/* AXChat conversation area – fills the overlay minus the bottom input bar */}
      {animState !== "closed" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: inputBarHeight,
            paddingTop: "1.5rem",
            paddingBottom: "1.0rem",
            zIndex: 10000,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <AXChat ref={chatRef} messages={messages} />
          </div>
        </div>
      )}

      {/* Guide text above the input bar */}
      {animState !== "closed" && (
        <>
          {session?.status === "busy" && AXSDK.t("chatBusyGuide") && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: inputBarHeight,
                zIndex: 10002,
                fontSize: "1rem",
                color: "rgba(255, 255, 255, 1)",
                padding: "4px 12px 1.2rem",
                textAlign: "center",
                whiteSpace: "pre-wrap",
              }}
            >
              {AXSDK.t("chatBusyGuide")}
            </div>
          )}
          {session?.status === "idle" && AXSDK.t("chatIdleGuide") && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: inputBarHeight,
                zIndex: 10002,
                fontSize: "1rem",
                color: "rgba(255, 255, 255, 1)",
                padding: "4px 12px 1.2rem",
                textAlign: "center",
                whiteSpace: "pre-wrap",
              }}
            >
              {AXSDK.t("chatIdleGuide")}
            </div>
          )}
        </>
      )}

      {/* Fixed bottom full-width input bar */}
      {animState !== "closed" && (
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10002,
            background: "rgba(12, 12, 18, 0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            boxSizing: "border-box",
          }}
        >
          <div style={{ height: inputBarHeight, display: "flex", alignItems: "center", width: "100%" }}>
            <AXChatMessageInput
              placeholder={AXSDK.t("chatInput")}
              onSend={handleSend}
              onClear={handleClear}
              onFocus={() => { scrollChatToBottom(); onInputFocusOrChange?.(); }}
              onInputChange={() => { scrollChatToBottom(); onInputFocusOrChange?.(); }}
            />
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes axhint-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
