# 업무 화면 문법 카탈로그 (Work Screen Grammar Catalog)

> **상위 규범:** [프런트엔드 UX 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) · [ADR-0003](decisions/ADR-0003-frontend-ux-modernization-principles.md)(과업 우선) · [ADR-0006](decisions/ADR-0006-css-only-responsive-table.md)(CSS-only 반응형) · [ADR-0007](decisions/ADR-0007-reference-default-ia-approval.md)(참조-기본 IA)
>
> **실행 계획:** [ERP 전환 마스터플랜](erp-transformation-master-plan.html) Phase 3~5 · **디자인 시스템:** [frontend-design-system.md](frontend-design-system.md)
>
> **이 문서의 지위:** 파생 스펙이다. 토큰 값의 정본은 [globals.css](../../frontend/src/app/globals.css)와 프로필 CSS, 라우트 처분의 정본은 [disposition overlay](../../config/ui-navigation-disposition-proposal.json), 색·접근성 하한의 정본은 헌법이다. 충돌하면 원본을 먼저 고치고 이 문서를 함께 갱신한다.

## 1. 목적

포털 중심 화면을 업무 중심 화면으로 바꾸는 판단 기준을 **8개 archetype의 화면 문법**으로 고정한다. 119개 화면을 개별 재설계하지 않고, archetype 스펙 → 공유 컴포넌트 → 전 화면 순으로 전달하는 것이 이 카탈로그의 용도다.

전담 디자이너가 없으므로 **취향에 의존하는 판단을 설계에서 제거한다.** 근거는 두 가지만 쓴다.

1. 공개된 디자인 가이드의 규칙 문장 — 복수 출처가 같은 방향일 때만 채택한다(§2).
2. 이 저장소의 실측값 — 토큰 선언, 소비 census, 실행 가능한 수치 목표(§4, §6).

## 2. 근거와 채택 규칙

### 2.1 3-소스 합의 규칙

> 한 규칙은 **서로 독립적인 공개 가이드 2개 이상이 같은 방향을 지시하고, 이 저장소의 상위 규범과 충돌하지 않을 때** 카탈로그에 확정한다. 근거가 1개뿐이면 `미결`로 남기고 파일럿 화면에서 실측(첫 데이터 행 도달 거리·클릭 수·키보드 완주)으로 판정한다.

이 규칙의 목적은 완벽한 근거가 아니라 **판단 지점의 수를 줄이는 것**이다. 아래 §3의 규칙 대부분은 출처 간 이견이 없어 판단할 것이 남지 않는다.

### 2.2 대조한 출처와 대조 수준

| 출처 | 확인 경로 | 대조 수준 | 확인일 |
|---|---|---|---|
| KRDS 표(Table) 컴포넌트 | `krds.go.kr/html/site/component/component_04_11.html` | **원문 대조 완료** — 정렬·구분선·행 간격·접근성·반응형 규칙 인용 | 2026-08-24 |
| KRDS 검색 서비스 패턴(상세 검색·검색 결과) | `krds.go.kr/html/site/service/service_02_04.html`, `service_02_05.html` | 부분 — 공개 스니펫 수준 | 2026-08-24 |
| SAP Fiori for Web — List Report floorplan | `sap.com/design-system/fiori-design-web/` 이하 list report floorplan 문서 | 부분 — 본문 직접 조회가 403이라 SAP 호스트 공개 스니펫으로 대조 | 2026-08-24 |
| Microsoft Learn — UI/UX design components for model-driven apps | `learn.microsoft.com/en-us/dynamics365/guidance/develop/ui-ux-component-details-model-driven-apps` | **원문 대조 완료** — views/grids·command bar·forms 절 전문 | 2026-08-24 |
| Ant Design Pro `ProTable`, IBM Carbon Data Table | — | **미대조** — 이번 라운드에서 본문을 확보하지 못했다. 규칙의 근거로 사용하지 않는다 | 2026-08-24 |

### 2.3 표현 제약

- 이 카탈로그는 KRDS의 **일부 규칙을 채택**한 것이다. `KRDS 준수`·`적합`·`인증`으로 쓰지 않는다([krds-profile-mapping.md](krds-profile-mapping.md)의 표현 규칙을 승계한다).
- 출처 문장은 규칙의 근거이지 상위 지시가 아니다. 헌법·ADR과 충돌하면 헌법·ADR이 이긴다.
- `미대조` 출처의 관행을 근거로 인용하지 않는다.

## 3. 공통 문법 — 전 archetype 공통 규칙

