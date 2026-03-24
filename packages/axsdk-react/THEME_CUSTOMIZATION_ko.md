# axsdk-react 테마 커스터마이제이션 가이드

`axsdk-react`는 CSS 변수 기반의 테마 시스템을 제공합니다. 개발자는 **CSS 직접 오버라이드** 또는 **TypeScript `theme` prop** 두 가지 방법으로 UI 스타일을 커스터마이징할 수 있습니다.

---

## 목차

1. [개요](#1-개요)
2. [CSS 변수로 커스터마이징 (권장)](#2-css-변수로-커스터마이징-권장)
3. [TypeScript theme prop으로 커스터마이징](#3-typescript-theme-prop으로-커스터마이징)
4. [AXThemeProvider 직접 사용 (고급)](#4-axthemeprovider-직접-사용-고급)
5. [컴포넌트별 styles override](#5-컴포넌트별-styles-override)
6. [라이트 모드 지원](#6-라이트-모드-지원)

---

## 1. 개요

`axsdk-react`의 테마 시스템은 **CSS 커스텀 속성(CSS Variables)** 을 기반으로 동작합니다. `<AXUI>` 컴포넌트가 렌더링될 때, 포털 루트 `div` 요소에 `--ax-*` 접두사를 가진 CSS 변수가 자동으로 주입됩니다. 모든 하위 컴포넌트는 `var(--ax-*)` 구문으로 이 변수들을 소비합니다.

### 두 가지 커스터마이징 방법

| 방법 | 설명 | 권장 대상 |
|------|------|-----------|
| **CSS 직접 오버라이드** | `--ax-*` CSS 변수를 CSS 파일에서 직접 덮어씁니다 | 브랜드 색상 일괄 변경 |
| **TypeScript `theme` prop** | `<AXUI theme={...} />` prop으로 타입 안전하게 구성합니다 | 세밀한 제어, 동적 테마 변경 |

---

## 2. CSS 변수로 커스터마이징 (권장)

가장 간단한 방법은 CSS 파일에서 `--ax-*` 변수를 오버라이드하는 것입니다.

```css
/* 포털 루트 요소에 직접 지정하거나, :root에 전역 선언합니다 */
:root {
  /* 브랜드 색상을 보라색에서 파란색으로 변경 */
  --ax-color-primary:       #2563eb;
  --ax-color-primary-dark:  #1d4ed8;
  --ax-color-primary-light: #3b82f6;
  --ax-color-primary-muted: #60a5fa;

  /* 링/배지 그라디언트 액센트 색상 조정 */
  --ax-color-accent1: #3b82f6;
  --ax-color-accent2: #06b6d4;
  --ax-color-accent3: #0891b2;
  --ax-color-accent4: #8b5cf6;
}
```

> **주의:** AXUI는 포털을 `document.body`에 별도 `div`로 마운트합니다. 호스트 페이지 CSS가 포털 내부에 적용되지 않을 수 있으므로, `theme` prop을 사용하는 방법이 더 안정적입니다.

---

### CSS 변수 전체 참조표

`injectCSSVariables()` 함수가 포털 루트에 주입하는 CSS 변수 목록입니다.  
`colorMode`가 `'dark'`일 때의 기본값을 기준으로 합니다.

#### 컬러 토큰 (`--ax-color-*`)

| 변수명 | 기본값 (dark) | 설명 |
|--------|--------------|------|
| `--ax-color-primary` | `#7c3aed` | 메인 브랜드 색상 (보라) |
| `--ax-color-primary-dark` | `#1d4ed8` | 보조 그라디언트 파트너 (인디고) |
| `--ax-color-primary-light` | `#a855f7` | 테두리·포커스 링용 밝은 액센트 |
| `--ax-color-primary-muted` | `#c084fc` | 그라디언트 텍스트용 뮤트 색상 |
| `--ax-color-accent1` | `#a855f7` | 링 그라디언트 액센트 1 (바이올렛) |
| `--ax-color-accent2` | `#3b82f6` | 링 그라디언트 액센트 2 (블루) |
| `--ax-color-accent3` | `#06b6d4` | 링 그라디언트 액센트 3 (시안) |
| `--ax-color-accent4` | `#ec4899` | 링 그라디언트 액센트 4 (핑크) |
| `--ax-color-primary-rgb` | `168, 85, 247` | `primaryLight`의 R,G,B 컴포넌트 문자열 (rgba 조합용) |

#### 배경 토큰 (`--ax-bg-*`)

| 변수명 | 기본값 (dark) | 설명 |
|--------|--------------|------|
| `--ax-bg-base` | `rgba(12, 12, 18, 0.97)` | 채팅 패널 기본 배경 |
| `--ax-bg-popover` | `rgba(18, 18, 28, 0.92)` | 팝오버 / 말풍선 배경 |
| `--ax-bg-user-message` | `linear-gradient(135deg, rgba(124,58,237,1) 0%, rgba(79,70,229,1) 100%)` | 사용자 메시지 버블 배경 |
| `--ax-bg-assistant-message` | `rgba(255, 255, 255, 1.0)` | 어시스턴트 메시지 버블 배경 |
| `--ax-bg-question-dialog` | `linear-gradient(160deg, rgba(20,15,45,0.97) 0%, rgba(10,8,30,0.98) 100%)` | 질문 다이얼로그 카드 배경 |
| `--ax-bg-input-textarea` | `rgba(255, 255, 255, 0.07)` | 입력 textarea 배경 |
| `--ax-bg-overlay` | `rgba(0, 0, 0, 0.5)` | 전체 화면 오버레이 백드롭 |
| `--ax-bg-error` | `rgba(248, 113, 113, 0.08)` | 에러 상태 배경 |

#### 텍스트 토큰 (`--ax-text-*`)

| 변수명 | 기본값 (dark) | 설명 |
|--------|--------------|------|
| `--ax-text-primary` | `rgba(255, 255, 255, 0.92)` | 주요 텍스트 색상 |
| `--ax-text-muted` | `rgba(255, 255, 255, 0.75)` | 보조 / 뮤트 텍스트 |
| `--ax-text-dim` | `rgba(255, 255, 255, 0.45)` | 흐린 장식용 텍스트 |
| `--ax-text-assistant` | `rgba(33, 33, 33, 0.92)` | 어시스턴트 버블 내부 텍스트 |
| `--ax-text-timestamp` | `rgba(255, 255, 255, 0.28)` | 타임스탬프 레이블 |
| `--ax-text-error` | `#f87171` | 에러 메시지 색상 |
| `--ax-text-success` | `rgba(52, 211, 153, 0.9)` | 성공 확인 색상 |
| `--ax-text-caret` | `#a78bfa` | Textarea 캐럿 색상 |
| `--ax-text-gradient` | `linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)` | 말풍선 그라디언트 텍스트 |

#### 테두리 토큰 (`--ax-border-*`)

| 변수명 | 기본값 (dark) | 설명 |
|--------|--------------|------|
| `--ax-border-primary` | `rgba(168, 85, 247, 0.35)` | 주요 테두리 (`primaryLight` 기반 자동 계산) |
| `--ax-border-surface` | `rgba(255, 255, 255, 0.12)` | 서피스 구분선 (dark) / `rgba(0,0,0,0.12)` (light) |
| `--ax-border-error` | `rgba(248, 113, 113, 0.25)` | 에러 상태 테두리 |

---

## 3. TypeScript theme prop으로 커스터마이징

`<AXUI>` 컴포넌트의 `theme` prop에 `AXTheme` 객체를 전달하면 타입 안전하게 테마를 구성할 수 있습니다.

### `AXTheme` 타입 구조

```typescript
import type { AXTheme } from '@axsdk/react';

const myTheme: AXTheme = {
  // 색상 모드: 'dark' | 'light' (기본값: 'dark')
  colorMode: 'dark',

  // 기본(유휴) 버튼 아이콘 이미지 URL
  buttonImageUrl: 'https://example.com/bot-icon.png',

  // busy 상태일 때 표시할 이미지(GIF 가능) URL
  buttonAnimationImageUrl: 'https://example.com/bot-spinning.gif',

  // 색상 토큰 오버라이드
  colors: {
    primary: {
      primary:      '#2563eb',  // 메인 브랜드 색상
      primaryDark:  '#1d4ed8',  // 보조 그라디언트 색상
      primaryLight: '#3b82f6',  // 테두리·링 색상
      primaryMuted: '#60a5fa',  // 뮤트 브랜드 색상
      accent1:      '#3b82f6',  // 링 그라디언트 액센트 1
      accent2:      '#06b6d4',  // 링 그라디언트 액센트 2
      accent3:      '#0891b2',  // 링 그라디언트 액센트 3
      accent4:      '#8b5cf6',  // 링 그라디언트 액센트 4
    },
    bg: {
      dark: {
        base:             'rgba(10, 10, 20, 0.97)',
        popover:          'rgba(15, 15, 30, 0.92)',
        userMessage:      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        assistantMessage: 'rgba(255, 255, 255, 1.0)',
        questionDialog:   'linear-gradient(160deg, rgba(10,15,40,0.97) 0%, rgba(5,8,25,0.98) 100%)',
        inputTextarea:    'rgba(255, 255, 255, 0.07)',
        overlay:          'rgba(0, 0, 0, 0.5)',
        error:            'rgba(248, 113, 113, 0.08)',
      },
      light: {
        base:             'rgba(255, 255, 255, 0.97)',
        popover:          'rgba(248, 248, 252, 0.97)',
        userMessage:      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        assistantMessage: 'rgba(245, 245, 250, 1.0)',
        questionDialog:   'rgba(255, 255, 255, 0.98)',
        inputTextarea:    'rgba(0, 0, 0, 0.04)',
        overlay:          'rgba(0, 0, 0, 0.35)',
        error:            'rgba(248, 113, 113, 0.06)',
      },
    },
    text: {
      primary:   'rgba(255, 255, 255, 0.92)',
      muted:     'rgba(255, 255, 255, 0.75)',
      dim:       'rgba(255, 255, 255, 0.45)',
      assistant: 'rgba(33, 33, 33, 0.92)',
      timestamp: 'rgba(255, 255, 255, 0.28)',
      error:     '#f87171',
      success:   'rgba(52, 211, 153, 0.9)',
      caret:     '#60a5fa',
      gradient:  'linear-gradient(90deg, #60a5fa 0%, #818cf8 50%, #38bdf8 100%)',
    },
    border: {
      error: 'rgba(248, 113, 113, 0.25)',
    },
  },

  // 컴포넌트별 inline style 오버라이드
  styles: {
    button: { /* AXThemeButtonStyles */ },
    input:  { /* AXThemeInputStyles  */ },
    popover: { /* AXThemePopoverStyles */ },
    message: { /* AXThemeMessageStyles */ },
    questionDialog: { /* AXThemeQuestionDialogStyles */ },
  },
};
```

### 예제: dark / light 모드 전환

```tsx
import React, { useState } from 'react';
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

export function App() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark');

  const theme: AXTheme = { colorMode: mode };

  return (
    <>
      <button onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}>
        {mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      </button>
      <AXUI theme={theme} />
    </>
  );
}
```

### 예제: 커스텀 브랜드 색상 적용 (보라 → 파랑)

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const blueTheme: AXTheme = {
  colorMode: 'dark',
  colors: {
    primary: {
      primary:      '#2563eb',
      primaryDark:  '#1d4ed8',
      primaryLight: '#3b82f6',
      primaryMuted: '#60a5fa',
      accent1:      '#3b82f6',
      accent2:      '#06b6d4',
      accent3:      '#0891b2',
      accent4:      '#8b5cf6',
    },
    bg: {
      dark: {
        userMessage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
  },
};

export function App() {
  return <AXUI theme={blueTheme} />;
}
```

### 예제: 버튼 이미지 커스텀

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const customButtonTheme: AXTheme = {
  // 유휴 상태 버튼 아이콘
  buttonImageUrl: 'https://example.com/my-bot-icon.png',
  // busy 상태(응답 생성 중)일 때 보여줄 애니메이션 GIF
  buttonAnimationImageUrl: 'https://example.com/my-bot-loading.gif',
};

export function App() {
  return <AXUI theme={customButtonTheme} />;
}
```

---

## 4. `AXThemeProvider` 직접 사용 (고급)

### `useAXTheme()` 훅으로 현재 테마 접근

`AXThemeProvider` 하위의 어느 컴포넌트에서든 `useAXTheme()` 훅으로 현재 테마 값에 접근할 수 있습니다.

```tsx
import { useAXTheme } from '@axsdk/react';

function MyCustomComponent() {
  const { theme, resolvedColorMode } = useAXTheme();

  return (
    <div style={{ color: theme.colors?.text?.primary }}>
      현재 모드: {resolvedColorMode}
    </div>
  );
}
```

`useAXTheme()`이 반환하는 `AXThemeContextValue` 구조:

```typescript
interface AXThemeContextValue {
  theme: AXTheme;                    // 사용자가 전달한 테마 (미병합 원본)
  resolvedColorMode: 'dark' | 'light'; // 실제 적용된 색상 모드
}
```

### `AXThemeProvider`를 독립적으로 사용

`<AXUI>` 없이 커스텀 컴포넌트 트리에 테마 컨텍스트만 제공하려는 경우:

```tsx
import { AXThemeProvider } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const myTheme: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: { primary: '#2563eb' },
  },
};

function Root() {
  return (
    <AXThemeProvider theme={myTheme}>
      {/* 하위 컴포넌트에서 useAXTheme()으로 테마 접근 가능 */}
      <MyCustomChatInterface />
    </AXThemeProvider>
  );
}
```

### `mergeTheme()` 유틸 함수

`mergeTheme()`는 사용자 테마를 기본 테마(dark 또는 light)에 딥 머지하여 완전히 채워진 `AXTheme` 객체를 반환합니다.

```typescript
import { mergeTheme } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const partial: AXTheme = {
  colorMode: 'dark',
  colors: {
    primary: { primary: '#2563eb' },
  },
};

// dark 기본값 위에 partial을 딥 머지
const resolved = mergeTheme(partial);
console.log(resolved.colors?.primary?.primaryLight); // '#a855f7' (기본값 유지)
```

### `injectCSSVariables()` 유틸 함수

DOM 요소에 `--ax-*` CSS 변수를 직접 주입할 때 사용합니다. `<AXUI>`는 내부적으로 이 함수를 포털 루트에 자동 호출합니다.

```typescript
import { injectCSSVariables } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const myTheme: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: { primary: '#2563eb' },
  },
};

// 특정 DOM 요소에 CSS 변수 주입
const container = document.getElementById('my-ax-container')!;
injectCSSVariables(container, myTheme);
```

---

## 5. 컴포넌트별 styles override

`theme.styles` 객체를 통해 각 컴포넌트의 특정 DOM 요소를 `React.CSSProperties`로 세밀하게 제어할 수 있습니다. 사용자 스타일은 컴포넌트 기본 inline style에 `Object.assign`으로 병합되며, **사용자 값이 우선**합니다.

### `styles.button` — `AXThemeButtonStyles`

`AXButton` 컴포넌트의 각 레이어를 오버라이드합니다.

| 키 | 대상 요소 |
|----|----------|
| `wrapper` | 외부 래퍼 `div` (position: fixed 컨테이너) |
| `button` | `<button>` 요소 자체 |
| `orb` | 오브/메인 바디 레이어 |
| `label` | "AX" 레이블 `span` (`buttonImageUrl` 미설정 시) |

### `styles.input` — `AXThemeInputStyles`

`AXChatMessageInput` 컴포넌트를 오버라이드합니다.

| 키 | 대상 요소 |
|----|----------|
| `card` | 외부 카드 컨테이너 `div` |
| `textarea` | `<textarea>` 요소 |
| `sendButton` | 전송 `<button>` |
| `clearButton` | 초기화 `<button>` |
| `guideText` | 가이드 텍스트 `div` |

### `styles.popover` — `AXThemePopoverStyles`

`AXChatMessagePopoverBase`(알림 팝오버, 최근 메시지) 컴포넌트를 오버라이드합니다.

| 키 | 대상 요소 |
|----|----------|
| `wrapper` | 외부 위치 지정 래퍼 |
| `card` | backdrop-filter가 있는 내부 카드 |
| `content` | 스크롤 가능한 콘텐츠 영역 |
| `closeButton` | 닫기 버튼 |

### `styles.message` — `AXThemeMessageStyles`

`AXChatMessage` 개별 메시지 버블을 오버라이드합니다.

| 키 | 대상 요소 |
|----|----------|
| `row` | 외부 행 `div` |
| `userBubble` | 사용자 메시지 버블 `div` |
| `assistantBubble` | 어시스턴트 메시지 버블 `div` |
| `timestamp` | 타임스탬프 `div` |

### `styles.questionDialog` — `AXThemeQuestionDialogStyles`

`AXQuestionDialog` 컴포넌트를 오버라이드합니다.

| 키 | 대상 요소 |
|----|----------|
| `card` | 다이얼로그 카드 외부 `div` |
| `optionSelected` | 선택된 옵션 카드 버튼 |
| `optionUnselected` | 미선택 옵션 카드 버튼 |
| `submitButton` | 제출/다음 버튼 (활성 상태) |
| `declineButton` | 거절 버튼 |

### 예제: 컴포넌트별 스타일 오버라이드

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

const styledTheme: AXTheme = {
  colorMode: 'dark',
  styles: {
    button: {
      wrapper: {
        bottom: '2rem',
        right: '2rem',
      },
      button: {
        borderRadius: '16px', // 원형 대신 둥근 사각형
      },
    },
    input: {
      card: {
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
      textarea: {
        fontSize: '1rem',
        lineHeight: '1.6',
      },
      sendButton: {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
    popover: {
      card: {
        maxWidth: '360px',
        borderRadius: '16px',
      },
    },
    message: {
      userBubble: {
        borderRadius: '18px 18px 4px 18px',
      },
      assistantBubble: {
        borderRadius: '18px 18px 18px 4px',
      },
    },
    questionDialog: {
      card: {
        borderRadius: '20px',
        padding: '1.5rem',
      },
      submitButton: {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
  },
};

export function App() {
  return <AXUI theme={styledTheme} />;
}
```

---

## 6. 라이트 모드 지원

`colorMode: 'light'`를 설정하면 라이트 배경 페이지에 적합한 팔레트가 자동 적용됩니다.

```tsx
import { AXUI } from '@axsdk/react';

export function App() {
  return <AXUI theme={{ colorMode: 'light' }} />;
}
```

`colorMode: 'light'`로 전환 시 자동으로 교체되는 CSS 변수 기본값:

| CSS 변수 | dark 기본값 | light 기본값 |
|----------|------------|-------------|
| `--ax-bg-base` | `rgba(12, 12, 18, 0.97)` | `rgba(255, 255, 255, 0.97)` |
| `--ax-bg-popover` | `rgba(18, 18, 28, 0.92)` | `rgba(248, 248, 252, 0.97)` |
| `--ax-bg-assistant-message` | `rgba(255, 255, 255, 1.0)` | `rgba(245, 245, 250, 1.0)` |
| `--ax-bg-question-dialog` | `linear-gradient(160deg, rgba(20,15,45,0.97) ...)` | `rgba(255, 255, 255, 0.98)` |
| `--ax-bg-input-textarea` | `rgba(255, 255, 255, 0.07)` | `rgba(0, 0, 0, 0.04)` |
| `--ax-bg-overlay` | `rgba(0, 0, 0, 0.5)` | `rgba(0, 0, 0, 0.35)` |
| `--ax-bg-error` | `rgba(248, 113, 113, 0.08)` | `rgba(248, 113, 113, 0.06)` |
| `--ax-text-primary` | `rgba(255, 255, 255, 0.92)` | `rgba(20, 20, 40, 0.92)` |
| `--ax-text-muted` | `rgba(255, 255, 255, 0.75)` | `rgba(20, 20, 40, 0.60)` |
| `--ax-text-dim` | `rgba(255, 255, 255, 0.45)` | `rgba(20, 20, 40, 0.35)` |
| `--ax-text-assistant` | `rgba(33, 33, 33, 0.92)` | `rgba(20, 20, 40, 0.92)` |
| `--ax-text-timestamp` | `rgba(255, 255, 255, 0.28)` | `rgba(20, 20, 40, 0.30)` |
| `--ax-text-error` | `#f87171` | `#dc2626` |
| `--ax-text-success` | `rgba(52, 211, 153, 0.9)` | `rgba(5, 150, 105, 0.9)` |
| `--ax-text-caret` | `#a78bfa` | `#7c3aed` |
| `--ax-text-gradient` | `linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)` | `linear-gradient(90deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)` |
| `--ax-border-error` | `rgba(248, 113, 113, 0.25)` | `rgba(248, 113, 113, 0.35)` |
| `--ax-border-surface` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.12)` |
| `--ax-color-accent1` | `#a855f7` | `#9333ea` |
| `--ax-color-accent2` | `#3b82f6` | `#2563eb` |
| `--ax-color-accent3` | `#06b6d4` | `#0891b2` |
| `--ax-color-accent4` | `#ec4899` | `#db2777` |
| `--ax-color-primary-dark` | `#1d4ed8` | `#4f46e5` |

> 라이트 모드에서도 `colors` 필드를 통해 개별 토큰을 추가로 오버라이드할 수 있습니다. `mergeTheme()`은 `colorMode: 'light'`가 지정된 경우 라이트 기본값 위에 사용자 오버라이드를 딥 머지합니다.

```tsx
import { AXUI } from '@axsdk/react';
import type { AXTheme } from '@axsdk/react';

// 라이트 모드 + 파란색 브랜드
const lightBlueTheme: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: {
      primary:      '#2563eb',
      primaryLight: '#3b82f6',
    },
    bg: {
      light: {
        userMessage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      },
    },
  },
};

export function App() {
  return <AXUI theme={lightBlueTheme} />;
}
```
