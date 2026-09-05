# 프런트엔드 콘텐츠·용어·상태 작성 가이드

- **Status:** Draft — 콘텐츠 소유자 승인 전 `blocked-input`
- **Owner:** content-design — 담당자 미지정
- **Reviewers:** product/UX, domain owner, accessibility, security/privacy — 담당자 미지정
- **Review by:** 2026-10-31
- **Last evidence review:** 2026-08-21
- **URL-state policy review:** 2026-09-05 — [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md)
- **Structured inventory:** [`config/frontend-visible-terms.json`](../../config/frontend-visible-terms.json)

이 문서는 사용자에게 보이는 한국어 문구, action 이름, 상태, 오류, 날짜·시간·수치의 공통 계약이다. 코드 식별자나 API DTO 이름을 바꾸는 규칙이 아니며, 단어를 기계적으로 전역 치환하는 허가도 아니다. 현재는 파일럿 후보 7개 route의 정적 소스 census와 즉시 판정 가능한 진실성 수정만 포함한다. 콘텐츠 소유자 검토, 실제 role별 렌더 결과, 사용자 이해도 연구가 없으므로 전체 화면의 콘텐츠 품질이나 사용자 검증 완료를 주장하지 않는다.

## 1. 규칙의 우선순위와 범위

1. [한국어 우선 ADR](../02-architecture/decisions/ADR-0002-korean-first-frontend.md)은 프런트엔드의 지원 언어를 한국어 하나로 정한다.
2. [프런트엔드 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)은 내부 구현 용어, 출처 없는 수치, 비동작 action을 실제 기능처럼 노출하지 못하게 한다. 개인정보성 업무 검색어의 URL 경계는 [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md)를 따른다.
3. [route capability manifest](../../config/ui-route-capabilities.json)는 route·role·기능 상태의 증거 경계다. 콘텐츠는 `demo`, `partial`, `unavailable`을 `live`처럼 바꿔 말할 수 없다.
4. 이 문서는 사용자 언어와 표현 구조를 소유하고, 도메인 정책·인가·데이터 보존·법률 판단을 대신하지 않는다.

적용 대상은 heading, navigation label, breadcrumb, button/link, form label·hint·validation, toast, dialog, table heading, empty/error/loading/status, metric label, aria accessible name, document title이다. 개발자 주석, 타입·변수·API field 이름은 사용자가 볼 수 없다면 직접 적용 대상이 아니다. 다만 오류 객체나 원시 payload가 toast·DOM·console·analytics로 흘러가면 사용자 및 개인정보 경계에 포함한다.

## 2. 핵심 원칙

### 2.1 과업과 결과부터 말한다

- 화면 제목은 컨테이너 은유가 아니라 `사용자 관리`, `새 게시물 작성`, `설문 결과 확인`처럼 사용자가 하려는 일로 쓴다.
- action은 가능한 한 `동사 + 대상`으로 쓴다. `저장`, `확인`, `처리`만으로 의미가 불분명하면 `변경사항 저장`, `사용자 삭제`, `검색 조건 초기화`로 구체화한다.
- 성공 문구는 실제 authoritative response/readback 뒤에만 표시하고 완료한 대상과 작업을 밝힌다.
- 위험 action은 대상, 결과, 되돌릴 수 있는지 여부를 확인 dialog와 결과 상태에서 일관되게 말한다.

### 2.2 시스템 은유와 과장된 상태를 제거한다

`Hub`, `Intelligence`, `Matrix`, `Node`, `Stream`, `Protocol`, `Core`, `Architecture`는 구현팀에게 익숙해도 사용자의 과업을 설명하지 못한다. 실제 도메인 명사인 `알림 목록`, `사용자`, `게시물`, `검색 결과`, `보안 설정`으로 바꾼다. adopter 전용 기술 문서나 실제 네트워크 topology처럼 용어가 도메인 개념인 경우에는 대상 독자와 의미를 명시해 예외 검토한다.

`ACTIVE`, `SAFE`, `HIGH`, `99.9%`, `정상`, `최적`은 출처·측정 시각·범위·실패 의미가 없으면 상태가 아니다. authoritative source가 없다면 수치를 제거하고 `상태 미확인`, `데이터 원천 미연결`, `정적 예시`처럼 증거 경계를 말한다. 0도 미측정이나 조회 실패를 대신할 수 없다.

### 2.3 한국어 우선은 영어를 숨기는 작업이 아니다

