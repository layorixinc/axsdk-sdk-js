import { useState } from 'react';
import type { ChatMessage } from '@axsdk/core';

export interface AXDevToolsProps {
  debug: boolean | undefined;
  messages: ChatMessage[];
}

export function AXDevTools({ debug, messages }: AXDevToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (!debug) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open DevTools"
        style={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          zIndex: 100010,
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(18, 18, 28, 0.92)',
          border: '1px solid rgba(168, 85, 247, 0.5)',
          color: 'rgba(192, 132, 252, 0.9)',
          fontSize: '1.2rem',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          userSelect: 'none',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(88, 28, 135, 0.85)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(18, 18, 28, 0.92)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(192, 132, 252, 0.9)';
        }}
      >
        🐛
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="DevTools — Chat Messages"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100020,
            background: 'rgba(8, 8, 16, 0.97)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
              background: 'rgba(18, 18, 28, 0.95)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: 'linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '0.06em',
              }}
            >
              ⚙ AXSDK DevTools — Chat Messages ({messages.length})
            </span>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close DevTools"
              style={{
                background: 'transparent',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: 6,
                color: 'rgba(192, 132, 252, 0.85)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '4px 12px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(88, 28, 135, 0.6)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(192, 132, 252, 0.85)';
              }}
            >
              ✕ Close
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minHeight: 0,
            }}
          >
            {messages.length === 0 ? (
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  marginTop: '2rem',
                }}
              >
                No messages yet.
              </p>
            ) : (
              messages.map((message, idx) => {
                const isExpanded = expandedIds.has(message.info.id);
                return (
                  <div
                    key={message.info.id}
                    style={{
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: 'rgba(18, 18, 28, 0.6)',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpand(message.info.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpand(message.info.id);
                        }
                      }}
                      style={{
                        padding: '6px 14px',
                        borderBottom: isExpanded ? '1px solid rgba(168, 85, 247, 0.15)' : 'none',
                        background: 'rgba(88, 28, 135, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.68rem',
                          color: 'rgba(255,255,255,0.35)',
                          letterSpacing: '0.04em',
                          flexShrink: 0,
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                          color: 'rgba(255,255,255,0.35)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color:
                            message.info.role === 'assistant'
                              ? '#818cf8'
                              : message.info.role === 'user'
                              ? '#38bdf8'
                              : '#c084fc',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {message.info.role}
                      </span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.68rem',
                          color: 'rgba(255,255,255,0.3)',
                          marginLeft: 'auto',
                        }}
                      >
                        id: {message.info.id}
                      </span>
                    </div>

                    {isExpanded && (
                      <pre
                        style={{
                          margin: 0,
                          padding: '12px 14px',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          lineHeight: 1.6,
                          color: 'rgba(255, 255, 255, 0.80)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          overflowX: 'auto',
                        }}
                      >
                        {JSON.stringify(message, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
