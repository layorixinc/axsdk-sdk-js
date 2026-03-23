'use client';

import React from 'react';
import { AXChatMessagePopoverBase } from './AXChatMessagePopoverBase';

export interface AXChatNotificationPopoverProps {
  message?: { id: string, text: string };
  userMessage?: { id: string, text: string };
  onClose: () => void;
  onOpen?: () => void;
  visible: boolean;
  /** True while the AI session is streaming/responding */
  isBusy: boolean;
  /** True when the chat popup is open; repositions popover above the message input */
  isOpen?: boolean;
  /**
   * When `isOpen` is true, the measured distance (px) from the bottom of the viewport
   * to the top of the message input wrapper. Used to align the popover's bottom edge
   * exactly with the input's top edge.
   */
  inputBottomOffset?: number;
  /**
   * When true, desktop layout is active (≥768px). On desktop with `isOpen`, the popover
   * is right-aligned with a fixed width instead of spanning the full viewport width.
   */
  isDesktop?: boolean;
  /**
   * Increment this value to trigger a scroll-to-bottom of the popover's scrollable content area.
   * Typically incremented after the open animation completes and layout is finalized.
   */
  scrollToBottomTrigger?: number;
}

export function AXChatNotificationPopover({
  message, userMessage, onClose, onOpen, visible, isBusy, isOpen = false, inputBottomOffset, isDesktop = false, scrollToBottomTrigger,
}: AXChatNotificationPopoverProps) {
  if (!visible) return null;

  return (
    <AXChatMessagePopoverBase
      message={message}
      userMessage={userMessage}
      onClose={onClose}
      onOpen={onOpen}
      isBusy={isBusy}
      isOpen={isOpen}
      inputBottomOffset={inputBottomOffset}
      isDesktop={isDesktop}
      scrollToBottomTrigger={scrollToBottomTrigger}
    />
  );
}
