# 디자인 토큰 & 브랜딩 규약 (Design Tokens & Branding Convention)

> **목적**: quality-score §2.B 재사용성 — "리브랜딩 = 토큰 한 벌 수정"을 성립시키기 위한 색상 토큰 SSOT.
> 프론트엔드 헌법 제6조(디자인 토큰) 실무 지침. 색은 팔레트 리터럴(`slate-500`)이 아니라 **시맨틱 토큰**으로 참조한다.
> **정의 위치**: [frontend/src/app/globals.css](../../frontend/src/app/globals.css) (`@theme` + `:root`/`.dark` HSL 변수).

---

## 1. 리브랜딩 방법 (한 곳만 고친다)

새 SI 프로젝트로 복제 후 브랜드를 바꾸려면 **globals.css 의 토큰 값만** 수정한다. 컴포넌트 클래스는 손대지 않는다.

| 바꾸려는 것 | 수정할 토큰(`:root`, 필요 시 `.dark`) |
|---|---|
| 주 브랜드색 | `--primary`, `--ring` |
| 다크 서피스(프리미엄 다크 카드/히어로) 색조 | `--surface-inverse` (+ `-foreground`/`-muted`/`-border`) |
| 중립 바탕/보조 | `--background`·`--card`·`--muted`·`--border`·`--muted-foreground` |
| 강조 카테고리(대시보드 위젯) | `--hub-blue`·`--hub-orange`·`--hub-purple`·… |
| 상태색 | `--success`·`--warning`·`--info`·`--destructive` |

---

## 2. 시맨틱 토큰 어휘 (컴포넌트에서 이것만 쓴다)

| 용도 | 토큰 유틸리티 | 라이트/다크 |
|---|---|---|
| 페이지 바탕 | `bg-background` / `text-foreground` | flip |
| 카드 표면 | `bg-card` / `text-card-foreground` | flip |
| 은은한 바탕 / 보조 텍스트 | `bg-muted` / `text-muted-foreground` | flip |
| 강조 바탕 | `bg-secondary` · `bg-accent` | flip |
| 경계 / 링 / 구분선 | `border-border` · `ring-ring` · `ring-border` · `divide-border` | flip |
| 입력 | `bg-input` · `border-input` | flip |
| 주 브랜드 | `bg-primary` / `text-primary` / `border-primary` / `ring-primary` | flip |
| 상태 | `bg-success`·`bg-warning`·`bg-info`·`bg-destructive` (+ `-foreground`) | flip |
| **카테고리 액센트** | `bg-hub-blue`·`bg-hub-indigo`·`bg-hub-purple`·`bg-hub-emerald`·`bg-hub-rose`·`bg-hub-amber`·`bg-hub-orange` | 고정색(다중 색조 변이) |
| **의도적 다크 서피스** | **`bg-surface-inverse` / `text-surface-inverse-foreground` / `text-surface-inverse-muted` / `border-surface-inverse-border`** | **항상 어두움(고정)** |

### 2.1 hub-* — 카테고리 액센트 팔레트 (다중 색조)

컴포넌트가 **색 변이 옵션**(대시보드 위젯·배지·아이콘칩)으로 제공하는 다중 색조는 `hub-*` 고정색 토큰을 쓴다.
`--hub-blue`(≈브랜드 primary)·`--hub-indigo`·`--hub-purple`·`--hub-emerald`·`--hub-rose`·`--hub-amber`·`--hub-orange`.
액센트 리브랜딩은 이 토큰 색조만 바꾼다. ⚠ **상태색(success/warning/destructive)** 은 별도 — 카테고리 액센트로 쓰지 말 것.

### 2.2 `surface-inverse` — 의도적 다크 서피스 패턴 (중요)

밝은 페이지 위에 **의도적으로 어두운** 카드/히어로/CTA(예: 프리미엄 다크 패널, 다이얼로그 헤더)는
테마와 무관하게 **항상 어두워야** 한다. 이를 `bg-card`(테마 추종 = 라이트에서 흰색) 로 바꾸면 **다크 카드가 흰색으로 파손**된다.
→ 이런 표면은 **`bg-surface-inverse`** 를 쓴다. 그 위의 밝은 텍스트/경계는 `text-surface-inverse-foreground`/
`-muted`/`border-surface-inverse-border`. 이 토큰군은 `:root` 에만 정의되어 `.dark` 에서도 동일하게 어둡다(고정).
리브랜딩 시 이 토큰 색조만 바꾸면 모든 다크 서피스가 함께 바뀐다.

---

## 3. 팔레트 리터럴 → 토큰 매핑 SPEC (신규 코드·마이그레이션 공통)

중립 팔레트(`slate`/`gray`/`zinc`/`neutral`/`stone`)-NNN 하드코딩은 아래 규칙으로 토큰화한다.
**액센트(blue/indigo/purple 등)·상태색(red/green/amber 등)은 별도** — 중립만 이 표를 따른다.

