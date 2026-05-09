'use client';

import type { ChatMessage } from '@axsdk/core';

export function AssistantInfoErrorPreview({ error }: { error: ChatMessage['info']['error'] }) {
  const message = error?.data.message;
  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.45em',
        marginTop: '0.6em',
        padding: '0.55em 0.7em',
        borderRadius: '0.6em',
        background: 'var(--ax-bg-error)',
        border: '1px solid var(--ax-border-error)',
        color: 'var(--ax-text-error)',
        fontSize: '0.84em',
        lineHeight: 1.5,
      }}
    >
      <span style={{ flexShrink: 0, fontSize: '0.9em' }} aria-hidden="true">⚠</span>
      <div>
        <span style={{ fontWeight: 700, marginRight: '0.3em' }}>Error{error.name ? ` · ${error.name}` : ''}:</span>
        <span style={{ wordBreak: 'break-word' }}>{message}</span>
      </div>
    </div>
  );
}