- 장식용 영어 부제, 대문자 status, 이중 번역을 제거한다.
- `ID`, `IP`, `URL`, `API`, `CSV`, `CPU`처럼 역할에 필요한 표준 약어는 첫 사용 설명, audience, 접근 가능한 이름을 검토한다.
- 제품명·기관명·법정 명칭은 번역하지 않을 수 있지만 제품 소유자 또는 기관 owner가 표기를 승인해야 한다.
- 코드값이나 저장 형식은 사용자가 입력·판단해야 할 때만 설명하고, 내부 field 이름을 label로 그대로 노출하지 않는다.
- 미래 다국어는 ADR-0002의 재도입 조건을 모두 충족하는 별도 제품 기능이다.

### 2.4 쉬운 한국어와 접근 가능한 이름을 함께 설계한다

- 한 문장에는 한 가지 주요 행동 또는 상태를 둔다. 불필요한 명사화와 존칭을 줄이고 같은 역할 안에서 종결형을 통일한다.
- visible label과 accessible name의 핵심 단어를 일치시킨다. 음성 입력 사용자가 화면의 말을 그대로 말해 작동할 수 있어야 한다.
- 색, icon, 위치만으로 상태를 전달하지 않는다. screen reader가 이름·상태·오류·진행 변화를 들을 수 있게 semantic element와 live region을 사용한다.
- placeholder는 label이나 지속되는 도움말을 대신하지 않는다.
- 긴 한국어, 사용자 입력, URL, 코드가 확대·reflow에서 action을 밀어내지 않도록 실제 최대 fixture로 확인한다.

## 3. Action label 계약

| 상황 | 권장 구조 | 예 | 금지/주의 |
|---|---|---|---|
| 이동 | 목적지 또는 `대상 보기` | `알림 목록 보기`, `사용자 상세 보기` | `이동`, `GO` |
| 생성 | `대상 추가/등록/작성` | `사용자 추가`, `게시물 등록` | 생성과 게시·발행 의미 혼합 |
| 수정 | `변경사항 저장` 또는 구체 속성 | `권한 변경사항 저장` | `처리`, `적용`만 사용 |
| 검색 | `대상 검색`, reset은 별도 | `사용자 검색`, `검색 조건 초기화` | placeholder만으로 검색 범위 설명 |
| 삭제 | 대상 명시 | `선택한 사용자 삭제` | `정리`, 대상 없는 `삭제` |
| 대기 | 같은 대상 + `중…` | `게시물 등록 중…` | 서버 확인 전 `완료`, `성공` |
| 미지원 | disabled + 이유 또는 제거 | `예약 기능은 아직 연결되지 않았습니다.` | enabled dead button, cursor-only card |

아이콘만 있는 버튼은 한국어 accessible name과 44×44 CSS px 이상의 기본 target을 우선한다. tooltip은 보조 설명이지 이름의 유일한 원천이 아니다. 한 action에 `등록`, `게시`, `배포`, `동기화`를 섞지 말고 실제 backend contract에 맞는 동사 하나를 선택한다.

## 4. 상태 모델

상태는 모양이 아니라 사용자에게 필요한 사실과 다음 행동의 조합이다. 다음 상태를 서로 합치지 않는다.

| 상태 | 반드시 말할 내용 | 기본 예 | 잘못된 축약 |
|---|---|---|---|
| loading | 무엇을 불러오는지, 진행 중임 | `사용자 목록을 불러오는 중…` | 빈 표, 완료 icon |
| first-use empty | 처음 상태, 생성 action | `아직 등록된 게시물이 없습니다. 새 게시물을 작성할 수 있습니다.` | `결과 없음` |
| filtered-zero | 조건과 초기화 action | `현재 검색 조건에 맞는 사용자가 없습니다.` | `사용자가 없습니다.` |
| permission | 거부된 action, 안전한 다음 행동 | `이 사용자의 권한을 변경할 권한이 없습니다.` | empty/404 위장 |
| unavailable | 미지원 범위, 대체 행동 | `예약 발송은 현재 지원하지 않습니다.` | enabled button, `준비 중`만 표시 |
| demo | 예시/로컬 범위, 저장·전송 여부 | `로컬 미리보기 데모입니다. 실제로 전송하지 않습니다.` | 운영 화면처럼 보이는 고정 수치 |
| partial failure | 성공/실패 범위, 기존 데이터, 재시도 | `목록은 표시했지만 부서 정보를 불러오지 못했습니다.` | 전체 성공 또는 전체 empty |
| offline | 네트워크, 저장 여부, 재시도 | `연결이 끊겼습니다. 입력 내용은 이 화면에 유지됩니다.` | 서버 오류와 혼합 |
| validation | field, 수정 조건, 입력 유지 | `종료일은 시작일 이후여야 합니다.` | `잘못된 요청` |
| server error | 실패 task, 유지 상태, next action | `게시물을 등록하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.` | 오류 객체 원문, blank table |
| success | 완료 대상과 검증된 결과 | `게시물이 등록되었습니다.` | toast만 성공이고 readback 없음 |
| unsaved | 떠날 때 영향, 선택지 | `저장하지 않은 변경사항이 있습니다.` | 자동 저장으로 오인 |

