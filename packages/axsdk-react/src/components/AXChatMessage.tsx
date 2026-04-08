'use client';

import React, { useState } from 'react';
import type { ChatMessage, MessagePart, TextPart, ReasoningPart, StepFinishPart, ToolPart } from '@axsdk/core';
import { AXSDK } from '@axsdk/core';
import { useAXTheme } from '../AXThemeContext';

export type AXChatMessageRole = "user" | "assistant";

export interface AXChatMessageProps {
  message: ChatMessage;
  onMessageClick?: () => void;
  opacity?: number;
  messageRef?: (el: HTMLDivElement | null) => void;
  isSelected?: boolean;
  onClick?: () => void;
}

function TextPartView({ part }: { part: TextPart }) {
  if (!part.text) return null;
  return (
    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {part.text}
    </span>
  );
}

function ReasoningPartView({ part }: { part: ReasoningPart }) {
  const [collapsed, setCollapsed] = useState(!AXSDK.config?.debug);
  if (!part.text) return null;

  return (
    <div
      style={{
        borderLeft: "2px solid rgba(167, 139, 250, 0.4)",
        paddingLeft: 10,
        marginBottom: 6,
        color: "rgba(80, 60, 160, 0.9)",
        fontSize: "0.82em",
      }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(120, 90, 200, 0.85)",
          fontSize: "0.75em",
          fontWeight: 600,
          padding: 0,
          marginBottom: collapsed ? 0 : 4,
          display: "flex",
          alignItems: "center",
          gap: 4,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: "0.65em" }}>{collapsed ? "▶" : "▼"}</span>
        {AXSDK.t("chatThought")}
      </button>
      {!collapsed && (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: 0.85 }}>
          {part.text}
        </div>
      )}
    </div>
  );
}

function ToolPartView({ part }: { part: ToolPart }) {
  const [collapsed, setCollapsed] = useState(true);

  const statusColor =
    part.state.status === "completed"
      ? "rgba(52, 211, 153, 0.9)"
      : part.state.status === "error"
      ? "rgba(248, 113, 113, 0.9)"
      : "rgba(251, 191, 36, 0.9)";

  const durationMs =
    part.state.time
      ? part.state.time.end - part.state.time.start
      : null;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.07)",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 8,
        marginBottom: 6,
        overflow: "hidden",
        fontSize: "0.8em",
      }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          color: "rgba(40,40,80,0.75)",
          textAlign: "left",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: "0.6em", opacity: 0.6 }}>{collapsed ? "▶" : "▼"}</span>
        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "rgba(100,60,200,0.85)" }}>
          {part.tool}
        </span>
        {part.state.title && (
          <span style={{ opacity: 0.55, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {part.state.title}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: statusColor, fontSize: "0.7em", fontWeight: 600, flexShrink: 0 }}>
          {part.state.status}
          {durationMs !== null && ` · ${durationMs}ms`}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: "0 10px 8px 10px", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          {part.state.input && (
            <div style={{ marginTop: 6 }}>
              <div style={{ opacity: 0.5, fontSize: "0.7em", marginBottom: 2, fontWeight: 600 }}>INPUT</div>
              <pre
                style={{
                  margin: 0,
                  background: "rgba(0,0,0,0.06)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  overflowX: "auto",
                  fontSize: "0.75em",
                  color: "rgba(40,40,80,0.8)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(part.state.input, null, 2)}
              </pre>
            </div>
          )}
          {part.state.output && (
            <div style={{ marginTop: 6 }}>
              <div style={{ opacity: 0.5, fontSize: "0.7em", marginBottom: 2, fontWeight: 600 }}>OUTPUT</div>
              <pre
                style={{
                  margin: 0,
                  background: "rgba(0,0,0,0.06)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  overflowX: "auto",
                  fontSize: "0.75em",
                  color: "rgba(20,140,100,0.85)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {part.state.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepFinishView({ part }: { part: StepFinishPart }) {
  if (!part.tokens || !AXSDK.config?.debug) return null;
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div
      style={{
        fontSize: "0.7em",
        color: "rgba(80,80,120,0.45)",
        marginTop: 4,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        userSelect: "none",
      }}
    >
      {part.tokens && (
        <>
          <span>in:{fmt(part.tokens.input)}</span>
          <span>out:{fmt(part.tokens.output)}</span>
          <span>reas:{fmt(part.tokens.reasoning)}</span>
          <span>cache R/W: {fmt(part.tokens.cache.read)}/{fmt(part.tokens.cache.write)}</span>
        </>
      )}
    </div>
  );
}

function AssistantErrorView({ name, message: msg }: { name: string; message: string }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        marginTop: 8,
        padding: "7px 10px",
        borderRadius: 8,
        background: "rgba(220, 38, 38, 0.08)",
        border: "1px solid rgba(220, 38, 38, 0.35)",
        color: "rgba(185, 28, 28, 0.95)",
        fontSize: "0.8em",
        lineHeight: 1.5,
      }}
    >
      <span style={{ flexShrink: 0, fontSize: "0.9em" }}>⚠</span>
      <div>
        <span style={{ fontWeight: 700, marginRight: 4 }}>Error{name ? ` · ${name}` : ""}:</span>
        <span style={{ wordBreak: "break-word" }}>{msg}</span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  const dotStyle = (delayMs: number): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--ax-color-primary-muted, rgba(100, 80, 180, 0.6))",
    animation: `axchat-thinking-bounce 1.2s ease-in-out ${delayMs}ms infinite`,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 0",
      }}
      aria-label={AXSDK.t("chatThinking...")}
      role="status"
    >
      <span style={dotStyle(0)} />
      <span style={dotStyle(160)} />
      <span style={dotStyle(320)} />
    </div>
  );
}

