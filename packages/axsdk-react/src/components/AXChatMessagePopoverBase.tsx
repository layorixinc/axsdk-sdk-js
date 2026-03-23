'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AXSDK } from '@axsdk/core';
import { AXChatErrorBar } from './AXChatErrorBar';

const LINE_HEIGHT_PX = 20;
const COLLAPSED_LINES = 4;
const COLLAPSED_HEIGHT_PX = LINE_HEIGHT_PX * COLLAPSED_LINES + 20;

export interface AXChatMessagePopoverBaseProps {
  message?: { id: string, text: string };
  userMessage?: { id: string, text: string };
  /** Called when the user clicks the close button. If undefined, close button is not rendered. */
  onClose?: () => void;
  /** Called when the user clicks the popover body (to open the chat). */
  onOpen?: () => void;
  /** True while the AI session is streaming/responding */
  isBusy: boolean;
  /** True when the chat popup is open; repositions popover above the message input */
  isOpen?: boolean;
  /**
   * When `isOpen` is true, the measured distance (px) from the bottom of the viewport
   * to the top of the message input wrapper. Used to align the popover's bottom edge
   * exactly with the input's top edge.
   */
  inputBottomOffset?: number;
  /**
   * When true, desktop layout is active (≥768px). On desktop with `isOpen`, the popover
   * is right-aligned with a fixed width instead of spanning the full viewport width.
   */
  isDesktop?: boolean;
  /**
   * Increment this value to trigger a scroll-to-bottom of the popover's scrollable content area.
   * Typically incremented after the open animation completes and layout is finalized.
   */
  scrollToBottomTrigger?: number;
}

