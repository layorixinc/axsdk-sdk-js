# AGENTS.md for React components

Guidance for edits inside `packages/axsdk-react/src/components/`. Keep this file focused on component editing rules and component hotspots. Do not add package build or publish commands here.

## OVERVIEW

This directory holds the React chat UI primitives for `@axsdk/react`.

Main complexity cluster, all over 500 lines:

- `AXUI.tsx`
- `AXChatMessagePopoverBase.tsx`
- `AXQuestionDialog.tsx`
- `AXVoiceIndicator.tsx`

## WHERE TO LOOK

| Area | Files | Start here when |
|---|---|---|
| Root widget | `AXUI.tsx` | Portal setup, popup wiring, theme flow, notification flow, voice setup |
| Floating button | `AXButton.tsx` | Trigger motion, size handling, position behavior, pressed state |
| Chat list | `AXChat.tsx` | Message list rendering, scrolling, selection, fade behavior |
| Popup shell | `AXChatPopup.tsx` | Popup visibility, overlay behavior, body overflow, input focus |
| Message surfaces | `AXChatMessage.tsx`, `AXChatMessagePopoverBase.tsx`, `AXChatLastMessage.tsx`, `AXChatNotificationPopover.tsx`, `AXChatErrorBar.tsx` | Bubbles, popovers, notifications, errors, reasoning, tool calls |
| Message input | `AXChatMessageInput.tsx` | Text entry, send behavior, clear behavior, disabled state, keyboard handling |
| Question modal | `AXQuestionDialog.tsx` | Prompts, choices, custom answers, submit/decline paths, accessibility |
| Voice UI | `AXVoiceIndicator.tsx` | VAD status display, mic controls, tooltip timing, plugin interaction |
| Dev diagnostics | `AXDevTools.tsx` | Development-only diagnostics |
| Public exports | `index.ts` | Adding, removing, or renaming public component exports |

## COMPONENT CONVENTIONS

- Prefer inline `React.CSSProperties` with CSS variables from the theme.
- Use `em`, `px`, viewport units already established, or `var(--ax-*)`. Never use `rem`.
- Keep portal z-index and `pointer-events` behavior intact so the widget stays clickable without blocking host-page dead zones.
- Do not mutate `document.body` or `document.head` from new code unless the existing component already documents that mutation.
- Preserve accessibility labels, roles, focus behavior, and keyboard paths when changing interactive components.
- Keep shared chat state in Zustand unless there is a clear component-local reason not to.
- Avoid creating more than one voice plugin instance. Reuse the existing path from `AXUI.tsx` and `src/voice.tsx`.

## HOTSPOT RULES

- `AXUI.tsx`: portal creation, theme variable stamping, store subscriptions, and voice setup are load-bearing.
- `AXChatMessagePopoverBase.tsx`: positioning, outside-click handling, markdown rendering, TTS controls, and pointer behavior must stay consistent across popover users.
- `AXQuestionDialog.tsx`: modal semantics, labels, page state, custom answer handling, and submit/decline paths are regression-prone.
- `AXVoiceIndicator.tsx`: permission API reads, ShadowRoot style injection, cleanup timers, hover listeners, and voice state transitions must remain explicit.

## ANTI-PATTERNS

- Do not weaken `.ax-portal-root` reset or scoped box-sizing assumptions.
- Do not add generic keyframe names. Use an `ax`-prefixed name if animation CSS is needed.
- Do not add runtime component logic to the dev playground expecting consumers to receive it.
- Do not move cross-component state out of Zustand without a specific reason.
- Do not duplicate voice plugin setup across components.
