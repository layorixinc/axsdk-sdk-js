import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface AXButtonProps {
  onClick?: () => void;
  /** Controls visibility; defaults to true. Toggling triggers show/hide animations. */
  visible?: boolean;
  /**
   * When true, slides the button half off the bottom-right edge of the screen
   * so only half of it remains visible. Returns to normal position when false.
   */
  isOpen?: boolean;
  className?: string;
  /**
   * Button diameter. Accepts:
   * - a pixel number (e.g. `64`)
   * - a rem string (e.g. `"4rem"`)
   * - a viewport-unit string (e.g. `"8vw"`, `"10vh"`, `"5vmin"`, `"5vmax"`)
   *
   * Defaults to `64` (pixels). All layers scale proportionally.
   */
  size?: number | string;
  /**
   * Session status. When `"busy"`, a swirling vortex animation is overlaid
   * on the button to indicate that the AI is processing.
   */
  status?: string;
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
}: AXButtonProps) {
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
      ? "0.7rem"
      : pxSize <= 64
      ? "0.875rem"
      : pxSize <= 80
      ? "1rem"
      : pxSize * 0.3;

  useEffect(() => {
    // Skip the initial mount: animState is already set correctly in useState initializer
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (visible) {
      setAnimState("show");
    } else {
      // Only transition to hide if currently visible (not already unmounted)
      setAnimState((prev) => (prev !== "unmounted" ? "hide" : "unmounted"));
    }
  }, [visible]);

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    // Ignore bubbled events from child layers (ring/glow spin animations)
    if (e.target !== e.currentTarget) return;

    if (e.animationName === "ax-show") {
      setAnimState("idle");
    } else if (e.animationName === "ax-hide") {
      setAnimState("unmounted");
    }
  }

  /** Spawn a ripple at the pointer position inside the button */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x, y }]);
      setPressed(true);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    },
    []
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
      ? "translate(55%, -55%) scale(0.77)"
      : "translate(55%, -55%)"
    : pressed
    ? "scale(0.77)"
    : undefined;

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        zIndex: 10000,
        ...(isOpen ? { top: "1.25rem" } : { bottom: "1.25rem" }),
        right: "1.25rem",
        width: sizeCSS,
        height: sizeCSS,
        transform: outerTransform,
        transition: pressed
          ? "transform 0.08s ease-out"
          : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
        borderRadius: "50%",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        display: "block",
        ...wrapperAnimation,
        // Must come after wrapperAnimation spread so it overrides the animation shorthand's
        // implicit animationPlayState: "running" reset
        animationPlayState: isOpen ? "paused" : undefined,
        outline: "none",
      }}
    >
      {/* ── Layer 1: Animated conic-gradient ring (outermost) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: ringSize,
          height: ringSize,
          top: ringOffset,
          left: ringOffset,
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #a855f7, #3b82f6, #06b6d4, #ec4899, #a855f7)",
          filter: "blur(2px)",
          animation: "ax-rotate 4s linear infinite",
        }}
      />

      {/* ── Layer 2: Glow halo (blurred, pulsing opacity) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: ringSize,
          height: ringSize,
          top: ringOffset,
          left: ringOffset,
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #a855f7, #3b82f6, #06b6d4, #ec4899, #a855f7)",
          filter: "blur(16px)",
          opacity: 0.7,
          animation:
            "ax-rotate 4s linear infinite, ax-glow 3s ease-in-out infinite",
        }}
      />

      {/* ── Layer 3: Main orb body (size×size) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: sizeCSS,
          height: sizeCSS,
          top: 0,
          left: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), transparent 60%), " +
            "radial-gradient(circle at center, #7c3aed, #1d4ed8)",
          backdropFilter: "blur(8px)",
        }}
      />

      {/* ── Layer 3b: Inner white shimmer highlight (top-left) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: sizeCSS,
          height: sizeCSS,
          top: 0,
          left: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45) 0%, transparent 55%)",
        }}
      />

      {/* ── Layer 4: Center "AX" label ── */}
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
      {/* ── Layer 5: Busy vortex swirl overlay (only when status === "busy") ── */}
      {isBusy && (
        <>
          {/* Outer rotating conic-gradient ring — gives the swirling vortex border */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: pxSize + 6,
              height: pxSize + 6,
              top: -3,
              left: -3,
              borderRadius: "50%",
              background:
                "conic-gradient(from 0deg, " +
                "rgba(168,85,247,0) 0%, " +
                "rgba(168,85,247,1) 20%, " +
                "rgba(139,92,246,1) 35%, " +
                "rgba(99,102,241,1) 50%, " +
                "rgba(168,85,247,0.6) 70%, " +
                "rgba(168,85,247,0) 100%)",
              animation: "ax-busy-spin 1.2s linear infinite",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
          {/* Inner mask disk — sits on top of the outer ring to restore the button face,
              leaving only a thin swirling border visible around the edge */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: pxSize - 4,
              height: pxSize - 4,
              top: 2,
              left: 2,
              borderRadius: "50%",
              background: "radial-gradient(circle at center, #ce0afffa, #8a3265)",
              zIndex: 11,
              pointerEvents: "none",
            }}
          />
          {/* Counter-rotating inner vortex shimmer for depth */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: pxSize - 4,
              height: pxSize - 4,
              top: 2,
              left: 2,
              borderRadius: "50%",
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
      <span
        style={{
          color: "white",
          fontWeight: 600,
          fontSize: fontSize,
          letterSpacing: "0.2em",
          textShadow: "0 0 10px rgba(255,255,255,1)",
          userSelect: "none",
          zIndex: 20,
        }}
      >
        AX
      </span>
    </div>

      {/* ── Layer 6: Ripple splashes ── */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: sizeCSS,
            height: sizeCSS,
            borderRadius: "50%",
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
