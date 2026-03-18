import React, { useRef, useState } from 'react';
import { AXSDK } from '@axsdk/core';

export interface AXChatMessageInputProps {
  onSend: (message: string) => void;
  onFocus?: () => void;
  /** Called whenever the textarea value changes (i.e. the user is typing). */
  onInputChange?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AXChatMessageInput({
  onSend,
  onFocus,
  onInputChange,
  onClear,
  disabled = false,
  placeholder = "Message",
}: AXChatMessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Clear button */}
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
          width: "3rem",
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

      {/* Textarea */}
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
        rows={1}
        style={{
          flex: 1,
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
          maxHeight: "4rem",
          overflowY: "auto",
        }}
      />

      {/* Send button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        style={{
          flexShrink: 0,
          background: message.trim()
            ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
            : "rgba(255, 255, 255, 0.07)",
          border: "none",
          borderRadius: 10,
          color: message.trim() ? "#fff" : "rgba(255, 255, 255, 0.25)",
          fontSize: "1rem",
          fontWeight: 600,
          padding: "10px 16px",
          cursor: message.trim() && !disabled ? "pointer" : "default",
          transition: "background 0.18s, color 0.18s, transform 0.1s",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
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
        {AXSDK.t("chatSend")}
      </button>
    </div>
  );
}
