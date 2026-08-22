# 디자인 토큰 & 브랜딩 규약 (Design Tokens & Branding Convention)

> **목적**: 컴포넌트가 브랜드 리터럴이 아니라 안정된 시맨틱 계약을 소비하도록 하는 색상 토큰 SSOT.
> 프론트엔드 헌법 제6조(디자인 토큰) 실무 지침. 색은 팔레트 리터럴(`slate-500`)이 아니라 **시맨틱 토큰**으로 참조한다.
> **정의 위치**: [frontend/src/app/globals.css](../../frontend/src/app/globals.css) (`@theme` + `:root`/`.dark` HSL 변수).
> **목표 구조**: [ADR-0003](../02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md)에 따라 브랜드 프로필과 색상 모드를 독립 축으로 분리한다. 현재 구현은 아직 단일 token set의 light/dark이므로 목표 상태를 지원 완료로 표현하지 않는다.

---

## 1. 현재 단일 프로필의 리브랜딩 방법

현재 새 SI 프로젝트로 복제해 단일 브랜드로 쓸 때는 **globals.css 의 토큰 값만** 수정하고 컴포넌트 클래스는 손대지 않는다. KRDS와 premium처럼 여러 프로필을 동시에 지원할 때는 같은 시맨틱 토큰 이름을 구현하는 profile adapter를 사용하며, source import를 바꾸는 방식으로 프로필을 가장하지 않는다.

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

`eslint.config.mjs`의 `local-theme/enforce-design-tokens`는 빠른 작성 피드백을 위한 `warn` 규칙이다. 현재 구현은 JSX의 정적 `className` 문자열과 template literal의 정적 조각에서 다음 항목만 찾는다.

- `bg|text|border|ring` + `red|blue|green|yellow|orange|purple|pink|indigo|teal` + `100`~`900`
- 투명도 접미사가 없는 불투명 `bg-white` (`bg-white/80` 등은 제외)

동적 클래스 조합, 위 목록 밖의 utility·variant·팔레트는 이 규칙만으로 증명할 수 없다. 또한 warning 수를 허용하거나 `lint`가 종료 코드 0을 반환했다고 해서 색상 계약이 통과한 것은 아니다. 전 팔레트 회귀의 하드 차단은 위 두 exact-match Vitest 래칫이 소유한다.

```bash
# 빠른 자문 피드백
pnpm -C frontend run lint

# 팔레트 리터럴 하드 차단 계약
pnpm -C frontend exec vitest run \
  src/__tests__/hardcoded-color-guard.test.ts \
  src/__tests__/status-color-guard.test.ts
```

래칫 실패는 기본적으로 리터럴을 시맨틱 토큰으로 치환해 해결한다. 감소했다면 같은 변경에서 baseline을 현재 실측값으로 낮추고, 신규 예외로 baseline을 올려야 한다면 토큰으로 표현할 수 없는 이유와 라이트·다크 시각 증거를 리뷰에 남긴다.

> **원칙**: 정적 검증(`tsc`/`next build`)은 통과해도 **색·다크모드 시각 회귀는 잡지 못한다**. 대규모 색 변경 후에는 반드시 라이트/다크 **육안 검증**을 병행한다(프론트 헌법 제6조).

*Last reviewed against current sources: 2026-08-19.*
