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
| **의도적 다크 서피스** | **`bg-surface-inverse` / `text-surface-inverse-foreground` / `text-surface-inverse-muted` / `border-surface-inverse-border`** | **항상 어두움(고정)** |

### 2.1 `surface-inverse` — 의도적 다크 서피스 패턴 (중요)

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
`bg-slate-900\|950\|800` 이 라이트 대응 없이 단독(또는 다크 그라디언트)이면 §2.1 패턴 →
`bg-surface-inverse`, 그 위 `text-white\|slate-100`→`text-surface-inverse-foreground`,
`text-slate-200\|300`→`text-surface-inverse-muted`, `border-slate-700\|800`→`border-surface-inverse-border`.

### R3. 단독 라이트 중립
`text-slate-900\|800\|700`→`text-foreground` · `text-slate-600\|500\|400`→`text-muted-foreground` ·
`bg-slate-50\|100\|200`→`bg-muted` · `border-slate-*`→`border-border` · `ring-slate-*`→`ring-border` ·
`divide-slate-*`→`divide-border` · `placeholder-slate-*`→`placeholder:text-muted-foreground`.

---

## 4. 2026-07-18 전면 스윕 결과 & 잔여 (정직 기록)

§2.B 브랜딩 토큰화 스윕(`branding-neutral-tokenize-2026-07-18`, 커밋은 본 문서 갱신 커밋 참조):
- **861건 토큰화**(136파일), 액센트 팔레트 불변(순증감 0), `tsc --noEmit`·`next build` green.
- **잔여 중립 ~214건(의도적 미치환)** — 아래는 토큰화하면 **오히려 파손**되어 남긴 것들:
  1. **매핑 밖 옅은 장식 텍스트** `text-slate-100\|200\|300`: `text-muted-foreground`(=slate-500급)보다 밝은 위계라 치환 시 더 진해짐 → 유지.
  2. **`bg-clip-text` 텍스트 그라디언트** `from-slate-900 to-slate-600`: 서피스가 아니라 글자 착색 → 단일 토큰 치환 시 텍스트 소실 → 유지.
  3. **항상-흰 pill/mark 위 고정 다크 텍스트**(`bg-yellow-200`/`bg-white` opaque 위 `text-slate-900`): 토큰화 시 다크테마에서 밝게 반전→대비 파손 → 유지.
  4. **흰색 투명 오버레이** `bg-white/10`·`border-white/5`·`text-white/NN`: 중립 팔레트(-NNN)가 아니고 다크 서피스 위 정상 → 대상 밖.
  5. **테마 스왑 버튼** `bg-slate-900 dark:bg-primary`: 라이트=중립·다크=액센트 스왑이라 단일 토큰 불가 → 유지.
  6. **비대칭 페어/중첩 다크 패널**(surface-inverse 위 `bg-slate-800`, `bg-slate-300 dark:bg-white/20` divider): "더 밝은 다크 서피스" 토큰 부재 → 유지.
- **후속 여지**: (a) `--surface-inverse-raised`(중첩 다크 패널용) 토큰 추가, (b) 액센트(blue/indigo/purple → hub-*/primary) 별도 스윕, (c) 신규 중립 하드코딩 차단 린트 게이트.

> **원칙**: 정적 검증(`tsc`/`next build`)은 통과해도 **색·다크모드 시각 회귀는 잡지 못한다**. 대규모 색 변경 후에는 반드시 라이트/다크 **육안 검증**을 병행한다(프론트 헌법 제6조).