| ID | 규칙 | 근거 |
|---|---|---|
| G1 | 화면 골격은 **페이지 헤더 → 조회조건 → 결과 툴바 → 콘텐츠** 순서다. 콘텐츠 영역에는 표·차트만 두고 폼 블록을 섞지 않는다. | Fiori(list report의 content area는 table/chart를 담고 form 등 다른 content block은 허용하지 않는다) + MS(가장 중요한 정보를 상단에 배치) |
| G2 | 조회조건은 목록 상단의 고정 영역이며, 접기/펴기 **상태를 유지**한다. | Fiori(filter bar는 list report에 필수이고 사용자가 설정한 접힘 상태를 앱이 유지해야 한다) + KRDS 상세 검색(필터 유형·수에 따라 목록 상단 막대나 사이드 패널에 배치) |
| G3 | 결과 툴바에 **총 건수**와 뷰 설정(정렬·페이지당 건수·컬럼·내보내기)을 둔다. | KRDS 검색 결과(결과 수는 결과 페이지의 구성 요소) + Fiori(table toolbar) + MS(사용자가 표시 열과 순서를 고르고 저장) |
| G4 | 첫 열은 사용자가 **행동할 수 있는 식별 정보**(상세 진입 지점)로 둔다. | MS(첫 열에 사용자가 선택해 상세로 갈 수 있는 중요한 정보를 둔다) + Fiori(list report → object page 진입) |
| G5 | **시스템 기본 정렬을 정의**하고, 열 단위 정렬을 허용한다. | MS(시스템 뷰에 기본 정렬을 구현하고 열 기준 정렬을 허용) + KRDS 표(표는 대화형 요소가 아니며 **데이터 정렬이 예외**다) |
| G6 | 개수·퍼센트·용량 등 **양적 데이터는 우측 정렬**, 일반 텍스트·범주는 좌측 정렬한다. | KRDS 표 원문 |
| G7 | **세로 열 구분선은 기본적으로 쓰지 않는다.** 시각적 복잡성을 올리므로 반드시 필요한 경우에만 넣는다. | KRDS 표 원문 |
| G8 | 데이터 셀 텍스트는 **3줄을 넘기지 않는다.** 넘치면 요약하고 상세로 넘긴다. | KRDS 표 원문 |
| G9 | 열을 과밀하게 넣지 않고 열 사이 간격을 충분히 둔다. 읽기 쉬움이 열 개수보다 우선한다. | MS 원문(grid를 너무 많은 열로 채우지 말고 충분한 간격을 둔다) |
| G10 | 명령(액션)은 **역할·레코드 상태에 따라 조건부로 표시**하고, 관련 명령끼리 논리적으로 묶는다. 죽은 버튼을 노출하지 않는다. | MS command bar(조건부 가시성·논리적 그룹) + ADR-0003(demo·unavailable 상태를 실제 기능처럼 위장하지 않는다) |
| G11 | 표 마크업은 `caption`·`thead`·`th`와 `scope`를 정확히 사용한다. | KRDS 표 접근성 원문 |
| G12 | 좁은 화면에서는 헤더-데이터를 수직 배치로 바꾸거나 열 헤더를 고정한 채 가로 스크롤을 준다. **표현 분기는 CSS만 담당한다.** | KRDS 표 반응형 원문 + ADR-0006(이중 렌더·뷰포트 데이터 분기 금지) |
| G13 | 정렬·필터·행 이동을 **키보드만으로 완주**할 수 있어야 한다. | MS 접근성(열 정렬·필터의 키보드 단축키를 시험) + 헌법 WCAG 2.2 하한 |
| G14 | 액션 라벨은 결과를 예측할 수 있는 **동사+대상** 구조로 쓰고 약어·전문용어를 피한다. | MS(명확·간결한 라벨, 전문용어 회피) + [frontend-design-system.md](frontend-design-system.md) §4 |
| G15 | 조회 중에도 **직전 결과를 유지**하고, `결과 없음`과 `데이터 없음`을 다른 문구로 구분한다. | ADR-0003(위험 기반 복구·상태 계약) + KRDS 검색 결과 패턴(결과 수 노출) |

**금지 목록(전 archetype 공통)**

- 업무 목록을 장식 카드로 감싸기, 히어로·배너·마케팅 문구
- 진입 애니메이션으로 첫 데이터 행 도달을 지연시키기
- 한국어 라벨에 영문 uppercase·넓은 letter-spacing 적용([frontend-design-system.md](frontend-design-system.md) §4)
- 실제로 동작하지 않는 버튼을 활성 상태로 노출하기(G10)
- 표의 행 전체를 유일한 조작 수단으로 만들기 — 행 클릭은 보조이고 첫 열의 명시적 링크가 주 경로다(G4, KRDS 표: 행·셀은 대화형 요소가 아니다)

## 4. 밀도 계약

업무 밀도는 브랜드와 직교하는 `data-density` 축이 전달한다(DEC-OPS-015). `compact` 값은 [globals.css](../../frontend/src/app/globals.css)의 무레이어 오버라이드 블록이 정본이며, 아래 표는 그 값을 복제한 것이 아니라 **계약으로 결속된 사본**이다 — [work-screen-grammar-contract.test.ts](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts)가 양방향 exact 일치를 강제한다.