function renderPart(part: MessagePart, index: number): React.ReactNode {
  const partId = part.id ?? String(index);

  if (part.type === "text") {
    return <TextPartView key={partId} part={part as TextPart} />;
  }
  if (part.type === "reasoning") {
    return <ReasoningPartView key={partId} part={part as ReasoningPart} />;
  }
  if (part.type === "tool") {
    return <ToolPartView key={partId} part={part as ToolPart} />;
  }
  if (part.type === "step-finish") {
    return <StepFinishView key={partId} part={part as StepFinishPart} />;
  }
  return null;
}

export function AXChatMessage({ message, onMessageClick, opacity = 1, messageRef, onClick }: AXChatMessageProps) {
  const { theme } = useAXTheme();
  const isUser = message.info.role === "user";
  const isThinking = !isUser && !message.finish && !message.info.finish && !message.info.error;
  const messageError = !isUser && message.info.role === "assistant" ? message.info.error : undefined;
  const rawTs = message.timestamp;
  const timestamp: Date | undefined = rawTs instanceof Date
    ? rawTs
    : rawTs != null
      ? new Date(rawTs as string | number)
      : undefined;

  const formattedTime = timestamp
    ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const parts: MessagePart[] = message.parts ?? [];

  const userText = isUser
    ? parts
        .filter((p: MessagePart) => p.type === "text")
        .map((p: MessagePart) => (p as TextPart).text ?? "")
        .join("")
    : null;

  const [animationDone, setAnimationDone] = useState(false);

  return (
    <div
      ref={messageRef}
      onClick={() => { onClick?.(); onMessageClick?.(); }}
      onAnimationEnd={() => setAnimationDone(true)}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        padding: "8px 16px",
        boxSizing: "border-box",
        cursor: "pointer",
        animation: animationDone ? undefined : "axchat-message-in 0.3s ease-out both",
        opacity: animationDone ? opacity : undefined,
        transition: animationDone ? "opacity 0.3s ease" : undefined,
        ...theme.styles?.message?.row,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          background: isUser
            ? "var(--ax-bg-user-message)"
            : "var(--ax-bg-assistant-message)",
          border: isUser
            ? "1px solid rgba(167, 139, 250, 0.3)"
            : "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "10px 14px",
          color: isUser ? "var(--ax-text-primary)" : "var(--ax-text-assistant)",
          fontSize: "1.25em",
          lineHeight: 1.6,
          boxShadow: isUser
            ? "0 2px 12px rgba(124, 58, 237, 0.2)"
            : "0 2px 8px rgba(0, 0, 0, 0.25)",
          ...(isUser ? theme.styles?.message?.userBubble : theme.styles?.message?.assistantBubble),
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {userText}
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {parts.map((part: MessagePart, i: number) => renderPart(part, i))}
            {isThinking && <ThinkingIndicator />}
            {messageError && (
              <AssistantErrorView
                name={messageError.name}
                message={messageError.data.message}
              />
            )}
          </div>
        )}
      </div>

      {formattedTime && (
        <div
          style={{
            fontSize: "0.62em",
            color: "var(--ax-text-timestamp)",
            marginTop: 4,
            userSelect: "none",
            ...theme.styles?.message?.timestamp,
          }}
        >
          {formattedTime}
        </div>
      )}
    </div>
  );
}
