'use client';

interface BottomSearchBarUnreadIndicatorProps {
  mode: 'unread' | 'message';
}

export function BottomSearchBarUnreadIndicator({ mode }: BottomSearchBarUnreadIndicatorProps) {
  const isUnread = mode === 'unread';

  return (
    <div
      data-ax-bottom-search-bar="unread-indicator"
      data-ax-bottom-search-bar-indicator={mode}
      aria-hidden="true"
      title={isUnread ? 'Unread assistant message' : 'Assistant message'}
      style={{
        position: 'fixed',
        right: 'calc(max(1em, env(safe-area-inset-right)) + 0.15em)',
        bottom: 'calc(max(1em, env(safe-area-inset-bottom)) + 2.9em)',
        zIndex: 10004,
        minWidth: '1.55em',
        height: '1.55em',
        borderRadius: '999px',
        border: isUnread
          ? '1px solid var(--ax-border-error, rgba(248,113,113,0.42))'
          : '1px solid rgba(34,197,94,0.45)',
        background: isUnread ? 'var(--ax-text-error, #f87171)' : 'var(--ax-color-success, #22c55e)',
        color: 'var(--ax-text-primary, #fff)',
        boxShadow: '0 8px 22px rgba(0,0,0,0.34), 0 0 0 3px var(--ax-bg-popover, rgba(18,18,28,0.92))',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.72em',
        fontWeight: 800,
        letterSpacing: '0.02em',
        lineHeight: 1,
        pointerEvents: 'none',
      }}
    >
      {isUnread ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-ax-bottom-search-bar="unread-indicator-alert-icon">
          <path d="M12 5v8" />
          <path d="M12 19h.01" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-ax-bottom-search-bar="unread-indicator-message-icon">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      )}
    </div>
  );
}
