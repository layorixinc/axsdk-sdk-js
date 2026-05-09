'use client';

import { useSyncExternalStore } from 'react';
import { AXSDK } from '@axsdk/core';

export interface AXChatErrorBarProps {
  message?: { id: string, text: string };
}

export function AXChatErrorBar({ message } : AXChatErrorBarProps) {
  const errorStore = AXSDK.getErrorStore();
  const errors = useSyncExternalStore(errorStore.subscribe, errorStore.getState, errorStore.getState);
  const latestError = errors.errors[0] ?? null;
  const messageErrorUrl = message ? `axsdk://${message.id}` : null;
  const effectiveError = latestError?.method === "message" && latestError.url === messageErrorUrl ? latestError : null;

  if (!effectiveError) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 14px",
        borderTop: "1px solid rgba(239, 68, 68, 0.35)",
        background: "rgba(239, 68, 68, 0.12)",
        flexShrink: 0,
      }}
    >
      <span style={{
        fontSize: "0.75em",
        lineHeight: "1.1em",
        color: "var(--ax-text-error)",
        flexShrink: 0,
        marginTop: 1,
      }}>⚠</span>
      <span style={{
        fontSize: "0.75em",
        lineHeight: "1.1em",
        color: "var(--ax-text-error)",
        wordBreak: "break-word",
        flex: 1,
      }}>{effectiveError.message}</span>
    </div>
  );
}
