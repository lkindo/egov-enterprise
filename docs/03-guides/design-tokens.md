# 디자인 토큰 & 브랜딩 규약 (Design Tokens & Branding Convention)

> **목적**: 컴포넌트가 브랜드 리터럴이 아니라 안정된 시맨틱 계약을 소비하도록 하는 색상 토큰 SSOT.
> 프론트엔드 헌법 제6조(디자인 토큰) 실무 지침. 색은 팔레트 리터럴(`slate-500`)이 아니라 **시맨틱 토큰**으로 참조한다.
> **정의 위치**: 값의 소유자는 [frontend/src/styles/themes/](../../frontend/src/styles/themes/)의 **프로필 CSS**(`premium.css`·`krds-aligned.css`)다. [globals.css](../../frontend/src/app/globals.css)는 `@theme` 간접 참조(`--color-x: hsl(var(--x))`)만 소유하며 `:root` 시맨틱 블록을 되돌리면 계약이 red다(theme-token-contract).
> **구조**: [ADR-0003](../02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md)의 브랜드 프로필 × 색상 모드 2축이 **구현 완료**됐다 — `<html data-brand-theme>`가 서버 env(`BRAND_THEME`)에서 전역 배선되며(레이아웃 1곳, 라우트별 배정은 ADR-0004 금지), 프로필 선택은 배포 단위 설정이다.

---

## 1. 30분 브랜드 프로필 — 새 브랜드 추가 레시피

새 SI 프로젝트의 브랜드는 **globals.css를 수정하지 않는다**. 프로필 CSS 한 장을 추가하고 allowlist에 올리면 끝이다:

1. **프로필 CSS 생성**: `frontend/src/styles/themes/<name>.css` — `premium.css`를 복사해 값만 바꾼다. 셀렉터 형태는 계약이 강제한다: 라이트 `:root[data-brand-theme="<name>"]`, 다크는 특이성 함정 때문에 반드시 조합 셀렉터 `:root[data-brand-theme="<name>"].dark`.
2. **키 패리티**: 라이트 블록은 기준 프로필과 **같은 시맨틱 키 집합을 완전 정의**해야 한다(누락 시 이전 프로필 값이 캐스케이드로 남는 조용한 파손 — theme-token-contract가 차단).
3. **import 연결**: `globals.css`에 `@import "../styles/themes/<name>.css";` 추가.
4. **allowlist 등록**: [brand-theme.ts](../../frontend/src/lib/theme/brand-theme.ts)의 `BRAND_THEMES`에 `'<name>'` 추가 — allowlist 밖 env 값은 premium으로 강등된다.
5. **대비 검증**: 상태색 pair는 status-token-contrast 계약이 양 모드 4.5:1을 수학 검증한다 — 값 선정 시 이 하한을 만족해야 계약이 green이다.
6. **활성화**: 배포 env `BRAND_THEME=<name>`. 미설정 시 premium(기본 셀렉터 `:root,`가 premium에 붙어 있어 속성 유무와 무관하게 동일).

검증: `pnpm -C frontend exec vitest run src/__tests__/theme-token-contract.test.ts src/__tests__/status-token-contrast.test.ts`.

바꾸는 값의 의미는 아래 표를 따른다(수정 대상은 이제 프로필 CSS다):

| 바꾸려는 것 | 프로필 CSS에서 수정할 토큰(라이트 블록, 필요 시 다크 블록) |
|---|---|
| 주 브랜드색 | `--primary`, `--ring` |
| 다크 서피스(프리미엄 다크 카드/히어로) 색조 | `--surface-inverse` (+ `-foreground`/`-muted`/`-border`) |
| 중립 바탕/보조 | `--background`·`--card`·`--muted`·`--border`·`--muted-foreground` |
| 강조 카테고리(대시보드 위젯) | `--hub-blue`·`--hub-orange`·`--hub-purple`·… (다크 전경 재정의 포함) |
| 상태색 | `--success`·`--warning`·`--info`·`--destructive` (+ `-foreground`/`-emphasis`) |

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

---

## 5. 밀도 축 (data-density) — 브랜드와 직교

브랜드 프로필과 **직교**하는 배포 단위 축이다(DEC-OPS-015). allowlist는 `comfortable`(기본)·`compact` 2값이며, 서버 env `UI_DENSITY`를 [density.ts](../../frontend/src/lib/theme/density.ts)가 allowlist 검증한 뒤 `<html data-density>` **전역 한 곳**에만 배선한다. **라우트별 밀도 배정은 브랜드 축과 동일하게 ADR-0004가 금지한다.**

- **comfortable**: 오버라이드가 전혀 없다 — 밀도·구조 토큰(`--control-h`·`--cell-py`·`--page-max-w`·`--filter-pad`·`--filter-control-h` 등)은 프로필 CSS 선언값 그대로이며, `UI_DENSITY` 미설정 배포는 렌더링이 1px도 변하지 않는다.
- **compact**: [globals.css](../../frontend/src/app/globals.css)의 `:root[data-density="compact"]` 블록 **한 곳**이 같은 토큰을 고밀도 값으로 덮어쓴다. 이 블록은 의도적으로 **무레이어**다 — 프로필 선언은 전부 `@layer base` 안이라, 무레이어 규칙이 특이성·순서와 무관하게 두 프로필 × 라이트·다크 4개 블록을 전부 이긴다. 밀도는 컬러 모드에도 불변이므로 다크 재선언이 필요 없다.
- **프로필 파일에 밀도 오버라이드를 넣지 않는다**: 밀도는 어느 브랜드에서도 같은 커스텀 프로퍼티를 같은 값으로 덮으므로, 프로필별 복제는 드리프트만 만든다.

배선·토큰 전수·무레이어·import 후행은 theme-token-contract가 강제한다. 검증: `pnpm -C frontend exec vitest run src/__tests__/theme-token-contract.test.ts src/lib/theme/__tests__/density.test.ts`.

*Last reviewed against current sources: 2026-08-23.*