export function AXChatMessagePopoverBase({
  message,
  userMessage,
  onClose,
  onOpen,
  isBusy,
  isOpen = false,
  inputBottomOffset,
  isDesktop = false,
  scrollToBottomTrigger,
}: AXChatMessagePopoverBaseProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Auto-expand when isBusy transitions to false (idle)
  useEffect(() => {
    if (!isBusy) setExpanded(true); // intentional sync setState to mirror isBusy prop
  }, [isBusy]);

  // Scroll to bottom whenever the trigger increments
  useEffect(() => {
    if (scrollToBottomTrigger == null) return;
    const el = scrollableRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [scrollToBottomTrigger]);

  // When the chat is open, align the popover's bottom edge with the top of the message input.
  // Use the measured inputBottomOffset (px) when available; fall back to a CSS estimate.
  const bottomOffset = isOpen
    ? (inputBottomOffset != null ? `${inputBottomOffset > 0 ? inputBottomOffset : -1024}px` : "calc(1.25rem + 75px + 8px)")
    : "1.25rem";

  const wrapperStyle: React.CSSProperties = expanded
    ? {
        maxHeight: `calc(100vh - ${bottomOffset} - 4rem)`,
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
      }
    : {
        maxHeight: `${COLLAPSED_HEIGHT_PX}px`,
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
      };

  const contentStyle: React.CSSProperties = {
    padding: "10px 14px 10px 14px",
    fontSize: "0.95rem",
    lineHeight: `${LINE_HEIGHT_PX}px`,
    color: "rgba(255, 255, 255, 0.88)",
    wordBreak: "break-word",
  };

  const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    p: ({ children }) => (
      <p style={{ margin: "0 0 0.6em 0", lineHeight: `${LINE_HEIGHT_PX}px` }}>{children}</p>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: "0 0 0.6em 0", paddingLeft: "1.4em" }}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: "0 0 0.6em 0", paddingLeft: "1.4em" }}>{children}</ol>
    ),
    li: ({ children }) => (
      <li style={{ marginBottom: "0.2em", lineHeight: `${LINE_HEIGHT_PX}px` }}>{children}</li>
    ),
    h1: ({ children }) => (
      <h1 style={{ fontSize: "1.3em", fontWeight: 700, margin: "0.6em 0 0.4em", color: "rgba(255,255,255,0.95)", lineHeight: 1.3 }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ fontSize: "1.15em", fontWeight: 700, margin: "0.6em 0 0.4em", color: "rgba(255,255,255,0.93)", lineHeight: 1.3 }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: "1.05em", fontWeight: 600, margin: "0.5em 0 0.35em", color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 style={{ fontSize: "1em", fontWeight: 600, margin: "0.5em 0 0.3em", color: "rgba(255,255,255,0.90)", lineHeight: 1.3 }}>{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 style={{ fontSize: "0.95em", fontWeight: 600, margin: "0.4em 0 0.25em", color: "rgba(255,255,255,0.88)", lineHeight: 1.3 }}>{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 style={{ fontSize: "0.9em", fontWeight: 600, margin: "0.4em 0 0.25em", color: "rgba(255,255,255,0.85)", lineHeight: 1.3 }}>{children}</h6>
    ),
    code: ({ children, className }) => {
      const isBlock = Boolean(className);
      if (isBlock) {
        return (
          <code style={{
            display: "block",
            fontFamily: "'Fira Mono', 'Consolas', 'Menlo', monospace",
            fontSize: "0.85em",
            color: "rgba(220, 220, 255, 0.92)",
          }}>{children}</code>
        );
      }
      return (
        <code style={{
          background: "rgba(168, 85, 247, 0.15)",
          borderRadius: 4,
          padding: "0.1em 0.35em",
          fontSize: "0.87em",
          fontFamily: "'Fira Mono', 'Consolas', 'Menlo', monospace",
          color: "rgba(220, 200, 255, 0.95)",
          border: "1px solid rgba(168, 85, 247, 0.25)",
        }}>{children}</code>
      );
    },
    pre: ({ children }) => (
      <pre style={{
        background: "rgba(0, 0, 0, 0.4)",
        borderRadius: 8,
        padding: "10px 12px",
        margin: "0.5em 0 0.7em",
        overflowX: "auto",
        border: "1px solid rgba(168, 85, 247, 0.2)",
        fontSize: "0.87em",
        lineHeight: 1.5,
      }}>{children}</pre>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "rgba(168, 85, 247, 0.9)",
          textDecoration: "none",
          borderBottom: "1px solid rgba(168, 85, 247, 0.4)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
      >{children}</a>
    ),
    strong: ({ children }) => (
      <strong style={{ fontWeight: 700, color: "rgba(255, 255, 255, 0.97)" }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: "italic", color: "rgba(220, 200, 255, 0.9)" }}>{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: "3px solid rgba(168, 85, 247, 0.65)",
        margin: "0.5em 0 0.7em",
        paddingLeft: "0.85em",
        color: "rgba(255, 255, 255, 0.72)",
        fontStyle: "italic",
      }}>{children}</blockquote>
    ),
    hr: () => (
      <hr style={{
        border: "none",
        borderTop: "1px solid rgba(168, 85, 247, 0.3)",
        margin: "0.75em 0",
      }} />
    ),
  };

  return (
    <>
      <style>{`
        @keyframes axnotif-in {
          from { opacity: 0; transform: translateX(8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes axnotif-pulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 10px 2px rgba(255, 255, 255, 0.4); }
          50%       { box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 24px 8px rgba(255, 255, 255, 0.75); }
        }
        .ax-notif-content::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        onClick={onOpen}
        style={isOpen && isDesktop ? {
          position: "fixed",
          cursor: "pointer",
          bottom: bottomOffset,
          right: "1.25rem",
          width: "min(420px, 40vw)",
          boxSizing: "border-box",
          zIndex: 10001,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "stretch",
          animation: "axnotif-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        } : isOpen ? {
          position: "fixed",
          cursor: "pointer",
          bottom: bottomOffset,
          left: 0,
          right: 0,
          width: "100%",
          padding: "0 1.25rem",
          boxSizing: "border-box",
          zIndex: 10001,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "stretch",
          animation: "axnotif-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        } : {
          position: "fixed",
          cursor: "pointer",
          bottom: bottomOffset,
          right: "calc(1.25rem + 12vh)",
          zIndex: 10001,
          width: "min(420px, calc(100vw - 12vh - 1rem - 16px))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          animation: "axnotif-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        <div
          style={{
            width: "100%",
            position: "relative",
            background: "rgba(18, 18, 28, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(168, 85, 247, 0.35)",
            borderRadius: 12,
            boxShadow: !isBusy
              ? "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 10px 2px rgba(168,85,247,0.4)"
              : "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
            animation: !isBusy ? "axnotif-pulse 2s ease-in-out infinite" : "none",
            overflow: "hidden",
            minHeight: "12vh",
            maxHeight: `calc(100vh - ${bottomOffset} - 1rem)`,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{
            padding: "10px 14px 6px 14px",
            borderBottom: "1px solid rgba(168, 85, 247, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            {userMessage && (
              <div style={{
                fontSize: "0.85rem",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.75)",
                whiteSpace: "nowrap" as const,
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                paddingRight: 32,
              }}>{userMessage.text}</div>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              aria-label="Close notification"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                cursor: "pointer",
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: 0,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                zIndex: 10002,
              }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255, 255, 255, 0.4)"; b.style.border = "1px solid rgba(168, 85, 247, 0.7)"; b.style.color = "rgba(255,255,255,0.9)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255, 255, 255, 0.2)"; b.style.border = "1px solid rgba(168, 85, 247, 0.4)"; b.style.color = "rgba(255,255,255,0.85)"; }}
            >
              ×
            </button>
          )}

          <div className="ax-notif-content"
            ref={scrollableRef}
            style={wrapperStyle}
          >
            <div style={contentStyle}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {message?.text || ''}
              </ReactMarkdown>
            </div>
          </div>

          {false && <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: "100%",
              marginTop: "auto",
              background: "rgba(168, 85, 247, 0.12)",
              border: "none",
              borderTop: "1px solid rgba(168, 85, 247, 0.2)",
              cursor: "pointer",
              padding: "6px 0",
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: 500,
              letterSpacing: "0.02em",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(168, 85, 247, 0.22)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(168, 85, 247, 0.12)"; }}
          >
            {expanded ? `${AXSDK.t("notifCollapse")} ▼` : `▲ ${AXSDK.t("notifShowMore")}`}
          </button>}

          <AXChatErrorBar />

        </div>

        {!isOpen && <>
          <div style={{
            position: "absolute",
            right: -10,
            bottom: "calc(12vh / 2 - 9px)",
            width: 0, height: 0,
            borderTop: "9px solid transparent",
            borderBottom: "9px solid transparent",
            borderLeft: "10px solid rgba(168, 85, 247, 0.35)",
            zIndex: -1,
          }} />
          <div style={{
            position: "absolute",
            right: -8,
            bottom: "calc(12vh / 2 - 8px)",
            width: 0, height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderLeft: "8px solid rgba(18, 18, 28, 0.95)",
          }} />
        </>}
      </div>
    </>
  );
}
