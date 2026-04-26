'use client';

import { AXChatMessagePopoverBase, type AXCornerPosition } from './AXChatMessagePopoverBase';

export interface AXChatNotificationPopoverProps {
  message?: { id: string, text: string };
  userMessage?: { id: string, text: string };
  onClose: () => void;
  onOpen?: () => void;
  visible: boolean;
  isBusy: boolean;
  isOpen?: boolean;
  inputBottomOffset?: number;
  isDesktop?: boolean;
  scrollToBottomTrigger?: number;
  idleGuideText?: string;
  busyGuideText?: string;
  position?: AXCornerPosition;
}

export function AXChatNotificationPopover({
  message, userMessage, onClose, onOpen, visible, isBusy, isOpen = false, inputBottomOffset, isDesktop = false, scrollToBottomTrigger, idleGuideText, busyGuideText, position,
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
      idleGuideText={idleGuideText}
      busyGuideText={busyGuideText}
      position={position}
    />
  );
}
