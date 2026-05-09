'use client';

import type { ChatMessage } from '@axsdk/core';
import type { ComponentProps, CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useState } from 'react';
import { AXSDK } from '@axsdk/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAXTheme } from '../AXThemeContext';
import { AXSearchBar } from './AXSearchBar';
import { AXPoweredBy } from './AXPoweredBy';
import { AXChatErrorBar } from './AXChatErrorBar';
import { AXTtsToggleButton, type AXTtsControl } from './AXChatMessagePopoverBase';
import {
  selectAXSearchOnboardingText,
} from './AXSearchOnboardingContent';
import { extractMessageText, findLatestAssistantMessage } from './AXAnswerPanelSelectors';
import { buildAXBottomSearchBarChipTexts } from './AXBottomSearchBarContent';

const BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX = 20;
const bottomSearchMarkdownComponents: ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => (
    <p style={{ margin: '0 0 0.6em 0', lineHeight: `${BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX}px` }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 0.6em 0', paddingLeft: '1.4em' }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 0.6em 0', paddingLeft: '1.4em' }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: '0.2em', lineHeight: `${BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX}px` }}>{children}</li>
  ),
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.3em', fontWeight: 700, margin: '0.6em 0 0.4em', color: 'var(--ax-text-primary, rgba(255,255,255,0.95))', lineHeight: 1.3 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '1.15em', fontWeight: 700, margin: '0.6em 0 0.4em', color: 'var(--ax-text-primary, rgba(255,255,255,0.93))', lineHeight: 1.3 }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '1.05em', fontWeight: 600, margin: '0.5em 0 0.35em', color: 'var(--ax-text-primary, rgba(255,255,255,0.92))', lineHeight: 1.3 }}>{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 style={{ fontSize: '1em', fontWeight: 600, margin: '0.5em 0 0.3em', color: 'var(--ax-text-primary, rgba(255,255,255,0.90))', lineHeight: 1.3 }}>{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 style={{ fontSize: '0.95em', fontWeight: 600, margin: '0.4em 0 0.25em', color: 'var(--ax-text-primary, rgba(255,255,255,0.88))', lineHeight: 1.3 }}>{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 style={{ fontSize: '0.9em', fontWeight: 600, margin: '0.4em 0 0.25em', color: 'var(--ax-text-muted, rgba(255,255,255,0.85))', lineHeight: 1.3 }}>{children}</h6>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code style={{
          display: 'block',
          fontFamily: '\'Fira Mono\', \'Consolas\', \'Menlo\', monospace',
          fontSize: '0.85em',
          color: 'var(--ax-text-primary, rgba(204, 251, 241, 0.92))',
        }}>{children}</code>
      );
    }
    return (
      <code style={{
        background: 'var(--ax-bg-popover, rgba(0, 212, 255, 0.15))',
        borderRadius: 4,
        padding: '0.1em 0.35em',
        fontSize: '0.87em',
        fontFamily: '\'Fira Mono\', \'Consolas\', \'Menlo\', monospace',
        color: 'var(--ax-text-primary, rgba(204, 251, 241, 0.95))',
        border: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.25))',
      }}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre style={{
      background: 'var(--ax-bg-popover, rgba(0, 0, 0, 0.4))',
      borderRadius: 8,
      padding: '10px 12px',
      margin: '0.5em 0 0.7em',
      overflowX: 'auto',
      border: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.2))',
      fontSize: '0.87em',
      lineHeight: 1.5,
    }}>{children}</pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--ax-color-primary-light, rgba(0, 212, 255, 0.9))',
        textDecoration: 'none',
        borderBottom: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.4))',
      }}
      onMouseEnter={(event) => { event.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={(event) => { event.currentTarget.style.textDecoration = 'none'; }}
    >{children}</a>
  ),
  strong: ({ children }) => {
    const linkEnabled = AXSDK.config?.chatLinkEnabled !== false;
    if (!linkEnabled) {
      return <strong style={{ fontWeight: 700, color: 'var(--ax-text-primary, rgba(255, 255, 255, 0.97))' }}>{children}</strong>;
    }
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children ?? '');
    return (
      <strong
        role="button"
        tabIndex={0}
        onClick={(event) => { event.stopPropagation(); AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.link', data: { text } }); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.link', data: { text } });
          }
        }}
        style={{
          fontWeight: 700,
          color: 'var(--ax-color-primary-light, rgba(0, 212, 255, 0.95))',
          cursor: 'pointer',
          borderBottom: '1px dashed var(--ax-color-primary-light, rgba(0, 212, 255, 0.5))',
          paddingBottom: 1,
        }}
        onMouseEnter={(event) => { event.currentTarget.style.borderBottomStyle = 'solid'; event.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={(event) => { event.currentTarget.style.borderBottomStyle = 'dashed'; event.currentTarget.style.opacity = '1'; }}
      >{children}</strong>
    );
  },
  em: ({ children }) => (
    <em style={{ fontStyle: 'italic', color: 'var(--ax-text-muted, rgba(204, 251, 241, 0.9))' }}>{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '3px solid var(--ax-color-primary-light, rgba(0, 212, 255, 0.65))',
      margin: '0.5em 0 0.7em',
      paddingLeft: '0.85em',
      color: 'var(--ax-text-muted, rgba(255, 255, 255, 0.72))',
      fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
  hr: () => (
    <hr style={{
      border: 'none',
      borderTop: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.3))',
      margin: '0.75em 0',
    }} />
  ),
};