### R1. 라이트+다크 페어 → collapse (dark: 변형 삭제)
| 하드코딩 페어 | → 토큰 |
|---|---|
| `bg-white dark:bg-slate-900\|950\|800` | `bg-card` |
| `bg-slate-50\|100 dark:bg-slate-800\|900` | `bg-muted` (카드면 `bg-card`) |
| `text-slate-900\|800 dark:text-white\|slate-100` | `text-foreground` |
| `text-slate-600\|500 dark:text-slate-300\|400` | `text-muted-foreground` |
| `border-slate-200 dark:border-slate-700\|800` | `border-border` |

### R2. 의도적 다크 서피스 → surface-inverse
`bg-slate-900\|950\|800` 이 라이트 대응 없이 단독(또는 다크 그라디언트)이면 §2.2 패턴 →
`bg-surface-inverse`, 그 위 `text-white\|slate-100`→`text-surface-inverse-foreground`,
`text-slate-200\|300`→`text-surface-inverse-muted`, `border-slate-700\|800`→`border-surface-inverse-border`.

### R3. 단독 라이트 중립
`text-slate-900\|800\|700`→`text-foreground` · `text-slate-600\|500\|400`→`text-muted-foreground` ·
`bg-slate-50\|100\|200`→`bg-muted` · `border-slate-*`→`border-border` · `ring-slate-*`→`ring-border` ·
`divide-slate-*`→`divide-border` · `placeholder-slate-*`→`placeholder:text-muted-foreground`.

---

## 4. 리터럴 예외와 래칫 운영

팔레트 리터럴은 기본적으로 시맨틱 토큰으로 바꾼다. 다만 다음처럼 단일 토큰 치환이 의미나 대비를 파손하는 경우에는 코드 리뷰에 이유와 라이트·다크 시각 증거를 남겨 예외로 유지할 수 있다.

- `bg-clip-text` 텍스트 그라디언트와 데이터 시각화 명암 스케일
- 항상 흰색인 mark/pill 위의 고정 다크 텍스트
- 다크 서피스 위 투명 오버레이와 중첩 표면
- 토큰이 아직 표현하지 못하는 파스텔 tint나 구조적 색 단계

예외는 아래 exact baseline 게이트에 동결된다. 기본 방향은 리터럴 감소이며, 감소한 변경은 같은 변경에서 baseline을 낮춘다. 신규 예외 때문에 baseline을 올릴 때는 토큰으로 표현할 수 없는 이유와 시각 검증을 함께 제시한다.

### 4.1 하드코딩 차단 게이트

색 부채는 **exact-match 양방향 베이스라인 2종**이 담당한다. 둘의 합집합이 Tailwind 전 팔레트다.

| 게이트 | 커버 계열 | 실행 경로 |
|---|---|---|
| [`hardcoded-color-guard.test.ts`](../../frontend/src/__tests__/hardcoded-color-guard.test.ts) | 중립(slate·gray·zinc·neutral·stone) + 브랜드(blue·indigo·sky·violet·purple·cyan·teal·fuchsia) | pre-push(`vitest run src/__tests__`) · CI(`pnpm test`) |
| [`status-color-guard.test.ts`](../../frontend/src/__tests__/status-color-guard.test.ts) | status(red·green·emerald·rose·amber·orange·yellow·lime·pink) | 동일 |

현재 baseline 값은 각 테스트 소스에서 확인한다. 문서에 복제한 수치를 완화 근거로 사용하지 않는다.

- **양방향 래칫**: 증가뿐 아니라 감소 후 baseline 미갱신도 실패한다. 개선분을 다음 변경의 여유분으로 남기지 않는다.
- **치환 지침**: green·emerald → `success`, amber·yellow·orange → `warning`, red·rose → `destructive`(강조는 `-emphasis`), 정보성 blue → `info`(기존 가드 소관).

#### ESLint 자문 규칙과의 경계

`eslint.config.mjs`의 `local-theme/enforce-design-tokens`는 정적 `className`의 일부 팔레트·utility와 불투명 `bg-white`를 찾는 `warn` 규칙이다. 동적 조합과 전 팔레트를 증명하지 않으므로, 이 규칙의 경고 예산을 넓혀 색상 계약을 대신하지 않는다. 전 팔레트 회귀는 위 두 Vitest 래칫이 소유하며 자세한 사용법은 [Tailwind 린트 규칙](./tailwind-lint-rules.md)을 따른다.

> **원칙**: 정적 검증(`tsc`/`next build`)은 통과해도 **색·다크모드 시각 회귀는 잡지 못한다**. 대규모 색 변경 후에는 반드시 라이트/다크 **육안 검증**을 병행한다(프론트 헌법 제6조).

*Last reviewed against current sources: 2026-08-19.*
