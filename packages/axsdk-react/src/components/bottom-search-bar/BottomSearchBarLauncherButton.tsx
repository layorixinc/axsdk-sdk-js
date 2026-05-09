'use client';

import type { AXTheme } from '../../theme';

interface BottomSearchBarLauncherButtonProps {
  appInfoReady: boolean;
  hasUnreadAssistantText: boolean;
  isBusy: boolean;
  launcherImageSrc?: string;
  theme: AXTheme;
  onOpen: () => void;
}

export function BottomSearchBarLauncherButton({
  appInfoReady,
  hasUnreadAssistantText,
  isBusy,
  launcherImageSrc,
  theme,
  onOpen,
}: BottomSearchBarLauncherButtonProps) {
  return (
    <button
      type="button"
      aria-label={hasUnreadAssistantText ? 'Open AXSDK search. Unread assistant message' : 'Open AXSDK search'}
      onClick={onOpen}
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
        border: launcherImageSrc ? 'none' : '1px solid var(--ax-border-primary, rgba(0,212,255,0.45))',
        background: launcherImageSrc ? 'transparent' : 'var(--ax-bg-popover)',
        color: 'var(--ax-text-primary)',
        boxShadow: launcherImageSrc ? 'none' : '0 18px 50px rgba(0,0,0,0.36), 0 0 0 1px rgba(var(--ax-color-primary-rgb, 0, 212, 255), 0.18) inset',
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
        animation: launcherImageSrc
          ? 'none'
          : appInfoReady
          ? isBusy
            ? 'ax-bottom-search-bar-launcher-busy-pulse 1.2s ease-in-out infinite'
            : 'ax-bottom-search-bar-launcher-idle-pulse 2.5s ease-in-out infinite'
          : 'none',
        ...theme.styles?.button?.wrapper,
      }}
    >
      {launcherImageSrc && <LauncherImage src={launcherImageSrc} />}
      {!launcherImageSrc && !isBusy && <LauncherIdleLayers />}
      {!launcherImageSrc && isBusy && <LauncherBusyLayers />}
      {!launcherImageSrc && <LauncherGlyph theme={theme} />}
    </button>
  );
}

function LauncherImage({ src }: { src: string }) {
  return (
    <img
      src={src}
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
  );
}

function LauncherIdleLayers() {
  return (
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
  );
}

function LauncherBusyLayers() {
  return (
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
  );
}

function LauncherGlyph({ theme }: { theme: AXTheme }) {
  return (
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
  );
}
