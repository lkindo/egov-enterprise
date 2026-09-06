# UI/UX 현대화 제품 Brief 및 사용자 연구 Protocol

- **Status:** Draft — 제품 소유자 승인 전, `blocked-input`
- **Document owner:** product/UX — 담당자 미지정
- **Decision owners:** 제품 소유자, 대상 기관 또는 파생 제품 책임자 — 모두 미지정
- **Technical reviewers:** frontend architecture, domain owner, security/privacy, accessibility — 담당자 미지정
- **Review by:** G0 회의 전 날짜 지정 필요
- **Last evidence review:** 2026-08-21
- **IA decision review:** 2026-09-05 — [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md)
- **URL-state decision review:** 2026-09-05 — [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md)

> 이 문서는 UI/UX 현대화를 위한 활성 제품 brief와 연구 프로토콜이다. 연구 결과, 사용자 승인, 기관별 요구사항 또는 출시 승인을 기록한 문서가 아니다. 현재 확인된 사실과 아직 검증하지 않은 가설을 분리하며, 제품 소유자의 승인과 실제 사용자 증거가 들어오기 전에는 G0 또는 **기관 채택 시 원 G1** 통과나 “사용자 검증 완료”를 선언하지 않는다. 공통 base의 reference-default G1은 ADR-0007로 이미 승인됐으며 이를 기관별 검증 완료와 혼동하지 않는다.

## 1. Executive summary

이 저장소는 특정 기관에 즉시 납품할 수 있는 완성 제품이 아니라, 전자정부 기능을 현대 스택으로 구현한 **동작 가능한 참조 구현(reference implementation)**이자 신규 SI·재개발을 위한 **재사용 base**다. 코어와 선택 기능의 경계, `core`·`collaboration`·`demo` 프로필, 생성·검증 경로는 존재하지만, 실제 기관의 업무 우선순위·조직 구조·콘텐츠·법적 의무·지원 디바이스를 저장소가 대신 결정할 수는 없다. 이 경계의 정본은 [루트 README](../../README.md), [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md), [재사용 프로필 manifest](../../config/reusable-base-profiles.json)다.

따라서 현대화의 연구 대상은 하나의 막연한 “사용자”가 아니라 다음 두 집단으로 나눈다.

1. **Framework adopter:** base를 평가·선택·생성·확장·검증·운영하는 발주/제품 책임자, 아키텍트, 개발자, 보안·운영 담당자.
2. **End user:** 파생 제품에서 로그인, 사용자·권한 관리, 게시판·댓글 또는 설문 협업, 로그·개인정보 조회 등 실제 업무를 수행하는 관리자와 일반 사용자.

현재 코드와 문서만으로는 어느 과업이 가장 자주 수행되는지, 실패 비용이 어느 정도인지, 어떤 디바이스·보조기술이 실제로 사용되는지 확정할 수 없다. 현대화는 다음 순서를 지켜야 한다.

1. 제품 소유자와 대상 배포 맥락을 지정하고 G0 질문에 답한다.
2. 역할별 맥락 조사와 현재 UI baseline을 수집한다.
3. 기관 채택 시 top task, 목표 IA, 민감 상태, 성공·rollback 기준을 제품 소유자가 승인해 원 G1을 통과한다. 공통 base에서는 ADR-0007 reference-default와 route별 disposition 개별 승인 경계를 따른다.
4. 주요 역할별 약 5명의 소규모 형성 평가(formative usability test)를 반복하고, 악화가 없는 파일럿만 확대한다.

이 문서는 위 절차를 실행할 수 있을 만큼 내부적으로 완결된 초안이다. 다만 제품 소유자, 실제 연구 참여자, 연구 데이터 개인정보 승인, 대상 기관과 배포 프로필이 미지정이므로 Task 0.2의 승인 조건은 아직 충족하지 않는다. 이는 ADR-0009의 제품 URL-state 정책 승인과 별개다.

## 2. 제품 정의와 경계

### 2.1 현재 제품 정의

| 항목 | 현재 정의 | 근거와 한계 |
|---|---|---|
| 제품 형태 | 동작 가능한 전자정부 기능 참조판 + 재사용 base | [README](../../README.md), [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md). 기관별 완제품이라는 뜻이 아니다. |
| 배포 단위 | 정확한 release tag에서 `core`, `collaboration`, `demo` 중 하나를 생성 | [프로필 manifest](../../config/reusable-base-profiles.json), [생성 가이드](../03-guides/reusable-base-guide.md). 생성 성공과 기관 적합성은 별개다. |
| UI 언어 | 공통 프런트엔드는 한국어 우선 단일 언어 | [ADR-0002](../02-architecture/decisions/ADR-0002-korean-first-frontend.md). 파생 제품의 다국어 필요는 별도 제품 결정이다. |
| UX 원칙 | 과업·신뢰 우선, 브랜드 중립, WCAG 2.2 A+AA 목표, 위험 기반 상태·복구 | [ADR-0003](../02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md). 목표 선언만으로 준수를 뜻하지 않는다. |
| UI 기능 상태 | route별로 `live`, `partial`, `demo`, `unavailable`, 미검증 상태를 분리하는 census 진행 중 | [capability manifest](../../config/ui-route-capabilities.json). 화면 존재나 API 문자열만으로 `live`를 확정하지 않는다. |
| 미결정 제품 입력 | reference-default 안의 exact label/group/order/visibility와 route별 disposition, 기관 채택 시 목표 IA 재검증, 계측 원천, 대상 기관별 URL 허용 범위 축소 여부 등 | [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md), [pending decisions](../04-operations/pending-decisions.md). 공통 base의 IA 방향과 URL 검색 정책은 각각 ADR-0007·ADR-0009로 결정됐으며, 미승인 route나 기관별 입력을 구현이 선결하면 안 된다. |

### 2.2 제품 목표

1. adopter가 필요한 프로필과 선택 기능을 이해하고, 검증 가능한 base를 안전하게 생성·평가할 수 있게 한다.
2. end user가 역할에 허용된 핵심 과업을 정확한 상태·권한·오류 피드백과 함께 완료하게 한다.
3. 관리자와 일반 사용자를 잇는 교차 역할 여정에서 생성·전달·응답·검토 결과가 일관되게 보존되게 한다.
4. demo·partial·unavailable 기능을 실제 운영 기능처럼 보이지 않게 하며 데이터 출처와 지원 action을 정직하게 표현한다.
5. 키보드, 화면낭독기, 확대/reflow, 고대비·forced colors, reduced motion을 포함한 접근성 요구를 사후 감사가 아니라 연구와 파일럿에 포함한다.
6. 시각적 일관성보다 과업 성공, 개인정보 보호, 회복 가능성, 성능을 우선하며 baseline 대비 결과로 확대 여부를 결정한다.
7. 공통 core가 특정 기관·브랜드·미학을 기본 진실로 가정하지 않고 파생 제품의 명시적 profile로 확장되게 한다.

### 2.3 비목표

- 현재 참조 구현을 특정 기관의 업무·조직·법적 요건이 확정된 완성 제품으로 선언하지 않는다.
- route 수, component 채택률, client LOC, 자동 검사 수를 UX 성공 지표로 사용하지 않는다.
- 사용자 조사 없이 관리자 화면 수나 시각적 인상을 기준으로 IA와 우선순위를 확정하지 않는다.
- `demo`·`partial` 기능을 리디자인만으로 `live`로 승격하지 않는다.
- 근거 없이 정부 공식 식별 요소, KRDS 준수, 접근성 준수를 주장하지 않는다.
- 외부 analytics/RUM 도구, 프로덕션 녹화, 개인 식별 가능한 행동 추적을 이 문서만으로 승인하지 않는다.
- 파생 제품별 다국어, 조직도, 보존기간, 법률 판단, 운영 인프라를 공통 base가 임의 결정하지 않는다.
- 소규모 형성 평가 결과를 모집단 전체의 통계적 대표성이나 정량적 사업 효과로 과장하지 않는다.

## 3. 증거와 가설 register

### 3.1 현재 확인된 증거

