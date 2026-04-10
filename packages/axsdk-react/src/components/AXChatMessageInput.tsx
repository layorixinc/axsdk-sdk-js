'use client';

import React, { useRef, useState, useEffect } from 'react';
import { AXSDK } from '@axsdk/core';
import { useStore } from 'zustand';
import { useAXTheme } from '../AXThemeContext';

export interface AXChatMessageInputProps {
  onSend: (message: string) => void;
  onFocus?: () => void;
  onInputChange?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
  guideText?: string;
  onboarding?: string;
  onOnboardingSelect?: (text: string) => void;
  autoFocus?: boolean;
  onAutoFocus?: () => void;
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
  onboarding,
  onOnboardingSelect,
  autoFocus = false,
  onAutoFocus,
  focusTrigger,
}: AXChatMessageInputProps) {
  const { theme } = useAXTheme();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      onAutoFocus?.();
    }
  }, [autoFocus]);

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
        background: "var(--ax-bg-base)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.12))",
        borderRadius: "1.25em",
        boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(120,80,255,0.15)",
        padding: "0.5em",
        paddingBottom: "0.25em",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: guideText ? "11em" : "9em",
        ...theme.styles?.input?.card,
      }}
    >
      <div
        style={{
          fontSize: "1em",
          color: "var(--ax-text-muted)",
          padding: "8px 4px",
          textAlign: "center",
          whiteSpace: "pre-wrap",
          border: "1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.15))",
          minHeight: "2em",
          ...theme.styles?.input?.guideText,
        }}
      >
        {guideText}
        {onboarding && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0.4em",
              marginTop: guideText ? "0.6em" : 0,
            }}
          >
            {onboarding.split(",").map((raw, i) => {
              const text = raw.trim();
              if (!text) return null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onOnboardingSelect?.(text)}
                  style={{
                    background: "var(--ax-bg-input-textarea)",
                    border: "1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.2))",
                    borderRadius: 999,
                    color: "var(--ax-text-primary)",
                    fontSize: "0.85em",
                    padding: "0.35em 0.9em",
                    cursor: "pointer",
                    transition: "background 0.15s, transform 0.1s, border-color 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--ax-color-primary, #7c3aed) 20%, transparent)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ax-color-primary-light, rgba(167, 139, 250, 0.55))";
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--ax-bg-input-textarea)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ax-border-surface, rgba(255, 255, 255, 0.2))";
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                  }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        )}
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
            textareaRef.current.style.borderColor = "var(--ax-color-primary-light, rgba(167, 139, 250, 0.55))";
          }
          onFocus?.();
        }}
        onBlur={() => {
          if (textareaRef.current) {
            textareaRef.current.style.borderColor = "var(--ax-border-surface, rgba(255, 255, 255, 0.12))";
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        style={{
          width: "100%",
          resize: "none",
          background: "var(--ax-bg-input-textarea)",
          border: "1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.12))",
          borderRadius: 10,
          color: "var(--ax-text-primary)",
          fontSize: "1em",
          lineHeight: 1.5,
          padding: "10px 14px",
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          caretColor: "var(--ax-text-caret)",
          transition: "border-color 0.15s",
          minHeight: "3.5em",
          maxHeight: "8em",
          overflowY: "auto",
          ...theme.styles?.input?.textarea,
        }}
      />

      {effectiveError && (
        <div
          style={{
            fontSize: "0.8125em",
            color: "var(--ax-text-error)",
            padding: "4px 6px",
            borderRadius: 6,
            background: "var(--ax-bg-error, rgba(248, 113, 113, 0.08))",
            border: "1px solid var(--ax-border-error, rgba(248, 113, 113, 0.25))",
            wordBreak: "break-word",
          }}
        >
          {effectiveError.message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25em" }}>
        <button
          type="button"
          onClick={() => onClear?.()}
          disabled={disabled}
          title={AXSDK.t("chatClearTooltip")}
          style={{
            flexShrink: 0,
            background: "var(--ax-bg-input-textarea)",
            border: "none",
            borderRadius: 10,
            color: "var(--ax-text-dim)",
            width: "4em",
            height: "3em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "default" : "pointer",
            transition: "background 0.18s, color 0.18s, transform 0.1s",
            padding: 0,
            ...theme.styles?.input?.clearButton,
          }}
          onMouseEnter={(e) => {
            if (disabled) return;
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.13)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ax-text-muted)";
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--ax-bg-input-textarea)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ax-text-dim)";
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
              ? `linear-gradient(135deg, var(--ax-color-primary, #7c3aed) 0%, var(--ax-color-primary-dark, #4f46e5) 100%)`
              : "var(--ax-bg-input-textarea)",
            border: "none",
            borderRadius: 10,
            marginLeft: "0.5em",
            marginRight: "2em",
            height: "3em",
            color: message.trim() ? "#fff" : "var(--ax-text-dim)",
            fontSize: "1em",
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
            ...theme.styles?.input?.sendButton,
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