const closedTooltipMarkdownComponents: ComponentProps<typeof ReactMarkdown>['components'] = {
  ...bottomSearchMarkdownComponents,
  a: ({ children }) => (
    <span
      style={{
        color: 'var(--ax-color-primary-light, rgba(0, 212, 255, 0.9))',
        textDecoration: 'none',
        borderBottom: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.4))',
      }}
    >{children}</span>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 800, color: 'var(--ax-text-primary, rgba(255, 255, 255, 0.97))' }}>{children}</strong>
  ),
};

function findLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.info?.role === 'user') return messages[index];
  }
  return undefined;
}

function AssistantInfoErrorPreview({ error }: { error: ChatMessage['info']['error'] }) {
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

export interface AXBottomSearchBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  isDesktop: boolean;
  isBusy: boolean;
  appInfoReady: boolean;
  searchBarValue: string;
  onSearchBarValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  onboardingText?: string;
  shortcutText?: string;
  showShortcutChips?: boolean;
  latestUserText?: string;
  placeholder?: string;
  buttonLabel?: string;
  previewTitle?: string;
  resetLabel?: string;
  closeLabel?: string;
  emptyText?: string;
  busyText?: string;
  ttsControl?: AXTtsControl;
}

export function AXBottomSearchBar({
  open,
  onOpenChange,
  messages,
  isDesktop,
  isBusy,
  appInfoReady,
  searchBarValue,
  onSearchBarValueChange,
  onSearch,
  onClear,
  onboardingText,
  shortcutText,
  showShortcutChips = false,
  latestUserText,
  placeholder,
  buttonLabel = '실행',
  previewTitle,
  resetLabel = 'Clear',
  closeLabel = 'Close',
  emptyText,
  busyText,
  ttsControl,
}: AXBottomSearchBarProps) {
  const { theme } = useAXTheme();
  const latestAssistantMessage = findLatestAssistantMessage(messages);
  const latestAssistantText = extractMessageText(latestAssistantMessage);
  const latestAssistantInfoError = latestAssistantMessage?.info.error;
  const latestAssistantErrorMessage = latestAssistantMessage
    ? { id: latestAssistantMessage.info.id, text: latestAssistantText }
    : undefined;
  const latestAssistantKey = latestAssistantMessage
    ? `${latestAssistantMessage.info.id}:${latestAssistantText}`
    : null;
  const latestUserHeaderText = latestUserText?.trim() || extractMessageText(findLatestUserMessage(messages)).trim();
  const previewHeaderText = latestUserHeaderText || previewTitle || AXSDK.t('chatPreviewTitle');
  const chipTexts = buildAXBottomSearchBarChipTexts(onboardingText, latestUserText, shortcutText, showShortcutChips);
  const statusText = isBusy ? (busyText ?? AXSDK.t('chatBusyGuide')) : (emptyText ?? AXSDK.t('chatEmpty'));
  const previewGlowEnabled = Boolean(latestAssistantText && !isBusy);
  const resetButtonLabel = resetLabel.trim() || 'Clear';
  const closeButtonLabel = closeLabel.trim() || 'Close';
  const [readAssistantKey, setReadAssistantKey] = useState<string | null>(() => (open ? latestAssistantKey : null));
  const hasUnreadAssistantText = Boolean(latestAssistantKey && latestAssistantText && readAssistantKey !== latestAssistantKey);
  const closedTooltipVisible = !open && hasUnreadAssistantText;
  const launcherImageSrc = isBusy
    ? (theme.buttonAnimationImageUrl ?? theme.buttonImageUrl)
    : theme.buttonImageUrl;

  function markLatestAssistantRead() {
    if (latestAssistantKey) {
      setReadAssistantKey(latestAssistantKey);
    }
  }

  function openAndMarkRead() {
    markLatestAssistantRead();
    onOpenChange(true);
  }

  function closeAndMarkRead() {
    markLatestAssistantRead();
    onOpenChange(false);
  }

  function handleClosedTooltipKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openAndMarkRead();
    }
  }

  function submitChipText(text: string) {
    selectAXSearchOnboardingText(text, onSearch);
  }

  function handleChipPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleChipMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  const previewContentStyle: CSSProperties = {
    padding: '10px 14px 10px 14px',
    fontSize: '0.95em',
    lineHeight: `${BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX}px`,
    color: 'var(--ax-text-primary)',
    wordBreak: 'break-word',
    ...theme.styles?.popover?.content,
  };

  return (
    <div
      data-ax-bottom-search-bar="root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        pointerEvents: 'none',
      }}
    >
      <style>
        {`@keyframes ax-bottom-search-bar-launcher-idle-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes ax-bottom-search-bar-launcher-ring-rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes ax-bottom-search-bar-launcher-glow{0%,100%{opacity:.56;filter:blur(14px)}50%{opacity:.92;filter:blur(22px)}}@keyframes ax-bottom-search-bar-launcher-busy-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes ax-bottom-search-bar-launcher-busy-pulse{0%,100%{opacity:.76;transform:scale(.94)}50%{opacity:1;transform:scale(1.03)}}@keyframes ax-bottom-search-bar-tooltip-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}
      </style>
      {!open && (
        <>
          {closedTooltipVisible && latestAssistantText && (
            <div
              data-ax-bottom-search-bar="closed-tooltip"
              role="button"
              tabIndex={0}
              aria-live="polite"
              aria-label={`Open AXSDK search. Unread assistant message: ${latestAssistantText}`}
              title={latestAssistantText}
              onClick={openAndMarkRead}
              onKeyDown={handleClosedTooltipKeyDown}
              style={{
                position: 'fixed',
                right: 'calc(max(1em, env(safe-area-inset-right)) + 4.55em)',
                bottom: 'calc(max(1em, env(safe-area-inset-bottom)) + 0.4em)',
                zIndex: 10003,
                maxWidth: 'min(320px, calc(100vw - 6em))',
                boxSizing: 'border-box',
                ...theme.styles?.popover?.content,
                border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.35))',
                borderRadius: 'var(--ax-tooltip-radius, 12px)',
                background: 'var(--ax-bg-popover, rgba(20,20,30,0.92))',
                color: 'var(--ax-text-primary, rgba(255,255,255,0.94))',
                padding: 'var(--ax-tooltip-padding, 10px 14px)',
                fontSize: 'var(--ax-tooltip-font-size, 0.95em)',
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: '0.01em',
                whiteSpace: 'normal',
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
                pointerEvents: 'auto',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: 'var(--ax-tooltip-shadow, 0 12px 30px rgba(0,0,0,0.42)), 0 0 0 1px rgba(var(--ax-color-primary-rgb, 0,212,255),0.12) inset',
                animation: 'ax-bottom-search-bar-tooltip-in 0.2s ease-out both',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={closedTooltipMarkdownComponents}>
                {latestAssistantText}
              </ReactMarkdown>
            </div>
          )}
          {hasUnreadAssistantText && latestAssistantText && (
            <div
              data-ax-bottom-search-bar="unread-indicator"
              aria-hidden="true"
              title="Unread assistant message"
              style={{
                position: 'fixed',
                right: 'calc(max(1em, env(safe-area-inset-right)) + 0.15em)',
                bottom: 'calc(max(1em, env(safe-area-inset-bottom)) + 2.9em)',
                zIndex: 10004,
                minWidth: '1.55em',
                height: '1.55em',
                borderRadius: '999px',
                border: '1px solid var(--ax-border-error, rgba(248,113,113,0.42))',
                background: 'var(--ax-text-error, #f87171)',
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v8" />
                <path d="M12 19h.01" />
              </svg>
            </div>
          )}
          <button
            type="button"
            aria-label={hasUnreadAssistantText ? 'Open AXSDK search. Unread assistant message' : 'Open AXSDK search'}
            onClick={openAndMarkRead}
            disabled={!appInfoReady}
            data-ax-bottom-search-bar="launcher"
            data-ax-bottom-search-bar-animation={isBusy ? 'busy' : 'idle'}
            style={{
              position: 'fixed',
              right: 'max(1em, env(safe-area-inset-right))',
              bottom: 'max(1em, env(safe-area-inset-bottom))',
              width: '3.75em',
              height: '3.75em',
              borderRadius: theme.buttonBorderRadius ?? '50%',
              border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.45))',
              background: launcherImageSrc ? 'transparent' : 'var(--ax-bg-popover)',
              color: 'var(--ax-text-primary)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.36), 0 0 0 1px rgba(var(--ax-color-primary-rgb, 0, 212, 255), 0.18) inset',
              cursor: appInfoReady ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: appInfoReady ? 1 : 0.66,
              pointerEvents: 'auto',
              padding: 0,
              overflow: 'hidden',
              isolation: 'isolate',
              transition: 'transform 0.18s ease, opacity 0.18s ease, filter 0.18s ease',
              animation: appInfoReady
                ? isBusy
                  ? 'ax-bottom-search-bar-launcher-busy-pulse 1.2s ease-in-out infinite'
                  : 'ax-bottom-search-bar-launcher-idle-pulse 2.5s ease-in-out infinite'
                : 'none',
              ...theme.styles?.button?.wrapper,
            }}
          >
            {launcherImageSrc && (
              <img
                src={launcherImageSrc}
                alt=""
                aria-hidden="true"
                data-ax-bottom-search-bar="launcher-image"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: 'inherit',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
            )}
            {!launcherImageSrc && !isBusy && (
              <>
                <span
                  aria-hidden="true"
                  data-ax-bottom-search-bar="launcher-idle-ring"
                  style={{
                    position: 'absolute',
                    inset: '-0.4em',
                    borderRadius: 'inherit',
                    background: 'conic-gradient(from 0deg, var(--ax-color-accent1, #00d4ff), var(--ax-color-accent2, #38bdf8), var(--ax-color-accent3, #22e6c7), var(--ax-color-accent4, #0ea5e9), var(--ax-color-accent1, #00d4ff))',
                    filter: 'blur(2px)',
                    opacity: 0.76,
                    animation: 'ax-bottom-search-bar-launcher-ring-rotate 4s linear infinite',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                <span
                  aria-hidden="true"
                  data-ax-bottom-search-bar="launcher-idle-glow"
                  style={{
                    position: 'absolute',
                    inset: '-0.75em',
                    borderRadius: 'inherit',
                    background: 'conic-gradient(from 0deg, var(--ax-color-accent1, #00d4ff), var(--ax-color-accent2, #38bdf8), var(--ax-color-accent3, #22e6c7), var(--ax-color-accent4, #0ea5e9), var(--ax-color-accent1, #00d4ff))',
                    filter: 'blur(16px)',
                    opacity: 0.7,
                    animation: 'ax-bottom-search-bar-launcher-ring-rotate 4s linear infinite, ax-bottom-search-bar-launcher-glow 3s ease-in-out infinite',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              </>
            )}
            {!launcherImageSrc && isBusy && (
              <>
                <span
                  aria-hidden="true"
                  data-ax-bottom-search-bar="launcher-busy-spin"
                  style={{
                    position: 'absolute',
                    inset: '-0.2em',
                    borderRadius: 'inherit',
                    background: 'conic-gradient(from 0deg, rgba(var(--ax-color-primary-rgb, 0,212,255),0) 0%, rgba(var(--ax-color-primary-rgb, 0,212,255),1) 20%, var(--ax-color-accent2, #38bdf8) 45%, rgba(var(--ax-color-primary-rgb, 0,212,255),0.6) 70%, rgba(var(--ax-color-primary-rgb, 0,212,255),0) 100%)',
                    animation: 'ax-bottom-search-bar-launcher-busy-spin 1.2s linear infinite',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                <span
                  aria-hidden="true"
                  data-ax-bottom-search-bar="launcher-busy-pulse"
                  style={{
                    position: 'absolute',
                    inset: '0.18em',
                    borderRadius: 'inherit',
                    background: 'conic-gradient(from 180deg, rgba(125,223,240,0) 0%, rgba(125,223,240,0.35) 25%, rgba(125,223,240,0) 50%, rgba(14,165,233,0.25) 75%, rgba(125,223,240,0) 100%)',
                    animation: 'ax-bottom-search-bar-launcher-busy-spin 2s linear infinite reverse, ax-bottom-search-bar-launcher-busy-pulse 1.2s ease-in-out infinite',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
              </>
            )}
            {!launcherImageSrc && (
              <span
                aria-hidden="true"
              style={{
                position: 'relative',
                zIndex: 2,
                width: '2.15em',
                height: '2.15em',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--ax-text-gradient)',
                color: 'var(--ax-text-primary)',
                boxShadow: '0 8px 24px rgba(var(--ax-color-primary-rgb, 0, 212, 255), 0.28)',
                ...theme.styles?.button?.orb,
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>
              </span>
            )}
          </button>
        </>
      )}

      {open && (
        <>
          <style>
            {`@keyframes ax-bottom-search-bar-surface-in-desktop{from{opacity:0;transform:translate(-50%,1em)}to{opacity:1;transform:translate(-50%,0)}}@keyframes ax-bottom-search-bar-surface-in-mobile{from{opacity:0;transform:translateY(1em)}to{opacity:1;transform:translateY(0)}}@keyframes ax-bottom-search-bar-preview-pulse{0%,100%{box-shadow:0 4px 24px rgba(0,0,0,0.45),0 1px 0 rgba(255,255,255,0.06) inset,0 0 10px 2px var(--ax-color-primary-light,rgba(0,212,255,0.4))}50%{box-shadow:0 4px 24px rgba(0,0,0,0.45),0 1px 0 rgba(255,255,255,0.06) inset,0 0 24px 8px var(--ax-color-primary-light,rgba(0,212,255,0.75))}}.ax-bottom-search-bar-preview-content::-webkit-scrollbar{display:none}`}
          </style>
          <section
        aria-label="AXSDK bottom search"
        data-ax-bottom-search-bar="surface"
        style={{
          position: 'fixed',
          left: isDesktop ? '50%' : 0,
          right: isDesktop ? undefined : 0,
          bottom: 'max(1em, env(safe-area-inset-bottom))',
          width: isDesktop ? 'min(720px, calc(100vw - 2em))' : 'auto',
          maxWidth: isDesktop ? 'calc(100vw - 2em)' : undefined,
          paddingLeft: isDesktop ? undefined : 'max(0.75em, env(safe-area-inset-left))',
          paddingRight: isDesktop ? undefined : 'max(0.75em, env(safe-area-inset-right))',
          boxSizing: 'border-box',
          transform: isDesktop ? 'translate(-50%, 0)' : 'translateY(0)',
          opacity: 1,
          pointerEvents: 'auto',
          transition: 'opacity 0.24s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          animation: isDesktop
            ? 'ax-bottom-search-bar-surface-in-desktop 0.32s cubic-bezier(0.22, 1, 0.36, 1) both'
            : 'ax-bottom-search-bar-surface-in-mobile 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55em',
          color: 'var(--ax-text-primary)',
        }}
      >
          <article
            aria-label="AXSDK answer preview"
          data-ax-bottom-search-bar="preview"
          style={{
            width: '100%',
            maxHeight: 'min(32vh, 15em)',
            minHeight: '8em',
            boxSizing: 'border-box',
            overflow: 'hidden',
            border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.35))',
            borderRadius: 12,
            background: 'var(--ax-bg-popover)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: previewGlowEnabled
              ? '0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 10px 2px var(--ax-color-primary-light, rgba(0,212,255,0.4))'
              : '0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
            animation: previewGlowEnabled ? 'ax-bottom-search-bar-preview-pulse 2s ease-in-out infinite' : 'none',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            ...theme.styles?.popover?.card,
          }}
        >
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6em',
              padding: '10px 14px 6px 14px',
              borderBottom: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.2))',
              background: 'var(--ax-bg-popover)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'var(--ax-text-muted)',
              fontSize: '0.9em',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {ttsControl ? (
              <AXTtsToggleButton
                control={ttsControl}
                theme={theme}
                rowStyle={{ flex: '1 1 auto', minWidth: 0, padding: 0, justifyContent: 'flex-start' }}
              />
            ) : (
              <span title={previewHeaderText} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewHeaderText}</span>
            )}
            <button
              type="button"
              aria-label={resetButtonLabel}
              title={resetButtonLabel}
              onClick={onClear}
              style={{
                flexShrink: 0,
                minWidth: '4.9em',
                minHeight: '2.72em',
                border: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.4))',
                borderRadius: '999px',
                background: 'var(--ax-bg-input-textarea, rgba(255, 255, 255, 0.12))',
                color: 'var(--ax-text-primary)',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '0.92em',
                fontWeight: 700,
                lineHeight: 1,
                margin: 0,
                padding: '0.42em 0.72em',
                pointerEvents: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5em',
                boxShadow: '0 8px 20px rgba(var(--ax-color-primary-rgb, 0,212,255),0.16)',
                transition: 'filter 0.15s ease, transform 0.12s ease, opacity 0.15s ease',
                ...theme.styles?.popover?.closeButton,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                data-ax-bottom-search-bar="reset-button-icon"
                style={{ flexShrink: 0 }}
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
              <span
                data-ax-bottom-search-bar="reset-button-label"
                style={{
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {resetButtonLabel}
              </span>
            </button>
            <button
              type="button"
              aria-label={closeButtonLabel}
              title={closeButtonLabel}
              onClick={closeAndMarkRead}
              style={{
                flexShrink: 0,
                minWidth: '4.45em',
                minHeight: '2.72em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.43em',
                border: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.4))',
                borderRadius: '999px',
                background: 'var(--ax-bg-input-textarea, rgba(255, 255, 255, 0.12))',
                color: 'var(--ax-text-primary)',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '0.92em',
                fontWeight: 700,
                lineHeight: 1,
                margin: 0,
                padding: '0.42em 0.72em',
                pointerEvents: 'auto',
                ...theme.styles?.popover?.closeButton,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                data-ax-bottom-search-bar="close-button-icon"
                style={{ flexShrink: 0 }}
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span
                data-ax-bottom-search-bar="close-button-label"
                style={{ color: 'inherit', whiteSpace: 'nowrap', userSelect: 'none' }}
              >
                {closeButtonLabel}
              </span>
            </button>
          </header>
          <div
            className="ax-bottom-search-bar-preview-content"
            data-ax-bottom-search-bar="preview-body"
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
            }}
          >
            <div style={previewContentStyle}>
              {latestAssistantText ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={bottomSearchMarkdownComponents}>
                  {latestAssistantText}
                </ReactMarkdown>
              ) : (
                <div
                  role="status"
                  style={{
                    color: 'var(--ax-text-muted)',
                    fontSize: '1em',
                    lineHeight: 1.5,
                    textAlign: 'center',
                  }}
                >
                  {statusText}
                </div>
              )}
              <AssistantInfoErrorPreview error={latestAssistantInfoError} />
            </div>
          </div>
          <AXChatErrorBar message={latestAssistantErrorMessage} />
          {chipTexts.length > 0 && (
            <section
              aria-label="AXSDK search suggestions"
              data-ax-bottom-search-bar="chips"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexShrink: 0,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: '0.45em',
                padding: '0.5em 0.75em 0.35em',
                borderTop: '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
                pointerEvents: 'auto',
                ...theme.styles?.popover?.content,
              }}
            >
              {chipTexts.map((text) => (
                <button
                  key={text}
                  type="button"
                  aria-label={`Search suggestion: ${text}`}
                  title={text}
                  onPointerDown={handleChipPointerDown}
                  onMouseDown={handleChipMouseDown}
                  onClick={() => submitChipText(text)}
                  style={{
                    flex: '0 1 auto',
                    minWidth: 0,
                    maxWidth: 'min(18em, 100%)',
                    border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.4))',
                    borderRadius: '999px',
                    background: 'color-mix(in srgb, var(--ax-color-primary, #00b8db) 14%, var(--ax-bg-input-textarea, transparent))',
                    color: 'var(--ax-text-primary)',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: '0.9em',
                    lineHeight: 1.35,
                    margin: 0,
                    overflow: 'hidden',
                    padding: '0.48em 0.75em',
                    pointerEvents: 'auto',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {text}
                </button>
              ))}
            </section>
          )}
        </article>

        <div
          data-ax-bottom-search-bar="input"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
            borderRadius: '1.15em',
            background: 'var(--ax-bg-popover)',
            boxShadow: '0 18px 64px rgba(0,0,0,0.36), 0 0 0 1px rgba(var(--ax-color-primary-rgb, 0, 212, 255), 0.12)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            ...theme.styles?.input?.card,
          }}
        >
          <AXSearchBar
            placeholder={placeholder ?? AXSDK.t('chatInput')}
            buttonLabel={buttonLabel}
            onSearch={onSearch}
            value={searchBarValue}
            onValueChange={onSearchBarValueChange}
            clearOnSubmit={false}
            disabled={!appInfoReady || isBusy}
            surface="embedded"
          />
        </div>
        <AXPoweredBy
          style={{
            color: 'var(--ax-text-muted, rgba(255,255,255,0.66))',
          }}
        />
      </section>
        </>
      )}
    </div>
  );
}