| ID | 검증된 사실 | 제품상 의미 | 근거 |
|---|---|---|---|
| E-01 | 저장소는 참조 구현이며 release-tag 기반 재사용 base를 생성한다. | adopter 경험이 독립적인 핵심 UX다. | [README](../../README.md), [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md) |
| E-02 | 프로필은 `core`, `collaboration`, `demo`이고 선택 pack과 물리 소유권이 manifest에 정의돼 있다. | 프로필 선택·생성·검증을 조사 과업에 포함할 수 있다. | [프로필 manifest](../../config/reusable-base-profiles.json) |
| E-03 | UI는 한국어 우선이며 부분 번역을 다국어로 오인하지 않기로 했다. | 한국어 문해성·쉬운 언어를 기본 평가하되 파생 제품 언어 요구는 별도 수집한다. | [ADR-0002](../02-architecture/decisions/ADR-0002-korean-first-frontend.md) |
| E-04 | 현대화 원칙은 사용자 과업, 브랜드 중립, WCAG 2.2 목표, 상태 진실성, 측정 기반 데이터 소유권을 우선한다. | 미학 중심 성공 기준을 사용할 수 없다. | [ADR-0003](../02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md) |
| E-05 | 현재 계획 검토에는 활성 PRD·인터뷰·사용 로그·지원 문의 분류·RUM이 없다고 기록돼 있다. | 실제 top task와 목표치는 미확정이다. | [현대화 계획 §2.2](../02-architecture/ui-ux-modernization-plan.md#22-증거의-한계) |
| E-06 | route/capability manifest는 정확한 route 모집단과 상태를 관리하지만 미검증 필드가 남아 있다. | route 존재를 기능 완성 또는 사용 빈도의 증거로 사용할 수 없다. | [capability manifest](../../config/ui-route-capabilities.json) |
| E-07 | ADR-0007이 ADR-0004의 hybrid 방향을 참조-기본 IA로 승인해 공통 base에서 잠정 지위를 끝냈다. 사용자 연구 없는 accepted risk는 남고, exact label/group/order/visibility와 route별 disposition은 개별 승인 대상이며 기관 채택 시 실사용자·실메뉴·실권한으로 G1을 다시 수행한다. 개인정보성 업무 검색어는 ADR-0009가 exact route/query allowlist와 accepted risk 아래 URL 사용을 승인했다. | reference-default를 미승인으로 되돌리지 않는다. 다만 미승인 route를 menu/generator가 소비하지 않고, 기관별 G1과 URL 검색의 unknown-query 차단·same-view `replace`·log/analytics 비복제를 검증한다. 앱은 고위험 용도의 전용 URL field/state를 설계하거나 일반 검색창에서 그런 입력을 요구·유도하지 않는다. 자유 입력값의 의미를 완전 탐지할 수 없으므로 예상 밖 붙여넣기는 accepted residual risk이며 고위험 용도 승인이 아니다. credential-name gate는 key 이름 차단이지 DLP가 아니다. | [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md), [ADR-0004](../02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md), [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md), [pending decisions](../04-operations/pending-decisions.md#거버넌스ux-결정) |

### 3.2 아직 검증하지 않은 가설

| ID | 가설 | 틀렸을 때 위험 | 검증 방법 |
|---|---|---|---|
| H-01 | adopter에게 프로필 선택·산출물 생성이 가장 중요한 첫 과업 중 하나다. | 문서·생성기 개선이 실제 도입 장애를 해결하지 못한다. | 최근 유사 도입 경험 맥락 인터뷰, 첫 사용 관찰, 생성 task baseline |
| H-02 | 관리자에게 사용자·권한 관리와 로그 조회가 고빈도 또는 고위험 과업이다. | admin-first 현대화가 실제 가치를 왜곡한다. | 역할별 최근 사례 인터뷰, 현장 관찰, 지원 문의·감사 절차 자료가 있을 때 교차 검증 |
| H-03 | 게시판/댓글 또는 설문은 관리자와 일반 사용자를 잇는 대표 교차 역할 여정이다. | 파일럿이 실제 협업 흐름을 대표하지 못한다. | 대상 기관의 실제 업무 흐름 확인 후 두 후보 중 선택 |
| H-04 | 주 사용 환경은 데스크톱이지만 모바일·확대·보조기술 지원도 필요하다. | 모바일 또는 AT 사용자의 핵심 action이 누락된다. | 디바이스·입력·AT 질문, 실제 환경 관찰, 지원 매트릭스 승인 |
| H-05 | 한국어 내부 용어와 메뉴 중복이 탐색 비용을 높인다. | 용어 개편이 오히려 숙련자의 효율을 떨어뜨린다. | 최근 과업의 findability 관찰, tree test/card sort, baseline 대비 |
| H-06 | 정직한 unavailable/partial 표시는 화려한 지표보다 신뢰를 높인다. | 상태 표시는 늘지만 사용자는 다음 행동을 알지 못한다. | 상태 이해 질문, 오류·빈 상태 회복 task, 신뢰도 후속 질문 |

가설은 우선순위 점수에 바로 넣지 않는다. 조사 결과가 모순되면 가설을 폐기하고, 결과가 비어 있으면 `unknown`을 유지한다.

## 4. 사용자군과 의사결정권

### 4.1 연구 대상 세그먼트

| Segment | 포함 후보 | 연구에서 답할 질문 | 현재 상태 |
|---|---|---|---|
| A1 adopter 의사결정 | 발주/제품 책임자, enterprise architect | 어떤 profile·표준·운영 책임을 선택하며 무엇을 승인 근거로 보는가? | 참여자·기관 미지정 |
| A2 adopter 구현·운영 | 개발자, DevOps/DB, 보안 담당 | bootstrap, profile 생성, 확장, 검증, 실패 복구에서 어디서 막히는가? | 참여자 미지정 |
| E1 관리자 | 사용자·권한·메뉴·콘텐츠 관리자 | 고위험 mutation과 오류를 어떻게 판단·복구하는가? | 참여자 미지정 |
| E2 업무/콘텐츠 담당 | 게시판·설문·승인 등 업무를 생성·관리하는 사용자 | 교차 역할 흐름에서 상태와 다음 action을 이해하는가? | 참여자 미지정 |
| E3 일반 인증 사용자 | 게시글·댓글·설문 응답·조회 등을 수행하는 사용자 | 원하는 기능을 찾고 제출 결과를 확인할 수 있는가? | 참여자 미지정 |
| E4 감사·개인정보 담당 | 로그·개인정보 접근을 검토하는 사용자 | 최소 공개, 검색, 내보내기, 감사 추적이 업무와 정책에 맞는가? | 참여자 미지정 |

한 사람이 여러 역할을 겸할 수 있지만 분석에서는 수행 맥락을 분리한다. 조직 직함만으로 역할을 정하지 않고 실제 책임과 최근 과업 경험을 확인한다. 접근성은 별도 “특수 사용자”가 아니라 각 segment에 교차되는 조건으로 모집한다.

### 4.2 RACI

`A`는 최종 승인, `R`은 실행·산출 책임, `C`는 필수 협의, `I`는 결과 공유다. 개인 이름이 정해지기 전까지 아래 역할명은 자리표시자이며 승인으로 간주하지 않는다.

| 결정/활동 | 제품 소유자 | UX lead/researcher | framework/FE architecture | domain owner | security/privacy | accessibility owner | adopter 대표 | end-user 대표 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 제품 목표·비목표, G0 승인 | A | R | C | C | C | C | C | C |
| 연구 설계·모집·진행 | A | R | C | C | C | C | C | C |
| 동의·수집 최소화·보존/삭제 | I | R | C | I | A | C | I | I |
| top-task 순위와 목표 IA, G1 승인 | A | R | C | R | C | C | C | C |
| route/capability 진실 상태 | I | C | A/R | R | C | C | I | I |
| 프로필 범위와 생성 계약 | C | C | A/R | C | C | C | C | I |
| 접근성 평가 범위·판정 | I | R | C | C | C | A | C | C |
| pilot go/no-go·rollback | A | R | R | C | C | C | C | C |
| 출시 및 기관별 준수 주장 | A | I | R | C | A/C | A/C | I | I |

연구 참여자는 의견과 행동 증거를 제공하지만 제품 결정을 승인하는 역할은 아니다. 관리자가 부하 직원을 직접 모집·관찰해 참여 압력을 만들지 않으며, 연구자가 자신의 설계를 단독 승인하지 않는다.

## 5. Top-task 후보 matrix

다음 표는 조사할 후보 목록이지 확정 우선순위가 아니다. `빈도`, `실패 비용`, `민감도`, `device/AT`의 모든 값은 미측정이며, 괄호 안 내용은 연구 설계를 위한 초기 가설이다.

### 5.1 Framework adopter 후보

| ID | 역할 후보 | 과업 후보와 완료 결과 | 빈도 | 실패 비용 | 민감도 | Device/AT | 검증할 증거 |
|---|---|---|---|---|---|---|---|
| A-T01 | adopter 의사결정 | 요구 기능에 맞는 `core`/`collaboration`/`demo` 선택과 제외 범위 설명 | 미측정(가설: 도입·큰 범위 변경 시) | 미측정(가설: 높음—잘못된 범위가 장기 비용 유발) | 미측정(가설: 낮음, 기관 요구 문서는 민감 가능) | 미측정 | 선택 근거, 오분류, 결정 시간, 확인한 문서 |
| A-T02 | 구현 담당 | 깨끗한 release tag에서 DB/source 산출물 생성 | 미측정(가설: release/프로젝트 시작 시) | 미측정(가설: 높음—불완전 산출물) | 미측정(가설: 환경 변수·로그에 비밀 가능) | 미측정(가설: desktop+keyboard) | 무지원 성공, 오류 회복, lock 해석 |
| A-T03 | 구현 담당 | 선택 도메인 확장 또는 제거 후 의존·DB·route 계약 검증 | 미측정 | 미측정(가설: 높음) | 미측정 | 미측정 | profile ownership 이해, gate 결과 해석 |
| A-T04 | 제품/디자인 담당 | 기관 brand profile과 color mode·접근성 범위 결정 | 미측정 | 미측정(가설: 중~높음) | 미측정 | 미측정; AT 요구 수집 필요 | brand와 mode 분리 이해, 준수 주장 범위 |
| A-T05 | 보안/운영 담당 | 인증·RBAC·로그·보존·계측의 미결정 입력 확인 | 미측정 | 미측정(가설: 매우 높음) | 미측정(가설: 높음) | 미측정 | pending decision 발견, owner 지정, 안전한 보류 |
| A-T06 | 운영/품질 담당 | 산출물 gate 실패 원인 파악과 release 가능 여부 판정 | 미측정(가설: 변경마다) | 미측정(가설: 높음) | 미측정(로그 redaction 필요) | 미측정 | 올바른 명령 선택, false-green 회피, 증거 보존 |

### 5.2 End-user 후보

| ID | 역할 후보 | 과업 후보와 완료 결과 | 빈도 | 실패 비용 | 민감도 | Device/AT | 검증할 증거 |
|---|---|---|---|---|---|---|---|
| E-T01 | 모든 인증 사용자 | 로그인하고 권한에 맞는 시작점 도달, 만료 시 입력을 잃지 않고 재인증 | 미측정(가설: 근무일마다) | 미측정(가설: 높음) | 미측정(가설: 자격증명은 매우 높음) | 미측정; keyboard·SR·mobile 포함 조사 | 성공률, 오류 이해, 재인증 회복 |
| E-T02 | 관리자 | synthetic 사용자를 찾고 상태/역할을 의도대로 변경한 뒤 결과 확인 | 미측정 | 미측정(가설: 매우 높음—권한 오부여) | 미측정(가설: 높음) | 미측정 | 대상 식별, 확인, mutation 결과, rollback |
| E-T03 | 콘텐츠 담당+일반 사용자 | 게시글 게시→다른 역할의 댓글→작성자의 확인/처리 | 미측정 | 미측정(가설: 중~높음) | 미측정(자유 텍스트에 개인정보 가능) | 미측정 | cross-role 전달, 상태·알림, 권한 경계 |
| E-T04 | 설문 관리자+응답자 | 설문 생성/공개→응답→권한별 결과 확인 | 미측정 | 미측정(가설: 높음—응답 손실/노출) | 미측정(질문·응답에 민감정보 가능) | 미측정 | 제출 보존, 중복 방지, 결과 공개 범위 |
| E-T05 | 업무 사용자+승인자 | 요청 작성→승인/반려→요청자의 상태 확인 | 미측정 | 미측정(가설: 높음) | 미측정 | 미측정 | 상태 명확성, 중복 mutation, 회복 |
| E-T06 | 감사·개인정보 담당 | synthetic 사건의 로그를 최소 조건으로 찾아 근거와 접근 범위를 확인 | 미측정(가설: 감사/사고 시) | 미측정(가설: 매우 높음) | 미측정(가설: 매우 높음) | 미측정; 확대·keyboard·SR 조사 | 검색 정확도, URL/내보내기 노출, 감사 추적 |
| E-T07 | 일반 사용자 | 알림의 출처·미확인 상태를 이해하고 관련 업무로 이동 | 미측정 | 미측정 | 미측정 | 미측정 | 데이터 출처 이해, dead action 여부, 오류/empty 구분 |

빈도와 실패 비용은 인터뷰의 추상적 평점만으로 확정하지 않는다. 가능할 때 최근 실제 사례·업무 절차·비식별 지원 문의·승인된 최소 analytics를 교차 확인한다. 서로 다른 역할의 점수를 평균내 소수 고위험 역할을 숨기지 않는다.

## 6. Decision Gate 질문과 통과 증거

### 6.1 G0 — 제품·사용자·프로필·표준

다음 질문에 답하고 제품 소유자가 기록으로 승인하기 전에는 visual theme, 목표 IA, 대규모 route 이식을 시작하지 않는다.

1. 이번 현대화의 대상은 공통 reference, 특정 파생 제품, 특정 기관 중 무엇인가?
2. adopter와 end-user 중 누가 이번 wave의 일차 사용자이며 제외되는 집단은 누구인가?
3. 해결하려는 top-task 후보와 관찰된 문제는 무엇이며, 현재 증거와 가설은 어떻게 구분되는가?
4. `core`, `collaboration`, `demo` 중 어떤 profile이 대상이고, demo/partial 기능은 어떻게 격리·표시하는가?
5. 한국어 우선 외에 필요한 언어, 문해 수준, 콘텐츠 책임자는 누구인가?
6. 적용할 WCAG/KWCAG/KRDS 버전과 `target`, `aligned`, `compliant` 중 허용 표현은 무엇인가?
7. 기관 masthead·brand asset을 사용할 자격과 승인자는 누구인가?
8. 대상 역할·권한·조직·데이터 원천·보존 정책은 누가 소유하는가?
9. 사용자 연구 접근, 모집, 보상, 녹화, 개인정보 보존·삭제가 승인됐는가?
10. 성공/중단/rollback을 승인하는 한 명의 제품 소유자와 기술·개인정보·접근성 reviewer가 지정됐는가?

**G0 통과 산출물:** 승인된 brief 버전, RACI 실명/연락 채널, 대상 profile·표준·역할, 연구 승인, open input 처분, 승인자·날짜. 현재는 이 중 담당자와 외부 입력이 없어 **미통과**다.

### 6.2 기관 채택 G1 — IA·상태·baseline·성공 기준

ADR-0007의 reference-default G1 승인은 유지된다. 아래 질문과 산출물은 기관이 base를 채택할 때 실사용자·실메뉴·실권한으로 다시 수행하는 원 G1이며, 참조 구현의 route별 disposition은 이와 별도로 owner PR review를 통해 개별 승인한다.

1. 역할별 top task 순위가 맥락 조사와 baseline으로 뒷받침되는가?
2. 목표 IA와 메뉴 명칭이 실제 mental model, 권한, cross-role journey를 보존하는가?
3. route별 `live | partial | demo | unavailable`과 supported action, actor scope가 승인됐는가?
4. empty, filtered-zero, 권한 없음, offline, 부분 실패, 서버 오류, unavailable을 구분하는가?
5. ADR-0009의 URL 검색 allowlist(`/search?q`, 게시판 두 route의 `searchCnd`·`searchWrd`)와 용도 경계를 지키는가? 앱이 자격증명·token·고유식별정보·고위험 개인정보·응답 본문을 위한 전용 URL field/state를 만들거나 일반 검색창에서 그런 입력을 요구·유도하지 않는가? 자유 입력값의 예상 밖 붙여넣기는 accepted residual risk이지 고위험 용도 승인이 아니며, credential-name gate는 값 DLP가 아니라 key 이름 차단임을 이해하는가? 파생 제품이 범위를 더 좁힐지, 새 route/key나 browser storage가 필요한지 별도 승인됐는가?
6. baseline과 after가 같은 역할·task·데이터·환경·측정식으로 비교 가능한가?
7. 파일럿 task, 표본, AT/device 범위, 성공/rollback threshold와 예외 승인자가 정해졌는가?
8. 미해결 P0/P1 위험, unsupported action, 무출처 수치를 사용자에게 어떻게 정직하게 고지하는가?

**G1 통과 산출물:** 승인된 top-task/IA, capability manifest review, state/content contract, baseline dataset, 연구 readout, threshold, 파일럿·rollback 계획. 사용자 접근 불가 시 expert walkthrough는 위험 목록을 만들 수 있지만 사용자 검증 산출물을 대신하지 않는다.

## 7. 연구 질문

### 7.1 공통

- 참여자는 최근 실제 과업을 어떤 계기로 시작하고, 완료를 무엇으로 판단하는가?
- 가장 큰 실패는 탐색, 이해, 입력, 권한, 시스템 응답, cross-role handoff 중 어디서 발생하는가?
- 오류·권한 없음·빈 결과·미지원 상태를 구분하고 다음 행동을 선택할 수 있는가?
- 어떤 정보가 민감하며 화면, URL, 다운로드, 알림, 로그에 어디까지 보여야 하는가?
- 사용하는 디바이스, viewport, 입력 방식, 확대, 색/모션 설정, 보조기술은 무엇인가?
- 숙련자 속도와 신규 사용자 학습성 사이에 어떤 차이가 있는가?

### 7.2 Adopter 전용

- profile 설명만 보고 포함/제외 기능과 데이터 소유권을 예측할 수 있는가?
- clean release tag, Docker/DB, lock, gate 실패 조건을 이해하고 안전하게 복구하는가?
- reference 기능과 production-ready 기능, 제품 결정 대기 항목을 구분하는가?
- 기관별 브랜드·표준·인가·보존 정책을 어디에서 주입하고 어디까지 core로 오인하는가?

### 7.3 End-user 전용

- 메뉴와 가시 label이 내부 시스템명이 아니라 업무 목표를 설명하는가?
- mutation 전 대상·영향·권한을 확인하고, 완료 후 authoritative 결과를 확인하는가?
- 관리자에서 일반 사용자로 넘어가는 게시/응답/승인 흐름의 상태가 일치하는가?
- 세션 만료, 네트워크 실패, validation 오류 뒤에도 입력과 맥락을 복구할 수 있는가?

## 8. 연구 설계

### 8.1 단계와 산출물

| 단계 | 방법 | 입력 | 산출물 | 다음 단계 조건 |
|---|---|---|---|---|
| R0 준비 | evidence review, stakeholder interview, privacy review | 이 brief, ADR, manifest, pending decisions | 승인된 scope·RACI·recruitment screener | G0 입력 확보 |
| R1 맥락 조사 | 인터뷰 + 가능 시 실제 업무 관찰 | 역할별 참여자, 비식별 업무 자료 | task model, failure/recovery map, 용어, device/AT inventory | 핵심 역할별 saturation 메모와 반례 기록 |
| R2 구조 검증 | tree test, card sort 또는 scenario findability test | R1 task/mental model | 후보 IA별 성공·오분류·용어 이슈 | 제품 소유자 목표 IA 승인 |
| R3 baseline | 현행 UI moderated task test | 고정 build, synthetic data | 역할/task별 baseline | 측정식·환경 완결 |
| R4 파일럿 반복 | 후보 UI formative test round 1→수정→round 2 | 같은 난이도의 task와 data | after metrics, issue closure, residual risk | G1 이후 pilot gate 판단 |
| R5 제한 출시 | 승인된 경우에만 canary/feature flag 관찰 | rollback 가능한 배포 | 최소 운영 지표와 incident review | threshold 충족 시 확대 |

### 8.2 맥락 조사 표본 기본안

방향 발견을 위한 기본안은 역할당 3명 이상, 총 12~18명이다. 이는 통계적 대표 표본이 아니라 서로 다른 mental model과 고위험 실패를 발견하기 위한 목적 표본이다.

| Stratum | 기본 모집 | 구성 원칙 |
|---|---:|---|
| adopter 의사결정/architecture | 3 | 제품·범위 결정 경험이 다른 사람을 포함한다. |
| adopter 구현/운영 | 3 | 개발, DB/운영, 보안 중 둘 이상의 관점을 포함한다. |
| 관리자/감사 | 3 | 사용자·권한 또는 로그 책임을 실제 수행하는 후보를 구분 기록한다. |
| 업무·콘텐츠 담당 | 3 | 게시/설문/승인 중 대상 wave와 직접 관련된 역할을 모집한다. |
| 일반 인증 사용자 | 3 | 숙련도와 이용 빈도가 다른 후보를 포함한다. |

기본 합계는 15명이다. 역할 하나가 실제로 분리된 mental model과 권한을 가진다고 조사 중 확인되면 기존 역할의 3명을 쪼개지 않고 전체를 최대 18명으로 조정한다. 18명을 넘어야 하거나 접근 가능한 모집단이 더 작으면 UX lead가 목적·편향·영향을 기록하고 제품 소유자가 표본 변경을 승인한다.

### 8.3 맥락 인터뷰/관찰 세션

- **권장 시간:** 60~75분.
- **도입 5분:** 연구 목적, 자발성, 녹화 선택, 중단권, 실데이터 입력 금지를 읽어준다.
- **역할/환경 10분:** 책임, 최근 수행 과업, 빈도는 범주가 아니라 최근 사례로 묻는다. device/AT는 참여자가 사용하는 표현을 그대로 기록한다.
- **최근 사례 재구성 20분:** “마지막으로 이 일을 했던 때”를 시작 신호→정보 준비→action→확인→후속 전달 순으로 설명하게 한다. 이상적인 절차를 유도하지 않는다.
- **맥락 관찰 20분:** 승인된 synthetic 또는 redacted 자료로 현재 도구를 사용하게 한다. 업무 데이터·자격증명·개인 식별 정보가 보이면 즉시 녹화를 중단한다.
- **실패·회복 10분:** 최근 오류, 잘못된 권한/대상, 취소·되돌림, 지원 요청 경로를 묻는다.
- **종료 5분:** 연구자가 이해한 핵심을 되읽고 정정받으며 추가 연락 동의를 별도로 확인한다.

질문은 “이 기능이 편리하지 않습니까?”가 아니라 “무엇을 기대했습니까?”, “다음에 무엇을 하시겠습니까?”, “완료됐다고 어떻게 알았습니까?”처럼 중립적으로 한다. 참여자가 막혔을 때 즉시 가르치지 않고 사전에 정의한 assist 시점과 내용을 기록한다.

### 8.4 파일럿 사용성 평가

- G1에서 선정된 **각 주요 역할별 약 5명**을 한 round의 기본값으로 한다.
- Round 1 후 P0/P1 문제를 수정하고 같은 역할별 약 5명으로 Round 2를 반복한다. 학습 효과를 피하려면 가능한 한 새 참여자를 모집한다. 동일 참여자를 다시 부를 때는 longitudinal retest로 표시하고 신규 참여자 결과와 합치지 않는다.
- 약 5명은 형성 평가의 결함 발견 단위이지 비율 추정의 충분한 표본이 아니다. 결과에는 `4/5`처럼 원시 분모를 함께 표기하고 작은 차이를 통계적 우위로 주장하지 않는다.
- 한 세션은 60분 이내를 기본으로 하며 3~5개 핵심 task만 수행한다. 피로·AT 속도에 맞춰 휴식과 추가 시간을 제공하고 시간 초과를 참여자 실패로 자동 분류하지 않는다.
- 기존 UI와 후보 UI를 비교하면 순서를 counterbalance하고, 콘텐츠는 다르지만 난이도·필드 수·권한·오류 조건이 동등한 synthetic dataset을 사용한다.

## 9. 모집, 포함·제외, 동의와 개인정보

### 9.1 Recruitment screener

모집 설문은 연락과 선별에 필요한 최소 항목만 받는다.

- 연구 segment와 실제 책임 또는 최근 유사 과업 경험.
- 대상 task의 최근 수행 여부와 대략적 빈도 범주. 정확한 사건·기관명은 받지 않는다.
- 주 사용 device, input, 브라우저, 확대/대비/모션 설정, 보조기술 사용 여부. 진단명은 묻지 않는다.
- 원격/대면 참여 가능 여부와 필요한 accommodation.
- 이해관계 충돌: 현재 현대화 설계·구현·승인 담당인지 여부.
- 녹화 없는 참여가 가능한지와 후속 연락 동의. 녹화 동의는 참여 동의와 분리한다.

### 9.2 Inclusion

- adopter: 최근 유사 framework/base 평가·구축·검증 경험이 있거나 이번 파생 제품에서 해당 책임을 실제 맡을 예정인 성인.
- end user: 대상 기관 또는 유사 업무에서 후보 task를 실제 수행하거나 수행할 예정인 성인.
- 관리자·일반 사용자·감사 역할과 초보·숙련 사용자를 목적 표집한다.
- 각 핵심 segment에 keyboard-only, 화면낭독기, 확대/저시력, 고대비/forced colors, reduced motion 등 실제 사용 조건이 교차되도록 접근 가능한 모집 풀을 만든다. 정확한 quota는 모집 가능성과 대상 제품 지원 범위를 G0에서 승인한다.
- 한국어 문해 수준, 장문·전문 용어 친숙도, desktop/mobile 사용 차이를 배제 사유로 삼지 않고 분석 변수로 기록한다.

### 9.3 Exclusion 또는 별도 표기

- 현대화 UI를 직접 설계·구현한 사람은 end-user usability 표본으로 합산하지 않는다. expert review에는 참여할 수 있다.
- 실제 과업 경험이 없는 대리 참가자는 `proxy participant`로 표시하며 실제 사용자 검증으로 합산하지 않는다.
- 관리자나 상사가 참여를 강제하거나 개별 성과를 볼 수 있는 모집 구조는 사용하지 않는다.
- 실서비스 계정·운영 데이터·실제 개인정보를 사용해야만 참여 가능한 세션은 중단한다.
- 동의 내용을 이해하기 어렵거나 녹화 거부를 이유로 필수 참여 자체가 불가능한 설계는 모집하지 않고 프로토콜을 수정한다.

### 9.4 동의 script의 필수 내용

진행자는 세션 전에 다음을 쉬운 한국어로 읽고 문서 또는 접근 가능한 대체 형식으로 제공한다.

> 우리는 시스템을 평가하며 참여자를 평가하지 않습니다. 참여는 자발적이고 언제든 이유 없이 중단하거나 질문을 건너뛸 수 있습니다. 실제 비밀번호·주민번호·전화번호·업무 내용은 입력하거나 말하지 마십시오. 녹화는 별도 선택이며 거부해도 참여할 수 있습니다. 수집 항목, 이용 목적, 보존기간, 삭제 요청 방법을 설명한 뒤 각각 동의를 확인하겠습니다.

필수 동의 범위는 참여, 익명화된 관찰 메모다. 선택 동의는 음성, 화면, 얼굴, 직접 인용, 후속 연락을 각각 분리한다. 보상은 중도 중단 여부와 무관하게 약정한 기준을 적용한다.

### 9.5 최소 수집과 제안 보존기간

아래 기간은 **초안 기본값**이며 security/privacy owner가 G0 전에 승인하거나 더 짧게 조정해야 한다.

| 데이터 | 최소 내용 | 저장 위치/접근 | 제안 보존 | 삭제 |
|---|---|---|---|---|
| 모집·연락 | 연락 수단, segment 적합 여부, accommodation | 연구 운영 전용, 결과와 분리 | 세션·보상 종료 후 30일 | 자동 삭제 + 확인 로그 |
| consent | participant ID, 동의 범위·시각·버전 | 제한된 연구 저장소 | 법적 최소기간을 owner가 확정; 미확정 시 신규 모집 금지 | 철회 가능한 범위를 안내하고 처리 기록 |
| 원본 녹화 | 선택 동의한 음성/화면만, 얼굴은 기본 off | 최소 인원만 접근, 암호화 | 해당 round readout 확정 후 30일 이내 | secure delete, 백업 만료 확인 |
| redacted transcript/notes | 가명 ID, task 관찰, 개인정보 제거 | 연구팀 | 최종 G1 결정 후 90일 | 삭제 검토 후 aggregate만 보존 |
| aggregate finding | 비식별 패턴, 근거 수, 결정·예외 | 제품 문서/decision artifact | 제품 결정 수명 동안 | 재식별 위험 재검토 |
| 연구 analytics | study/session 난수 ID, allowlist event | 격리 연구 환경 | round 종료 후 30일 | 원시 event 삭제, 집계만 보존 |

삭제 요청은 접수 후 7일 이내 처리하는 초안을 권장한다. 법적·계약상 다른 기간이 필요하면 목적·권위·예외·담당자를 승인 기록에 남긴다. Git, issue, 일반 analytics, 채팅에 원본 녹화나 개인정보를 넣지 않는다.

## 10. 정확한 연구 task script

### 10.1 공통 운영 규칙

각 task는 시작 전에 [capability manifest](../../config/ui-route-capabilities.json)에서 대상 route, actor scope, data source, supported action을 재확인한다. `demo`, `partial`, `unavailable`, `unverified`인 action을 live 과업으로 가장하지 않는다. 검증되지 않은 기능은 명시적으로 labelled prototype에서만 평가하고 결과를 `concept evidence`로 분리한다.

- 격리된 연구 환경과 synthetic account/data만 사용한다.
- 시작 화면은 업무상 자연스러운 진입점으로 고정하되 참가자 prompt에 메뉴 경로를 알려주지 않는다.
- 성공은 toast나 화면 이동만이 아니라 authoritative readback과 올바른 actor 결과로 확인한다.
- 진행자는 사전에 정의한 중단 조건 외에는 해결법을 알려주지 않는다. 도움을 주면 시각·내용을 기록하고 `assisted`로 분류한다.
- PII, secret, 권한 오부여, 삭제 위험이 발생하면 즉시 task를 중단하고 데이터·계정을 초기화한다.

### 10.2 T-LOGIN — 로그인·세션 회복

| 항목 | Script |
|---|---|
| 대상 | 모든 end-user 역할; keyboard·화면낭독기 조건 포함 |
| 준비 | 역할별 synthetic 계정, 잘못된 암호 1회 시나리오, 만료 가능한 연구 세션, 작성 중인 비민감 draft |
| 시작 상태 | `/login`, 로그아웃 상태 |
| 참여자 prompt | “제공된 연구용 계정으로 로그인해 본인의 업무 시작점을 찾으십시오. 첫 입력은 일부러 잘못된 암호를 사용하고, 오류를 이해한 뒤 올바른 정보로 다시 시도하십시오.” |
| 후속 prompt | 로그인 후 비민감 draft를 입력하는 중 세션 만료를 주입한다. “작업을 잃지 않는다고 판단되는 방법으로 다시 인증하고 계속하십시오.” |
| 성공 | 오류가 어떤 필드/조치와 관련되는지 이해함; 올바른 역할 시작점 도달; 재인증 뒤 draft와 focus 맥락 보존; 비밀번호 전용 입력을 URL query field/state로 설계·직렬화하지 않고 화면 녹화 메모·analytics에 복제하지 않음 |
| 관찰 | label/오류 발화, password manager 허용, keyboard focus, 중복 제출, redirect 이해, 세션 만료 안내·회복 |
| 중단 | 실제 자격증명 사용, token 노출, 계정 잠금 위험, 무한 redirect |

### 10.3 T-USER — 사용자·권한 관리

| 항목 | Script |
|---|---|
| 대상 | 사용자 관리자; 일반 사용자 검증 계정은 별도 관찰자 또는 자동 readback |
| 준비 | 이름이 유사한 synthetic 사용자 2명, 변경 전 권한 snapshot, 되돌릴 수 있는 연구 tenant |
| 시작 상태 | 관리자 home. 경로는 prompt에 제공하지 않는다. |
| 참여자 prompt | “`연구사용자-02`를 찾아 현재 상태와 역할을 확인하십시오. 이 사용자가 게시판 관리가 아닌 일반 참여만 할 수 있도록 변경하고, 변경이 실제로 적용됐는지 확인하십시오.” |
| 변형 | 잘못된 동명이인 선택 경고, 서버 validation 실패, 동시 변경 충돌 중 하나를 round별로 주입 |
| 성공 | 올바른 사용자 식별; 변경 영향과 대상 확인; 중복 mutation 없이 저장; 관리자 readback과 해당 사용자 재로그인 결과가 일치; 필요 시 원래 권한으로 rollback |
| 관찰 | 검색 기준, 민감정보 최소 표시, 권한 이름 이해, confirmation, pending/실패/성공, audit evidence, undo/rollback |
| 중단 | 실제 계정 변경, 관리자 자신/연구 진행자 잠금, 예상 밖 권한 확대, 개인정보 노출 |

### 10.4 T-BOARD — 게시판·댓글 cross-role

이 task는 실제 대상 제품에서 게시판이 top task로 확인되고 해당 capability가 `partial` 이상으로 검증될 때 사용한다.

| 단계 | Actor와 participant prompt | 성공 확인 |
|---|---|---|
| 1 게시 | 콘텐츠 담당: “이번 주 점검 안내를 지정된 게시판에 게시하되 연락처 같은 개인정보는 넣지 마십시오. 일반 사용자가 볼 수 있는지 확인하십시오.” | 생성된 server ID/readback, 올바른 게시판·공개 범위 |
| 2 탐색·댓글 | 일반 사용자: “새 점검 안내를 찾고, 제시된 synthetic 질문을 댓글로 남기십시오. 등록 결과를 확인하십시오.” | 정확한 글 탐색, 댓글 readback, keyboard/SR action 가능 |
| 3 처리 | 콘텐츠 담당: “사용자의 질문을 확인하고 답변한 뒤, 어느 상태에서 처리가 끝났다고 판단하는지 말해 주십시오.” | cross-role 댓글 일치, 상태·알림 이해, 중복 없음 |
| 4 권한 반례 | 권한 없는 계정으로 관리 action을 시도하지 말고 “할 수 있는 범위”를 설명하게 한다. | UI와 서버 권한이 일치하고 dead/forbidden action이 실제 기능처럼 보이지 않음 |

### 10.5 T-SURVEY — 설문 cross-role 대체안

게시판 대신 설문이 top task로 확인되면 다음을 사용한다. 같은 round에서 두 cross-role 후보를 모두 강제하지 않는다.

| 단계 | Actor와 participant prompt | 성공 확인 |
|---|---|---|
| 1 생성/공개 | 설문 관리자: “합의된 synthetic 3문항 설문을 만들고 대상 사용자가 응답 가능한 상태로 전환하십시오.” | 문항·순서·공개 범위 authoritative readback |
| 2 응답 | 일반 사용자: “설문을 찾아 두 문항에 응답하고 한 문항은 처음 비워 둔 뒤 안내에 따라 제출하십시오.” | validation 이해, 중복 제출 방지, 성공 확인 |
| 3 결과 | 관리자와 응답자 각각: “현재 볼 수 있는 결과와 볼 수 없어야 하는 정보를 설명하십시오.” | 역할별 공개 범위, aggregate/individual 응답 구분, 민감정보 미노출 |
| 4 실패 회복 | 제출 직전 네트워크 실패를 주입한다. | 입력 보존, 재시도 의미, 중복 응답 여부를 사용자가 이해 |

### 10.6 T-LOG — 로그·개인정보 조회

| 항목 | Script |
|---|---|
| 대상 | 감사·개인정보 담당 또는 권한 있는 관리자 |
| 준비 | synthetic actor가 특정 시각에 수행한 성공·실패 사건, 유사 사건 5개 이상, export는 capability가 검증된 경우에만 활성화 |
| 시작 상태 | 관리자 home |
| 참여자 prompt | “연구사용자의 오늘 실패 사건을 찾아 사건 종류, 시각, 결과를 확인하십시오. 업무에 필요한 최소 정보만 사용하고 어떤 값을 URL·다운로드에 남겨도 되는지 설명하십시오.” |
| 변형 | 부분 API 실패, filtered-zero, 권한 없음 상태를 서로 다른 round에서 제시 |
| 성공 | 올바른 사건 식별; empty와 error 구분; 로그 주소창 검색어를 로컬 상태로 유지하는 현행과 허용이 의무가 아닌 이유를 이해; 허용 검색어가 client log·analytics에 복제되지 않음; 앱이 자격증명·token·고유식별정보·고위험 개인정보·응답 본문을 위한 전용 URL field/state를 제공하거나 일반 검색창에서 입력을 요구·유도하지 않음; 자유 입력창의 예상 밖 붙여넣기는 accepted residual risk이며 고위험 용도 승인이 아니고 credential-name gate는 key 차단이지 DLP가 아님; 상세 접근과 export가 역할 범위와 일치 |
| 관찰 | filter mental model, 시간대, redaction, row/detail 관계, focus, download 이름·내용, 재인증 필요성 |
| 중단 | 실운영 로그 접근, 원본 IP·토큰·주민번호·실명 노출, 승인되지 않은 export |

### 10.7 T-PROFILE — 재사용 profile 생성

| 항목 | Script |
|---|---|
| 대상 | framework adopter 구현/운영 담당 |
| 준비 | 격리된 clean clone, 정확한 `v*` release tag, Docker/PostgreSQL, synthetic 설정, 별도 작업 디렉터리. 운영/공유 DB 사용 금지 |
| 참여자 prompt | “인증·사용자·조직·권한에 더해 게시판·댓글·알림이 필요하고 demo 업무 기능은 제외하는 신규 프로젝트 base를 선택해 생성하십시오. 산출물이 배포 후보인지 검증하고 근거를 설명하십시오.” |
| 기대 선택 | `collaboration`. 진행자는 선택명을 먼저 알려주지 않는다. |
| 공식 명령 | `npm run base:census` → `npm run base:generate-db -- --profile collaboration` → 출력된 경로로 `npm run base:generate-source -- --profile collaboration --db-bundle build/reusable-base/collaboration-<sha>-<timestamp>` |
| 산출물 검증 | 생성 디렉터리에서 `npm run test:base-profile`, `./gradlew compileJava compileTestJava`, `./gradlew :api-server:harnessTest :api-server:schemaValidationTest`, `pnpm -C frontend install --frozen-lockfile`, `pnpm -C frontend exec tsc --noEmit` |
| 성공 | 올바른 profile 선택 이유 설명; dirty/non-release 제한을 우회하지 않음; 생성 DB가 일회용임을 이해; lock과 gate 결과 확인; `demo` 제외와 필요한 collaboration 기능 포함을 설명 |
| 실패/중단 | 운영 DB 대상, `--allow-dirty`/`--allow-non-release-ref` 산출물을 공식 release로 오인, gate red 무시, 장기 template branch를 정본으로 사용 |

Windows 참가자는 `./gradlew` 대신 `.\gradlew.bat`을 사용한다. 생성기의 실제 최신 명령과 선행 조건은 [재사용 Base 생성 가이드](../03-guides/reusable-base-guide.md)를 세션 직전에 다시 확인한다.

## 11. Metrics dictionary와 baseline 비교

### 11.1 핵심 UX metric

| Metric | 정의/계산 | 수집 방법 | 해석 제한 |
|---|---|---|---|
| `unassisted_task_success` | moderator 도움 없이 authoritative end state에 도달한 eligible attempt / 전체 eligible attempt | 관찰 + server/readback | 화면 이동·toast만으로 성공 처리하지 않음 |
| `assisted_success` | 사전 정의된 assist 후 완료한 attempt | assist 시각·내용 기록 | unassisted와 합쳐 성공률을 부풀리지 않음 |
| `task_abandonment` | 참여자가 중단하거나 안전 timebox 후 완료하지 못한 attempt | 중단 이유 분류 | 접근성 accommodation 시간은 자동 실패가 아님 |
| `critical_error` | 권한 오부여, 데이터 손실/중복, 개인정보 노출, 잘못된 대상의 파괴적 변경 | 관찰·server evidence | 작은 UI 실수와 분리, 1건도 go/no-go에 영향 |
| `time_on_task` | prompt 종료부터 authoritative 완료까지, 시스템/진행자 pause 제외 | monotonic timer, pause log | 역할·AT·task별로 분리; 작은 n에서 평균만 제시하지 않음 |
| `assist_count` | moderator가 해결 정보 또는 경로를 제공한 횟수 | 세션 log | clarification과 assist를 구분 |
| `recovery_success` | 주입된 recoverable failure 중 입력/맥락을 잃지 않고 완료한 수 / 해당 failure attempt | 오류 task 관찰 | 오류가 실제 주입됐는지 확인 |
| `navigation_reversal` | 잘못된 top-level 목적지에서 되돌아온 횟수 | 관찰 또는 최소 연구 event | 많다고 반드시 실패는 아니므로 발화와 함께 해석 |
| `SEQ` | task 직후 “이 과업은 얼마나 쉬웠습니까?” 1~7 단일 문항 | 참여자 응답 | 번역 문구와 scale 고정; 통계적 대표성 주장 금지 |
| `state_comprehension` | 현재 상태·다음 action 질문에 정확히 답한 참여자 원시 수 | 사전 coding rubric | 유도 질문 금지 |
| `a11y_blocker` | 선택 AT/input 조건에서 핵심 task 완료를 막는 문제 수 | 실제 사용자 + 수동 평가 | axe 0건과 동치 아님 |
| `profile_artifact_success` | adopter가 올바른 profile 산출물과 필수 gate를 완료·판정했는지 | terminal artifact/readback | 명령 실행만 하고 red를 무시하면 실패 |

### 11.2 보조 engineering/신뢰 guardrail

- route/capability별 지원 action 진실성: 실제 지원하지 않는 visible action 수.
- error가 empty로 보인 횟수, 기존 유효 데이터 또는 작성 입력이 사라진 횟수.
- keyboard focus 손실, overlay 복귀 실패, 예상하지 않은 양방향 scroll.
- 대상 route의 LCP/CLS/상호작용 지연, 전송 JS는 같은 환경에서 보조 진단으로만 비교한다.
- 자동 axe 결과는 수동 keyboard·screen reader·reflow·forced colors 평가의 대체 지표가 아니다.

### 11.3 Baseline/after 비교 protocol

1. 비교 대상 build의 commit SHA, profile, browser/OS, viewport, color mode, input/AT, network 조건을 고정해 기록한다.
2. 같은 role, 같은 task intent, 동등한 난이도의 synthetic data를 사용한다. 데이터 개수·이름 유사도·권한·주입 오류가 다르면 비교 불가로 표시한다.
3. 현행 UI baseline을 먼저 수집한다. baseline을 실행할 수 없으면 after-only 결과로 보고하고 “개선”이라는 표현을 쓰지 않는다.
4. 같은 참여자가 두 UI를 쓰면 순서를 counterbalance하고 다른 synthetic content를 사용한다. 학습 효과와 carryover를 기록한다.
5. 역할·AT별 원시 분자/분모, median time, range, critical incident를 제시한다. 전체 평균 하나로 합치지 않는다.
6. `Δ success = after% - baseline%`, `time ratio = after median / baseline median`, `Δ SEQ = after median - baseline median`을 계산하되 n≈5에서는 방향성 guardrail로만 사용한다.
7. 중도 중단, 시스템 장애, 잘못된 seed, 진행자 개입은 사전 코드로 제외/포함 사유를 남긴다. 불리한 결과를 사후 제외하지 않는다.
8. 정성 finding은 관찰 참여자 수, 반례, 직접 인용의 redaction 상태를 함께 기록한다.

## 12. 성공·중단·rollback 기준

아래 수치는 baseline 전에 제품 성과를 확정한 값이 아니라 **파일럿 안전 guardrail 초안**이다. G1에서 역할별 baseline과 실패 비용을 검토해 승인·조정하고, 변경 이유와 승인자를 남긴다.

| 축 | Go 후보 기준 | 중단/rollback 기준 |
|---|---|---|
| 보안·개인정보·데이터 무결성 | critical incident 0 | 권한 확대, 잘못된 대상 mutation, 데이터 손실/중복, secret/PII 노출 1건이라도 재현되면 즉시 중단 |
| 핵심 task 성공 | 최종 round의 각 주요 role/task에서 약 5명 중 최소 4명 unassisted 성공이며 baseline보다 낮지 않음 | baseline 대비 2명 이상 또는 20%p 이상 하락; 1명 하락은 자동 go가 아니라 원인 review |
| 오류 회복 | recoverable failure에서 약 5명 중 최소 4명이 입력·맥락을 보존해 완료 | 오류가 empty/success로 오인되거나 완료 mutation이 중복되면 중단 |
| 완료 시간 | median이 baseline의 1.15배 이내이거나 안전성 향상과 함께 제품 소유자가 예외 승인 | 1.25배 초과 악화가 반복되고 안전성·정확성 이익으로 설명되지 않으면 rollback 후보 |
| 인지 난이도 | SEQ median이 baseline보다 낮지 않고, 상태 이해 오답이 감소 또는 동일 | SEQ median 1점 이상 하락 또는 핵심 상태를 절반 이상이 오해하면 재설계 |
| 접근성 | 선택한 role×task×AT 조합 모두 blocker 없이 완료; 새 WCAG 2.2 A/AA blocker 0 | keyboard/SR/reflow/forced-colors에서 핵심 action 불가, focus 손실로 파괴 action 오작동 시 중단 |
| 기능 진실성 | active exposure의 demo/partial/unavailable 상태와 지원 action이 명시됨 | dead action, 무출처 운영 수치, demo를 live로 오인시키는 표현이 핵심 task에 남으면 no-go |
| 운영 안정성 | candidate cohort에서 오류율·성능이 승인된 baseline guardrail 내 | 5xx/JS error 급증, rollback 경로 불능, 지원팀이 처리할 수 없는 신규 failure mode 발생 |

threshold 경계에 걸린 결과를 평균으로 상쇄하지 않는다. security/privacy/accessibility blocker는 빠른 task가 보상할 수 없다. rollback은 이전 UI/route를 복구하는 것뿐 아니라 exposure를 숨기거나 기능을 `unavailable`로 정직하게 되돌리는 선택도 포함한다.

## 13. 접근성 및 assistive technology protocol

### 13.1 지원 범위 결정 전 원칙

- 공통 목표는 WCAG 2.2 A·AA이며 공공 profile은 승인된 KWCAG 2.2/KRDS 매핑을 추가한다.
- 실제 지원 browser/OS/AT 조합은 현재 미측정이다. G0에서 target population과 지원 정책을 정하기 전 임의로 “지원 완료”를 선언하지 않는다.
- AT 사용자를 각 연구 role 안에 포함하며 비장애 연구자가 screen reader를 켜 본 결과만으로 사용자 증거를 대체하지 않는다.
- 세션 시간, think-aloud 방식, remote tool, 문서 형식, 휴식, 보조인 동반을 참여자 필요에 맞춘다.

### 13.2 최소 평가 후보 matrix

| 조건 | 확인할 계약 | 상태 |
|---|---|---|
| keyboard-only | skip, focus 순서/가시성/비가림, overlay trap·Escape·focus return, 모든 action parity | 대상 role/task 미확정 |
| Windows screen reader | heading/landmark, name/role/state, table·form error, live status, route 전환 | NVDA/JAWS 등 실제 사용 조합 조사 필요 |
| mobile screen reader | touch exploration, reading order, modal·menu, virtual keyboard | VoiceOver/TalkBack 사용 분포 미측정 |
| zoom/reflow | 200%·400%, 320 CSS px 상당, 긴 한국어/URL, action 보존, 양방향 scroll 방지 | 지원 browser 미확정 |
| forced colors/high contrast | 텍스트·UI·focus·selected/disabled 구분 | 실제 사용/OS 미측정 |
| reduced motion | 비필수 모션 제거, 상태 피드백 보존 | 실제 선호 분포 미측정 |
| speech/switch/alternative input | accessible name과 visible label 일치, target 크기, 순차 조작 | 모집 가능성과 제품 범위 확인 필요 |

각 issue에는 표준 성공기준, route, role, state, profile×mode, viewport, AT/version, 재현 단계, 증거, 사용자 영향, owner를 기록한다. 자동 검사 결과에는 실행 날짜·범위·비활성 rule을 함께 적는다.

## 14. 최소 analytics event 정책

### 14.1 기본 원칙

- 사용자 연구는 moderated observation을 기본으로 하며 production analytics는 필수 선행 조건이 아니다.
- 외부 analytics/RUM 도입은 별도 개인정보·보안·조달 승인을 받기 전 금지한다.
- 이벤트는 개별 직원을 감시하거나 성과 평가하는 용도로 사용하지 않는다.
- 연구 환경에서도 user ID, 이름, 이메일, IP, 조직, 자유 검색어, form 값, 콘텐츠, URL query, record ID, token/cookie를 수집하지 않는다.
- client log에 민감 값을 쓰지 않고, 연구 session ID는 round 종료 후 재연결할 수 없는 난수로 만든다.

### 14.2 연구용 allowlist 후보

| Event | 최소 payload | 목적 |
|---|---|---|
| `ux_task_started` | study ID, task ID, build SHA, coarse role, profile, viewport/input bucket | eligible attempt 분모 |
| `ux_task_completed` | task ID, success kind(`unassisted|assisted`), duration bucket, error category | task 결과 |
| `ux_task_abandoned` | task ID, coarse reason code | 중단 원인 |
| `ux_error_presented` | task ID, approved error taxonomy, recoverable 여부 | error/empty 진실성 |
| `ux_recovery_attempted` | task ID, recovery kind, outcome | 회복 가능성 |
| `ux_navigation_choice` | task ID, destination capability ID, ordinal step | IA/findability; raw URL/query 금지 |

정확한 timestamp가 필요하면 연구 recorder가 보유하고 event payload에는 불필요한 세밀도를 줄인다. `duration bucket`은 분석 목적이 정확한 time-on-task일 때만 원시 timestamp 대신 사용하며, 원시 event는 round 종료 후 30일 내 삭제하는 초안을 적용한다. allowlist 밖 필드를 받으면 ingest 단계에서 거부하고 red test를 둔다.

## 15. 연구 artifact와 redaction template

### 15.1 Session record

```yaml
studyId: UX-<wave>-<round>
protocolVersion: <document revision>
buildSha: <exact commit>
participantId: P-<random>
segment: <A1|A2|E1|E2|E3|E4>
actualRoleContext: <redacted description>
consent:
  notes: true
  audio: true|false
  screen: true|false
  quote: true|false
environment:
  profile: <core|collaboration|demo|derived>
  browserOs: <approved coarse value>
  viewport: <bucket>
  inputAt: <participant-described, minimum necessary>
tasks:
  - taskId: <ID>
    outcome: unassisted|assisted|abandoned|invalid-attempt
    startEnd: <research store only>
    assists: []
    errors: []
    authoritativeReadback: pass|fail|not-applicable
    seq: <1..7 or declined>
    observation: <redacted fact>
    interpretation: <separate hypothesis>
deviations: []
privacyIncidents: []
retention:
  rawDeleteBy: <date>
  notesDeleteBy: <date>
reviewer: <role/name>
```

### 15.2 Finding record

```yaml
findingId: UXF-<wave>-<number>
statement: <observable problem, not inferred motive>
affected:
  roles: []
  tasks: []
  routeCapabilities: []
evidence:
  participantCount: <n/N>
  sessionIds: []
  counterEvidence: <present|none-observed>
severity: P0|P1|P2|P3
impact: <task/privacy/accessibility/trust>
hypothesis: <why it may occur>
recommendation: <testable change>
owner: <named role/person>
reviewBy: <date>
decision: open|accepted|rejected|deferred
redactionReviewedBy: <privacy reviewer>
```

### 15.3 Redaction checklist

- 이름, 이메일, 전화번호, 주소, 사번, 조직·기관 식별자, 계정명은 가명 또는 역할로 바꾼다.
- token, cookie, password, secret, connection string은 기록하지 않고 발견 시 원본을 즉시 격리·삭제한다.
- 자유 입력·게시글·설문 응답·로그 payload는 원문을 복사하지 않고 필요한 interaction 특성만 요약한다.
- 직접 인용은 선택 동의가 있고 재식별 정보가 제거된 짧은 구절만 사용한다.
- screenshot/video는 필요한 영역만 crop 또는 mask하고 browser chrome, 알림, 다른 창을 제거한다.
- redaction 전 artifact를 Git, issue, PR, 일반 메신저에 올리지 않는다.
- 결과 공유 전 두 번째 reviewer가 redaction과 participant count를 확인한다.

## 16. 사용자 연구가 불가능할 때의 fallback

실제 adopter/end-user 접근이 불가능하면 UX, domain, accessibility/security 관점의 독립 reviewer가 cognitive walkthrough와 heuristic review를 수행할 수 있다. 각 reviewer는 다음을 기록한다.

1. 역할·task·시작 상태와 성공 상태.
2. 사용자가 올바른 action을 발견할 가능성, action과 목표의 연결, 시스템 feedback 이해, 오류 회복 가능성.
3. keyboard/SR/reflow/forced-colors 상태와 개인정보·권한 경계.
4. 코드·DOM·실행 증거와 반례, reviewer 간 불일치.

이 산출물의 evidence type은 `expert-walkthrough`다. 다음 표현은 금지한다.

- “사용자가 선호했다.”
- “사용성 검증 완료.”
- “task frequency가 확인됐다.”
- “접근성 준수.”

Fallback은 명백한 결함 수정과 연구 준비에는 사용할 수 있지만, 실제 사용자 성과 baseline이나 top-task 우선순위를 확정하지 못한다. 실제 연구 없이 파일럿을 진행하려면 제품 소유자가 제한 범위·가설·rollback·재연구 조건을 명시적으로 승인해야 하며 G1 기록에는 `user-validation: unavailable`을 남긴다.

## 17. Open inputs, owner, reviewBy

| ID | 필요한 입력/결정 | 상태 | Owner | reviewBy | 차단 범위 |
|---|---|---|---|---|---|
| OI-01 | 제품 소유자와 최종 승인자 실명/연락 채널 | `blocked-input` | repository/사업 책임자가 지정 | 미정—G0 일정 확정 전 | G0·G1·go/no-go 전체 |
| OI-02 | 대상이 공통 reference인지 특정 기관/파생 제품인지 | `blocked-input` | 제품 소유자 | 미정—G0 전 | 사용자·profile·표준 범위 |
| OI-03 | adopter/end-user 모집 접근과 보상 예산 | `blocked-input` | 제품 소유자 + UX lead | 미정—모집 전 | 사용자 연구·baseline |
| OI-04 | 실제 역할·최근 task 빈도·지원 문의 또는 업무 절차 자료 | `blocked-input` | domain owner + 대상 기관 | 미정—R1 종료 전 | top-task 우선순위 |
| OI-05 | target profile과 demo/partial 노출 정책 | `open` | 제품 소유자 + framework owner | 미정—G0 전 | 파일럿 route 선정 |
| OI-06 | ADR-0007 reference-default 안의 exact label/group/order/visibility와 route별 disposition; 기관 채택 시 목표 IA 재검증 | `open` (범위 축소) — reference-default 방향은 승인됨. disposition은 owner PR review로 route별 개별 승인하며 기관별 실사용자·실메뉴·실권한 G1은 채택 시 수행 | IA/product owner | route별 소비 전; 기관 채택 G1 전 | 미승인 route의 menu/generator 소비와 기관별 대규모 navigation 변경 |
| OI-07 | 개인정보성 업무 검색어의 URL allowlist와 민감도 | `closed` — 2026-09-05 [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md). 로그 주소창은 현행 로컬 상태 유지; 새 route/key·파생 제품 확대는 별도 결정 | repository owner + security/privacy + frontend architecture | 2026-09-05 | 공통 base 정책 차단 해소 |
| OI-08 | 적용 WCAG/KWCAG/KRDS 버전·claim과 기관 식별 자격 | `blocked-input` | accessibility + 제품/기관 owner | 미정—G0 전 | profile·준수 표현 |
| OI-09 | 실제 지원 device/browser/AT matrix와 accommodation | `blocked-input` | accessibility owner + 대상 기관 IT | 미정—모집 전 | AT 표본·파일럿 gate |
| OI-10 | consent, 녹화, 보존기간, 삭제 요청 채널 | `blocked-input` | privacy/security owner | 미정—첫 모집 전 | 모든 연구 데이터 수집 |
| OI-11 | capability manifest의 미검증 역할·상태·action | `open` | frontend platform + domain owner | manifest의 route별 `reviewBy` | task script 실행 가능성 |
| OI-12 | baseline과 threshold 최종값·예외 승인 규칙 | `blocked-input` | 제품 소유자 + UX lead | 미정—G1 전 | improvement/go/rollback 주장 |
| OI-13 | production analytics 필요성·수집자·보존·접근자 | `blocked-input` | privacy/security + 제품 소유자 | 미정—instrumentation 전 | production analytics 도입 |
| OI-14 | 제한 출시 환경·feature flag·rollback 담당자 | `blocked-input` | release/operations + 제품 소유자 | 미정—pilot 배포 전 | R5·wave 확대 |

`owner` 또는 `reviewBy`가 미정인 행은 완료로 닫지 않는다. 담당자와 날짜가 정해지면 이 문서 또는 연결된 결정 원본을 갱신하며, 과거 세션의 구두 추정을 승인으로 기록하지 않는다.

## 18. 승인과 상태 전이

| 상태 | 조건 | 허용되는 다음 행동 |
|---|---|---|
| `Draft / blocked-input` | 프로토콜은 작성됐지만 owner·대상·연구 승인이 없음 | evidence census, stakeholder 정렬, recruitment 준비 |
| `G0 approved` | §6.1 산출물과 개인정보 연구 승인이 날짜·승인자와 함께 존재 | R1~R3 조사와 제한된 긴급 접근성 수정 |
| `G1 approved` | top-task·IA·상태·baseline·threshold가 승인됨 | design foundation, 파일럿 구현/평가 |
| `Pilot passed` | 역할별 반복 평가와 기술·AT gate가 success 기준 충족 | 작은 journey wave 확대 |
| `Released` | wave/release gate와 운영 handoff·rollback 증거 완결 | 승인 범위 안에서만 개선 완료 표현 |

### 승인 기록

| 항목 | 값 |
|---|---|
| 제품 소유자 승인 | **없음** |
| 연구 프로토콜 Security/privacy 승인 | **없음** — ADR-0009의 제품 URL-state 승인은 별개 |
| Accessibility 범위 승인 | **없음** |
| G0 | **미통과** |
| G1 | **원 정의 미통과** — 2026-08-23 [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md)이 참조-기본 범위로 재정의·승인(사용자 연구 없음 = accepted-risk). 기관 채택 시 원 정의 G1 재수행 의무 |
| 사용자 연구 결과 | **없음** |
| 다음 재개 조건 | OI-01~OI-03, OI-08~OI-10의 owner·입력·날짜 지정 |

이 상태 표는 진행 일지가 아니라 현대화 결정의 증거 경계다. 승인 후에는 승인자·날짜·적용 범위와 연결된 artifact만 기록하고 원시 세션 자료를 이 저장소에 복제하지 않는다.