<!-- density-contract:start -->

| 토큰 | `compact` 값 | 역할 |
|---|---|---|
| `--control-h` | `2rem` | 기본 컨트롤(버튼·입력) 높이 |
| `--cell-px` | `0.75rem` | 표 셀 좌우 패딩 |
| `--cell-py` | `0.5rem` | 표 셀 상하 패딩 — 행 높이의 지배 인자 |
| `--font-size-body` | `0.8125rem` | 본문·셀 텍스트 크기(13px) |
| `--form-gap` | `0.75rem` | 폼 필드 간격 |
| `--page-max-w` | `100%` | 작업면 폭 — 업무 화면은 전폭 |
| `--page-pad` | `1rem` | 페이지 패딩(기본) |
| `--page-pad-md` | `1.25rem` | 페이지 패딩(md) |
| `--page-pad-lg` | `1.5rem` | 페이지 패딩(lg) |
| `--filter-pad` | `1rem` | 조회조건 영역 패딩 |
| `--filter-control-h` | `2rem` | 조회조건 컨트롤 높이 |

<!-- density-contract:end -->

**파생 수치와 합격선**

| 항목 | 목표 | 산출 근거 |
|---|---|---|
| 표 행 높이 | 32–40px | `2 × --cell-py`(16px) + 13px 본문의 줄 높이 |
| 첫 데이터 행의 화면 상단 거리 | ≤ 200px | 페이지 헤더 + 조회조건 + 결과 툴바의 합 |
| 1440×900에서 스크롤 없이 보이는 행 수 | ≥ 15 | 위 두 값의 결과 |
| 조회 완료까지 필요한 클릭 | ≤ 2 (기본 조건 + 조회) | §5 A1 |

`comfortable`(기본 배포)은 오버라이드가 없어 프로필 선언값 그대로다. **위 합격선은 `compact` 배포에만 적용한다.** 대민 프로필에 업무 밀도를 주입하지 않는다.

## 5. Archetype 8종

각 archetype은 `목적 / 골격 / 필수 / 금지 / 키보드 / 합격` 6줄로 규정한다. 공통 규칙 G1~G15는 전부 상속하며 아래에는 **추가·예외만** 적는다.

### A1. 조회형 목록 (Work List) — 가장 큰 모집단

- **목적:** 조건으로 좁히고, 결과를 비교하고, 한 건을 골라 상세로 넘어간다.
- **골격:** 페이지 헤더(제목 + 주요 액션) → 조회조건(2~3열, 기본 펼침) → 결과 툴바(`총 N건` · 페이지당 건수 · 내보내기 · 컬럼) → 표 → 페이저.
- **필수:** 총 건수, 정렬 가능 열의 시각·`aria-sort` 표시, 페이지당 건수 선택, 빈 상태 2종 구분(G15).
- **금지:** 결과 위 설명 카드·아이콘 박스, 표를 감싸는 장식 컨테이너, 플로팅 액션 바.
- **키보드:** 조회 `Enter` · 초기화 `Esc` · 신규 `Ctrl+N` · 행 이동 `↑`/`↓` · 상세 `Enter`.
- **합격:** §4 합격선 4개 전부 + 키보드만으로 조회→상세 완주.
- **현재 화면:** `/admin/collaboration/*`, `/admin/community/*`, `/admin/operation/*`, `/admin/system/codes/*` 등 최대 모집단.

### A2. 마스터-디테일 (Master-Detail)

- **목적:** 좌측에서 항목을 고르고 우측에서 그 항목의 하위 데이터를 편집한다.
- **골격:** 좌 트리·목록(고정 폭) / 우 상세. 우측 상단에 선택 항목 식별자와 액션.
- **필수:** 선택 상태의 시각·`aria-current` 표시, 미선택 시 우측 안내, 좌측 검색.
- **금지:** 좌·우를 각각 다른 페이지로 분리해 왕복시키기, 선택 없이 활성인 저장 버튼.
- **키보드:** 좌측 `↑`/`↓` 이동, `Tab`으로 우측 진입, `Ctrl+S` 저장.
- **합격:** 항목 전환 시 우측이 전체 리로드 없이 갱신 · 선택 상태가 새로고침 후 복원(URL allowlist 범위 내, [IA §5.5](../01-product/information-architecture.md) 준수).
- **현재 화면:** `/admin/system/common-code`의 STANDARD 탭, `/admin/user/departments`, `/admin/system/menus`, `/admin/collaboration/mail-history`. `/admin/system/codes/administ`·`institution`은 이미 A1 목록이고 `/admin/system/common-code/codes`는 canonical route로 이동하는 alias라 A2 소비자로 세지 않는다.

