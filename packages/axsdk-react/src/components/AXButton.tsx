'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAXTheme } from '../AXThemeContext';

export interface AXButtonProps {
  onClick?: () => void;
  visible?: boolean;
  isOpen?: boolean;
  className?: string;
  size?: number | string;
  status?: string;
  borderRadius?: string;
}

type AnimState = "show" | "idle" | "hide" | "unmounted";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function AXButton({
  onClick,
  visible = true,
  isOpen = false,
  className = "",
  size = 64,
  status,
  borderRadius: borderRadiusProp,
}: AXButtonProps) {
  const { theme } = useAXTheme();
  const borderRadius = borderRadiusProp ?? theme.buttonBorderRadius ?? "50%";
  const rippleEnabled = theme.buttonRipple ?? true;

  const [animState, setAnimState] = useState<AnimState>(visible ? "idle" : "unmounted");
  const isInitialMount = useRef(true);
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const sizeCSS: string =
    typeof size === "number" ? `${size}px` : (size as string);

  const isViewportUnit =
    typeof size === "string" && /vw|vh|vmin|vmax/i.test(size);

  const initialPxSize: number = (() => {
    if (typeof size === "number") return size;
    if (typeof size === "string") {
      if (size.endsWith("rem")) return parseFloat(size) * 16;
      if (size.endsWith("px")) return parseFloat(size);
    }
    if (!isViewportUnit) {
      console.warn(
        `[AXButton] Unsupported size format: "${size}". ` +
          `Expected a number, rem, px, vw, vh, vmin, or vmax string. Falling back to 64px.`
      );
    }
    return 64;
  })();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [measuredPx, setMeasuredPx] = useState<number>(initialPxSize);

  useEffect(() => {
    if (!isViewportUnit) return;
    const el = buttonRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setMeasuredPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isViewportUnit]);

  const pxSize = isViewportUnit ? measuredPx : initialPxSize;

  const isBusy = status === "busy";

  const ringSize = pxSize + 16;
  const ringOffset = -8;
  const rippleHalf = pxSize / 2;
  const fontSize =
    pxSize <= 48
      ? "0.7em"
      : pxSize <= 64
      ? "0.875em"
      : pxSize <= 80
      ? "1em"
      : pxSize * 0.3;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (visible) {
      setAnimState("show");
    } else {
      setAnimState((prev) => (prev !== "unmounted" ? "hide" : "unmounted"));
    }
  }, [visible]);

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    if (e.target !== e.currentTarget) return;

    if (e.animationName === "ax-show") {
      setAnimState("idle");
    } else if (e.animationName === "ax-hide") {
      setAnimState("unmounted");
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (rippleEnabled) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }
      setPressed(true);
    },
    [rippleEnabled]
  );

  const handlePointerUp = useCallback(() => setPressed(false), []);
  const handlePointerLeave = useCallback(() => setPressed(false), []);

  if (animState === "unmounted") {
    return null;
  }

  const wrapperAnimation: React.CSSProperties =
    animState === "show"
      ? { animation: "ax-show 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }
      : animState === "hide"
      ? { animation: "ax-hide 0.4s ease-in forwards" }
      : { animation: "ax-pulse 2.5s ease-in-out infinite" };

  const outerTransform = isOpen
    ? pressed
      ? "translate(40%, 40%) scale(0.9)"
      : "translate(40%, 40%)"
    : pressed
    ? "scale(0.9)"
    : undefined;

  const buttonImageUrl = theme.buttonImageUrl;
  const buttonAnimationImageUrl = theme.buttonAnimationImageUrl ?? buttonImageUrl;
  const useCustomImage = Boolean(buttonImageUrl);

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        zIndex: 10000,
        bottom: "1em",
        right: "1em",
        width: sizeCSS,
        height: sizeCSS,
        transform: outerTransform,
        transition: pressed
          ? "transform 0.08s ease-out"
          : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        ...theme.styles?.button?.wrapper,
      }}
    >
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onAnimationEnd={handleAnimationEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      aria-label="AI Assistant"
      style={{
        width: sizeCSS,
        height: sizeCSS,
        borderRadius,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        display: "block",
        ...wrapperAnimation,
        animationPlayState: isOpen ? "paused" : undefined,
        outline: "none",
        ...theme.styles?.button?.button,
      }}
    >
      {useCustomImage ? (
        <>
          {isBusy && buttonAnimationImageUrl ? (
            <img
              src={buttonAnimationImageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                borderRadius,
                objectFit: "cover",
              }}
            />
          ) : (
            <img
              src={buttonImageUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                borderRadius,
                objectFit: "cover",
              }}
            />
          )}
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: ringSize,
              height: ringSize,
              top: ringOffset,
              left: ringOffset,
              borderRadius,
              background:
                `conic-gradient(from 0deg, var(--ax-color-accent1, #a855f7), var(--ax-color-accent2, #3b82f6), var(--ax-color-accent3, #06b6d4), var(--ax-color-accent4, #ec4899), var(--ax-color-accent1, #a855f7))`,
              filter: "blur(2px)",
              animation: "ax-rotate 4s linear infinite",
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: ringSize,
              height: ringSize,
              top: ringOffset,
              left: ringOffset,
              borderRadius,
              background:
                `conic-gradient(from 0deg, var(--ax-color-accent1, #a855f7), var(--ax-color-accent2, #3b82f6), var(--ax-color-accent3, #06b6d4), var(--ax-color-accent4, #ec4899), var(--ax-color-accent1, #a855f7))`,
              filter: "blur(16px)",
              opacity: 0.7,
              animation:
                "ax-rotate 4s linear infinite, ax-glow 3s ease-in-out infinite",
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: sizeCSS,
              height: sizeCSS,
              top: 0,
              left: 0,
              borderRadius,
              background:
                "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), transparent 60%), " +
                `radial-gradient(circle at center, var(--ax-color-primary, #7c3aed), var(--ax-color-primary-dark, #1d4ed8))`,
              backdropFilter: "blur(8px)",
              ...theme.styles?.button?.orb,
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: sizeCSS,
              height: sizeCSS,
              top: 0,
              left: 0,
              borderRadius,
              background:
                "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45) 0%, transparent 55%)",
            }}
          />
        </>
      )}

      <div
        style={{
          position: "absolute",
          width: sizeCSS,
          height: sizeCSS,
          top: 0,
          left: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isBusy && !buttonAnimationImageUrl && (
          <>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: pxSize + 6,
                height: pxSize + 6,
                top: -3,
                left: -3,
                borderRadius,
                background:
                  `conic-gradient(from 0deg, ` +
                  `rgba(var(--ax-color-primary-rgb, 168,85,247),0) 0%, ` +
                  `rgba(var(--ax-color-primary-rgb, 168,85,247),1) 20%, ` +
                  `rgba(139,92,246,1) 35%, ` +
                  `rgba(99,102,241,1) 50%, ` +
                  `rgba(var(--ax-color-primary-rgb, 168,85,247),0.6) 70%, ` +
                  `rgba(var(--ax-color-primary-rgb, 168,85,247),0) 100%)`,
                animation: "ax-busy-spin 1.2s linear infinite",
                zIndex: 10,
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: pxSize - 4,
                height: pxSize - 4,
                top: 2,
                left: 2,
                borderRadius,
                background: `radial-gradient(circle at center, var(--ax-color-primary, #7c3aed), var(--ax-color-primary-dark, #1d4ed8))`,
                zIndex: 11,
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: pxSize - 4,
                height: pxSize - 4,
                top: 2,
                left: 2,
                borderRadius,
                background:
                  "conic-gradient(from 180deg, " +
                  "rgba(192,132,252,0.0) 0%, " +
                  "rgba(192,132,252,0.35) 25%, " +
                  "rgba(192,132,252,0.0) 50%, " +
                  "rgba(139,92,246,0.25) 75%, " +
                  "rgba(192,132,252,0.0) 100%)",
                animation: "ax-busy-spin 2s linear infinite reverse, ax-busy-pulse 1.2s ease-in-out infinite",
                zIndex: 12,
                pointerEvents: "none",
              }}
            />
          </>
        )}
        {!useCustomImage && (
          <span
            style={{
              color: "white",
              fontWeight: 600,
              fontSize: fontSize,
              letterSpacing: "0.2em",
              textShadow: "0 0 10px rgba(255,255,255,1)",
              userSelect: "none",
              zIndex: 20,
              ...theme.styles?.button?.label,
            }}
          >
            AX
          </span>
        )}
      </div>

      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: sizeCSS,
            height: sizeCSS,
            borderRadius,
            top: r.y - rippleHalf,
            left: r.x - rippleHalf,
            background: "rgba(255, 255, 255, 0.45)",
            pointerEvents: "none",
            animation: "ax-ripple 0.6s ease-out forwards",
          }}
        />
      ))}
    </button>
    </div>
  );
}
