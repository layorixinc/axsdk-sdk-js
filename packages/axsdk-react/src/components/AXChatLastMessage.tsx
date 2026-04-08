'use client';

import { AXChatMessagePopoverBase } from './AXChatMessagePopoverBase';

export interface AXChatLastMessageProps {
  message?: { id: string, text: string };
  userMessage?: { id: string, text: string };
  onClose?: () => void;
  onOpen?: () => void;
  visible: boolean;
  isBusy: boolean;
  isOpen?: boolean;
  inputBottomOffset?: number;
  isDesktop?: boolean;
  scrollToBottomTrigger?: number;
}

export function AXChatLastMessage({
  message, userMessage, onClose, onOpen, visible, isBusy, isOpen = false, inputBottomOffset, isDesktop = false, scrollToBottomTrigger,
}: AXChatLastMessageProps) {
  if (!visible || (!message && !userMessage)) return null;

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
