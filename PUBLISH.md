# Publish Guide

## 사용법

```bash
# patch 버전 업 + publish (0.3.4 -> 0.3.5)
bun run bump

# minor 버전 업 + publish (0.3.4 -> 0.4.0)
bun run bump:minor

# major 버전 업 + publish (0.3.4 -> 1.0.0)
bun run bump:major

# dry-run (버전 변경만 확인, publish 안 함)
bun run bump:dry
```

## 동작 순서

1. 모든 패키지 버전을 일괄 bump
2. 패키지 간 cross-dependency 버전 자동 업데이트 (`@axsdk/core`, `@axsdk/react` 등)
3. 의존성 순서대로 빌드 & publish: `core` → `react` → `browser`
4. publish 완료 후 workspace deps (`workspace:*`)로 자동 복원

## 사전 조건

- npm 로그인 필요: `npm login`
- 각 패키지의 빌드가 정상 동작해야 함