`config/frontend-visible-terms.json`의 `stateVocabulary`가 machine-readable ID와 최소 정보를 소유한다. 컴포넌트는 모든 상태를 무조건 렌더하는 것이 아니라 적용 가능한 상태를 명시하고, route 시나리오에서 role·data·network 상태별로 확인한다.

## 5. 오류와 회복 문구

오류는 다음 순서로 구성한다.

1. **상태:** 어떤 작업을 완료하지 못했는가.
2. **원인 또는 조건:** 사용자가 고칠 수 있고 공개해도 안전할 때만 말한다.
3. **보존:** 입력·선택·기존 데이터가 유지되는가.
4. **다음 행동:** 다시 시도, 조건 변경, 돌아가기, 문의 중 실제 가능한 행동.
5. **참조 코드:** 운영 지원에 필요하고 개인정보가 아닌 승인된 correlation ID만 선택적으로 표시한다.

예: `게시물을 등록하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.`

다음은 금지한다.

- axios/Java exception, SQL, stack trace, request/response 객체, token, cookie, 개인 데이터 원문 노출.
- 오류를 `데이터가 없습니다` 또는 0건으로 표시.
- 실패 후 form을 초기화하거나 성공 route로 이동.
- `알 수 없는 오류`만 표시하고 가능한 회복 action을 제공하지 않음.
- 같은 mutation을 반복 클릭할 수 있게 두거나 실패 여부가 불명확한 상태에서 자동 재시도.

서버 메시지를 그대로 보여 주지 않는다. 허용된 domain error code를 사용자 문구에 매핑하고, 알 수 없는 오류는 안전한 기본 문구로 수렴한다. 개인정보나 자유 입력은 console·analytics·오류 로그 payload에 기록하지 않는다. URL은 예외적으로 ADR-0009의 화면별 route/query key allowlist에 든 일반 업무 검색어만 허용하며 unknown query를 재전파하지 않고 same-view 변경에 `replace`를 우선한다. 앱은 자격증명·token·고유식별정보·고위험 개인정보·응답 본문을 위한 URL field를 만들거나 일반 검색창에서 입력을 요구·유도하지 않는다. 자유 입력에 예상 밖 값이 들어올 가능성은 내용 기반으로 완전 차단할 수 없는 잔여 위험이며, 이를 다른 화면의 URL 동기화나 고위험 검색 용도의 승인으로 해석하지 않는다.

## 6. 날짜·시간·숫자·단위

- 사용자 표시 날짜는 공유 `ko-KR` formatter를 사용한다. 저장 형식 `yyyyMMdd`를 화면 문구나 placeholder로 노출하지 않는다.
- 시간대가 결과 해석에 영향을 주는 로그·예약·교차 지역 과업은 시간대와 기준 시각을 함께 표시한다. 감사 로그는 상대 시간만으로 표시하지 않는다.
- 수치는 `Intl.NumberFormat('ko-KR')` 또는 공유 formatter를 사용하고 `건`, `명`, `초`, `ms`, `MB`, `%` 등 단위를 붙인다.
- 전체 합계와 현재 페이지 건수를 명시적으로 구분한다. 현재 배열 길이를 `전체`라고 부르지 않는다.
- 조회 실패나 미측정을 0으로 표시하지 않는다. `조회 실패`, `측정값 없음`, `상태 미확인`을 구분한다.
- 백분율에는 분자·분모·기간·데이터 원천이 있어야 하며, 그렇지 않으면 표시하지 않는다.

## 7. 긴 콘텐츠 및 boundary fixture

파일럿은 다음 synthetic fixture를 최소 한 번 렌더한다. 실제 개인정보나 운영 로그를 복사하지 않는다.

| Fixture | 값의 성격 | 검증 |
|---|---|---|
| 긴 한국어 제목 | 공백 포함 100자 경계 | 잘림 표시, 전체 접근 경로, action 보존 |
| 긴 연속 문자열 | 200자 synthetic ASCII | overflow/wrap, table·dialog 폭 |
| URL | 300자 example.invalid 경로와 선택적 allowlisted synthetic 검색 query | 양방향 스크롤 없이 wrap, unknown query·금지 데이터 없음 |
| 사용자 이름 | 짧은 1자/긴 40자 synthetic | avatar fallback, table/card/reflow |
| 오류 | 상태+보존+다음 행동 3문장 | live announcement, focus, 320 CSS px |
| 수치 | 0, 1, 9,999,999와 unknown | locale·단위·scope, unknown≠0 |
| 날짜 | 월/연도 경계와 timezone 경계 | 정렬·표시·저장 변환 일치 |

