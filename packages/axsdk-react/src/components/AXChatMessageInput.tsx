'use client';

import React, { useRef, useState, useEffect } from 'react';
import { AXSDK } from '@axsdk/core';
import { useStore } from 'zustand';

export interface AXChatMessageInputProps {
  onSend: (message: string) => void;
  onFocus?: () => void;
  /** Called whenever the textarea value changes (i.e. the user is typing). */
  onInputChange?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Optional guide text rendered at the top of the input card (e.g. busy/idle status hint). */
  guideText?: string;
  /** When true, focuses the textarea automatically on mount. */
  autoFocus?: boolean;
  /** Called when the textarea is focused automatically (via autoFocus). */
  onAutoFocus?: () => void;
  /**
   * Increment this value to programmatically focus the message textarea.
   * Typically incremented after the open animation completes (~300ms after isOpen becomes true).
   */
  focusTrigger?: number;
}

export function AXChatMessageInput({
  onSend,
  onFocus,
  onInputChange,
  onClear,
  disabled = false,
  placeholder = "Message",
  guideText,
  autoFocus = false,
  onAutoFocus,
  focusTrigger,
}: AXChatMessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      onAutoFocus?.();
    }
  }, [autoFocus]);

  // Focus the textarea whenever focusTrigger increments
  useEffect(() => {
    if (focusTrigger == null) return;
    textareaRef.current?.focus();
  }, [focusTrigger]);
  const { errors } = useStore(AXSDK.getErrorStore());
  const { messages } = useStore(AXSDK.getChatStore());
  const lastMessage = messages?.[messages.length - 1];
  const latestError = errors[0] ?? null;
  const effectiveError = !latestError?.url?.startsWith("axsdk://") || latestError?.method == "session" || (lastMessage?.info?.id === latestError?.id) ? latestError : null

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "rgba(12, 12, 18, 0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "1.25rem",
        boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(120,80,255,0.15)",
        padding: "0.5rem",
        paddingBottom: "0.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: guideText ? "11rem" : "9rem",
      }}
    >
      <div
        style={{
          fontSize: "1rem",
          color: "rgba(255, 255, 255, 0.75)",
          padding: "8px 4px",
          textAlign: "center",
          whiteSpace: "pre-wrap",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          minHeight: "2rem",
        }}
      >
        {guideText}
      </div>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          onInputChange?.();
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (textareaRef.current) {
            textareaRef.current.style.borderColor = "rgba(167, 139, 250, 0.55)";
          }
          onFocus?.();
        }}
        onBlur={() => {
          if (textareaRef.current) {
            textareaRef.current.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        style={{
          width: "100%",
          resize: "none",
          background: "rgba(255, 255, 255, 0.07)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 10,
          color: "rgba(255, 255, 255, 0.92)",
          fontSize: "1rem",
          lineHeight: 1.5,
          padding: "10px 14px",
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          caretColor: "#a78bfa",
          transition: "border-color 0.15s",
          minHeight: "3.5rem",
          maxHeight: "8rem",
          overflowY: "auto",
        }}
      />

      {effectiveError && (
        <div
          style={{
            fontSize: "0.8125rem",
            color: "#f87171",
            padding: "4px 6px",
            borderRadius: 6,
            background: "rgba(248, 113, 113, 0.08)",
            border: "1px solid rgba(248, 113, 113, 0.25)",
            wordBreak: "break-word",
          }}
        >
          {effectiveError.message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem" }}>
        <button
          type="button"
          onClick={() => onClear?.()}
          disabled={disabled}
          title={AXSDK.t("chatClearTooltip")}
          style={{
            flexShrink: 0,
            background: "rgba(255, 255, 255, 0.07)",
            border: "none",
            borderRadius: 10,
            color: "rgba(255, 255, 255, 0.45)",
            width: "4rem",
            height: "3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "default" : "pointer",
            transition: "background 0.18s, color 0.18s, transform 0.1s",
            padding: 0,
          }}
          onMouseEnter={(e) => {
            if (disabled) return;
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.13)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255, 255, 255, 0.85)";
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.07)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255, 255, 255, 0.45)";
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          <svg
            width="32"
            height="32"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.021-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          style={{
            flex: 1,
            flexShrink: 0,
            background: message.trim()
              ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
              : "rgba(255, 255, 255, 0.07)",
            border: "none",
            borderRadius: 10,
            marginLeft: "0.5rem",
            marginRight: "2rem",
            height: "3rem",
            color: message.trim() ? "#fff" : "rgba(255, 255, 255, 0.25)",
            fontSize: "1rem",
            fontWeight: 600,
            padding: "10px 16px",
            cursor: message.trim() && !disabled ? "pointer" : "default",
            transition: "background 0.18s, color 0.18s, transform 0.1s",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!message.trim() || disabled) return;
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          <svg
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
          </svg>
          {AXSDK.t("chatSend")}
        </button>
      </div>
    </div>
  );
}
