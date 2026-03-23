/**
 * axsdk-browser: iframe inner bundle
 *
 * This self-contained IIFE runs inside the srcdoc iframe.
 * It bundles React, react-dom, @axsdk/core, and @axsdk/react (including CSS).
 *
 * Responsibilities:
 *  1. Listen for AXSDK_INIT postMessage from the parent page.
 *  2. Wrap axHandler calls as postMessage RPC back to the parent.
 *  3. Call AXSDK.init() with the received config + the RPC axHandler.
 *  4. Mount the <AXUI /> component into document.body.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { AXSDK } from '@axsdk/core';
import { AXUI } from '@axsdk/react';
import '@axsdk/react/index.css';

// ---------------------------------------------------------------------------
// Listen for the AXSDK_INIT message from the parent page
// ---------------------------------------------------------------------------

window.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data as Record<string, unknown>;

  if (data?.type !== 'AXSDK_INIT') return;

  const config = data.config as Record<string, unknown>;

  // ---------------------------------------------------------------------------
  // Build postMessage-based axHandler that proxies calls to the parent page
  // ---------------------------------------------------------------------------

  const axHandler = (command: string, args: unknown): Promise<unknown> => {
    const requestId = Math.random().toString(36).slice(2) + Date.now().toString(36);

    return new Promise<unknown>((resolve, reject) => {
      const responseListener = (e: MessageEvent) => {
        const msg = e.data as Record<string, unknown>;
        if (
          msg?.type === 'AXSDK_HANDLER_RESPONSE' &&
          msg.requestId === requestId
        ) {
          window.removeEventListener('message', responseListener);
          if (msg.error) {
            reject(new Error(msg.error as string));
          } else {
            resolve(msg.result);
          }
        }
      };

      window.addEventListener('message', responseListener);

      // Ask the parent page to run the real axHandler
      window.parent.postMessage(
        {
          type: 'AXSDK_HANDLER_REQUEST',
          requestId,
          command,
          args,
        },
        '*',
      );
    });
  };

  // ---------------------------------------------------------------------------
  // Initialise the AXSDK core with the forwarded config + RPC axHandler
  // ---------------------------------------------------------------------------

  AXSDK.init({
    ...config,
    axHandler,
  });

  // ---------------------------------------------------------------------------
  // Mount the React app
  // ---------------------------------------------------------------------------

  const container = document.createElement('div');
  container.id = 'axsdk-browser-root';
  container.style.cssText = 'width:100%;height:100%;';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(React.createElement(AXUI));
});
