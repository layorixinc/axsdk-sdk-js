# Bottom Search Bar UI Tree

이 문서는 `<AXUI variant="bottomSearchBar" />`가 렌더링하는 UI 구성을 트리 형태로 정리한다. 기준 소스는 `src/components/AXUI.tsx`의 `bottomSearchBar` 분기와 `src/components/bottom-search-bar/AXBottomSearchBar.tsx`이다. 기존 `src/components/AXBottomSearchBar.tsx`는 호환성 re-export facade다.

## 진입 트리

`bottomSearchBar`는 React 패키지의 기본 AXUI variant다. `resolveAXUIVariant(...)`는 explicit `variant`, `ui.variant`, fallback `'bottomSearchBar'` 순서로 선택하며, browser embed도 `ui.variant`가 없으면 `'bottomSearchBar'`를 명시해서 넘긴다.

```text
AXUI (resolvedVariant === 'bottomSearchBar')
└─ ReactDOM.createPortal(..., portalTarget)
   └─ AXThemeProvider
      └─ div
         ├─ {children}
         ├─ AXDevTools
         │  └─ debug 모드에서 메시지 진단 UI를 렌더링
         ├─ AXBottomSearchBar
         │  ├─ open={isOpen}
         │  ├─ onOpenChange={handleBottomSearchBarOpenChange}
         │  ├─ messages={messages}
         │  ├─ isDesktop={isDesktop}
         │  ├─ isBusy={isBusy}
         │  ├─ appInfoReady={appInfoReady}
         │  ├─ searchBarValue={searchBarValue}
         │  ├─ onSearchBarValueChange={setSearchBarValue}
         │  ├─ onSearch={handleBottomSearchBarSend}
         │  ├─ onClear={handleBottomSearchBarClear}
         │  ├─ onboardingText={AXSDK.t('chatOnboarding')}
         │  ├─ shortcutText={AXSDK.t('chatShortcutChips')}
         │  ├─ showShortcutChips={hasActiveSession}
         │  ├─ latestUserText={userMessageText || undefined}
         │  ├─ placeholder={AXSDK.t('chatInput')}
         │  ├─ buttonLabel={AXSDK.t('chatSearchSubmit')}
         │  ├─ previewTitle={AXSDK.t('chatPreviewTitle')}
         │  ├─ resetLabel={AXSDK.t('chatBottomSearchReset')}
         │  ├─ closeLabel={AXSDK.t('chatBottomSearchClose')}
         │  ├─ emptyText={AXSDK.t('chatEmpty')}
         │  ├─ busyText={AXSDK.t('chatBusyGuide')}
         │  └─ ttsControl={ttsControl}
         └─ AXQuestionDialog 영역 (조건부)
            └─ questions가 있을 때 중앙 modal로 렌더링
```

## AXBottomSearchBar 내부 트리