### A3. 목록 → 편집 폼 (List to Form)

- **목적:** 목록에서 한 건을 골라 등록·수정·삭제한다.
- **골격:** 목록과 동일한 A1 골격 + 폼(라벨 좌·입력 우 또는 라벨 상단, 2열 이내) + 하단 액션 바.
- **필수:** 필수 항목 표시, 필드 단위 오류 메시지, 저장 후 목록 복귀 + 결과 피드백, 이탈 시 미저장 경고.
- **금지:** 한 폼에 불필요한 필드를 몰아넣기(MS: 폼 과적재 금지), 성공·실패를 같은 토스트 문구로 처리.
- **키보드:** `Ctrl+S` 저장 · `Esc` 취소 · 첫 오류 필드로 포커스 이동.
- **합격:** 등록→목록 복귀까지 키보드 완주 · 오류 시 포커스가 원인 필드에 도달.
- **현재 화면:** `/admin/user/manage`, `/admin/community/boards/master`, `/admin/system/banner`.

### A4. 작업 큐 / 결재함 (Work Queue)

- **목적:** "내가 지금 처리해야 할 것"을 우선 노출하고 일괄 처리한다.
- **골격:** 상태 탭(대기·진행·완료) → 결과 툴바(선택 건수 · 일괄 액션) → 표.
- **필수:** 상태 뱃지, 선택 체크박스와 선택 건수, 일괄 액션 확인 다이얼로그, 처리 결과의 부분 실패 표시.
- **금지:** 확인 없이 실행되는 일괄 액션, 상태를 색으로만 구분하기(색 단독 의미 전달 금지).
- **키보드:** `Space` 선택 토글 · `Ctrl+A` 전체 선택(현재 페이지 한정 명시) · 일괄 액션 `Enter`.
- **합격:** 일괄 처리 N건 중 M건 실패가 건별로 보고됨 · 대기 건수가 진입 즉시 보임.
- **현재 화면(2026-08-24 판정):** **이 저장소에 A4 실소비자는 없다.** `/approvals`(결재 허브)는 결재 API 가 건별 `confirm(approvalId, status)` 하나뿐이라 "선택 → 일괄 처리 → 부분 실패 보고"가 성립하지 않고, 실제 과업이 문서 선택 → 결재선·의견 확인 → 처리라서 **A2 로 이행했다**. `/admin/sanctn/workflow` 는 컨트롤이 전부 비활성인 정적 데모다. 일괄 처리(`bulkActions`)는 게시판 마스터·사용자 조직 두 화면에 **A1/A2 에 붙는 기능 축**으로 존재한다. 따라서 소비자 없는 A4 셸을 미리 만들지 않는다 — 실제 일괄 처리 API 가 생기면 그때 이 스펙으로 만든다.

### A5. 권한 매트릭스 (Matrix Grid)

- **목적:** 역할 × 권한처럼 두 축의 교차 상태를 한 화면에서 확인·변경한다.
- **골격:** 좌측 행 헤더 고정 + 상단 열 헤더 고정 + 체크 셀. 상단에 변경 요약과 저장.
- **필수:** 행·열 헤더 고정, 변경된 셀의 시각 표시, 저장 전 변경 요약, 셀의 접근 가능한 이름(`행×열`).
- **금지:** 저장 없이 즉시 반영되는 체크(감사 추적 불가), 인가 의미가 다른 셀을 같은 위젯으로 뭉뚱그리기(AGENTS H3).
- **키보드:** 방향키 셀 이동 · `Space` 토글 · `Ctrl+S` 저장.
- **합격:** 20×20 이상에서 헤더 고정 유지 · 변경 셀 수와 저장 결과 건수 일치.
- **현재 화면(2026-08-24 판정):** 실제 매트릭스는 `/admin/security/authority` 의 역할 × 메뉴 격자 **하나뿐**이다. `/admin/security/role`·`/admin/security/dept-authority` 는 제목에만 `매트릭스` 가 붙은 목록 화면이라 A1 대상이다. 소비자가 하나면 셸이 재사용을 만들지 못하므로 **셸 대신 스펙을 계약으로 고정**했다([matrix-a5-contract](../../frontend/src/app/admin/security/authority/__tests__/matrix-a5-contract.test.tsx)) — 변경 셀 표시·저장 전 요약·변경 없음 시 저장 불가·격자 방향키 이동·`Ctrl+S`. 이행 중 **저장이 손대지 않은 역할까지 전부 다시 쓰던 결함**을 함께 고쳤다(동시 편집 덮어쓰기 · AGENTS H3).

### A6. 대용량 로그 조회 (Log Query)

