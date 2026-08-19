# 디자인 토큰 구현 가이드

이 문서는 [프론트엔드 UX 헌법](./constitution.md)의 토큰 적용 진입점이다. 실제 토큰 이름과 값의 정본은 `frontend/src/app/globals.css`이며, 상세 마이그레이션 규칙은 [디자인 토큰 가이드](../../../../docs/03-guides/design-tokens.md)에 둔다. 색상값·잔여 건수·완료 이력을 이 문서에 중복 기록하지 않는다.

## 적용 원칙

1. 컴포넌트는 팔레트 리터럴보다 의미 토큰을 사용한다.
2. 라이트·다크 테마가 뒤집혀야 하는 표면은 `background`, `card`, `muted`, `border` 계열을 사용한다.
3. 테마와 무관하게 어두운 표면은 `surface-inverse` 계열을 사용한다.
4. 성공·주의·정보·위험은 `success`, `warning`, `info`, `destructive` 계열을 사용한다.
5. 대시보드 카테고리 구분은 `hub-*` 계열을 사용하되 상태 의미와 혼용하지 않는다.
6. 간격·반경·z-index·motion은 기존 컴포넌트와 `globals.css`의 토큰을 재사용한다. 임의 수치를 새 전역 규약처럼 문서화하지 않는다.

## 현재 토큰군

| 목적 | 대표 유틸리티 |
|---|---|
| 페이지·본문 | `bg-background`, `text-foreground` |
| 카드·보조 표면 | `bg-card`, `bg-muted`, `border-border` |
| 주 브랜드 | `bg-primary`, `text-primary`, `ring-primary` |
| 상태 | `bg-success`, `bg-warning`, `bg-info`, `bg-destructive` |
| 고정 다크 표면 | `bg-surface-inverse`, `text-surface-inverse-foreground` |
| 카테고리 액센트 | `bg-hub-blue`, `bg-hub-indigo`, `bg-hub-purple` 등 |

## 검증

- 타입·정적 검사: `pnpm -C frontend type-check`, `pnpm -C frontend lint`
- 색상 부채 래칫: `frontend/src/__tests__/hardcoded-color-guard.test.ts`, `status-color-guard.test.ts`
- 테마·접근성: 변경 화면을 라이트·다크와 reduced-motion 조건에서 브라우저로 확인한다.

정적 검사가 통과해도 대비·겹침·motion 회귀를 증명하지는 않는다. 시각 결과를 확인하지 않은 작업을 “검증 완료”라고 기록하지 않는다.
