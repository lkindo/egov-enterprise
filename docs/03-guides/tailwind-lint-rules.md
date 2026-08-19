# Tailwind 디자인 토큰 린트 규칙

이 문서는 `frontend/eslint.config.mjs`의 로컬 규칙을 빠르게 해석하기 위한 보조 안내다. 색상 토큰의 정의와 변환 규약은 [디자인 토큰 가이드](./design-tokens.md), 상위 규범은 [프론트엔드 헌법 제6조](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)를 따른다. 실제 탐지 범위와 severity의 정본은 언제나 현재 `eslint.config.mjs`다.

## 현재 역할

`local-theme/enforce-design-tokens`는 JSX의 정적 `className` 문자열과 template literal 일부에서 다음 패턴을 찾는다.

- `bg|text|border|ring` + 일부 Tailwind 팔레트 + `100`~`900` 단계
- 불투명 `bg-white` (`bg-white/80` 같은 투명도 표현은 제외)

규칙은 `warn`이다. 동적 클래스 조합, 더 넓은 utility·variant·팔레트를 모두 해석하지 않으므로 전체 색상 계약을 증명하지 않는다. 저장소의 하드 차단 래칫은 다음 Vitest 계약이 담당한다.

| 계약 | 역할 |
|---|---|
| `src/__tests__/hardcoded-color-guard.test.ts` | 중립·브랜드 팔레트 리터럴의 exact baseline |
| `src/__tests__/status-color-guard.test.ts` | 상태 팔레트 리터럴의 exact baseline |

baseline을 올려 경고를 없애는 것은 기본 해결책이 아니다. 실제 리터럴을 시맨틱 토큰으로 바꾸고, 감소했다면 같은 변경에서 baseline을 낮춘다. 히트맵·차트처럼 팔레트 단계 자체가 의미인 예외는 시각 검증과 리뷰 근거가 필요하다.

## 권장 치환

```tsx
// 피한다
<div className="bg-red-500 text-white">오류</div>
<button className="bg-blue-600 text-white">확인</button>

// 시맨틱 토큰을 사용한다
<div className="bg-destructive text-destructive-foreground">오류</div>
<button className="bg-primary text-primary-foreground">확인</button>
```

- 중립 표면·텍스트: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`
- 상태: `success`, `warning`, `info`, `destructive` 계열
- 브랜드·카테고리: `primary`, `hub-*`
- 항상 어두운 표면: `surface-inverse` 계열

## 실행과 판정

```bash
pnpm -C frontend run lint
pnpm -C frontend exec vitest run \
  src/__tests__/hardcoded-color-guard.test.ts \
  src/__tests__/status-color-guard.test.ts
```

`lint` 성공만으로 색상 계약이 모두 검증됐다고 보고하지 않는다. 대규모 색 변경은 위 계약과 타입/빌드 검증에 더해 라이트·다크 화면을 직접 확인한다.

*Last reviewed against current sources: 2026-08-19.*
