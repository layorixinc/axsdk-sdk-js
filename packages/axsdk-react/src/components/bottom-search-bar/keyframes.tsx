'use client';

export function BottomSearchBarLauncherKeyframes() {
  return (
    <style>
      {`@keyframes ax-bottom-search-bar-launcher-idle-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes ax-bottom-search-bar-launcher-ring-rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes ax-bottom-search-bar-launcher-glow{0%,100%{opacity:.56;filter:blur(14px)}50%{opacity:.92;filter:blur(22px)}}@keyframes ax-bottom-search-bar-launcher-busy-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes ax-bottom-search-bar-launcher-busy-pulse{0%,100%{opacity:.76;transform:scale(.94)}50%{opacity:1;transform:scale(1.03)}}@keyframes ax-bottom-search-bar-tooltip-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}
    </style>
  );
}

export function BottomSearchBarSurfaceKeyframes() {
  return (
    <style>
      {`@keyframes ax-bottom-search-bar-surface-in-desktop{from{opacity:0;transform:translate(-50%,1em)}to{opacity:1;transform:translate(-50%,0)}}@keyframes ax-bottom-search-bar-surface-in-mobile{from{opacity:0;transform:translateY(1em)}to{opacity:1;transform:translateY(0)}}@keyframes ax-bottom-search-bar-preview-pulse{0%,100%{box-shadow:0 4px 24px rgba(0,0,0,0.45),0 1px 0 rgba(255,255,255,0.06) inset,0 0 10px 2px var(--ax-color-primary-light,rgba(0,212,255,0.4))}50%{box-shadow:0 4px 24px rgba(0,0,0,0.45),0 1px 0 rgba(255,255,255,0.06) inset,0 0 24px 8px var(--ax-color-primary-light,rgba(0,212,255,0.75))}}.ax-bottom-search-bar-preview-content::-webkit-scrollbar{display:none}`}
    </style>
  );
}
