'use client';

import type { ComponentProps } from 'react';
import { AXSDK } from '@axsdk/core';
import ReactMarkdown from 'react-markdown';

export const BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX = 20;

export const bottomSearchMarkdownComponents: ComponentProps<typeof ReactMarkdown>['components'] = {
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

export const closedTooltipMarkdownComponents: ComponentProps<typeof ReactMarkdown>['components'] = {
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
