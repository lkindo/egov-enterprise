# KRDS 프로필 추적 매트릭스와 적용 계약

- **Status:** Draft internal contract — 구현·기관 자격·release evidence 미완료
- **Owner:** design-system + accessibility — 담당자 미지정
- **Checked at:** 2026-08-21
- **Refresh by:** 2026-11-21
- **Pinned guideline:** 디지털 정부서비스 UI/UX 가이드라인 2025.08
- **Pinned component kit:** KRDS HTML Component Kit 1.1.0
- **Machine-readable SSOT:** [`config/krds-profile-mapping.json`](../../config/krds-profile-mapping.json)

이 문서는 eGov Enterprise의 `krds-standard`, `krds-aligned`, `premium` 브랜드 프로필이 KRDS 원칙·스타일·컴포넌트·패턴·아이덴티티를 어떤 범위에서 채택하거나 변형하고 있는지 추적한다. 이 문서와 현재 토큰이 존재한다는 사실은 `KRDS compliant`, `KWCAG 준수`, `웹 접근성 준수 완료`의 증거가 아니다. 현재 허용되는 표현은 **목표(target)**이며, 승인된 exact scope와 실행 증거가 있는 경우에만 **검증된 범위(verified scope)**를 말할 수 있다.

## 1. 결론

최적안은 KRDS HTML/CSS를 전체 앱에 그대로 덮는 것이 아니라 다음 세 경계를 유지하는 것이다.

1. 공통 컴포넌트는 브랜드 중립적인 semantic·state·interaction contract를 소비한다.
2. `krds-standard`와 `krds-aligned`는 그 contract를 pinned KRDS 원문에 매핑하는 profile adapter다.
3. 정부 공식 배너·운영기관 식별자는 theme 장식이 아니라 **기관 자격과 승인된 콘텐츠가 필요한 identity 기능**이다.

현재 29개 mapping entry의 정적 판정은 `adopted 4`, `adapted 15`, `deferred 9`, `notApplicable 1`이다. `adopted`는 원칙 또는 로컬 계약을 채택했다는 뜻이며, 모든 route/state에서 구현이 입증됐다는 뜻이 아니다. `adapted`는 React/Next.js 구조와 제품 경계를 보존하며 의미를 이식하는 상태다. `deferred`는 이유·owner·reviewBy가 있는 미충족 항목이다.

따라서 지금 `krds-standard`를 활성화하거나 공공서비스 identity를 노출하면 안 된다. 먼저 Task 2.2의 profile×mode plumbing, Task 0.5/2.3의 rendered·AT 증거, 기관 자격 승인, 공식 self-checklist를 닫아야 한다. `premium`은 KRDS claim을 하지 않지만 동일한 상태·접근성 하한을 지켜야 한다.

## 2. 공식 원문 pin