`example.invalid`, 비실존 ID, 생성된 이름만 사용한다. fixture에 실제 기관명, 이메일, 전화번호, IP, 실제 검색어, 설문 응답, 토큰을 넣지 않는다. URL 검색 계약을 시험할 때만 승인된 key와 synthetic 검색어를 사용한다.

## 8. 구조화 glossary와 census 운영

[`config/frontend-visible-terms.json`](../../config/frontend-visible-terms.json)은 다음을 구분한다.

- `terms`: 단어 자체의 허용/금지보다 audience·근거·대체 표현을 기록한다.
- `stateVocabulary`: 서로 합치면 안 되는 상태와 최소 정보.
- `actionRules`, `formatRules`: action 및 형식 불변조건.
- `pilotCensus`: 정확히 7개 파일럿 후보 route의 static evidence와 open finding.
- `approval`: 콘텐츠·제품 owner 승인과 사용자 검증 여부.

게시글 작성 파일럿의 canonical route는 `/admin/community/boards/insert-board-article`이다. `/admin/community/boards/write`는 별도 병렬 화면이며 raw payload logging과 내부 용어를 선제 수리했더라도 기준선·파일럿 route의 대체 근거로 사용하지 않는다.

정적 regex는 영어 후보와 금지 phrase를 찾는 보조 수단이다. `API`, 코드 샘플, hidden developer identifier, 합법적인 제품명까지 일괄 위반으로 판정하지 않는다. 후보는 실제 route reachability, role, 렌더 여부, 기능 상태를 사람이 대조한다. 반대로 regex에 잡히지 않는 한국어 내부 은유와 과장도 검토 대상이다.

새 finding은 `route`, `source`, 가시 문구, state, user impact, owner, `reviewBy`, proposed copy, 실행 증거를 기록한다. `open`이나 `blocked-input`을 `partial`로 세탁하지 않는다. 콘텐츠 owner가 승인하면 reviewer, 날짜, route/state/role 범위, 비교 screenshot 또는 DOM evidence를 연결한다.

## 9. 파일럿 review checklist

- [ ] 모든 heading과 navigation label이 role의 top task를 설명한다.
- [ ] 영어 장식, 내부 시스템 은유, 출처 없는 상태·수치가 없다.
- [ ] enabled action은 handler, 권한, 서버 완료 경로가 있고 이름이 결과와 일치한다.
- [ ] loading, first-use empty, filtered-zero, permission, unavailable, demo, partial error, server error가 필요한 만큼 구분된다.
- [ ] 오류는 입력/기존 데이터 보존과 가능한 다음 행동을 말한다.
- [ ] label과 accessible name이 일치하고 dynamic status가 발표된다.
- [ ] 날짜·시간대·수치·단위·전체/현재 페이지 scope가 정확하다.
- [ ] 긴 한국어·URL·최대 데이터가 200% text, 400% zoom/320 CSS px에서 action을 가리지 않는다.
- [ ] URL에는 allowlisted synthetic 일반 업무 검색어만 있고 unknown query 또는 자격증명·token·고유식별정보·고위험 개인정보·응답 본문용 전용 field가 없다. 테스트 입력이 그런 값을 흉내 내거나 요구하지 않으며, 허용 검색어도 console·analytics·오류 로그 payload·screenshot artifact에 복제되지 않는다.
- [ ] content owner와 domain owner가 실제 role/state별 화면을 검토했다.

## 10. 승인·완료 경계

현재 완료된 것은 가이드, 구조화 inventory, 7-route 정적 census, canonical 게시글 composer와 설문 composer의 로컬 진실성 수정, 그리고 별도 `/write` 화면의 인접한 개인정보·문구 수리다. 다음은 완료되지 않았다.

- 콘텐츠 소유자와 제품 소유자 지정·승인.
- role별 실제 렌더 및 backend 오류 문구 census.
- 7개 파일럿의 모든 state·viewport·theme·AT 검토.
- 사용자 이해도와 task 성과 검증.
- 전체 route의 visible-string census.

따라서 Task 1.2의 전체 acceptance는 `blocked-input`이다. 현재 산출물은 이후 파일럿을 검사할 내부 계약으로 사용할 수 있지만, `콘텐츠 검토 완료`, `사용자 용어 검증 완료`, `영어 UI 0`을 주장할 수 없다. 승인 전에는 glossary가 product language를 임의로 확정하거나 도메인 용어를 전역 치환해서는 안 된다.

승인 기록에는 content owner, domain owner, reviewer, 날짜, exact route/state/role population, open finding 처분, 사용자 증거 또는 expert-only 한계를 남긴다. 승인된 표현이 route·URL·도메인 의미를 바꾸면 별도 ADR 또는 제품 결정을 먼저 수락한다.