```text
AXBottomSearchBar
└─ div[data-ax-bottom-search-bar="root"]
   ├─ Closed state (!open)
   │  └─ BottomSearchBarLauncher
   │     ├─ BottomSearchBarLauncherKeyframes
   │     │  └─ style (closed launcher / tooltip keyframes)
   │     ├─ BottomSearchBarClosedTooltip (조건부)
   │     │  └─ div[data-ax-bottom-search-bar="closed-tooltip"]
   │     │     └─ ReactMarkdown(latestAssistantText)
   │     │        └─ closedTooltipMarkdownComponents
   │     ├─ BottomSearchBarUnreadIndicator (조건부)
   │     │  └─ div[data-ax-bottom-search-bar="unread-indicator"]
   │     │     └─ unread alert SVG icon 또는 read message SVG icon
   │     └─ BottomSearchBarLauncherButton
   │        └─ button[data-ax-bottom-search-bar="launcher"]
   │           ├─ img[data-ax-bottom-search-bar="launcher-image"] (조건부)
   │           ├─ idle visual layers (조건부)
   │           │  ├─ span[data-ax-bottom-search-bar="launcher-idle-ring"]
   │           │  └─ span[data-ax-bottom-search-bar="launcher-idle-glow"]
   │           ├─ busy visual layers (조건부)
   │           │  ├─ span[data-ax-bottom-search-bar="launcher-busy-spin"]
   │           │  └─ span[data-ax-bottom-search-bar="launcher-busy-pulse"]
   │           └─ default search glyph (조건부)
   └─ Open state (open)
      └─ BottomSearchBarSurface
         ├─ BottomSearchBarSurfaceKeyframes
         │  └─ style (open surface / preview glow keyframes)
         └─ section[data-ax-bottom-search-bar="surface"]
            ├─ BottomSearchBarPreview
            │  └─ article[data-ax-bottom-search-bar="preview"]
            │     ├─ header
            │     │  ├─ AXTtsToggleButton (조건부: ttsControl 있음)
   │     │  ├─ preview header text (조건부: ttsControl 없음)
   │     │  └─ close button
            │     │     ├─ svg[data-ax-bottom-search-bar="close-button-icon"]
            │     │     └─ span[data-ax-bottom-search-bar="close-button-label"]
            │     ├─ div[data-ax-bottom-search-bar="preview-body"]
            │     │  └─ preview content
            │     │     ├─ ReactMarkdown(latestAssistantText) (조건부)
            │     │     ├─ status text role="status" (조건부: assistant text 없음)
            │     │     └─ AssistantInfoErrorPreview (조건부)
            │     ├─ AXChatErrorBar
            │     └─ BottomSearchBarChips (조건부)
   │        └─ section[data-ax-bottom-search-bar="chips"]
   │           ├─ suggestion buttons[]
   │           └─ button[data-ax-bottom-search-bar="reset-chip"] (조건부: shortcuts mode)
            ├─ BottomSearchBarInput
            │  └─ div[data-ax-bottom-search-bar="input"]
            │     └─ AXSearchBar(surface="embedded")
            │        └─ form[role="search"]
            │           ├─ input[type="text"]
            │           ├─ clear input button (조건부: 입력값 있음)
            │           ├─ voice dictation button/status (조건부: enableVoiceDictation=true; bottom search에서는 전달하지 않음)
            │           └─ submit button
            └─ AXPoweredBy
               └─ attribution link
```

## 조건부 렌더링 규칙

| 노드 | 렌더링 조건 | 주요 동작 |
|---|---|---|
| `closed-tooltip` | 닫힘 상태이고, 읽지 않은 최신 assistant text가 있을 때 | 클릭 또는 Enter/Space로 bottom search를 연다. 읽음 처리는 닫기 경로에서 수행한다. |
| `unread-indicator` | 닫힘 상태이고 최신 assistant text가 있을 때 | 읽지 않은 메시지는 빨간 경고 배지, 닫기로 읽음 처리된 메시지는 녹색 메시지 배지를 표시한다. |
| `launcher-image` | `theme.buttonImageUrl` 또는 busy 상태의 `theme.buttonAnimationImageUrl`이 있을 때 | 테마 이미지를 launcher visual로 사용한다. |
| idle visual layers | launcher 이미지가 없고 `isBusy`가 false일 때 | ring/glow animation을 표시한다. |
| busy visual layers | launcher 이미지가 없고 `isBusy`가 true일 때 | spin/pulse animation을 표시한다. |
| `AXTtsToggleButton` | `ttsControl`이 전달될 때 | preview header의 제목 위치를 voice toggle row가 대체한다. |
| preview markdown | 최신 assistant text가 있을 때 | `ReactMarkdown`과 `remarkGfm`으로 렌더링한다. |
| status text | 최신 assistant text가 없을 때 | busy면 `busyText`, 아니면 `emptyText`를 표시한다. |
| `AssistantInfoErrorPreview` | 최신 assistant message의 `info.error.data.message`가 있을 때 | preview body 안에 inline error alert를 표시한다. |
| `AXChatErrorBar` | error store의 최신 error가 현재 preview message id와 매칭될 때 | article 하단에 message-scoped error bar를 표시한다. |
| `chips` | chip mode가 `onboarding` 또는 `shortcuts`이고 표시할 chip/reset chip이 있을 때 | user message가 없으면 onboarding, user message 전송 후 idle 전까지 hidden, idle 이후 shortcuts를 표시한다. shortcuts mode의 마지막에는 별도 reset chip을 추가한다. |
| `reset-chip` | chip mode가 `shortcuts`일 때 | shortcut text에 같은 라벨이 있어도 구분되도록 `data-ax-bottom-search-bar="reset-chip"`과 `Reset bottom search: ...` label을 사용하며 `onClear`를 호출한다. |
| search input clear button | `AXSearchBar` value가 비어 있지 않을 때 | input 값만 비운다. 세션 reset은 하지 않는다. |
| submit button | 항상 렌더링되지만 empty/disabled 상태에서는 disabled | `buttonLabel`은 `AXSDK.t('chatSearchSubmit')`에서 온다. |
| `AXQuestionDialog` | `AXUI`의 `questions` state가 있을 때 | bottom search surface와 별도로 중앙 modal로 렌더링된다. |