| Source | Pin | 확인한 사실 | 사용 경계 |
|---|---|---|---|
| [KRDS 리소스 다운로드](https://www.krds.go.kr/html/site/outline/outline_05.html) | 가이드라인 `2025.08` | 변경 이력은 컴포넌트와 서비스 패턴 사용성 가이드라인이 수정됐다고 밝힌다. | PDF 직접 URL이 바뀌어도 공식 resource page와 버전을 기준점으로 유지한다. |
| [KRDS 소개](https://www.krds.go.kr/html/site/utility/utility_01.html) | live page, 2026-08-21 확인 | 원칙·스타일·컴포넌트·기본 패턴·서비스 패턴·token/kit의 관계 | live 문서는 pinned PDF와 독립적으로 변할 수 있어 `checkedAt` 증거로만 사용한다. |
| [KRDS HTML Component Kit](https://github.com/KRDS-uiux/krds-uiux/releases/tag/v1.1.0) | `1.1.0` | 공식 developer page가 안내하는 HTML kit release | package를 설치하거나 markup을 복사하기 전 release·asset·license diff를 다시 검토한다. |
| [KRDS 저작권](https://www.krds.go.kr/html/eng/utility/utility_05.html) | 공공누리 제1유형 | 상업/비상업 이용과 수정 가능, 출처 표시 필요 | 파생 CSS·token·asset에도 attribution을 보존한다. |
| [KRDS 디지털 포용](https://www.krds.go.kr/html/site/utility/utility_04.html) | live page, 2026-08-21 확인 | KWCAG 2.2, 전자정부 웹 품질관리, WCAG 2.1 매핑과 컴포넌트별 지침 | KRDS 스스로 적용만으로 완전한 접근성 충족을 판단할 수 없다고 경고한다. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C Recommendation | 프로젝트의 A·AA 목표 | KRDS live page의 WCAG 2.1 mapping에 더해 프로젝트가 독립적으로 검증한다. |

공식 페이지, pinned guideline, component kit은 같은 버전 축이 아니다. 예를 들어 live component page는 kit release 이후 수정될 수 있다. 따라서 “KRDS 최신”이라는 단일 숫자를 만들지 않고 `guideline.version`, `documentation.checkedAt`, `componentKit.version`을 별도로 기록한다.

## 3. Claim과 evidence 언어

### 3.1 허용 단계

| 표현 | 의미 | 현재 허용 여부 |
|---|---|---|
| `KRDS target` | pinned 원문을 목표로 mapping과 gap을 관리 | 세 프로필 중 `krds-standard`, `krds-aligned`에 허용 |
| `KRDS aligned` | 승인된 exact scope에서 적용 가능한 mapping이 채택 또는 승인 예외이며 실제 화면 증거가 있음 | 현재 불허 — release evidence 없음 |
| `KRDS verified scope` | profile×route×role×state×mode×viewport, checklist, AT, identity 자격을 함께 명시한 검증 범위 | 현재 불허 |
| `KRDS compliant`, `KRDS 준수 완료` | 범위 없는 포괄 준수 주장 | 항상 금지 |

`aligned`도 제품 전체를 뜻하지 않는다. 예를 들어 “`krds-aligned`, 로그인 idle/error, light/high-contrast, desktop/mobile, build X에서 검증”처럼 모집단을 밝혀야 한다. component adoption count나 token 이름 유사성은 이 단계를 올리지 못한다.

### 3.2 `adopted | adapted | notApplicable | deferred`

- `adopted`: KRDS 항목의 의도를 로컬 규범 또는 구현이 그대로 채택하고 evidence path가 있다.
- `adapted`: 의미·접근성·상호작용 계약은 보존하지만 기술 스택이나 제품 맥락 때문에 markup, token 이름, asset, 배치가 다르다. `deviation`을 필수로 남긴다.
- `notApplicable`: exact profile에서 적용 대상이 아니며 이유가 있다. 단순 미구현을 이 값으로 숨기지 않는다.
- `deferred`: 적용 가능하지만 현재 충족 증거가 없다. reason, owner, reviewBy를 반드시 가진다.

`deferred`를 0으로 만드는 것이 목표가 아니다. 실제 제품에 부적합한 항목을 억지로 채택하지 않고, 승인된 이유와 재검토 조건을 남기는 것이 목표다.

## 4. 프로필 계약

### 4.1 `krds-standard`

대상은 공식 공공 디지털 서비스로 승인된 배포다. 표준형 palette·typography·shape·layout, 적용 가능한 컴포넌트와 패턴, 공식 identity, KOGL attribution, 자체 체크리스트, 접근성 증거를 모두 요구한다.

현재 blockers:

- reference implementation이 어느 기관의 공식 서비스인지 승인되지 않았다.
- current `globals.css`의 Hub Blue 단일 token set은 KRDS standard palette가 아니다.
- Pretendard Variable/Inter/Outfit은 KRDS 표준형 Pretendard GOV 계약으로 검증되지 않았다.
- premium radius/shadow와 standard shape/elevation이 profile별로 분리되지 않았다.
- `.dark`는 일반 dark mode이며 KRDS 선명한 화면 모드 또는 OS forced colors 증거가 아니다.
- masthead, 운영기관 식별자, 연락처, 정책 링크, footer 순서를 승인할 institution owner가 없다.
- 공식 self-checklist를 승인된 route-state population에서 실행하지 않았다.

따라서 `identityElements=blocked-input`, `currentClaim=target`이다.

### 4.2 `krds-aligned`

기관 고유 브랜드나 기존 React primitive를 유지하면서 KRDS의 사용자 중심 원칙, semantic state, interaction, 접근성, 기본·서비스 패턴을 매핑하는 프로필이다. 표준형 HTML class나 asset을 복사하는 것이 목적이 아니다.

허용되는 adaptation 예:

- KRDS token 값을 기존 semantic token interface에 adapter로 공급.
- KRDS button markup을 복사하지 않고 기존 native/Radix primitive가 동일 name·role·state·keyboard·target contract를 구현.
- 기관 palette를 사용하되 모든 mode/state에서 contrast와 비색상 단서를 검증.
- 제품의 실제 table/master-detail 구조를 유지하면서 목록 탐색·필터·상태 가이드를 적용.

금지되는 adaptation:

- visual resemblance만으로 `aligned` 주장.
- identity 자격 없이 masthead 또는 기관 식별자를 켬.
- dark mode를 선명한 화면 모드라고 이름만 바꿈.
- unsupported action, fake metric, error→empty를 그대로 둔 채 KRDS class를 추가.

현재 claim은 `target`이고 official identity는 기본 off다.

### 4.3 `premium`

참조 구현과 비공공 파생 제품을 위한 선택적 visual profile이다. Hub Blue, rich shadow, blur, accent palette를 소유할 수 있지만 core semantic contract를 바꾸지 않는다. KRDS claim과 공식 정부 identity는 금지한다. KRDS에서 파생한 token·pattern·asset을 사용하면 KOGL attribution과 adaptation 기록은 유지한다.

## 5. Category별 현재 판정

machine-readable exact entry는 JSON이 소유한다. 아래는 위험과 의사결정을 설명하는 요약이다.

| Category | entries | 현재 판단 | 다음 증거 |
|---|---:|---|---|
| principle | 3 | 사용자 중심·포용 원칙 채택, profile×mode 독립 축으로 일관성 원칙 adaptation | 실제 사용자 연구, task baseline, profile parity |
| style | 8 | semantic color/token·layout·icon·elevation adaptation, typography·shape·high-contrast deferred | Task 2.2 adapter, computed contrast, typography/reflow, forced-colors |
| identity | 3 | standard identity deferred, nonstandard masthead not applicable, header/footer content 미승인 | 기관 자격·명칭·연락처·정책 owner 승인 |
| component | 5 | skip link 채택; button/form/table/feedback 의미 adaptation | rendered states, keyboard/SR, mobile, exact checklist |
| basic pattern | 5 | list/filter/error/form adaptation, 개인 식별 정보 입력 deferred | dense-list/composer pilot, privacy approval |
| service pattern | 4 | login/search adaptation, 신청·정책 정보 journey deferred | complete UI journey와 role별 결과 readback |
| verification | 1 | 공식 자체 검증 체크리스트 deferred | approved profile·scope에서 실행한 artifact |

### 5.1 이미 채택된 항목도 다시 검증하는 이유

예를 들어 root shell에는 반복 영역 앞 `본문 바로가기`와 focus 가능한 `<main id="main-content">`가 있어 skip-link 의도를 채택했다. 그러나 실제 browser에서 focus가 가려지지 않는지, route transition 뒤 올바른 위치인지, 각 profile/mode에서 대비가 유지되는지는 별도 실행 증거다. `adopted`는 구현 seed이지 release sign-off가 아니다.

오류 시 입력 유지 원칙도 헌법과 콘텐츠 가이드가 채택했다. 모든 form이 실제로 이를 지킨다는 뜻은 아니며 composer·wizard pilot에서 mutation 실패를 주입해 확인해야 한다.

### 5.2 기존 primitive를 유지하는 기준

기존 button/input/dialog/table을 KRDS kit으로 전부 교체하지 않는다. 다음 항목이 같거나 더 엄격하게 충족되고, 유지 비용이 합리적이면 `adapted`가 가능하다.

- native semantics와 accessible name/role/state.
- keyboard, focus order/visibility/return, Escape, drag alternative.
- loading/empty/error/permission/demo/unavailable 상태.
- target size, text/non-text/focus contrast, reflow, forced colors.
- 실제 domain validation·RBAC·mutation·readback과의 연결.
- profile별 token set equality와 feature behavior parity.

KRDS component가 명시한 의도를 빠뜨렸거나 실제 public service에서 exact identity/interaction 일관성이 필수라면 기존 primitive를 보완하거나 해당 component를 선택적으로 이식한다. 기술 교체 자체를 adoption KPI로 사용하지 않는다.

## 6. Identity 안전 경계

KRDS 공식 배너는 공식 정부 서비스가 아닌 사이트에서 사용하지 말라고 명시한다. 이 저장소는 reference implementation이므로 다음 입력 전에는 masthead·운영기관 식별자를 렌더하지 않는다.

1. 공식 서비스 자격과 적용 profile.
2. 운영기관의 법정 표기, 상위 기관, logo/mark 사용 권리.
3. 모든 화면의 동일 위치·문구·스타일 계약.
4. skip link가 masthead보다 먼저 오는 DOM 순서.
5. header/footer 연락처·정책 링크·개인정보 처리방침·저작권 책임자.
6. 잘못 활성화했을 때 즉시 끌 수 있는 rollback.

`NEXT_PUBLIC_*` 한 값으로 마크를 켜거나 build-time 기본값을 `krds-standard`로 두지 않는다. 서버가 검증한 profile과 승인된 content manifest가 모두 있어야 한다. `premium`에서는 identity element를 hard fail한다.

## 7. 접근성 mapping

KRDS live documentation은 KWCAG 2.2와 WCAG 2.1 관련 기준을 component별로 연결하면서, KRDS 적용만으로 완전한 접근성을 판단할 수 없다고 밝힌다. 프로젝트는 이를 다음처럼 보완한다.

- 프로젝트 기준은 WCAG 2.2 A·AA다. KRDS가 WCAG 2.1을 인용한 항목도 2.2의 추가 기준과 함께 평가한다.
- 자동 axe는 deterministic DOM에서 color contrast를 포함해 실행하되 자동 검출 범위를 보고한다.
- keyboard, NVDA+Chrome, 200% text, 400% zoom/320 CSS px, forced colors, reduced motion은 수동 evidence를 가진다.
- 실제 task success와 action parity를 포함한다. component 단품 pass로 완결 여정을 대체하지 않는다.
- identity·privacy·security blocker는 visual similarity나 빠른 completion time으로 상쇄할 수 없다.

특히 WCAG 2.2의 Focus Not Obscured, Dragging Movements, Target Size (Minimum), Redundant Entry, Accessible Authentication을 파일럿 matrix에 명시한다. KRDS high-contrast와 Windows forced-colors는 서로 다른 변형이므로 각각 검증한다.

## 8. 라이선스와 attribution

공식 영문 저작권 페이지는 KRDS 자료를 공공누리 제1유형으로 제공하며 출처 표시를 요구한다. 이 계약은 다음 attribution을 기준 문구로 둔다.

> 본 저작물은 행정안전부에서 작성하여 공공누리 제1유형으로 개방한 KRDS(Korea Design System) 자료를 이용하였으며, 원문은 https://www.krds.go.kr/에서 확인할 수 있습니다.

실제 distribution에서는 NOTICE/README/제품 내 법적 고지 중 적용 위치를 release owner가 승인한다. KRDS repository package metadata와 공식 저작권 페이지가 다르게 보일 경우 더 느슨한 조건을 임의 선택하지 않고 legal/release owner가 정리한다. 정부 logo·기관 identity 사용 권리는 일반 component license와 별도로 확인한다.

## 9. Self-checklist와 release evidence

KRDS 자체 검증 체크리스트는 다음 metadata와 함께 실행한다.

```yaml
profile: krds-standard | krds-aligned
guidelineVersion: 2025.08
componentKitVersion: 1.1.0
buildSha: <exact SHA>
population:
  routes: []
  roles: []
  states: []
  modes: []
  viewports: []
result:
  pass: []
  fail: []
  exception: []
  notApplicable: []
artifacts: []
reviewers:
  productInstitution: <required for identity>
  accessibility: <required>
  engineering: <required>
checkedAt: <date>
```

`notApplicable`에는 이유가 있어야 하고, `exception`에는 owner, reason, compensating control, reviewBy가 있어야 한다. checklist 총점만 보존하지 않고 fail과 N/A 근거를 함께 보존한다. 실행하지 않은 checklist 파일이나 template은 evidence가 아니다.

## 10. Refresh protocol

다음 중 하나가 발생하면 `config/krds-profile-mapping.json`이 stale 상태가 되며 mapping을 다시 검토한다.

1. 2026-11-21이 지나 scheduled review가 만료됨.
2. 공식 resource page가 2025.08보다 새 guideline을 게시함.
3. HTML Component Kit latest release가 1.1.0에서 바뀜.
4. profile 목적, identity 자격, 정부/기관 표기가 바뀜.
5. WCAG/KWCAG 목표 또는 KRDS accessibility mapping이 바뀜.
6. adopted/adapted local evidence path가 삭제되거나 semantic contract가 바뀜.

업데이트는 version 숫자만 바꾸지 않는다. 원칙·style·component·pattern·identity diff, 영향을 받는 local evidence, migration/rollback, license 변경을 함께 검토한다. contract test는 stale `checkBy`, 비공식 source, category 누락, owner 없는 deferred, 설명 없는 adaptation, premium identity 누출을 red로 만든다.

## 11. 구현 순서

1. 이 mapping과 Task 0.5 baseline을 현재 증거로 고정한다.
2. Task 2.2에서 `data-brand-theme`와 color mode를 독립 구현하고, profile token equality를 계약화한다.
3. `krds-standard`의 typography·shape·high-contrast를 작은 representative state에서 먼저 검증한다.
4. identity를 제외한 component/pattern adaptation을 실제 vertical pilot에서 증명한다.
5. 기관 자격과 content owner가 정해진 뒤 identity를 별도 feature로 구현한다.
6. approved exact scope에서 official self-checklist와 수동 AT 평가를 실행한다.
7. evidence가 완결된 범위만 `aligned` 또는 `verified scope`로 release note에 명시한다.

대규모 CSS 교체나 kit 전체 설치는 이 순서의 선행 조건이 아니다. component별로 현재 의미·상태·접근성 gap이 확인될 때만 선택적으로 도입한다.

## 12. 현재 acceptance와 blocker

완료된 내부 산출물:

- official guideline 2025.08, live documentation, kit 1.1.0, KOGL Type 1 source pin.
- 세 profile의 claim·identity·attribution 경계.
- 7개 category, 29개 mapping entry의 explicit disposition.
- deferred 항목의 reason, role owner, reviewBy.
- stale/source/category/deviation/identity negative fixtures와 operational test path.

남은 release blockers:

- product/institution owner와 official-service 자격.
- Task 2.2 profile implementation.
- current UI baseline과 rendered profile×mode×state evidence.
- user/task, keyboard, screen reader, reflow, forced-colors, reduced-motion 결과.
- official self-checklist 실행과 승인된 exception.
- attribution 배치와 identity/legal 검토.

따라서 Task 2.1의 **mapping contract**는 내부적으로 실행 가능하지만 KRDS 적용 완료나 profile release는 아니다. 외부 입력이 없더라도 `premium`의 identity 차단, source refresh, semantic adaptation, accessibility non-claim은 즉시 강제할 수 있다.
