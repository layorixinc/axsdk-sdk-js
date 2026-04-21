import React from 'react';
import ReactDOM from 'react-dom/client';
import { AXSDK, type DeferFn } from '@axsdk/core';
import { AXUI, AXShadowRootProvider } from '@axsdk/react';
import { handleAX } from './axhandler';
import '@axsdk/react/index.css';
import type { AXTheme } from './types';

export type { AXTheme };

export interface AXSDKBrowserConfig {
  apiKey: string;
  appId: string;
  axHandler?: (command: string, args: unknown) => Promise<unknown>;
  theme?: AXTheme;
  [key: string]: unknown;
}

declare const __AXSDK_INLINED_CSS__: string;
const _inlinedCss: string =
  typeof __AXSDK_INLINED_CSS__ !== 'undefined' ? __AXSDK_INLINED_CSS__ : '';

const _baseCss = `
:host {
  all: initial;
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: visible;
  z-index: 10000;
  font-size: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.5;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*, *::before, *::after {
  box-sizing: border-box;
}
`;

let _root: ReactDOM.Root | null = null;
let _hostElement: HTMLElement | null = null;

const AXSDKBrowser = {
  init(config: AXSDKBrowserConfig): void {
    if (_root) {
      console.warn('[AXSDKBrowser] Already initialized. Ignoring duplicate init() call.');
      return;
    }

    const { axHandler, theme, ...axsdkConfig } = config;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AXSDK.init({
      ...(axsdkConfig as any),
      axHandler: async function(command: string, args: unknown, defer: DeferFn) {
        if(!axHandler) {
          throw new Error('axHandler is required')
        }
        const result = await handleAX(axHandler, command, args, defer);
        return result;
      },
    });

    _hostElement = document.createElement('div');
    _hostElement.id = 'axsdk-browser-host';
    document.body.appendChild(_hostElement);

    const shadow = _hostElement.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = _baseCss + (_inlinedCss ?? '');
    shadow.appendChild(style);

    const mountPoint = document.createElement('div');
    mountPoint.id = 'axsdk-root';
    mountPoint.style.cssText = 'position:relative;width:0;height:0;';
    shadow.appendChild(mountPoint);

    _root = ReactDOM.createRoot(mountPoint);
    _root.render(
      React.createElement(
        AXShadowRootProvider,
        { shadowRoot: shadow },
        React.createElement(AXUI, theme ? { theme } : null),
      ),
    );
  },

  destroy(): void {
    _root?.unmount();
    _root = null;
    _hostElement?.remove();
    _hostElement = null;
    if (typeof (AXSDK as unknown as Record<string, unknown>).destroy === 'function') {
      (AXSDK as unknown as { destroy(): void }).destroy();
    }
  },
};

(window as unknown as Record<string, unknown>).AXSDK = AXSDKBrowser;

export default AXSDKBrowser;