- **목적:** 기간·대상으로 좁혀 감사·장애 근거를 찾고 원본을 반출한다.
- **골격:** A1 + 기간 프리셋(1일·1주·1개월·직접 입력) + 서버측 전체 결과 내보내기.
- **필수:** 기간 프리셋(KRDS 검색 기간 필터 규칙), 페이지당 건수 선택, 서버측 export, 총 건수.
- **금지:** 현재 페이지만 내보내면서 `전체 내보내기`로 라벨링, 자유 검색어를 URL에 싣기([IA §1.1](../01-product/information-architecture.md) 6항).
- **키보드:** A1과 동일 + 기간 프리셋 단축 이동.
- **합격:** 대용량 조회에서 첫 페이지 응답이 열화되지 않음 · export 건수와 총 건수 일치.
- **현재 화면:** `/admin/system/logs`(+ `login`·`privacy`·`system`·`user`·`web`), `/admin/system/audit`, `/admin/security/audit`. **정렬·페이지당 건수는 이미 이행됨**(§6).

### A7. 현황 + 원본 표 (Report)

- **목적:** 요약 지표를 보고, 같은 화면에서 원본 데이터로 내려간다.
- **골격:** 조회조건 → 요약 지표(3~5개) → 차트 → 원본 표.
- **필수:** 차트와 표가 **같은 조회조건**을 공유, 집계 기준·기간 명시, 데이터 출처 표시.
- **금지:** 차트만 있고 원본 표가 없는 화면, 하드코딩 지표(ADR-0003 `demo`·`unavailable` 위장 금지).
- **키보드:** 조회조건은 A1과 동일 · 차트는 표로 대체 접근 가능.
- **합격:** 차트 값과 표 합계 일치 · 지표의 데이터 출처가 화면에서 확인 가능.
- **현재 화면:** `/admin/stats`(2026-08-25 [ReportPage](../../frontend/src/app/components/patterns/report-page.tsx) 셸로 이행 — [A7 census](../../frontend/src/__tests__/report-adoption-census.test.ts)), `/admin/survey/stats`(2026-08-25 이행), `/admin/system/logs`(대시보드), `/admin/system/monitoring`. **셸이 `children`(원본 표)과 `basis`(집계 기준·기간·출처)를 필수 prop 으로 두어 차트만 남는 화면을 구조적으로 막는다** — A4·A5 와 달리 실소비자가 여럿이라 셸이 재사용을 만든다.

### A8. 다단계 마법사 (Wizard)

- **목적:** 되돌리기 어려운 작업을 단계로 나눠 검증하며 진행한다.
- **골격:** 단계 표시기 → 현재 단계 폼 → 이전/다음 → 마지막에 실행 요약과 확인.
- **필수:** 단계별 검증 통과 후 진행, 마지막 확인 화면에 영향 범위 요약, 실행 후 결과 리포트.
- **금지:** 단계 수를 불필요하게 늘리기(MS: 가능한 한 단순하게), 확인 없이 실행되는 마지막 단계.
- **키보드:** `Enter` 다음 단계 · `Esc` 취소(확인 후).
- **합격:** 중단 시 데이터 유실 경고 · 실행 결과가 건별로 보고됨.
- **현재 화면:** 대량 등록·이관 경로. 현재 저장소에 확립된 사례가 적어 **A8은 파일럿 대상에서 후순위**다.

## 6. 현재 소비 census (2026-08-25 실측)

`frontend/src/app` 기준, `__tests__`와 `loading.tsx`를 제외한 화면 파일에서 **import 경로**로 센 값이다(문자열 언급이 아니라 실제 소비). 이 정의는 [채택 census 게이트](../../frontend/src/__tests__/work-list-adoption-census.test.ts)와 같으며, 게이트가 값을 동결한다.

| 항목 | 값 | 의미 |
|---|---|---|
| `StandardDataTable` 소비 화면 | 49 | 문법 전달의 모집단 |
| 그중 `WorkListPage` 셸 경유 | **39** | W3 wave 1~12 — 되돌리기는 게이트가 red |
| 그중 셸 없이 직접 조립 | **5** | 신규 유입은 게이트가 red. 남은 5건의 성격은 아래 참조 |
| `MasterDetailPage`(A2) 소비 | 6 | 별도 exact census 가 고정 |
| `ReportPage`(A7) 소비 | 2 | 별도 exact census 가 고정 |
| `sortKey`(열 정렬) 채택 | 9 | G5 — 이행 전 7 |
| `onPageSizeChange` 채택 | 14 | A1 필수 — 이행 전 6 |
| `KeywordFilter` 경유 조회 조건 | 17 | G2 — 조회 조건 조립의 단일 경로 |
| `emptyResultMessage` 경유 빈 상태 | 30 | G15 — 결과 없음/데이터 없음 구분 |
| `PagePagination` 별도 소비 | 0 | 표가 아닌 페이지 목록도 전부 셸·표 페이저로 수렴했다 |
| `bulkActions` 채택 | 3 | A4 필수 미이행 |
| `DataExportExcel` 소비 | 10 | A6 필수 부분 이행 |

