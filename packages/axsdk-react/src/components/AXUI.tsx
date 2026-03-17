import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { useStore } from 'zustand';

import { AXChatPopup } from './AXChatPopup';
import { AXButton } from './AXButton';

import { AXSDK } from '@axsdk/core';

export interface AXUIProps {
  children?: React.ReactNode;
}

// Closed-state bubble: appears above the AXButton fixed at bottom-right,
// tail points DOWNWARD toward the button below.
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
      {/* Bubble body */}
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

      {/* Downward-pointing CSS triangle arrow (border layer) */}
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
      {/* Downward-pointing CSS triangle arrow (fill layer) */}
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

// Clear-state bubble: appears above the clear button at the bottom-left of the chat popup,
// tail points DOWNWARD toward the clear button below.
function SpeechBubbleClear({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <div
      aria-hidden={!visible}
      onClick={onClick}
      style={{
        position: "fixed",
        // Place above the 4rem input bar with a small gap
        bottom: "calc(2rem + 14px)",
        left: "0rem",
        zIndex: 10003,
        pointerEvents: visible ? "auto" : "none",
        cursor: "pointer",
        animation: visible
          ? "axbubble-clear-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards"
          : "axbubble-clear-out 0.2s ease-in forwards",
        opacity: visible ? undefined : 0,
      }}
    >
      {/* Bubble body */}
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

      {/* Downward-pointing CSS triangle arrow (border layer) */}
      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: "1.5rem",
          width: 0,
          height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "9px solid rgba(255, 255, 255, 0.7)",
          zIndex: -1,
        }}
      />
      {/* Downward-pointing CSS triangle arrow (fill layer) */}
      <div
        style={{
          position: "absolute",
          bottom: -8,
          left: "calc(1.5rem + 1px)",
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

// Open-state bubble: appears to the LEFT of the AXButton fixed at top-right,
// tail points RIGHTWARD toward the button to its right.
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

        {/* Right-pointing CSS triangle arrow (border layer) */}
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
        {/* Right-pointing CSS triangle arrow (fill layer) */}
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

export function AXUI({ children }: AXUIProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const [clearBubbleVisible, setClearBubbleVisible] = useState(false);

  const { isOpen, setIsOpen } = useStore(AXSDK.getChatStore());

  useEffect(() => {
    if (isOpen) {
      setClearBubbleVisible(true);
    } else {
      setClearBubbleVisible(false);
    }
  }, [isOpen]);

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

  if (!portalTarget) return null;

  const content = <div>
    {children}
    <AXChatPopup visible={isOpen} onSendMessage={handleSend} onInputFocusOrChange={() => setClearBubbleVisible(false)}></AXChatPopup>
    {/* Closed-state bubble: shown when popup is closed, tail points down toward bottom-right button */}
    <SpeechBubbleClosed visible={!isOpen} />
    {/* Open-state bubble: shown when popup is open, tail points up toward top-right button */}
    <SpeechBubbleOpen visible={isOpen} />
    {/* Clear bubble: shown above the clear button at bottom-left when the popup is open */}
    <SpeechBubbleClear visible={clearBubbleVisible} onClick={() => setClearBubbleVisible(false)} />
    <AXButton size="12vh" onClick={handleClick} isOpen={isOpen} />
  </div>

  return ReactDOM.createPortal(content, portalTarget);
}
