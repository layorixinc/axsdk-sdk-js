import React, { useState, useEffect } from 'react';
import { AXSDK } from '@axsdk/core';

const LINE_HEIGHT_PX = 20;
const COLLAPSED_LINES = 4;
const COLLAPSED_HEIGHT_PX = LINE_HEIGHT_PX * COLLAPSED_LINES + 20; // 4 lines + vertical padding

export interface AXChatNotificationPopoverProps {
  message: string;
  onClose: () => void;
  onOpen?: () => void;
  visible: boolean;
  /** True while the AI session is streaming/responding */
  isBusy: boolean;
}

export function AXChatNotificationPopover({
  message, onClose, onOpen, visible, isBusy,
}: AXChatNotificationPopoverProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  // Auto-expand when isBusy transitions to false (idle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isBusy) setExpanded(true); // intentional sync setState to mirror isBusy prop
  }, [isBusy]);

  if (!visible) return null;

  const wrapperStyle: React.CSSProperties = expanded
    ? {
        maxHeight: "calc(100vh - 6rem)",
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
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
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
        style={{
          position: "fixed",
          cursor: "pointer",
          bottom: "1.25rem",
          right: "calc(1.25rem + 12vh + 16px)",
          zIndex: 10001,
          width: "min(420px, calc(100vw - 12vh - 1rem - 16px))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          animation: "axnotif-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        {/* Card */}
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
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close notification"
            style={{
              position: "absolute",
              top: 0,
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
              zIndex: 1,
            }}
            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255, 255, 255, 0.4)"; b.style.border = "1px solid rgba(168, 85, 247, 0.7)"; b.style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255, 255, 255, 0.2)"; b.style.border = "1px solid rgba(168, 85, 247, 0.4)"; b.style.color = "rgba(255,255,255,0.85)"; }}
          >
            ×
          </button>

          {/* Content wrapper */}
          <div className="ax-notif-content" style={wrapperStyle}>
            <div style={contentStyle}>{message}</div>
          </div>

          {/* Expand/collapse toggle — inside card, at the bottom */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: "100%",
              marginTop: "auto",
              background: "rgba(185, 74, 0, 0.97)",
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
          </button>

        </div>

        {/* Right-pointing tail */}
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
      </div>
    </>
  );
}
