'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { AXChatMessage } from './AXChatMessage';
import { type ChatMessage } from '@axsdk/core';

export interface AXChatHandle {
  scrollToBottom: () => void;
}

export interface AXChatProps {
  messages: ChatMessage[];
  /** Called when the user clicks any chat message bubble. */
  onMessageClick?: () => void;
}

export const AXChat = forwardRef<AXChatHandle, AXChatProps>(function AXChat({ messages, onMessageClick }: AXChatProps, ref) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [opacities, setOpacities] = useState<Map<string, number>>(new Map());
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isStripInteracting, setIsStripInteracting] = useState(false);

  const leftStripRef = useRef<HTMLDivElement>(null);
  const rightStripRef = useRef<HTMLDivElement>(null);

  const innerContentRef = useRef<HTMLDivElement>(null);

  const isStripDragging = useRef(false);
  const stripStartY = useRef(0);
  const stripScrollTopAtStart = useRef(0);

  const touchStartYRef = useRef(0);

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    },
  }), []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const updateVisibility = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerBottom = container.scrollTop + container.clientHeight;
    const newMap = new Map<string, number>();

    for (const [id, el] of messageRefsRef.current.entries()) {
      const elementBottom = el.offsetTop + el.offsetHeight;
      const distanceFromBottom = containerBottom - elementBottom;
      const ratio = distanceFromBottom / container.clientHeight;

      let opacity: number;
      if (ratio <= 0.20) {
        opacity = 1;
      } else if (ratio >= 0.80) {
        opacity = 0;
      } else {
        opacity = 1 - (ratio - 0.20) / 0.60;
      }

      opacity = Math.min(1, Math.max(0, opacity));
      newMap.set(id, opacity);
    }

    setOpacities(newMap);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateVisibility();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    const blockWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (container) {
        container.scrollTop += e.deltaY;
      }
    };
    container.addEventListener("wheel", blockWheel, { passive: false });

    const recordTouchStart = (e: TouchEvent) => {
      if (isStripDragging.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartYRef.current = touch.clientY;
    };

    const blockTouchMove = (e: TouchEvent) => {
      if (isStripDragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const delta = touchStartYRef.current - touch.clientY;
      touchStartYRef.current = touch.clientY;
      container.scrollTop += delta;
    };

    container.addEventListener("touchstart", recordTouchStart, { passive: true });
    container.addEventListener("touchmove", blockTouchMove, { passive: false });

    updateVisibility();

    const isStripTarget = (target: EventTarget | null): boolean => {
      return (
        target === leftStripRef.current ||
        target === rightStripRef.current
      );
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isStripTarget(e.target)) {
        setIsStripInteracting(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isStripTarget(e.target)) {
        setIsStripInteracting(true);
      } else {
        setIsStripInteracting(false);
      }
    };

    const handlePointerUp = () => {
      setIsStripInteracting(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handlePointerUp, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", blockWheel);
      container.removeEventListener("touchstart", recordTouchStart);
      container.removeEventListener("touchmove", blockTouchMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handlePointerUp);
    };
  }, [updateVisibility]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const strips = [leftStripRef.current, rightStripRef.current].filter(
      (s): s is HTMLDivElement => s !== null
    );
    if (!container || strips.length === 0) return;

    const onMouseDown = (e: MouseEvent) => {
      isStripDragging.current = true;
      stripStartY.current = e.clientY;
      stripScrollTopAtStart.current = window.pageYOffset;
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isStripDragging.current) return;
      const strip = strips[0];
      if (!strip) return;
      const stripHeight = strip.getBoundingClientRect().height;
      const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
      const delta = e.clientY - stripStartY.current;
      const newScrollTop = stripScrollTopAtStart.current - (delta / stripHeight) * pageHeight;
      window.scrollTo({ top: newScrollTop, behavior: "instant" as ScrollBehavior });
    };

    const onMouseUp = () => {
      isStripDragging.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      isStripDragging.current = true;
      stripStartY.current = touch.clientY;
      stripScrollTopAtStart.current = window.pageYOffset;
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isStripDragging.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      const strip = e.currentTarget as HTMLDivElement;
      const stripHeight = strip.getBoundingClientRect().height;
      const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
      const delta = touch.clientY - stripStartY.current;
      const newScrollTop = stripScrollTopAtStart.current - (delta / stripHeight) * pageHeight;
      window.scrollTo({ top: newScrollTop, behavior: "instant" as ScrollBehavior });
    };

    const onTouchEnd = () => {
      isStripDragging.current = false;
    };

    for (const strip of strips) {
      strip.addEventListener("mousedown", onMouseDown);
      strip.addEventListener("touchstart", onTouchStart, { passive: false });
      strip.addEventListener("touchmove", onTouchMove, { passive: false });
      strip.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      for (const strip of strips) {
        strip.removeEventListener("mousedown", onMouseDown);
        strip.removeEventListener("touchstart", onTouchStart);
        strip.removeEventListener("touchmove", onTouchMove);
        strip.removeEventListener("touchend", onTouchEnd);
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    updateVisibility();
  }, [messages, updateVisibility]);

  const handleMessageClick = (id: string) => {
    setSelectedMessageId(id);
  };

  const getOpacity = (id: string): number => {
    return 1
    if (isStripInteracting) return 0;
    if (id === selectedMessageId) return 1;
    return opacities.get(id) ?? 1;
  };

  const setMessageRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      messageRefsRef.current.set(id, el);
    } else {
      messageRefsRef.current.delete(id);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", paddingTop: "2em" }}>
      <div
        ref={leftStripRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "3em",
          height: "100%",
          zIndex: 10,
          opacity: 0,
          cursor: "ns-resize",
          touchAction: "none",
        }}
      />
      <div
        ref={rightStripRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "3em",
          height: "100%",
          zIndex: 10,
          opacity: 0,
          cursor: "ns-resize",
          touchAction: "none"
        }}
      />
      <div
        ref={scrollContainerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflowY: "auto",
          pointerEvents: "auto",
          scrollbarWidth: "none",
        }}
      >
        <div
          ref={innerContentRef}
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            paddingBottom: "1em",
          }}
        >
          {messages.map((message) => (
            <AXChatMessage
              key={message.info.id}
              message={message}
              onMessageClick={onMessageClick}
              opacity={getOpacity(message.info.id)}
              messageRef={setMessageRef(message.info.id)}
              isSelected={selectedMessageId === message.info.id}
              onClick={() => handleMessageClick(message.info.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