**남은 직접 조립 5건의 성격** — 숫자만 보면 "미이행 5"지만, 그중 실제 이행 대상은 1건이다.

| 파일 | 성격 | 판정 |
|---|---|---|
| `admin/system/monitoring/MonitoringHubClient.tsx` | 7탭 이종 허브(목록 4탭 + 관측·토폴로지·하네스 3탭) | **유일한 잔여 이행 대상.** 탭마다 archetype 이 달라 단일 셸에 넣으면 셸이 거짓말을 한다 — 탭별 archetype 판정이 선행돼야 한다 |
| `admin/security/authority/SecurityHubClient.tsx` | 권한 매트릭스(A5) | 셸 없이 **스펙 계약**으로 고정하기로 판정(§5 A5). 이행 대상 아님 |
| `admin/security/login-policy/LoginPolicyAdminClient.tsx` | 라우트가 리다이렉트되는 도달 불가 화면 | [next.config](../../frontend/next.config.ts) 가 `/admin/security/login-policy` 를 모니터링 허브로 보낸다. 이행해도 사용자에게 보이는 변화가 없고 채택 수치만 부풀어 **대상에서 제외**한다 |
| `cop/sms/selectSmsList/SmsHubClient.tsx` | 같은 이유의 도달 불가 alias | 위와 동일. 정리 여부는 alias 승인 절차가 결정한다 |
| `components/ui/smart-notification-hub.tsx` | 화면이 아니라 공유 컴포넌트 | 자기 화면 문법을 갖지 않는다. 이행 대상 아님 |

> 정정: 최초 작성 시 적었던 58·7·6·10·4는 파일 안의 **문자열 언급**을 센 값이라 주석만 있는 파일 7건이 섞여 있었다. 위 표는 import 기준 재측정값이며 게이트와 정의가 같다.

**핵심 판정:** 기능은 [standard-data-table.tsx](../../frontend/src/app/components/ui/standard-data-table.tsx)(headless TanStack 기반, 정렬 상태머신·`aria-sort`·페이지당 건수·일괄 액션 보유)에 이미 있고, 이행의 병목은 컴포넌트 개발이 아니라 **화면이 archetype을 선언하도록 만드는 것**이었다. 2026-08-25 기준 archetype 셸 경유는 47화면(A1 39 · A2 6 · A7 2)이고, 셸 없는 직접 조립은 5건인데 그중 실제 잔여 대상은 모니터링 허브 1건이다.

로그 클러스터는 5화면 중 4화면(`privacy`·`system`·`user`·`web`)이 이행됐고, `login`은 아래 VRT 보류에 남아 있다. 이행된 4화면이 A6·A1의 참조 구현이다.

A2는 [채택 census 게이트](../../frontend/src/__tests__/master-detail-adoption-census.test.ts)가 route→consumer와 importer exact 집합을 별도로 고정한다. 3차 이행 후 소비자는 `/admin/user/departments`·`/admin/system/menus`·`/admin/collaboration/mail-history`·`/admin/system/common-code` STANDARD 4화면이다. `UserOrgHubClient`는 USERS의 직접 표와 DEPTS의 A2를 함께 가지므로 A2 import를 이유로 위 A1 직접 소비를 추가로 낮추지 않는다. 메일 이력은 6열 표를 18–24rem master에 축소하지 않고 제목·상태 중심 compact 목록으로 바꿔 직접 표 소비가 30→29로 내려갔다. 공통코드는 기존 상세 `StandardDataTable`을 보존해 `StandardDataTable` 50·직접 조립 29·`WorkListPage` 21·`PagePagination` 4의 census를 바꾸지 않는다. STANDARD만 전체 `MasterDetailPage`로 이행하고 포털 hero·metrics·진입 motion을 걷어 1280×720에서도 실제 탐색·상세 업무 영역이 보이게 했다. DnD handle과 선택 버튼을 분리하고 검색 중 이동을 비활성화했으며, 물리 스키마가 정렬 순서를 저장하지 않는 계약에 맞춰 분류 자체와 같은 분류 안의 순서 이동은 허용하지 않고 **그룹의 소속 분류 변경만** 저장한다. 선택 항목이 있으면서 소속 분류가 변경된 경우에만 저장하고, 검색 결과에서 사라진 선택은 상세와 함께 해제한다. 허브가 공통 h1·breadcrumb를 먼저 단독 소유하고, STANDARD `MasterDetailPage`와 ADMINIST·INSTITUTION `WorkListPage`는 활성 tabpanel 안에서 h2로 임베드된다. 두 A1의 중복 page header·hero·metrics 래퍼는 제거했고 `/admin/system/common-code/codes` canonical alias는 그대로다. 기존 `groupId` query consumer 1건은 `deny`·`unverified` legacy로 유지하고 새 producer나 local/session storage를 만들지 않았다. URL 이행과 privacy 승인은 별도 과제로 보류한다.

