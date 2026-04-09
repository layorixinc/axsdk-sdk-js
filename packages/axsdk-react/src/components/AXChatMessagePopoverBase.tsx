'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AXChatErrorBar } from './AXChatErrorBar';
import { useAXTheme } from '../AXThemeContext';
import remarkGfm from 'remark-gfm';
const ReactMarkdown = React.lazy(() => import('react-markdown'))

const LINE_HEIGHT_PX = 20;
const COLLAPSED_LINES = 4;
const COLLAPSED_HEIGHT_PX = LINE_HEIGHT_PX * COLLAPSED_LINES + 20;

export interface AXChatMessagePopoverBaseProps {
  message?: { id: string, text: string };
  userMessage?: { id: string, text: string };
  onClose?: () => void;
  onOpen?: () => void;
  isBusy: boolean;
  isOpen?: boolean;
  inputBottomOffset?: number;
  isDesktop?: boolean;
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
  const { theme } = useAXTheme();
  const [expanded, setExpanded] = useState<boolean>(false);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBusy) setExpanded(true);
  }, [isBusy]);

  useEffect(() => {
    if (scrollToBottomTrigger == null) return;
    const el = scrollableRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [scrollToBottomTrigger]);

  // Keep the latest (bottom) content pinned so the top is what clips, not the bottom.
  useEffect(() => {
    const el = scrollableRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [message?.text, expanded]);

  const bottomOffset = isOpen
    ? (inputBottomOffset != null ? `${inputBottomOffset > 0 ? inputBottomOffset : -1024}px` : "calc(1.25em + 75px + 8px)")
    : "1.25em";

  const wrapperStyle: React.CSSProperties = expanded
    ? {
        flex: "1 1 auto",
        minHeight: 0,
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
    fontSize: "0.95em",
    lineHeight: `${LINE_HEIGHT_PX}px`,
    color: "var(--ax-text-primary)",
    wordBreak: "break-word",
    ...theme.styles?.popover?.content,
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
      <h1 style={{ fontSize: "1.3em", fontWeight: 700, margin: "0.6em 0 0.4em", color: "var(--ax-text-primary, rgba(255,255,255,0.95))", lineHeight: 1.3 }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ fontSize: "1.15em", fontWeight: 700, margin: "0.6em 0 0.4em", color: "var(--ax-text-primary, rgba(255,255,255,0.93))", lineHeight: 1.3 }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: "1.05em", fontWeight: 600, margin: "0.5em 0 0.35em", color: "var(--ax-text-primary, rgba(255,255,255,0.92))", lineHeight: 1.3 }}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 style={{ fontSize: "1em", fontWeight: 600, margin: "0.5em 0 0.3em", color: "var(--ax-text-primary, rgba(255,255,255,0.90))", lineHeight: 1.3 }}>{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 style={{ fontSize: "0.95em", fontWeight: 600, margin: "0.4em 0 0.25em", color: "var(--ax-text-primary, rgba(255,255,255,0.88))", lineHeight: 1.3 }}>{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 style={{ fontSize: "0.9em", fontWeight: 600, margin: "0.4em 0 0.25em", color: "var(--ax-text-muted, rgba(255,255,255,0.85))", lineHeight: 1.3 }}>{children}</h6>
    ),
    code: ({ children, className }) => {
      const isBlock = Boolean(className);
      if (isBlock) {
        return (
          <code style={{
            display: "block",
            fontFamily: "'Fira Mono', 'Consolas', 'Menlo', monospace",
            fontSize: "0.85em",
            color: "var(--ax-text-primary, rgba(220, 220, 255, 0.92))",
          }}>{children}</code>
        );
      }
      return (
        <code style={{
          background: "var(--ax-bg-popover, rgba(168, 85, 247, 0.15))",
          borderRadius: 4,
          padding: "0.1em 0.35em",
          fontSize: "0.87em",
          fontFamily: "'Fira Mono', 'Consolas', 'Menlo', monospace",
          color: "var(--ax-text-primary, rgba(220, 200, 255, 0.95))",
          border: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.25))",
        }}>{children}</code>
      );
    },
    pre: ({ children }) => (
      <pre style={{
        background: "var(--ax-bg-popover, rgba(0, 0, 0, 0.4))",
        borderRadius: 8,
        padding: "10px 12px",
        margin: "0.5em 0 0.7em",
        overflowX: "auto",
        border: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.2))",
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
          color: "var(--ax-color-primary-light, rgba(168, 85, 247, 0.9))",
          textDecoration: "none",
          borderBottom: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.4))",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
      >{children}</a>
    ),
    strong: ({ children }) => (
      <strong style={{ fontWeight: 700, color: "var(--ax-text-primary, rgba(255, 255, 255, 0.97))" }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: "italic", color: "var(--ax-text-muted, rgba(220, 200, 255, 0.9))" }}>{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: "3px solid var(--ax-color-primary-light, rgba(168, 85, 247, 0.65))",
        margin: "0.5em 0 0.7em",
        paddingLeft: "0.85em",
        color: "var(--ax-text-muted, rgba(255, 255, 255, 0.72))",
        fontStyle: "italic",
      }}>{children}</blockquote>
    ),
    hr: () => (
      <hr style={{
        border: "none",
        borderTop: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.3))",
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
          0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 10px 2px var(--ax-color-primary-light, rgba(168, 85, 247, 0.4)); }
          50%       { box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 24px 8px var(--ax-color-primary-light, rgba(168, 85, 247, 0.75)); }
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
          right: "1.25em",
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
          padding: "0 1.25em",
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
          right: "calc(1.25em + 12vh)",
          zIndex: 10001,
          width: "min(420px, calc(100vw - 12vh - 1em - 16px))",
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
            background: "var(--ax-bg-popover)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))",
            borderRadius: 12,
            boxShadow: !isBusy
              ? "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 10px 2px var(--ax-color-primary-light, rgba(168,85,247,0.4))"
              : "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
            animation: !isBusy ? "axnotif-pulse 2s ease-in-out infinite" : "none",
            overflow: "hidden",
            minHeight: "12vh",
            maxHeight: `calc(100vh - ${bottomOffset} - 1em)`,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            ...theme.styles?.popover?.card,
          }}
        >
          <div style={{
            padding: "10px 14px 6px 14px",
            borderBottom: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.2))",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            {userMessage && (
              <div style={{
                fontSize: "0.85em",
                fontWeight: 500,
                color: "var(--ax-text-muted)",
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
                border: "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.4))",
                cursor: "pointer",
                color: "var(--ax-text-primary)",
                fontSize: "1.25em",
                lineHeight: 1,
                padding: 0,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                zIndex: 10002,
                ...theme.styles?.popover?.closeButton,
              }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255, 255, 255, 0.4)"; b.style.border = "1px solid var(--ax-border-primary)"; b.style.color = "var(--ax-text-primary)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255, 255, 255, 0.2)"; b.style.border = "1px solid var(--ax-border-primary, rgba(168, 85, 247, 0.4))"; b.style.color = "var(--ax-text-primary)"; }}
            >
              ×
            </button>
          )}

          <div className="ax-notif-content"
            ref={scrollableRef}
            style={wrapperStyle}
          >
            <div style={contentStyle}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]} components={mdComponents}>
                {message?.text || ''}
              </ReactMarkdown>
            </div>
          </div>

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
            borderLeft: "10px solid var(--ax-border-primary, rgba(168, 85, 247, 0.35))",
            zIndex: -1,
          }} />
          <div style={{
            position: "absolute",
            right: -8,
            bottom: "calc(12vh / 2 - 8px)",
            width: 0, height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderLeft: "8px solid var(--ax-bg-popover)",
          }} />
        </>}
      </div>
    </>
  );
}
