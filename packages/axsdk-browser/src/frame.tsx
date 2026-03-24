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
import type { AXTheme } from './types';

window.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data as Record<string, unknown>;

  if (data?.type !== 'AXSDK_INIT') return;

  const config = data.config as Record<string, unknown>;

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

  async function _axHandler(command: string, args: unknown): Promise<string | { '$': string | (() => Promise<void>), message: string }> {
    const result = await axHandler(command, args) as string | { '$': string | (() => Promise<void>), message: string };
    if (typeof result === 'string') {
      return result;
    }
    if (result.$) {
      const callbackId = result.$;
      result.$ = async () => {
        window.parent.postMessage(
          {
            type: 'AXSDK_HANDLER_CALLBACK',
            callbackId,
          },
          '*',
        );
      };
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Extract theme from config before forwarding to AXSDK.init.
  // The theme key is stripped from coreConfig since AXSDK.init doesn't know it.
  // ---------------------------------------------------------------------------

  const { theme: rawTheme, ...coreConfig } = config;

  // theme arrives as a plain JSON-serializable object via structured-clone
  // (postMessage serialisation). Cast to local AXTheme; it is structurally
  // compatible with @axsdk/react's AXTheme so AXUI accepts it at runtime.
  const theme = rawTheme as AXTheme | undefined;

  AXSDK.init({
    ...coreConfig,
    axHandler: _axHandler,
  });

  const container = document.createElement('div');
  container.id = 'axsdk-browser-root';
  container.style.cssText = 'width:100%;height:100%;';
  document.body.appendChild(container);

  const root = createRoot(container);

  // Pass the theme prop to AXUI when provided. The local AXTheme type (types.ts)
  // mirrors @axsdk/react's AXTheme structurally; a cast is needed because the
  // two types live in separate compilation units with no shared declaration.
  root.render(React.createElement(AXUI, theme ? { theme: theme as Parameters<typeof AXUI>[0]['theme'] } : null));
});