## 7. 이행 순서와 소비 계약

| 단계 | 상태 | 내용 | 산출물 |
|---|---|---|---|
| W1 | **완료(2026-08-24)** | 이 카탈로그 + 밀도 계약 테스트 | 본 문서, [work-screen-grammar-contract.test.ts](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts) — 값 드리프트·토큰 누락 red 실측 완료 |
| W2 | **완료(2026-08-24)** | A1 archetype 셸 신설 + 패턴 갤러리 | [work-list-page.tsx](../../frontend/src/app/components/patterns/work-list-page.tsx), [갤러리 화면](../../frontend/src/app/admin/patterns/PatternGalleryClient.tsx), [문법 불변식 테스트](../../frontend/src/app/components/patterns/__tests__/work-list-page.test.tsx)(G1 순서 위반 red 실측 완료). 라우트 census 3종(capabilities 119→120 · disposition 119→120 · url-state 재생성)과 shell 집계를 같은 변경에서 갱신했고, 갤러리는 demo pack 소유(`demo-isolated` 제안, `reviewState=proposed`)라 core·collaboration 산출물에는 실리지 않는다 |
| W3 | **진행 중(wave 1~12, 2026-08-25 기준 잔여 1화면)** | A1 이행 웨이브 | wave 1(협업 2): 스크랩·주소록. wave 2(9): 로그 4종 + 운영 5화면. wave 3(5): 설문 응답자·네트워크·HPCM·온라인 매뉴얼·마이페이지 설정. wave 4(4): 행정구역 코드·기관 코드(탭형)·공개 설문 목록·커뮤니티 목록. wave 5~10: 설문 관리·통계·커뮤니티 허브·보안 그룹/역할·프로그램·템플릿·SMS·도움말·ISM·로그 대시보드·쪽지·게시판 마스터·온라인 설문 등. wave 11(3): 협업 허브·조직 권한(A2)·커뮤니티 상세. wave 12(2): 배너/팝업·워크허브(한 클라이언트가 3개 라우트를 담당). 웨이브마다 장식 사이드바·조작 지표(`1.2k+` 등 계측 원천 없는 고정 문구)·죽은 검색(`console.log` onSearch)·근거 없는 지표 카드를 함께 제거했고, 조회 시점을 타이핑 디바운스에서 `조회`/Enter 로 통일했다(G2). 공통 조립기 [KeywordFilter](../../frontend/src/app/components/patterns/keyword-filter.tsx)·[emptyResultMessage](../../frontend/src/app/components/patterns/empty-result-message.ts) 신설. [채택 census 게이트](../../frontend/src/__tests__/work-list-adoption-census.test.ts) **39/5**(유입·이중 표기 red 실측, 오탐 2건 수정), status color BASELINE 656→592, hardcoded color BASELINE 64→61, h1 소유 계약을 셸 위임형으로 개정. **남은 직접 표 5건 중 실제 이행 대상은 모니터링 허브 1건**이며 나머지는 A5 스펙 계약(권한 매트릭스)·도달 불가 alias 2건(`/cop/sms/selectSmsList`·`/admin/security/login-policy` — [next.config](../../frontend/next.config.ts) 리다이렉트)·공유 컴포넌트 1건이라 대상이 아니다(§6 표 참조) |
| W4 | **완료(2026-08-24)** | 랜딩 포털 → 업무 홈 | [UnifiedDashboardClient](../../frontend/src/app/UnifiedDashboardClient.tsx) — 순서를 **처리 대기 → 내 목록 → 상태·활동 → 홍보**로 뒤집고 히어로·480px 고정 카드·진입 애니메이션 제거. 항목별 목적지가 없는 목록의 `cursor-pointer` 죽은 어포던스도 제거(G10). e2e 결속(팝업·배너·실시간 위젯)은 보존. VRT 기준선은 `/admin` 을 캡처하므로 영향 없음 |
| W5 | **진행 중(A2 3차 완료 2026-08-24)** | A2·A4·A5 셸 신설 + 이행 | [MasterDetailPage](../../frontend/src/app/components/patterns/master-detail-page.tsx) 신설 후 1차 부서·메뉴, 2차 메일 이력, 3차 공통코드 STANDARD까지 4화면을 이행했다. 단일 responsive DOM, 고정폭 master, 미선택 안내, 검색, `aria-current`, `↑`/`↓`, 상세 `Tab`, 저장 가능한 화면의 선택+변경 시 `Ctrl+S`를 계약으로 고정했다. 메일은 저장 동작이 없는 조회·삭제 화면이라 단축키를 만들지 않고, 6열 표 대신 compact master + 상세 구조로 바꿨다. 공통코드 STANDARD는 포털 hero·metrics·진입 motion을 제거해 1280×720에서도 탐색·상세 업무 영역을 노출하고, DnD handle/선택 분리·검색 중 이동 비활성·그룹의 교차 분류 이동만 저장·검색 stale 선택 해제를 결속했다. 허브 공통 h1·breadcrumb 뒤의 활성 panel에서 STANDARD A2와 ADMINIST·INSTITUTION A1을 h2로 임베드하고, 중복 포털 래퍼를 제거했으며 `/admin/system/common-code/codes` alias도 유지한다. [A2 exact census](../../frontend/src/__tests__/master-detail-adoption-census.test.ts)가 네 route의 실제 소비를 검증하며, `StandardDataTable` 50·직접 조립 29·`WorkListPage` 21·`PagePagination` 4는 불변이다. status color BASELINE은 메일 이행 642→629에 이어 공통코드의 필수·오류·사용 상태 리터럴을 semantic token으로 이행해 629→621이 됐다. **선택 새로고침 복원은 보류:** 메뉴·부서·메일 식별자는 IA와 미확정 privacy review에 따라 새 query·브라우저 저장소를 만들지 않으며, 공통코드의 기존 `groupId` query consumer 1건도 `deny`·`unverified` legacy로 보존하고 새 producer·저장소를 만들지 않는다. URL 이행과 privacy 승인은 별도 과제다. 4차로 **결재 허브(`/approvals`)** 를 A2 로 이행해 A2 소비자는 5개다 — 3열 유리질 카드를 걷고 마스터를 compact 목록으로 바꿨으며, 조회 함수가 처리 이력과 같아 **같은 데이터를 다른 이름으로 보여주던 `결재 문서 보관함` 탭**은 사유를 밝힌 비활성 컨트롤로 정정했다. **A4(작업 큐)는 실소비자가 없어 셸을 만들지 않는다**(§5 A4 판정). **A5(매트릭스)는 실소비자가 권한 매트릭스 1개뿐이라 셸 대신 스펙 계약으로 고정했다**(§5 A5 판정) — 변경 셀 표시·저장 전 요약·변경 없음 시 저장 불가·격자 방향키·`Ctrl+S`를 계약이 강제하고, 저장이 손대지 않은 역할까지 다시 쓰던 결함을 같은 변경에서 고쳤다. **W5 범위는 이로써 종료다** |