## Bottom Search 경로에 없는 구성요소

| 구성요소 | 현재 bottomSearchBar에서의 상태 | 이유 |
|---|---|---|
| `AXAnswerPanel` | 렌더링하지 않음 | `searchBar` variant 전용 answer panel이다. `bottomSearchBar`는 자체 `article[data-ax-bottom-search-bar="preview"]`를 사용한다. |
| `AXSearchOnboarding` | 렌더링하지 않음 | `searchBar` variant 전용 suggestion component다. `bottomSearchBar`는 `buildAXBottomSearchBarChipTexts(...)`와 inline chip buttons를 사용한다. |
| `AXVoiceIndicator` | 렌더링하지 않음 | `fab` fallback branch의 `AXButton` overlay 쪽 구성이다. `bottomSearchBar`의 voice 관련 UI는 `ttsControl`이 있을 때 preview header의 `AXTtsToggleButton`으로만 들어온다. |
| `AXSearchBar` voice dictation controls | 기본 bottomSearchBar에서는 렌더링하지 않음 | `AXBottomSearchBar`가 `enableVoiceDictation`을 전달하지 않으므로 `data-ax-search-bar="voice-dictation"`과 `voice-status`가 생기지 않는다. |

## 데이터 파생 규칙

```text
messages
├─ latestAssistantMessage = findLatestAssistantMessage(messages)
│  ├─ latestAssistantText = extractMessageText(latestAssistantMessage)
│  ├─ latestAssistantInfoError = latestAssistantMessage?.info.error
│  ├─ latestAssistantId = latestAssistantMessage.info.id
│  └─ readAssistantIds = localStorage['axsdk:bottom-search-read-assistant-message-ids']
├─ latestUserHeaderText
│  ├─ latestUserText prop 우선
│  └─ 없으면 findLatestUserMessage(messages)의 text 사용
└─ chipMode
   ├─ user message 없음 -> onboarding
   ├─ user message 있고 session idle 전 -> hidden
   └─ user message 있고 session idle -> shortcuts
└─ chipTexts = buildAXBottomSearchBarChipTexts(
   onboardingText,
   latestUserText,
   shortcutText,
   showShortcutChips,
)
```

- chip mode가 `shortcuts`이면 `shortcutText`를 comma-separated chip source로 사용하고 reset chip을 마지막에 붙인다.
- chip mode가 `onboarding`이면 `onboardingText`만 chip source로 사용한다.
- chip mode가 `hidden`이면 chip section을 렌더링하지 않는다.
- chip text는 trim 후 빈 문자열과 중복 값을 제거한다.
- preview header text는 `latestUserHeaderText -> previewTitle -> AXSDK.t('chatPreviewTitle')` 순서로 결정된다.
- preview glow는 최신 assistant text가 있고 busy 상태가 아닐 때만 켜진다.
- closed tooltip의 읽음 상태는 assistant message id 단위로 localStorage에 저장한다. 같은 id는 refresh 후에도 읽은 상태로 유지되고, 새 id는 다시 unread로 표시된다.

## 이벤트 흐름

