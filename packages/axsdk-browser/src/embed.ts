/**
 * axsdk-browser: Parent page loader script
 *
 * This IIFE bundle is loaded via <script> tag on the host page.
 * It creates an iframe, injects the frame bundle via srcdoc, and
 * exposes the global `AXSDKBrowser` API for postMessage-based communication.
 */

import { handleAX, executeCallback, type AXHandler } from "./axhandler";
import type { AXTheme } from "./types";

export type { AXTheme };

export interface AXSDKBrowserConfig {
  apiKey: string;
  appId: string;
  axHandler?: AXHandler;
  /**
   * Optional theme configuration for the embedded AXUI widget.
   *
   * All properties are optional. Unspecified values fall back to the built-in
   * dark-mode defaults, preserving full backward compatibility.
   *
   * The theme object must be JSON-serializable (no functions). It is forwarded
   * to the iframe via the `AXSDK_INIT` postMessage and passed to `<AXUI theme={...} />`.
   *
   * @example
   * ```js
   * AXSDK.init({
   *   apiKey: 'YOUR-API-KEY',
   *   appId:  'YOUR-APP-ID',
   *   theme: {
   *     colorMode: 'light',
   *     buttonImageUrl: 'https://example.com/bot.png',
   *   },
   * });
   * ```
   */
  theme?: AXTheme;
  [key: string]: unknown;
}

let _iframe: HTMLIFrameElement | null = null;
let _axHandler: AXHandler | undefined;

const _mql = window.matchMedia('(max-width: 767px)');

function updateIframeSize(isMobile: boolean): void {
  if (!_iframe) return;
  if (isMobile) {
    _iframe.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'width:100%',
      'height:100dvh',
      'border:none',
      'z-index:99999',
      'background:transparent',
    ].join(';');
  } else {
    _iframe.style.cssText = [
      'position:fixed',
      'right:0',
      'bottom:0',
      'width:420px',
      'height:680px',
      'border:none',
      'z-index:99999',
      'background:transparent',
    ].join(';');
  }
}

_mql.addEventListener('change', (e: MediaQueryListEvent) => {
  updateIframeSize(e.matches);
});

// Detect the base URL of this script so we can derive the frame bundle URL.
// `document.currentScript` is available synchronously when the script runs.
const _currentScript = document.currentScript as HTMLScriptElement | null;
const _scriptSrc = _currentScript?.src ?? '';
const _baseUrl = _scriptSrc.replace(/axsdk-browser\.js$/, '');
const _frameScriptUrl = _baseUrl
  ? _baseUrl + 'axsdk-browser-frame.js'
  : './axsdk-browser-frame.js';

window.addEventListener('message', async (event: MessageEvent) => {
  if (!_iframe) return;
  if (event.source !== _iframe.contentWindow) return;

  const data = event.data as Record<string, unknown>;

  if (data?.type === 'AXSDK_HANDLER_REQUEST' && _axHandler) {
    const { requestId, command, args } = data as {
      requestId: string;
      command: string;
      args: unknown;
    };

    try {
      const result = await handleAX(_axHandler, command, args);

      _iframe.contentWindow?.postMessage(
        { type: 'AXSDK_HANDLER_RESPONSE', requestId, result },
        '*',
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      _iframe.contentWindow?.postMessage(
        { type: 'AXSDK_HANDLER_RESPONSE', requestId, error: errorMessage },
        '*',
      );
    }
  } else if (data?.type === 'AXSDK_HANDLER_CALLBACK') {
    const { callbackId } = data as {
      callbackId: string;
    };

    try {
      await executeCallback(callbackId);
    } catch (err) {
      console.error('Error handling callback:', err);
    }
  }
});

export default {
  /**
   * Initialize the AXSDK embed widget.
   *
   * Creates an iframe, loads the frame bundle inside it via srcdoc,
   * and sends the init config via postMessage after the iframe has loaded.
   *
   * @param config - Embed configuration. `axHandler` is called on the parent
   *   side; all other keys are forwarded to the iframe for `AXSDK.init()`.
   */
  init(config: AXSDKBrowserConfig): void {
    if (_iframe) {
      console.warn('[AXSDKBrowser] Already initialized. Ignoring duplicate init() call.');
      return;
    }

    _axHandler = config.axHandler;

    // Strip the axHandler function before forwarding config via postMessage
    const { axHandler: _dropped, ...serializableConfig } = config;

    const iframe = document.createElement('iframe');
    _iframe = iframe;
    updateIframeSize(_mql.matches);

    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('frameborder', '0');

    // Use srcdoc so the frame script can be loaded with a predictable URL
    // even when no server serves the HTML page.
    iframe.srcdoc = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;width:100%;overflow:hidden}</style>',
      '</head>',
      '<body>',
      `<script src="${_frameScriptUrl}"><\/script>`,
      '</body>',
      '</html>',
    ].join('');

    iframe.addEventListener('load', () => {
      iframe.contentWindow?.postMessage(
        { type: 'AXSDK_INIT', config: serializableConfig },
        '*',
      );
    });

    document.body.appendChild(iframe);
  },

  /**
   * Destroy the embed widget and clean up resources.
   */
  destroy(): void {
    if (_iframe && _iframe.parentNode) {
      _iframe.parentNode.removeChild(_iframe);
    }
    _iframe = null;
    _axHandler = undefined;
  },
};