**VRT 기준선 재생성 필요(1건):** `/admin/system/logs/login` 을 A1 으로 이행했다. 이 화면은 시각 회귀 기준선 4장 중 하나(DEC-OPS-017: 무매칭 검색 empty-state)라 **`update-visual-baseline` workflow_dispatch(commit=true)로 리눅스 기준선을 다시 만들기 전까지 VRT 가 red 다.** win32 로컬 스냅샷 커밋은 폰트 렌더 차이로 금지다. e2e 캡처 스텝의 placeholder 셀렉터도 조회 조건 이행에 맞춰 함께 갱신했다.

**A1 참조 구현:** `/admin/patterns`. 정적 표본 데이터만 쓰므로 세션·시드와 무관하게 결정적으로 렌더되고, 조회·정렬·페이지당 건수가 표본 위에서 실제로 동작한다(죽은 컨트롤 금지 G10이 갤러리 자신에게도 적용된다). 시각 판단은 이 화면에서만 한다.

**소비 계약(W2 이후):** archetype이 존재하는 화면 유형은 `StandardDataTable`을 직접 조립하지 않고 archetype 컴포넌트를 경유한다. 직접 소비 수를 census로 동결하고 이행마다 하향해 되돌아가지 못하게 한다(H2 — baseline을 비우거나 올리지 않는다).

## 8. 하지 않을 것

- 두 번째 컴포넌트 라이브러리 도입, `ERP 전용` 병렬 컴포넌트 트리 fork
- ADR-0006 위반(뷰포트별 이중 렌더·데이터 분기)
- `krds-aligned` 프로필에 업무 밀도 주입(대민 축 파괴)
- KRDS·KWCAG `준수 완료` 주장, 새 측정 인프라 신설
- 승인 전 메뉴 DB·Flyway 변경([IA §1.3](../01-product/information-architecture.md) 금지 목록)
- 119개 화면 ad hoc 재작성

## 9. 재검증 트리거

`globals.css`의 `compact` 블록, `StandardDataTable`의 공개 props, archetype 컴포넌트 목록, §6 census, 또는 인용한 공개 가이드의 개정이 확인되면 해당 절과 확인일을 같은 변경에서 갱신한다. 밀도 표는 계약 테스트가 드리프트를 red로 만든다.