```text
launcher click
└─ requestOpen()
   ├─ markLatestAssistantRead()
   │  └─ localStorage에 latestAssistantId 저장
   └─ onOpenChange(true)

closed tooltip Enter/Space/click
└─ requestOpen()
   ├─ markLatestAssistantRead()
   │  └─ localStorage에 latestAssistantId 저장
   └─ onOpenChange(true)

close button click
└─ closeAndMarkRead()
   ├─ markLatestAssistantRead()
   │  └─ localStorage에 latestAssistantId 저장
   └─ onOpenChange(false)

reset chip click
└─ onClear
   └─ AXUI.handleBottomSearchBarClear()
      ├─ setSearchBarValue('')
      ├─ setSearchBarInputValue('')
      └─ handleClear()

chip click
└─ submitChipText(text)
   └─ selectAXSearchOnboardingText(text, onSearch)
      └─ onSearch(normalizedText)

AXSearchBar submit
└─ onSearch(trimmedQuery)
   └─ AXUI.handleBottomSearchBarSend(trimmedQuery)
      ├─ setSearchBarValue(trimmedQuery)
      ├─ setSearchBarInputValue(trimmedQuery)
      └─ handleSend(trimmedQuery)
```

`bottomSearchBar` submit은 현재 chat session을 보존한다. fresh query를 위해 `axsdk.chat.cancel`을 emit하고 `AXSDK.resetSession()`을 호출하는 경로는 `searchBar` variant의 submit handler에 남아 있다.

## 관련 파일

| 파일 | 역할 |
|---|---|
| `src/components/AXUI.tsx` | `bottomSearchBar` variant 진입점, store state/translation/handlers 연결, question dialog 렌더링 |
| `src/components/AXBottomSearchBar.tsx` | 기존 직접 import 경로를 유지하는 compatibility facade |
| `src/components/bottom-search-bar/AXBottomSearchBar.tsx` | bottom search state/derived data orchestration, open/close/read handlers 연결 |
| `src/components/bottom-search-bar/BottomSearchBarLauncher.tsx` | closed state launcher subtree composition |
| `src/components/bottom-search-bar/BottomSearchBarClosedTooltip.tsx` | 닫힘 상태의 latest assistant markdown tooltip 렌더링 |
| `src/components/bottom-search-bar/BottomSearchBarUnreadIndicator.tsx` | 닫힘 상태 unread badge 렌더링 |
| `src/components/bottom-search-bar/BottomSearchBarLauncherButton.tsx` | launcher button, themed image, idle/busy animation layers 렌더링 |
| `src/components/bottom-search-bar/BottomSearchBarSurface.tsx` | open surface shell, preview/input/attribution 배치 |
| `src/components/bottom-search-bar/BottomSearchBarPreview.tsx` | preview article/header/body/error/chips composition 렌더링 |
| `src/components/bottom-search-bar/BottomSearchBarChips.tsx` | bottom search suggestion chip section 렌더링 |
| `src/components/bottom-search-bar/BottomSearchBarInput.tsx` | embedded `AXSearchBar` input card 렌더링 |
| `src/components/bottom-search-bar/markdown.tsx` | preview/tooltip markdown component maps |
| `src/components/bottom-search-bar/keyframes.tsx` | launcher/surface keyframe style tags |
| `src/components/bottom-search-bar/selectors.ts` | bottom-search-specific latest user selector |
| `src/components/bottom-search-bar/AssistantInfoErrorPreview.tsx` | 최신 assistant `info.error` inline alert 렌더링 |
| `src/components/AXBottomSearchBarContent.ts` | 기존 chip helper import 경로를 유지하는 compatibility facade |
| `src/components/bottom-search-bar/content.ts` | bottom search chip 목록 생성 |
| `src/components/AXSearchBar.tsx` | embedded input form, clear button, submit button |
| `src/components/AXChatErrorBar.tsx` | message-scoped error bar |
| `src/components/AXChatMessagePopoverBase.tsx` | shared `AXTtsToggleButton` 구현 |
| `src/components/AXPoweredBy.tsx` | 기존 attribution import 경로를 유지하는 compatibility facade |
| `src/components/shared/AXPoweredBy.tsx` | attribution link |
| `src/components/AXUITargets.ts` | `bottomSearchBar` 기본 variant 결정 |
| `packages/axsdk-browser/src/embed.ts` | browser embed에서 기본 `ui.variant`를 `bottomSearchBar`로 전달 |
| `tests/AXBottomSearchBar.test.tsx` | closed/open 상태, chips, preview, TTS, errors, attribution의 source-level regression coverage |
| `tests/AXUIBottomSearchReset.test.ts` | bottom submit session-preserving behavior coverage |
