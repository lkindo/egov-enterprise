# 완성도 후속 보강과 검증 경계

> 이 문서에는 지금도 gap·설정·결정의 근거로 읽히는 절만 둔다. 후속이 끝난 절은 지운다(문서 수명, DEC-OPS-426) — 그때의 실측과 경위는 Git 이력과 결정 보관 원문에 있다.
>
> 적용 범위: 여기 인용한 측정값(행 수·부하·리허설·경고 분류)과 OCI 적용·집계 결과는 이 저장소(원본)의 환경에서 잰 것이다. 재사용 생성물에서도 그 수치는 upstream 기록이며 도입 기관의 실측이 아니다 — 도입 기관은 같은 절차로 자기 환경에서 다시 잰다. 절차·설정·점검 방법을 적은 부분(첨부 정합성 점검의 결과 파일과 지속 볼륨 확인 등)은 도입 뒤에도 그대로 적용한다. 이관 도구 절이 가리키는 도구 설계와 복구 런북은 재사용 생성물에 싣지 않고 독립 이관 제품(`npm run migration:export`)의 `docs/` 에 싣는다.

## 의존성

애플리케이션 의존성과 Gradle 플러그인 classpath는 별도로 검사한다. 루트 `buildscript`
constraints는 Dependency-Check/Boot 플러그인 경로의 전이 패치 하한을 둔다. 애플리케이션 BOM만
바꾸면 이 경로는 보호되지 않는다. 프런트엔드 전이 의존의 패치는 `frontend/package.json`의
`pnpm.overrides`가 둔다. 두 곳 모두 항목별 사유와 제거 조건은 그 파일의 주석이 정본이다.
상위 패키지가 패치 버전을 직접 공급하면 override 제거 후 실제 해석 결과와 감사를 재검증한다.

GitHub 경고는 선언·전이 그래프와 실제 Gradle 해석 결과를 대조한다. 로컬 패치만으로 원격 경고가
닫혔다고 판정하지 않는다. 재현 절차는 [Dependabot 런북](dependabot-alert-census.md)을 따른다.

## 날짜·입력 계약

`foundation/.../core/validation/Ymd.java`의 달력 정규식이 Bean Validation `@Pattern`에서
OpenAPI와 생성 Zod로 전파된다. 일정 2, 행사 3, 설문지 2, 온라인 설문 2, 업무보고·메모보고·
외부인력 각 1개, 총 12필드가 대상이다. 윤년·월별 말일·0000년·공백을 검사하며 선택 날짜의
null/빈 문자열은 보존한다. 일정·행사·설문지·온라인 설문의 종료일은 시작일보다 빠를 수 없다.
행사 정원은 음수가 될 수 없고, 온라인 설문의 폐기 여부는 Y/N이다.

기존 조회 응답과 쓰기 입력의 차이는 `EventInfoRequest`, `OnlinePollManageRequest`로 표현한다.
조회 데이터가 과거 입력 기준을 따르더라도 관리자가 읽고 보정할 수 있어야 한다.
2026-09-10 OCI 읽기 전용 집계에서 다음 데이터 보정 필요성을 확인했다.

| 대상 | 실측 | 보정 조건 |
|---|---|---|
| `tb_onln_poll_manage` | 3행의 시작일·종료일 모두 길이 8의 `YYYY-MM-` 형태, 숫자 8자리 아님(2026-09-30 재집계도 3행) | 원래 일자를 확인해 수정 화면에서 재입력. 빠진 일을 추정하지 않는다. |
| `tb_event_info` | 107행 중 이름이 null 또는 공백인 행 24개. 2026-09-30 재집계는 25행·공백 0으로 보정 대상이 남아 있지 않다. | 이후 쓰기는 공백 이름을 거부한다. |

이 작업은 OCI 값을 변경하지 않았다. 나머지 대상 날짜의 형식 오류, 행사 음수 정원·기간 역전,
온라인 설문 Y/N 오류는 실측 집계에서 0건이었다. 표본 데이터 값을 문서에 복제하지 않는다.

## API와 화면 연결

설문 템플릿 수정은 상세 API에서 최신 상태를 읽고 유형·설명을 수정하며, 화면에 없는 템플릿
경로는 상세 응답의 값을 보존한다. 조회 실패 시 목록 값을 대신 사용하지 않고 재시도를 허용한다.
생성/수정/삭제의 중복 요청과 겹치는 작업을 막는다.
격리 API·DB와 실제 브라우저에서 수정 후 재조회·새로고침, 숨겨진 경로 값 보존,
삭제 후 404 응답까지 확인했다.

미소비 operation은 11에서 10으로 감소했다. 미소비·화면 고아의 현재 수치는 이 문서가 아니라
[operation census](../../config/governance/operation-consumer-census.json)의 `expected`가 정본이다. 공용 메모리
GAP-WIRING-001 행은 그 수를 다시 적지 않고 원장에 링크한다(DEC-OPS-340). 공용 메모리 계약은 라벨 가까이의 수치 표기(조사·기호·
굵게 표시·어순 변형 포함)를 막고, 라벨에서 떨어진 문장 속 서술은 보지 않는다.
이 수치는 이름 기반의 보수적 정적 분석이며 완전한 호출 그래프는 아니다. 예를 들어 다른
서비스의 `updateTemplate` 호출만으로 설문 서비스까지 소비 중인 것으로 집계될 수 있었다.
현재 설문 수정은 실제 화면 호출과 동작 테스트로 확인한다. 새로운 상세 메서드 이름도
`getSurveyTemplate`로 구체화해 다른 템플릿 도메인의 고아 메서드를 가리지 않는다.

나머지 미소비 API를 일괄 연결하지 않는다. 가입·중복 ID 검사는 관리자 계정 발급 결정,
기관코드 상세는 공급 명세, health 경로 폐기는 배포 환경 확인에 묶여 있다. 알림·일정·메뉴·
통계의 별도 단건/평면 조회는 현재 화면의 목록·범위 조회와 목적을 대조해야 한다.
관리자 메일 이력에 본문 조회를 붙이는 것은 DEC-OPS-022의 프라이버시 경계를 위반한다.
원장은 [operation census](../../config/governance/operation-consumer-census.json)와
[활성 gap](../../.agent/memory/known-gaps.md)의 GAP-WIRING-001이다.

[라우트 기능 원장](../../config/ui-route-capabilities.json)의 동작 열거는 서버가 그 동작을 처리한다는 뜻이 아니다. 화면 관리(`program.screen-list`)는 원장에 `dataSource: admin-menus-api` 와 `search`·`paginate`·`sort` 를 함께 적지만, 서버에서 읽는 것은 메뉴 연결 상태(`getMenuStructure`)뿐이다 — 화면 목록은 생성된 화면 목록(`SCREEN_REGISTRY`)이고 검색·쪽 나누기·정렬은 브라우저가 한다(`filterScreens`·`slice`). 이 화면에 서버 검색·페이징이 있는 것으로 읽지 않는다.

## 실시간 연결 표시 정정 (2026-09-27)

DEC-OPS-140의 승인 의도는 화면이 서버가 제공하는 값의 의미를 정확히 표시하는 것이다.
그 결정의 “1분마다 초기화되지 않는 재기동 이후 누적 연결”이라는 구현 전제는 현재 코드와 다르다.
[RealTimeDashboardService](../../business-app/src/main/java/nuri/business/service/dashboard/RealTimeDashboardService.java)는
새 WebSocket 연결마다 `visitsPerMinute`를 늘리고, `resetVisitsCounter`의 60,000ms 고정 주기에서 0으로 초기화한다.
동시에 유지하는 `activeUsers`는 현재 연결 세션 수다. 둘 다 해당 서버 인스턴스의 값이며 고유 사용자 수가 아니다.

[실시간 카드](../../frontend/src/components/features/dashboard/RealTimeDashboard.tsx)는 이를
“새 연결(이 서버, 1분마다 초기화)”와 “마지막 초기화 이후 연결 횟수”로 표시한다.
집계 방식·초기화 주기·이벤트 필드는 유지한다. 최근 60초 이동 구간이나 전 서버 합산으로 해석하지 않는다.
원래 승인 기록은 보존하고 구현 전제와 표시 문구를 이 후속 근거로 정정한다.
검증 경계는 [서버 초기화 테스트](../../business-app/src/test/java/nuri/business/service/dashboard/RealTimeDashboardServiceTest.java)와
[초기화 전후 프레임 표시 테스트](../../frontend/src/components/features/dashboard/__tests__/RealTimeDashboard.test.tsx)다.
이 코드는 스케줄러가 운영에서 지연 없이 실행된다는 실측 증거까지 제공하지는 않는다.

## 화면 문구 규범 편차

2026-09-15 화면 용어 원장의 계약 수준 규범 검토([DEC-OPS-100](../../.agent/memory/decisions.md))에서 확인했지만 그 변경에서
고치지 않은 편차다. 결함으로 고친 것은 `mustNotImply` 위반, 미측정의 0 표시, 기능을 과장하거나 대상을 잘못 부르는
용어뿐이다. 아래는 필수 정보가 빠졌지만 잘못 암시하지는 않는 문구, 예외 검토가 필요한 용어, 소유자 결정이
필요한 항목이다. 원장 `reviewBy`의 다음 규범 검토에서 화면별로 처분하며 일괄 치환하지 않는다.

| 분류 | 대표 위치 | 규범 | 처분 조건 |
|---|---|---|---|
| 날짜 형식 | 원시 `yyyyMMdd`: 포상·메모보고·업무 허브 보고·기관코드·외부인사 목록. 점 구분: 부서 일정·행사·주소록·게시판 템플릿·설문 관리. 전송 원문: 쪽지 목록, 로그 내보내기(2026-11-07 확인: 사용자 로그 내보내기는 저장 형식 `yyyyMMdd` 를 그대로 쓴다). 가드 밖 표기: 일정 상세 제목 `yyyy년 M월 d일 (E)` | `formatRules.date`, `formatRules.time.dateTimeDisplay` | 날짜 표기 가드가 템플릿 조합 구분자를 보도록 넓히면서 함께 고친다 |
| 시간대 고지 | 로그·예약 화면(게시글 작성의 예약 게시 안내 포함), 메일 발송 화면의 로케일 시각 | `formatRules.time.zoneDisclosure` | 화면·내보내기마다 기준 시간대 한 번 |
| 파괴적 확인 | 권한 그룹 편집·프로그램 등록·부서 권한·결재 반려의 기본 `확인` 버튼, 기안 취소 옆의 `취소` 닫기. 2026-11-07 새 사례: 부서 삭제·일정 삭제 확인이 되돌릴 수 없다는 사실과 결과(부서 공유 일정은 부서원 달력에서도 사라진다)를 말하지 않는다(`confirmText` 는 충족) | `actionRules.destructive-action` | 확인 대화 가드를 `confirmText` 검사로 넓힐지 결정 |
| 안내용 확인 대화 | 게시판 목록의 영구 삭제 불가 안내 | `actionRules.verb-object` | toast·단일 버튼 모달 |
| 대기·저장 라벨 | 여론조사 등록 대화상자의 `저장 중…`(평소 라벨 `설문 등록`). 2026-11-15 해소: 부서·사용자 폼·온라인 매뉴얼·게시판 추천의 대상 없는 `처리 중…`(대상을 붙였다), 조직 계층·공통코드 저장 토스트의 `동기화`, 보안 그룹 등록 단추의 `배포`, 화면 대기 문구 `로딩 중` — `로딩 중`·대상 없는 `처리 중…` 은 ESLint `no-restricted-syntax` 가 0건에서 막는다 | `actionRules.pending-action` | 해당 폼 수정 시 |
| 허브 | 협업·공통코드·결재·모니터링 제목과 breadcrumb, 메뉴 9010100 이름, 템플릿 표시 이름 `지식 허브`, 사용자 관리의 `조직 정책 편집 기능은 이 허브가 아니라…` | `term-hub` | 메뉴 이름은 메뉴 결정과 Flyway, 화면 제목은 화면별 |
| 장식용 기술 용어 | 관리자 화면의 `아키텍처`·`프로토콜`·`코어`·`명세`(배너 수정 영역 이름 `배너 명세 수정` 등). 2026-11-15 해소: 공통코드 상세 코드 대화상자 제목(`상세 코드 수정`·`상세 코드 등록`)과 필드(`사용 여부`·`설명`), 보안 그룹 수정 알림, 팝업 상태 라벨(`사용 상태`), 문자 발송 화면 제목·안내 | `term-architecture-protocol-core` | 대상 독자·의미 예외 검토 또는 결과 중심 표현 |
| 영문·약어 | 게이지 임계 배지. 2026-11-15 해소: 모니터링 게이지 제목(`CPU 사용률`·`메모리 사용률`, e2e 함께 갱신), 사용자·공통코드·배너·팝업 폼의 괄호 영문 이중 표기, 로그인 정책의 `USER_ID`·`BLOCK_ACCOUNT_ACCESS`, 로그 검색 안내의 `사용자ID · 접속IP`(→`로그인 ID · 접속 IP`), 거버넌스 하네스 시연 탭의 영문 제목. 2026-11-07 새 사례: 전체 결과 내보내기 상한 토스트의 `export`·`-하십시오`(공용 full-result-export), 여론조사 목록의 `SN:`, 로그 메뉴 넷의 괄호 영문(`상세 사용자 로그 (User)` 등 — 메뉴 결정과 Flyway), 관리자 홈 요청자 칸의 `ANONYMOUS` | ADR-0002, `term-standard-acronyms` | e2e 갱신과 함께 |
| 필수 정보 누락 | 실패한 작업 없이 서버 메시지만 보이는 오류(일정 삭제 실패 포함), 대체 경로 없는 미지원 고지(업무 홈 게시판 카드의 `지금 이 게시판을 운영하지 않습니다.` 포함), 홈 권한 안내의 문의 경로, 목록 수준 403 을 일시 오류로 보이는 공용 오류 표시. 2026-11-07 새 사례: 사용자 관리 토스트 `상태 변경 중 오류 발생`·`부서 이동 중 오류 발생`·`구조 저장 중 오류 발생`(저장하지 않은 끌기 순서가 남는다는 말이 없다)과 `…중 오류가 발생했습니다.` 계열, 상세 조회 실패 때 이유 없이 비활성인 `정보 수정`, 공용 오류 표시의 보이는 글자 `다시 시도` 와 다른 접근 이름 `데이터 다시 불러오기` | `server-error`·`unavailable`·`permission-denied` | 화면별 |
| 서버 메시지 규칙 | 가이드 §5 의 "서버 메시지를 그대로 보여 주지 않는다" 와 DEC-OPS-037·095 의 서버 문구 표시 | 소유자 결정 | `Accept-Language` 전달을 확인한 뒤 가이드나 결정을 정정 |
| route capability 원장 | 부재·검색·알림 health·결재·재가 엔진 상태 행의 낡은 판정, 알림 목록 capability 표시 이름 ⚠ 이 중 부재 행은 2026-09-23(DEC-OPS-115), 결재 허브·결재 기안 행은 2026-10-13(DEC-OPS-302)에 낡은 판정만 정정했다 — 결재 허브의 지표(demo) 판정과 서버 검색 미지원 판정, 결재 기안의 목업 판정을 걷었다. 두 행의 나머지 동작 목록은 다시 대조하지 않았고 빠진 동작이 있다(회수·재알림·결재자 변경·보완 요청과 답변·참조자 추가·재상신·임시저장). 나머지(검색·알림 health·재가 엔진 상태, 알림 목록 표시 이름)는 그대로 남는다. | `normativeSources` | route 원장 소유자 재검증 |
| 한 화면의 두 이름 | 여론조사 관리(목록·단추 `여론조사`, 등록 대화상자 `설문`, 유형 `투표` 와 같은 화면의 별도 제품 `온라인 투표 관리`, 문서 제목 `설문 관리`·메뉴 `설문·투표 관리` — DEC-OPS-099 결정 문자열과 E2E `SurveyPage.ts` 를 함께 고친다), 업무 홈 로딩 제목 `통합 대시보드`, 일정 문서 제목 `일정 관리`, 사용자 폼 `연락처` 대 상세 `휴대전화`·`사무실 전화`, 부서 폼 `부서 설명명세`·`부서 명칭` 대 오류 `부서명`, 사용자 로그 화면 대 내보내기 머리글(`서비스설명`↔`서비스명`, `메소드명`↔`메서드명` — `메소드명` 은 DEC-OPS-099 결정 문자열). 관리자 홈 감사 이력 3종은 2026-11-07 해소(머리글 `최근 실패 요청`·카드 `실패 요청 기록`, 푸터는 건수만) — 행정 구역 코드(메타 제목·중복 PageHeader 제거·라우트 원장 `행정 구역 코드 관리`)와 투표 참여(메타 제목·로딩 h1·본문 h1·breadcrumb `투표 참여`)는 2026-10-16 통일 완료 | `term-hub`·ADR-0002 | E2E 갱신과 함께 정본 이름 하나를 정한다 |
| 한 용어의 두 표기 | 2026-10-16 해소 — 온라인 투표 관리의 `설문 명`→`설문명`, 게시판 마스터 설정 모달 설명의 `게시판 이름·설명`→`게시판 명칭·소개`로 화면 내 정본 통일 | `term-standard-acronyms` | 완료 |
| 파괴 동사 불일치 | 게시판 마스터 한 화면의 `영구 물리삭제`·`영구 삭제`·`완전 말소`, `일괄 비활성`↔`비활성화 처리 중...` | `actionRules.destructive-action`·`verb-object` | 화면 단위로 동사 하나를 정한다 |
| 불러오는 중 0건 | 셸 툴바 총 건수를 `\|\| 0`·`?? 0`·빈 배열 길이로 만들고 오류만 거르는 목록은 첫 조회가 끝나기 전 `총 0건` 을 보이고 읽어 준다. 2026-11-07 시범 셋(사용자 로그·여론조사·일정)과 로그 화면 넷(웹·로그인·개인정보·시스템)·행사 관리를 고쳤고, 2026-11-08 남은 후보를 화면별로 다시 읽어 열넷(스크랩·게시판 관리·게시판별 게시글·외부 인사·메모 보고·포상·로그인 정책·온라인 투표·행정 구역 코드·기관 코드·후속 작업·감사 일지·정책·SMS)과 같은 결함의 통합 로그·쪽지함을 고쳤다 — 받은 값이 없으면(조회 중·오프라인 일시 정지·실패) 비우고, 서버 선채움·이전 결과는 그대로 보인다. 같은 응답으로 센 툴바 요약(게시판 관리의 이 페이지 사용 수·메뉴 연결 고지, 메모 보고의 미열람 수, 온라인 투표의 진행중 수, 로그인 정책의 페이지 요약, 쪽지함 탭 배지)과 감사 일지 내보내기 잠금도 같이 가렸다. 포상·행정 구역 코드·기관 코드는 서버 선조회 실패를 빈 페이지(total 0)로 넘기던 것을 null 로 바꿔, 실패와 성공한 빈 첫 페이지(확인된 0건)를 가른다(외부 인사와 같다). 다시 조회가 실패하면 이전 값도 비운다(표가 오류를 먼저 보인다). 템플릿은 서버가 받은 목록으로만 그리므로(Suspense) 결함이 아니다. 남은 것: 오프라인으로 멈춘 조회에서 표가 `loading={isLoading}`(false)이라 빈 상태 문구(`등록된 … 없습니다`)를 보인다 | `loading` 의 `mustNotImply`·`formatRules.number.unknownAsZero` | 표의 빈 상태 문구는 셸·표가 조회 상태를 받는 공용 경로를 정할 때 함께 고친다(화면별 일괄 치환 금지) |
| 중복 실패 알림 | 화면 안에 실패를 보이는 조회가 전역 실패 토스트도 띄운다: 사용자 관리의 사용자 표·부서 트리·부재 경고(호출에 `suppressErrorToast` 없음), 게시글 작성의 게시판 선택지·게시판 정보·첨부 목록 조회 | 가이드 §5(DEC-OPS-184) | 해당 조회를 고칠 때 화면 쪽 표시만 남긴다 |
| 내용 없는 상호작용 | 관리자 홈 실패 요청 타임라인의 펼침 카드(펼칠 상세가 없는데 첫 행이 펼친 상태로 알려진다)와 검색(0건일 때 결과 없음 문구·초기화가 없고 푸터 건수는 그대로) | `unsupported-action`(G10)·`filtered-zero` | 타임라인이 상세를 받거나 펼침을 걷을 때 |
| 숫자·단위·보조기술 고지 | 업무 홈 카드 `실시간 연결 세션(이 서버)`·`오늘 등록된 글` 값의 단위 없음, `${count}건` 의 ko-KR 포매터 미사용(1,000 이상에서 구분 기호 없음), 일정 표의 접근 이름 기본값 `데이터 목록`, Skeleton 만 그리는 로딩(업무 홈 게시판·실시간 구역) | `formatRules.unit`·`formatRules.number.formatter`·`loading` | 해당 카드·표 수정 시 |
| 입력 안내와 표기 | 사용자 폼 휴대전화 자리표시자 `010-0000-0000` 과 최대 11자(하이픈 형식을 끝까지 칠 수 없다), 로그인 자리표시자의 말줄임표와 종결형 혼용, 타임라인 자리표시자 `검색..`, 게시글 임시저장 복구 대화의 `임시저장 데이터`↔`초안` 과 `새로 작성` 의 결과 미고지, 업무 홈 `새 공지사항이 없습니다.`(최근 5건이라 '새' 가 범위를 좁힌다), 설문 이름이 없을 때의 `N번 설문` | `validation-error`·가이드 §2.3·§2.4 | 해당 화면 수정 시 |
| 은유·콘솔 용어 | 게시판 마스터의 `마스터 아이템`·`메타 정보`·`작업 컨트롤`·`생성 마법사`(e2e 고정. `콘솔`은 2026-10-23 V2_138 로 메뉴 이름과 머리말을 '게시판 관리'로 바꿔 정리했다), 결재 양식 허브의 `아키텍처` | `term-architecture-protocol-core` | e2e·메뉴 시드와 함께 바꾼다 |

## 정기 첨부 점검

운영 프로파일은 매일 03:15 Asia/Seoul에 읽기 전용 점검을 실행한다.
`ATTACHMENT_INTEGRITY_ENABLED=false`로 끌 수 있고, cron과 `MAX_ITEMS`는 각각
`ATTACHMENT_INTEGRITY_CRON`, `ATTACHMENT_INTEGRITY_MAX_ITEMS`로 조정한다(기본 50,000).
전용 단일 스레드 executor를 사용해 대시보드 등의 공용 스케줄러를 점유하지 않는다.

파일 점검은 DB/저장소 열거 항목 수와 I/O 사이의 60초 경과를 검사한다. DB 트랜잭션도
60초 timeout을 둔다. 저장소 드라이버가 한 번의 I/O에서 멈추는 시간을 강제로 보장하는 것은
아니므로 네트워크 스토리지는 별도 드라이버 timeout도 설정해야 한다. 상한에 도달한 실행은
부분 결과를 성공으로 반환하지 않는다.

업무 참조 점검은 활성 `AttachmentSourceContributor`의 숫자 참조와 팝업의 두 파일 URL
형식을 대조한다. 개인정보 값·원본 파일명은 결과에 넣지 않는다. 접근권을 부여하지 않는
파생 다운로드 이력은 업무 참조 점검에서 제외하며, 인가 정책 자체는 바꾸지 않는다.
OCI에서 대상 11종의 물리 컬럼을 확인했고, 2026-09-10 집계 당시 대조할 업무 참조 값은
0건이었다. 누락 참조 탐지는 격리 PostgreSQL의 정상/누락 숫자·URL 참조로 별도 검증한다.

결과는 `storage/diagnostics/attachment-integrity/latest.json`과 `last-complete.json` 두 개다.
전자는 실패·미완료도 기록하고 후자는 완주한 결과만 갱신한다. 기존 Compose의 `/app/storage`
볼륨 아래에 있어 컨테이너 교체 후에도 유지된다. `ATTACHMENT_INTEGRITY_REPORT_DIRECTORY`로
위치를 바꾸면 지속 볼륨 내부인지 확인한다. 심볼릭 링크를 통과하는 기록 경로는 거부한다.

`nuri.attachment.integrity.runs{outcome=...}` 카운터의 PASS/DRIFT/INCOMPLETE/FAILED/REPORT_FAILED를
수집한다. 고아 후보는 커밋 전 업로드일 수 있으므로 자동 삭제하거나 확정 유실로 취급하지 않는다.
파일·업무 행·권한·보존 기간은 이 점검으로 변경하지 않는다. 운영에서 실제 실행됐다는 증거는
해당 환경의 결과 파일과 메트릭으로 확인한다.

## 혼합 부하와 장애 복구

재현 명령은 `./gradlew compileJava :api-server:readinessRuntimeClasspath -I scripts/readiness-runtime-classpath.gradle`
후 `node scripts/run-isolated-readiness.mjs`다. 설치된 k6, Docker, Java와 e2e 시드용
`TEST_USERNAME`/`TEST_PASSWORD` 환경변수가 필요하다. `K6_BINARY`로 실행 파일 위치를 지정한다.
8080 포트가 사용 중이면 중단하고, 새 loopback PostgreSQL만 생성한다. 기존 `.env`나 운영 DB
접속 설정은 적재하지 않는다. 컨테이너 소유 label을 확인한 뒤 장애를 주입하며 종료 시 제거한다.

5 VU smoke 후 60초 증가·60초 유지·15초 감소로 최대 100 VU를 실행한다. 매 반복은 사용자
목록·대시보드를 읽고, 다섯 반복마다 일정 생성→조회→수정→재조회→삭제→404 확인을 수행한다.
HTTP 성공뿐 아니라 실제 저장 결과를 검사하며, `checks == 1`, HTTP 오류율 <1%, p95 <1초가
종료 코드에 연결된다. 의도적으로 잘못된 HTTP 200 본문을 돌려주는 대조 서버에서 k6가
종료 코드 99로 실패하는 것도 확인했다.

2026-09-10 격리 Windows/Java 21/PostgreSQL 17, Hikari 최대 10의 첫 실행은 요청 15,429건,
check 24,930건, 오류율 0%, p95 41.93ms였다. 최종 소스로 백엔드·프론트 전체 검사와 함께
재실행한 결과는 요청 14,575건, check 23,534건, 오류율 0%, p95 180.01ms, 최대 779.98ms다.
두 실행 모두 남은 합성 일정은 0건이다. 동시 작업 조건이 다르므로 성능 증감 비교나 운영
데이터 규모·500/1000 VU 용량 보장의 근거로 사용하지 않는다.

장애 단계는 별도 API 프로세스의 풀을 2개로 제한한다. 두 연결의 DB lock 대기를 관측한 뒤
추가 요청의 실패를 검사하고, DB pause/unpause도 실행한다. `--recovery-only`는 혼합 부하를
생략하고 이 단계만 재현한다. JDBC connect/socket timeout은 격리 시험 프로세스에만 설정한다.

실측에서 JWT 자체가 유효해도 사용자 DB 조회 예외를 삼켜 401이 되는 경로를 발견했다.
`JwtAuthenticationFilter`는 저장소/트랜잭션/인증 서비스 장애에 503과 `Retry-After: 5`를 반환한다.
쿠키를 제거하지 않고 체인을 중단하며, 실제 잘못된 자격의 인증 거부는 유지한다. 프론트의
503 처리도 재발급·로그인 이동을 일으키지 않는지 검사한다. 재검증에서는 두 장애 모두 약
3초 후 503, 복구 후 같은 토큰으로 30~34ms의 정상 PageResponse를 확인했다.

## 이관 원천 탐색의 실제 Oracle 실측

2026-09-14에 `oracle-catalog` 어댑터를 실제 Oracle에 직접 실행했다. 대상은 Oracle AI Database 26ai Free 23.26.3(Docker `gvenzl/oracle-free:23-slim-faststart`), 드라이버는 Maven Central ojdbc11 23.26.3이다.
원천 스키마에는 테이블·파티션·identity·CLOB/BLOB·TIMESTAMP WITH TIME ZONE·뷰·구체화 뷰·시퀀스·동의어·타입·
프로시저·함수·패키지·트리거·주석·제약을 두었다. 저장소 밖 일회용 프로브로 CLI 승인 게이트를 거치지 않고
`discover`만 호출해 드라이버 동작을 봤다.

| 결함(실측) | 원인 | 수정 |
|---|---|---|
| 기본값 있는 테이블의 컬럼이 중간에서 끊김(`ORA-17027`) | `getColumns`의 LONG 열(`COLUMN_DEF`)을 뒤 열보다 늦게 읽음 | 열을 명세 순서대로 한 번씩 읽는다 |
| 탐색이 원천 테이블 통계를 수집(`LAST_ANALYZED` 갱신), 읽기 전용 연결에서는 인덱스 조회 실패 | `getIndexInfo(approximate=false)`에서 드라이버가 `DBMS_STATS.GATHER_TABLE_STATS` 실행 | `approximate=true`로 호출한다 |
| 스키마 하나를 요청해도 364초 | 사전 조회에 스키마를 넘기지 않아 전체 딕셔너리를 조회 | 요청 스키마를 이스케이프해 `getTables`·`getProcedures`·`getFunctions`에 넘긴다 |
| 파티션·권한 조회 실패 | `HIGH_VALUE`(LONG) 뒤 열을 먼저 읽음, `ALL_TAB_PRIVS`에 `OWNER` 열 없음 | LONG 열을 SELECT 마지막으로, `TABLE_SCHEMA AS OWNER` |

수정 후 같은 스키마에서 탐색은 364.5초에서 5.9초가 됐고, 객체는 55개에서 69개가 됐다(컬럼 20개 전부, 기본값·identity·권한·파티션 포함).
조회 실패 판정은 0건이고, 통계가 생긴 테이블도 0개였다. 일부 테이블에만 SELECT 권한이 있는 계정은 권한 있는 테이블만 보았고,
"빈 결과가 부재를 증명하지 않는다"는 PARTIAL 판정을 남겼다. 네 결함은 `JdbcMetadataRealDriverBehaviorTest`가 고정한다.
이 테스트는 LONG 스트림처럼 앞선 열 재읽기를 거부하는 결과 집합을 쓰며, 수정을 하나씩 되돌리면 각각 red가 된다.

이 실측은 원천 탐색의 증거이며, 후속 단계의 2026-09-15 검증은 아래에 구분한다. Oracle 어댑터 증거 수준은
`UNVERIFIED`로 유지한다. SCN 스냅샷, 운영 규모, 19c 등 다른 버전과 외부 드라이버 commit 자격은 검증하지 않았다.
Tibero는 당시 실행 환경을 확보하지 못해 실측하지 못했다. 후속 준비 상태는 [실행 환경 점검](#tibero-및-oracle-19c-실행-환경-점검)을 따른다.

## 이관 Oracle 후속 단계 실측

2026-09-15 로컬 Docker의 폐기용 Oracle AI Database 26ai Free `23.26.3.0.0`
(`gvenzl/oracle-free:23-slim-faststart`)와 PostgreSQL `17.10`, ojdbc11 `23.26.3.0.0`으로 후속 단계를 시험했다.
합성 원천 데이터만 사용한다. 첫 실측에서는 가시성 미증명으로 plan이 차단되고, BLOB 기록 실패와 CLOB의
large object OID 문자열 저장을 확인했다. 후속 구현은 소유자 범위의 가시성과 LOB 본문 처리를 보완한다.
Oracle의 `UNVERIFIED` 등급과 외부 driver의 공개 commit 금지는 유지한다.
`commitReady=true`는 plan의 승인·분류 완성을 뜻하며, load 단계의 vendor/driver 자격 검사를 대신하지 않는다.

| 경로·단계 | 실제 결과 | 근거 |
|---|---|---|
| 공개 workflow: discover → plan → 객체별 review → validate | 명시한 local owner의 TABLE/COLUMN/PRIMARY_KEY 범위에서 가시성을 증명하고 승인된 plan의 `commitReady=true` 확인 | [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/OracleWorkflowPostgresIntegrationTest.java) |
| 공개 workflow: dry-run | scalar 501행과 BLOB/CLOB 본문 변환, `DRY_RUN/PASS` 실행 artifact. target 업무 행·control 스키마 무변경 | 같은 workflow 테스트 |
| 공개 workflow: 승인 누락·commit·환경 변경 | 미승인 plan, adapter/freeze 확인 누락, `UNVERIFIED` commit 거절. target fingerprint 변경 시 이전 review·plan 재사용 거절 | 같은 workflow 테스트 |
| 가시성·권한 경계 | CREATE SESSION만 부여한 local owner의 테이블·컬럼·PK와 빈 스키마 탐색. 다른 소유자의 일부 SELECT 권한·CURRENT_SCHEMA 변경·미존재 스키마·미지원 객체 범위는 차단. 메타데이터 조회 실패도 차단 유지 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/OracleDiscoveryVisibilityIntegrationTest.java) |
| 직접 ETL 엔진: scalar dry-run·load·오류 복구 | Oracle NUMBER/VARCHAR2 1,001행. 오류 행 501만 미기록, 나머지 1,000행과 checkpoint 보존. 오류 행 정정 후 전체 값 일치·재반복 무중복·target 변조 탐지 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlOraclePostgresIntegrationTest.java) |
| 직접 ETL 엔진: 프로세스 종료·재개 | 1,001행 중 8행에 합계 152MiB LOB. 최대 힙 128MiB JVM을 500 checkpoint와 504 checkpoint(LOB 4행 포함)에서 각각 종료하고 새 JVM으로 재개·재반복·전체 내용·무중복·BLOB/CLOB 변조 탐지 | [Oracle JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlOracleCrashRecoveryIntegrationTest.java) |
| 직접 ETL 엔진: 16MiB BLOB → bytea | 전체 바이트·checksum, NULL/EMPTY_BLOB 구분, 재반복 무중복, 마지막 바이트 변조 탐지. PostgreSQL large object 증가 없음 | 엔진 통합 테스트 |
| 직접 ETL 엔진: 대형 Unicode CLOB → text | 전체 본문·checksum, NULL/EMPTY_CLOB 구분, 재반복 무중복, 마지막 문자 변조 탐지. PostgreSQL large object 증가 없음 | 엔진 통합 테스트 |
| 직접 ETL 엔진: LOB 오류 행 재시도·변환 | batch 제약 실패 후 BLOB/CLOB 본문으로 행별 재시도, 미기록 행 수정 후 재개. CLOB trim 결과와 영속 checksum 결속 | 엔진 통합 테스트 |
| 직접 ETL 엔진: 크기 초과 | 실제 32MiB+1 byte BLOB은 `LOB_SIZE_LIMIT_EXCEEDED`, target/checkpoint 0행, 검증 FAIL | 엔진 통합 테스트 |

CLOB fixture는 `본문🙂-` 1,048,576회 반복이다(Java UTF-16 5,242,880 단위, UTF-8 11MiB).
긴 `setCharacterStream`으로 fixture를 넣었을 때 이모지가 손상되는 현상도 관측하여, 최종 fixture는 Oracle 내부
LOB 연결 연산으로 생성하고 `getCharacterStream` 전체 내용과 먼저 대조한다. 일반 로그에는 본문을 남기지 않는다.

현재 엔진은 ResultSet이 열린 동안 BLOB을 `byte[]`, CLOB을 `String`으로 읽고 locator를 해제한 뒤
변환·checksum·target 바인딩에 같은 본문을 사용한다. 바이너리를 내장 문자열 변환·codemap·`type: text`에
통과시켜 객체 주소 문자열로 저장하는 경로는 거절한다. 기존 SHA-256 framing은 유지하며 Base64·UTF-8 인코딩을
유계 버퍼로 처리한다. 대상 검증은 `fetchSize=1` cursor로 행마다 checksum을 계산하고 키·건수·hash만 보관한다.
구현 digest는 새 helper를 포함한 모듈 전체 class/JAR bytes에 결속되므로 기존 승인 plan은 재작성·재승인해야 한다.

값별 상한은 **BLOB 32MiB, CLOB 16,777,216 UTF-16 단위**다. 행 보관 크기 추정치는 64MiB까지이며,
페이지는 최대 500행 또는 누적 8MiB에 도달하면 나눈다. 8MiB는 마지막 행을 포함한 뒤 검사하는 분할 기준이다.
CLOB 임시 복사·JDBC 버퍼·identity/checkpoint 목록을 포함한 JVM 전체 힙 상한이 아니며, 임의 크기 LOB를
디스크로 spool하는 구현도 아니다. source와 target의 `fetchSize=1`은 JDBC 힌트이며 드라이버 버퍼의 강제 상한이 아니다.
크기 초과·길이 불일치는 잘라 저장하지 않고 실패한다.
Oracle의 `NCLOB`, `LONG*`, `SQLXML`, quoted identifier와 vendor-specific type은 공개 load에서 계속 차단한다.
아래 MySQL의 `LONGVARCHAR`/`LONGVARBINARY` 처리는 MySQL 전용 capability이며 Oracle의 범위를 넓히지 않는다.

가시성 증명은 로그인 사용자·현재 사용자·현재 스키마·local owner가 일치하고 시스템/공통 계정이 아닌 경우만 적용한다.
catalog를 지정하지 않고 시스템 객체를 제외한 단일 스키마 범위여야 한다.
`--schemas=<정확한 owner>`와 `--object-kinds=TABLE,COLUMN,PRIMARY_KEY`처럼 범위를 명시한다.
소유자는 객체에 대한 암묵적 쓰기 권한도 있으므로 이 증명은 SELECT-only 계정이나 source freeze 증명이 아니다.
다른 스키마의 일부 객체 권한과 기본 전체 객체 범위는 아직 완전한 가시성을 증명하지 못한다.

재현: `npm run verify:migration`(기존 CI와 같은 독립 모듈 compile/test/bootJar 경로).
2026-09-15 전체 회차는 493건 중 489건 통과, 복구 시험 2건 시간 초과, Windows 심볼릭 링크 시험 2건 skip이었다.
이후 아래 명령으로 Oracle·PostgreSQL 복구 시험을 재실행하여 2건 모두 통과했다. 각 시험의 최신 결과는
**491건 통과·2건 환경 skip**이며, 실제 Oracle 통합 시험은 총 17건이다. 증거는 전체 회차와 복구 재실행의
조합이고, 단일 전체 회차의 green 결과는 확보하지 않았다. compileJava·compileTestJava와 bootJar도 확인했다.

```sh
./gradlew :migration-tool:compileJava :migration-tool:compileTestJava :migration-tool:test \
  --tests '*EtlOracleCrashRecoveryIntegrationTest' --tests '*EtlCrashRecoveryPostgresIntegrationTest' \
  --no-daemon --warning-mode fail --console=plain "-Dfile.encoding=UTF-8"
```

Windows PowerShell에서는 `./gradlew` 대신 `.\gradlew.bat`를 사용하고 JVM 속성의 따옴표를 유지한다.
각 실행의 JUnit XML이 결과의 정본이다. 로컬 결과는 `migration-tool/build/reports/oracle-lob-before-crash-diagnostics/`와
`migration-tool/build/reports/oracle-lob-crash-final/`에 분리 보존했으며 후자의 `verification-summary.json`에 집계를 남겼다.
Oracle 복구 회귀의 hang 방지 상한은 worker 완료·checkpoint 도달 각각 180초, DB 초기화 5분이다.
큰 fixture에서 기존 45초·90초 및 초기화 3분 제한에 걸린 사례를 반영했다. 최종 Oracle 재개·반복 PASS는
JVM 내부 측정으로 각각 약 91.5초·118.4초였다. advisory lock으로 고정한 500·504 종료 지점,
최대 힙 128MiB와 데이터 검증은 유지하며 checkpoint 초과는 즉시 실패한다. 단계 시간과 checkpoint 증가,
45초 시점의 상태를 기록한다. 최종 두 번째 종료 회차는 45초에 501건, 약 68.7초에 504건을 기록했다.
자식 콘솔의 문자셋과 무관하게 ASCII 단계 기록을 수집한다.
이 시간 상한은 처리 성능 보장값이 아니다. PostgreSQL 복구 회귀의 기존 45초·90초 제한은 유지했다.

프로파일 표본에서는 PostgreSQL 원천 cursor 읽기·대상 검증의 JDBC 응답 대기와 Oracle LOB 읽기·문자 변환이
관측됐다. 같은 표본의 GC 시간은 작고 PostgreSQL lock 대기는 관측되지 않았다. `fetchSize=1`의 왕복 비용과
실행 환경에 따른 시간 변동은 후속 성능 검증 대상이며, 이 표본만으로 전체 지연 원인을 확정하지 않는다.
Oracle 테스트만 실행할 때는 `./gradlew :migration-tool:test --tests '*Oracle*IntegrationTest'`를 사용한다.
Oracle 의존성은 테스트 전용이며 배포 bootJar에 포함되지 않는다. 공개 workflow는 실제 runner·adapter와 테스트
classpath 드라이버를 사용하므로, 외부 driver JAR를 전달한 배포 CLI의 승인형 전체 성공 증거로 해석하면 안 된다.
직접 엔진 시험은 승인 게이트 아래의 구현 검증이며 Oracle의 운영 사용을 승인하거나 차단을 해제하지 않는다.

구현 감사(L2): 백엔드·DB 헌법과 현재 diff를 대조했다. 변경은 독립 `migration-tool`의 JDBC 경로이며
온라인 API·Entity·운영 Flyway/메타 표준을 변경하지 않는다. 실제 스키마 확인과 DDL/DML은 폐기용 DB에 한정한다.
소스 freeze 확인, 승인 digest 재대조, target INSERT와 checkpoint의 원자적 기록을 유지한다.
검증기는 자신이 시작한 읽기 트랜잭션만 정리하며 호출자의 미커밋 트랜잭션은 보존한다.
오류 보고에는 고정 reason code를 사용하고 자격증명·LOB 본문을 담지 않는다. 가시성 누락·승인 누락·크기 초과·
잘못된 LOB 길이·정렬 키 중복·본문 변조를 거부하는 음성 사례가 기존 모듈 테스트/CI 실행 경로에 연결된다.

남은 작업은 실제 도입 버전·외부 driver digest별 commit 자격, 다른 스키마를 읽는 최소권한 계정의 완전한 가시성,
SCN·운영 규모·상한 초과 LOB의 별도 처리 검증이다. 이번 결과를 19c 등 미실측 버전의 지원으로 승격하지 않는다.
verify/report는 load 내부 단계이고 resume는 같은 run의 재실행이다. 전체 rollback CLI는 없으며,
백업 복원·운영 cutover는 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 절차로 이번에 실행하지 않았다.

## 이관 MySQL 후속 단계 실측

2026-09-15 폐기용 Docker의 MySQL `8.4.11`과 Connector/J `26.7.0`, PostgreSQL `17.10` 대상을 사용했다.
원천 이미지는 `mysql@sha256:85b9bf2e29cf836ecb8c2a15a935d4ba0c606631dff1dd79531a11983c638f2a`로 고정한다.
DB·driver 버전은 연결의 실제 JDBC 메타데이터로 기록하며, 계정과 데이터는 합성 fixture만 사용한다.
MySQL 어댑터의 증거 수준은 `UNVERIFIED`이며 공개 COMMIT 자격과 기관 운영 승인을 부여하지 않는다.

`npm run verify:migration` 전체 회차는 **599건 중 597건 통과, 실패·오류 0건, Windows 심볼릭 링크 2건 skip**이었다.
MySQL 실제 DB 시험 33건과 기존 Oracle 17건은 모두 통과했다. 이후 드라이버 확인·치명 오류 보존·상한 단위 시험·
3단 source 조기 거절을 보완한 뒤 `compileJava compileTestJava`와 표적 검사를 실행해
**331건 중 330건 통과, 실패·오류 0건, 심볼릭 링크 1건 skip**을 확인했다.
이 후속 회차는 가시성 14건·workflow 5건·배포 JAR 1건의 실제 MySQL 재검증을 포함하며 전체 회차와 구분한다.

| 범위 | 확인된 결과·경계 | 근거 |
|---|---|---|
| 최소권한 가시성 | 단일 존재 DB의 database-wide SELECT 계정에서 TABLE/COLUMN/PRIMARY_KEY와 빈 DB를 확인한다. 일부 테이블·컬럼 권한, 미존재 DB, 기본 CATALOG 모드, 범위 확장과 메타데이터/권한 조회 실패는 완전한 가시성 증명으로 취급하지 않는다 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MySqlDiscoveryVisibilityIntegrationTest.java) |
| 직접 엔진의 scalar 복구 | 1,001행에서 오류 행 501의 기록과 checkpoint만 누락시키고 나머지 1,000행을 보존한다. 정정 후 같은 run으로 재개·재반복해 전체 값과 무중복을 확인하고 target 변조를 탐지한다 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlMySqlPostgresIntegrationTest.java) |
| 직접 엔진의 LONGBLOB | 16MiB 전체 바이트와 checksum, NULL/빈 값 구분, 재반복 무중복과 마지막 바이트 변조를 확인한다. 대상은 PostgreSQL bytea이며 large object 증가는 없다 | 같은 엔진 통합 테스트 |
| 직접 엔진의 LONGTEXT | 11MiB UTF-8 Unicode 전체 본문과 checksum, NULL/빈 값 구분, 재반복 무중복과 마지막 문자 변조를 확인했다. 최초 긴 Reader fixture 업로드는 이관 전 원본 비교에서 실패했으며, 서버 REPEAT로 합성 원본을 만들고 원본·대상 전체 비교를 유지해 재검증했다 | 같은 엔진 통합 테스트 |
| 직접 엔진의 프로세스 종료 | 1,001행 중 8행의 LONGBLOB/LONGTEXT 합계 152MiB를 최대 힙 128MiB JVM에서 읽는다. 500·504 영속 checkpoint에서 각각 강제 종료하고 새 JVM으로 재개·재반복한다. 전체 본문 hash·무중복과 바이너리/문자 본문의 변조 탐지를 확인했다 | [MySQL JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlMySqlCrashRecoveryIntegrationTest.java) |
| 수치·고정 문자 | decimal(38,9)의 양수·음수는 PostgreSQL numeric(38,9)에, unsigned bigint 최댓값은 numeric(20,0)에 보존했다. signed long 범위를 넘는 unsigned 값은 target 행·checkpoint 기록 전에 거절했다. CHAR의 Unicode·앞 공백과 MySQL 조회에서 뒤 padding을 제거한 실제 값, NULL/빈 값·재반복·변조 탐지를 확인했다 | [값 타입 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MySqlValueTypesIntegrationTest.java) |
| 날짜·시간 | DATE와 DATETIME(6)을 PostgreSQL date·timestamp(6)에 적재해 날짜와 6자리 소수초를 보존했다. 최초 Java/JDBC 시간 표현 차이로 실패한 checksum은 정규화 후 전체 행 대조·재반복과 1마이크로초 변조 탐지를 통과했다 | 같은 값 타입 통합 테스트 |

DATETIME(6)에 대해 Connector/J의 `getColumns`는 `DECIMAL_DIGITS=0`을 보고했지만,
실제 `information_schema.COLUMNS.datetime_precision`은 6이었다. 시험은 driver 메타데이터와 물리 정밀도를
각각 확인하고 적재한 전체 값을 직접 비교한다. 메타데이터의 0을 소수초가 없는 물리 타입의 증거로 취급하지 않는다.

`RowChecksum`은 `LocalDateTime`을 기존 JDBC `Timestamp`와 같은 공백 구분·소수초 표현으로 정규화하도록
수정했다. 기존 JDBC `Timestamp`의 영속 hash는 유지하지만, 이전 `LocalDateTime.toString()`의 `T` 구분 표현으로
계산한 hash는 달라진다. 구현 digest가 바뀌므로 기존 승인 plan은 재작성·재승인해야 한다. 이전 `T` 표현의
checkpoint가 있는 run의 자동 재개 호환성은 보장하지 않는다. checkpoint를 지우지 말고 기존 승인·run·원천과
대상 근거를 보존해 별도 reconciliation과 승인을 거친다([복구 절차](migration-recovery-runbook.md#재개와-reconciliation)).

MySQL `LONGTEXT`/`LONGBLOB`의 실제 JDBC 타입 `LONGVARCHAR`/`LONGVARBINARY`만 MySQL 전용 capability로 허용한다.
열의 스트림을 ResultSet이 열린 동안 읽고 문자 본문은 `String`, 바이너리는 `byte[]`로 변환해 기존 변환·checksum·
target INSERT와 checkpoint에 결속한다. NULL과 빈 값은 구분한다. 다른 vendor의 `LONG*` 타입을 같은 근거로 허용하지 않는다.

값별 제한은 **바이너리 32MiB, 문자 16,777,216 UTF-16 단위**이며 보관할 행의 추정치는 64MiB까지다.
페이지는 최대 500행 또는 마지막 행을 포함한 뒤 누적 추정치가 8MiB에 도달하면 나눈다.
이 기준은 전체 JVM 힙 상한이 아니다. 스트림 취합과 최종 문자열/바이트 배열의 일시 복사, JDBC 버퍼와 checkpoint/identity
목록이 추가 메모리를 사용한다. 128MiB 복구 성공은 이번 8MiB 바이너리·11MiB UTF-8 문자 본문 fixture의 증거이며,
최대 허용 값이나 임의 크기 LOB·GB/TB 규모의 메모리와 처리 시간을 보장하지 않는다. 초과 값은 잘라 저장하지 않고 실패한다.

원천 조회는 실제 Connector/J property의 `useCursorFetch`와 `useServerPrepStmts`가 모두 true일 때
forward-only/read-only statement에 `fetchSize=1`을 적용한다. property는 외부 driver를 배포 JAR에 포함하지 않고
읽기 전용 reflection으로 확인한다. cursor 설정이 없거나 확인되지 않으면 Connector/J의 `Integer.MIN_VALUE` sentinel로
행 단위 읽기를 유지한다. sentinel 방식은 조기 종료한 결과의 나머지 행을 driver가 끝까지 읽고 버리므로, 큰 행으로
페이지가 자주 나뉘면 중복 원천 I/O가 증가한다. source driver가 Connector/J인지 증명되지 않으면 유계 조회를 가정하지 않고
차단한다. 조회 설정 실패 뒤 자원 정리가 추가로 실패해도 원래 JVM 치명 오류를 보존하고,
일반 오류 뒤 발생한 치명 오류는 전파하도록 부정 조합을 검증한다.
대상 검증은 기존 PostgreSQL `fetchSize=1` cursor에서 행별 checksum을 계산한다.

가시성 증명에는 Connector/J `databaseTerm=SCHEMA`, 명시한 단일 DB와 TABLE/COLUMN/PRIMARY_KEY 범위,
현재 계정에 직접 부여한 해당 DB 전체의 SELECT 권한과 `partial_revokes=0`이 필요하다. 밑줄·퍼센트 문자는
권한 카탈로그의 리터럴 escape 철자와 실제 DB 철자를 각각 정확히 대조한다. wildcard·global·role·table/column만의
권한과 미실측 partial revokes 모드는 완전한 가시성을 증명하지 않는다. SCHEMA 모드에서 `getCatalog()=null`이지만
컬럼 metadata의 `TABLE_CAT=def`인 실측을 반영해 누락된 기본 catalog만 보정한다.
mapping의 원천 SQL 이름은 `table` 또는 `schema.table`을 사용한다. `def.schema.table`을 포함한
3단 이름은 metadata 조회 전에 `MYSQL_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED`로 거절한다.
계획의 catalog를 포함한 객체 식별 정보는 입력 mapping의 SQL 이름을 바꾸지 않는다
([MySQL 식별자 문법](https://dev.mysql.com/doc/refman/8.4/en/identifier-qualifiers.html)).
단일 InnoDB REPEATABLE READ 트랜잭션과 operator freeze 확인을 사용하며,
가시성 증명 자체가 freeze나 재시작 사이의 동일 snapshot을 증명하지 않는다.

공개 [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MySqlWorkflowPostgresIntegrationTest.java)는
discover → review → plan → validate → dry-run과 승인 누락·환경 변경·미검증 COMMIT의 차단을 통과했다.
업무 target 행과 control 스키마가 생기지 않는 것, LONG 필드의 전체 변환 본문과 `DRY_RUN/PASS` artifact를 확인했다.
[배포 CLI 시험](../../migration-tool/src/test/java/nuri/migration/MySqlPackagedCliIntegrationTest.java)도 실제 bootJar와
외부 JDBC JAR로 같은 단계와 정확한 driver digest 확인을 통과했다. bootJar의 Spring 구성에는
`SourceJdbcEndpointFactory`의 주입 생성자를 명시하고, 중첩 JAR 경로는 실제 outer JAR 전체 bytes에 결속하도록 보완했다.
정상 실행 가능한 JAR에 합성 리소스만 추가해 이전 승인 plan이 execution digest 불일치로 쓰기 전에 거절되는 것을 확인했다.
isolated 외부 driver COMMIT과 driver digest ack 누락도 artifact·DB 쓰기 전에 거절한다.
어댑터 `UNVERIFIED`와 isolated 외부 driver의 공개 COMMIT 금지는 유지한다.

MySQL·MariaDB·Oracle driver와 Testcontainers는 테스트 전용이며 배포 bootJar에 포함되지 않는다.
MySQL·MariaDB 프로세스 종료·배포 CLI 시험은 일반 `test`와 독립 migration CI에서 계속 실행한다.
PIT는 targetClasses가 `nuri.migration.transform.*` 단독 또는 `nuri.migration.validate.*`와 `nuri.migration.verify.*`의
정확한 집합인 기존 CI 두 작업에서만 두 vendor의 이 네 시험을 정확한 클래스 이름으로 제외한다.
자식 JVM은 일반 classpath/bootJar를 실행하므로 그 범위의 mutant를 검사하지 않는다.
기본 `nuri.*` 분석에서는 부모의 artifact/adapter 검증을 보존하기 위해 포함한다. 기존 Oracle/PostgreSQL 시험과 생산 코드
mutation 분모는 유지하며, 정확한 제외·조건과 일반 통합 실행 경로는 기존 [독립 이관 계약](../../scripts/migration-verification-contract.test.mjs)이 검사한다.

로컬 Delta PIT는 `STRICT_MUTATION=true`로 9개 변경 경계 클래스와 관련 단위 시험 42개 클래스를 검사해
**382/475개 탐지(80.42%)**로 75% 기준을 통과했다. 범위는 `SourceReadStatements`, `JdbcLobReader`,
`RowChecksum`, `SourceLoadSurfaceGate`, `MySqlDiscoveryVisibilityProof`, `MappingValidator`,
`MigrationExecutionContract`, `SourceReadSessionPolicy`, `MySqlSourceAdapter`다.
결과는 정상 탐지 380개·제한시간 탐지 2개·미탐지 59개·미실행 34개이며 run/memory error는 없다.
점수는 이 범위의 합산이며 각 클래스의 75%나 전체 ETL 변이 검증을 뜻하지 않는다.
이후 MySQL 어댑터의 `visibilityProof` 전달 경로를 검증하는 단위 시험을 추가해 관련 시험 44건이 모두 통과했다.
`MySqlSourceAdapter` 단독 후속 PIT도 null-return 변이 1/1개를 탐지해 통과했다. 이 결과는 위 9개 클래스 회차와 별도다.
`MigrationExecutionContract`는 43/72개 탐지였다. 신규 outer JAR 경로 4개와 기존 JAR 처리 14개 변이는
미실행 상태이며, 일반 bootJar를 실행하는 자식 JVM의 성공·거절 시험은 이 변이들을 검사하지 않는다.
기존 class digest의 hash 읽기와 디렉터리 경로 결속·필터에서 생존한 11개 변이도 단위 시험의 탐지 공백으로 남는다.
배포 JAR 자식 JVM의 실제 동작은 위 CLI 회차에서 따로 확인했다. 현재 변경의 required CI·CodeQL은 실행하지 않았다.

재현은 `npm run verify:migration`이며 부분 실행은 `./gradlew :migration-tool:test --tests '*MySql*IntegrationTest'`다.
Windows에서는 `.\gradlew.bat`를 사용한다. verify/report는 load의 내부 단계이며 resume는 같은 run의 재실행이다.
실제 도입 버전·driver digest별 COMMIT 자격, 운영 규모·일관성·cutover와 전체 백업 복원은
[복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다. MariaDB·SQL Server·Tibero에는 이 결과를 승계하지 않는다.

## 이관 MariaDB 후속 단계 실측

2026-09-15~16 폐기용 Docker의 MariaDB `11.4.13-MariaDB-ubu2404`, MariaDB Connector/J `3.5.10`,
PostgreSQL `17.10`으로 별도 시험했다. 원천 이미지는
`mariadb@sha256:80494b9810694179889f7281ec44ca928241df577159c0356a1070e2e94616a1`로 고정하며,
실제 연결의 JDBC 메타데이터와 합성 fixture를 사용한다. MySQL의 성공 결과를 MariaDB 자격으로 승계하지 않는다.
2026-09-15 최초 표적 검사 **128건 통과**에는 실제 MariaDB 시험 **36건 통과**가 포함된다.
이 회차는 추가 서버 행 제한·namespace 경계 시험 전의 결과이며 전체 모듈의 최종 회차 결과가 아니다.
2026-09-16 추가 표적 3건은 12분 29초에 완료했다. 프로세스 종료 1건·배포 CLI 1건은 통과했으며,
`Rows_sent` 1건은 예상 3과 실제 2의 차이로 실패했다. 아래에 최초 실패와 assertion 수정 후 통과를 구분한다.
수정한 Rows_sent 시험은 별도 2건의 의도적 red 회차에서 통과했으며, 같은 회차의 기존 namespace 구현은 실패했다.
namespace 수정 후 `compileJava compileTestJava`와 영향 검사는 **BUILD SUCCESS(3분 13초)**였고,
**324건 중 323건 통과, 기존 Windows 심볼릭 링크 1건 skip, 실패·오류 0건**을 확인했다.
이 최신 회차의 실제 MariaDB 시험은 가시성 18건·workflow 5건의 **23건 통과**다. 여러 회차에서 통과를 확인한
서로 다른 실제 MariaDB 시험은 **40건**(초기 36건 + Rows_sent·프로세스 종료·배포 CLI·namespace 각 1건)이며,
40건을 최신 회차에서 모두 실행했거나 현재 전체 모듈을 실행했다는 뜻은 아니다.
MariaDB 가시성 증명 단위 51건·JDBC metadata edge case 6건·실제 driver 조회 순서 행동을 모사한 단위 4건도 통과했다.

| 범위 | 확인된 결과·경계 | 근거 |
|---|---|---|
| 실제 metadata | 기본 CATALOG 모드의 DB catalog·null schema를 확인했다. 명시적 `useCatalogTerm=SCHEMA`에서는 `getCatalog()=def`, `getSchema()=<DB>`와 컬럼의 `TABLE_CAT=def`, `TABLE_SCHEM=<DB>`를 확인한다 | [metadata 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbMetadataIntegrationTest.java), [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbWorkflowPostgresIntegrationTest.java) |
| 최소권한 가시성 | 존재하는 단일 DB에 현재 계정의 직접 database-wide SELECT 권한과 활성 role 없음이 필요하다. TABLE/COLUMN/PRIMARY_KEY·빈 DB와 리터럴 `_`/`%` escape 철자를 확인한다. wildcard·global·role·PUBLIC·table/column 권한, 기본 CATALOG와 조회 실패는 완전한 증명으로 취급하지 않는다 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbDiscoveryVisibilityIntegrationTest.java) |
| 직접 엔진의 scalar·LONG 값 | scalar 1,001행의 오류 행 재개·재반복·무중복·변조 탐지, 16MiB LONGBLOB과 11MiB UTF-8 Unicode LONGTEXT의 전체 내용·checksum·NULL/빈 값 구분을 확인했다. 크기 초과는 target 행·checkpoint 기록 전에 거절한다 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlMariaDbPostgresIntegrationTest.java) |
| LONG 변환·batch 오류 복구 | LONGTEXT 본문 변환 결과와 영속 checksum을 대조하고, binary/text batch 실패 뒤 본문을 유지한 행별 재시도·미기록 오류 행 정정·같은 run 재개를 확인했다 | 같은 엔진 통합 테스트 |
| 수치·고정 문자·시간 | decimal(38,9), unsigned bigint 최댓값의 BigInteger → numeric(20,0) 보존과 signed long 범위 초과 거절, CHAR Unicode·padding 조회 의미를 확인했다. DATE·DATETIME(6)의 전체 값·checksum과 PostgreSQL timestamp(6)의 6자리 소수초를 대조한다 | [값 타입 통합 테스트](../../migration-tool/src/test/java/nuri/migration/MariaDbValueTypesIntegrationTest.java) |
| 공개 workflow | 명시한 DB의 discover → 객체별 review → plan → validate → dry-run을 확인했다. scalar 501행과 LONG 본문 변환을 검증하고 target 업무 행·control 스키마 무변경을 확인한다. 승인 누락·target drift·UNVERIFIED COMMIT을 차단한다 | workflow 통합 테스트 |
| 직접 엔진의 프로세스 종료 | **통과**. 1,001행·8쌍 LONG 값 합계 152MiB를 최대 힙 128MiB 자식 JVM의 실제 StreamingResult에서 읽었다. 500·504 영속 checkpoint에서 각각 강제 종료하고 새 JVM으로 재개·재반복했다. 전체 1,001행의 본문 hash·checkpoint·무중복과 target binary/text 변조의 종료 코드 2를 확인했다 | [MariaDB JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlMariaDbCrashRecoveryIntegrationTest.java) |
| 배포 CLI | **통과**. 실제 bootJar·외부 JDBC JAR에서 13단계의 성공·거절 결과를 확인했다. discover·review·validate·dry-run, 정상 실행 가능한 app/driver JAR에 합성 리소스를 추가한 digest 변경과 ack 누락의 거절·무 artifact·무 DB 쓰기를 확인했다. isolated 외부 driver COMMIT 금지는 유지한다 | [배포 CLI 시험](../../migration-tool/src/test/java/nuri/migration/MariaDbPackagedCliIntegrationTest.java) |
| 서버 행 제한 | **통과**. 10행 fixture에 `setMaxRows(2)`를 적용해 `selectedRows=2`, `serverRowsSentDelta=2`, `statusRows=1`을 기록했다. 최초 예상 3은 SHOW 자신의 행까지 세는 잘못된 assertion이었다. 수정 후 연속 SHOW의 counter 무증가와 예상 delta 2를 모두 확인했다 | 엔진 통합 테스트 |

공개 운용에는 명시적 `useCatalogTerm=SCHEMA`, `--schemas=<정확한 DB>`와 단일 DB의 관계형 객체 범위가 필요하다.
기본 CATALOG metadata의 탐색 성공은 이 경로의 승인 가시성 증명이 아니다. 원천 mapping은 `table` 또는
`DB.table`을 사용한다. `def.DB.table`을 포함한 3단 이름은 metadata 조회 전에
`MARIADB_SOURCE_CATALOG_QUALIFICATION_UNSUPPORTED`로 거절한다. MySQL의 null catalog 보정을 MariaDB에 적용하지 않는다.
권한 증명은 `CURRENT_ROLE() IS NULL`과 현재 계정의 직접 권한만 대조하며, 실제 DB 철자와 grant의 리터럴
escape 철자를 구분한다. SELECT 증명은 다른 쓰기 권한의 부재나 source freeze를 증명하지 않는다.
리터럴 DB 권한의 가시성 시험은 기존 unquoted mapping SQL 식별자 문법을 넓히지 않는다.
추가 namespace 경계도 **red → 수정 → green을 확인했다**. raw schema를 JDBC LIKE pattern으로 넘기고 테이블
이름만 대조한 기존 컬럼 수집은 `md_<suffix>`와 `mdX<suffix>`의 같은 이름 테이블에서 인접 DB의
전용 컬럼 `neighbor_only`까지 섞어 실패했다. 공통 컬럼 수집에서 null schema 처리와 schema pattern escape를
유지하고, catalog·schema·table을 정확히 대조한 뒤 컬럼과 default를 읽도록 보완했다.
같은 fixture의 서로 다른 payload 타입·인접 DB 전용 컬럼 구분을 수정 후 통과했으며, 최신 23건에 포함된다.

MariaDB LONGTEXT/LONGBLOB의 실제 JDBC 타입 `LONGVARCHAR`/`LONGVARBINARY`는 명시적 adapter capability로 허용한다.
ResultSet 안에서 본문을 `String`/`byte[]`로 읽어 변환·checksum·target 기록과 checkpoint에 결속한다.
값별 상한은 **바이너리 32MiB, 문자 16,777,216 UTF-16 단위**, 행 보관 추정치는 64MiB다.
페이지는 최대 500행 또는 마지막 행을 포함한 뒤 누적 8MiB 기준으로 나누며 전체 JVM 힙 상한은 아니다.
Oracle의 LONG* 차단과 다른 미실측 vendor의 제한은 유지한다. DATETIME은 실제 JDBC `Timestamp`로 읽히고,
driver `DECIMAL_DIGITS=0`과 물리 `information_schema.COLUMNS.datetime_precision=6`을 각각 확인한다.
메타데이터의 0을 물리 소수초 부재의 증거로 취급하지 않는다. 이전 LocalDateTime hash 표현과 run의 호환성은
위 MySQL 관측 및 [reconciliation 절차](migration-recovery-runbook.md#재개와-reconciliation)를 따른다.

원천 조회는 실제 MariaDB Connector/J를 확인한 forward-only/read-only statement의 **positive fetchSize=1**을 사용한다.
MySQL cursor URL이나 MIN_VALUE sentinel 조건을 요구하지 않는다. 현재 ETL의 네 조회 경로는 ResultSet을 먼저 닫고
Statement를 닫은 뒤 다음 source query를 실행한다. Connector/J 3.5.10의 ResultSet.close는 잔여 패킷을 읽어 버리지만,
Statement만 먼저 닫거나 미완료 결과를 둔 채 같은 연결에 query를 내면 `fetchRemaining`이 잔여 행을 배열에 모을 수 있다
([Result.close 공식 소스](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/Result.java#L357),
[StreamingResult 공식 소스](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/StreamingResult.java#L146)).
행별 ResultSet.getMetaData/getColumnType은 기존 column decoder를 참조하며 별도 query를 내지 않는다
([결과 metadata](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/Result.java#L768),
[column type](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/client/result/ResultSetMetaData.java#L213)).
공식 driver 소스에서 MariaDB 10.3 이상은 `setMaxRows`를 `SET STATEMENT SQL_SELECT_LIMIT=<n> FOR`로 전달한다
([Connection 조건](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/Connection.java#L95),
[client prepared 경로](https://github.com/mariadb-corporation/mariadb-connector-j/blob/3.5.10/src/main/java/org/mariadb/jdbc/ClientPreparedStatement.java#L59)).
위 시험의 실제 SELECT 2행과 session Rows_sent 증가 2를 확인했다. 같은 서버의 독립 읽기 전용 프로브에서도
session counter 0 → SELECT 2행 → counter 2 → SELECT 3행 → counter 5를 관측했으며,
SHOW는 자신의 status 행을 session counter에 남기지 않았다. 연속 SHOW 무증가와 delta 2의 수정 assertion도 통과했다.
MariaDB 11.4.13의 `execute_show_status`도 SHOW 실행 뒤 session status snapshot을 복원한다
([서버 공식 소스](https://github.com/MariaDB/server/blob/mariadb-11.4.13/sql/sql_parse.cc#L5904)).
실제 관측은 10행 fixture의 `setMaxRows(2)`에 대한 증거이며 최대 크기 payload나 전체 운영 I/O 비용의 보장이 아니다.
byte 기준으로 일찍 나누면 해당 결과의 미처리 패킷 드레인과 다음 keyset 재조회에 추가 I/O가 남는다.
fetch1은 한 행의 큰 패킷·LOB 취합·임시 복사에 대한 일정한 메모리 상한을 보장하지 않는다.

MariaDB 어댑터는 **UNVERIFIED**이며 공개 및 isolated 외부 driver COMMIT은 계속 거절한다.
직접 엔진 시험은 승인형 공개 load의 자격을 부여하지 않는다. 단일 InnoDB REPEATABLE READ와 수동 freeze 확인은
운영 freeze의 실제 이행이나 재시작 사이의 같은 snapshot을 증명하지 않는다. 최대 허용 LOB·GB/TB 규모·처리량·
운영 cutover와 전체 백업 복원은 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다.
이번 보완 후 검증은 영향받은 MariaDB 가시성·workflow 실제 DB 시험, 공통 adapter/JDBC/validator 단위 경계와
백엔드 compile을 실행했다. 기존 Oracle/MySQL runtime 전체나 기본 `verify:migration` 전체는 이 회차에서 실행하지 않았다.
scoped Delta PIT는 `SourceReadStatements`, `MariaDbDiscoveryVisibilityProof`, `MariaDbSourceAdapter`,
`MappingValidator`, `JdbcMetadataSourceAdapter`의 정확한 5개 클래스와 관련 adapter/JDBC/validator/ETL 단위를
`STRICT_MUTATION=true`·75% 기준으로 검사해 **443/510개 탐지(86.86%)**로 통과했다.
관련 단위 시험은 40개 클래스이며 결과는 정상 탐지 436개·제한시간 탐지 7개·미탐지 44개·미실행 23개,
run/memory error 0개다. 점수는 이 5개 클래스의 합산이며 전체 ETL·운영 이관의 검증 점수가 아니다.
`JdbcMetadataSourceAdapter`는 207/233개, MariaDB 가시성 증명은 43/44개, MariaDB adapter는 1/1개,
`SourceReadStatements`는 23/23개, `MappingValidator`는 169/209개를 탐지했다.
새 컬럼 수집의 schema null 처리와 catalog·schema·table 대조 분기 변이는 모두 탐지했다.
현재 변경의 required CI·CodeQL은 실행하지 않았다. 실제 DB 표적 명령은
`./gradlew :migration-tool:test --tests '*MariaDbDiscoveryVisibilityIntegrationTest' --tests '*MariaDbWorkflowPostgresIntegrationTest'`다.
Windows에서는 `.\gradlew.bat`를 사용한다. 일반 모듈 시험과 독립 CI의 전체 통합 시험 등록은 유지하며,
위 두 scoped PIT 작업의 정확한 subprocess 네 클래스 제외는 일반 classpath/JAR의 mutant 미실행 경계에만 적용한다.

## 이관 SQL Server 후속 단계 실측

2026-09-16 폐기용 Docker의 SQL Server 2022 `16.00.4295`, Microsoft JDBC Driver 13.6 for SQL Server
`13.6.0.0`, PostgreSQL `17.10`으로 별도 시험했다. 원천 이미지는
`mcr.microsoft.com/mssql/server@sha256:4402d880dd4c34bfa7d8705e56a86cd6c88da80a1f6bbbe741f999e76264a090`로 고정한다.
전용 `migration_fixture` DB의 `dbo` 스키마와 합성 데이터만 사용하며 운영 DB·표준 엔티티는 변경하지 않았다.
SQL Server 어댑터의 증거 수준은 **UNVERIFIED**로 유지한다.

회차별 JUnit XML에서 서로 다른 실제 SQL Server 시험 **47건의 통과**를 확인했다.
metadata 1건·직접 엔진 14건·가시성 19건·값 타입 4건·workflow 7건·프로세스 종료 1건·배포 CLI 1건이다.
이는 여러 회차의 개별 시험 최종 성공을 합친 수이며, 47건을 한 회차에서 모두 실행하거나 전체 모듈이 통과했다는 뜻은 아니다.
초기 회차에는 공개 workflow 5건과 CONTROL SERVER 권한 경계 1건의 실패가 있었다.
후속 MAX lookahead의 의도적 red도 확인했으며, 수정 후 해당 시험과 workflow·권한 경계 시험의 통과를 별도로 확인했다.
로컬 정본 XML은 `migration-tool/build/reports/sqlserver-rehearsal-*`에 회차별로 보존한다.
`boundaries-green` 폴더에도 후속 수정 전 실패가 남아 있으므로 폴더 이름을 전체 성공 판정으로 사용하지 않는다.

| 범위 | 확인된 결과·경계 | 근거 |
|---|---|---|
| 실제 metadata | catalog `migration_fixture`·schema `dbo`, JDBC 및 물리 `sys.columns`를 대조했다. MAX는 LONG 코드가 아니라 `VARBINARY(-3)`·`NVARCHAR(-9)`·`VARCHAR(12)`이며 JDBC COLUMN_SIZE는 모두 2,147,483,647이다. nvarchar의 ResultSet precision은 1,073,741,823으로 별도 확인했다 | [metadata 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerMetadataIntegrationTest.java) |
| 가시성 | 현재 비시스템 DB의 `dbo`에서 original/current login 일치·현재 사용자 dbo·sysadmin membership이 필요하다. SCHEMA/TABLE/COLUMN/PRIMARY_KEY만 증명하며 일반 schema SELECT·VIEW DEFINITION·table/column/role·CONTROL SERVER 권한과 impersonation은 미증명으로 유지한다 | [가시성 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerDiscoveryVisibilityIntegrationTest.java) |
| 직접 엔진의 scalar 복구 | BIGINT/VARCHAR 1,001행의 오류 행 501만 기록·checkpoint가 없고 나머지 1,000행은 보존한다. 미기록 행 정정 후 같은 run 재개·재반복·전체 값·무중복과 target 변조 탐지를 확인했다 | [엔진 통합 테스트](../../migration-tool/src/test/java/nuri/migration/EtlSqlServerPostgresIntegrationTest.java) |
| MAX 전체 내용·변환 | 16MiB varbinary(max) → bytea, 11MiB UTF-8 Unicode nvarchar(max) → text의 전체 내용·SHA-256·NULL/빈 값·재반복·마지막 값 변조를 확인했다. binary/text batch 실패 뒤 본문을 유지한 행별 재시도·미기록 행 정정·재개와 text trim 결과의 영속 checksum을 대조했다 | 같은 엔진 통합 테스트 |
| MAX 크기 경계 | 바이너리 32MiB와 nvarchar/varchar 16,777,216 UTF-16 단위는 전체 값을 보존했다. 각 상한+1은 `LOB_SIZE_LIMIT_EXCEEDED`로 target/checkpoint 0행이다. 페이지 lookahead의 초과 MAX 정렬 키도 이전 페이지 기록 전에 거절한다 | 엔진 통합 테스트, [자기 참조 키 단위 회귀](../../migration-tool/src/test/java/nuri/migration/etl/SqlServerSelfReferenceReadTest.java) |
| 수치·고정 값·시간 | decimal(38,9) → numeric(38,9), signed BIGINT 경계·DATE·DATETIME2(6) → timestamp(6)의 전체 값·checksum을 대조했다. long 범위 초과·소수 포함 decimal → bigint는 기록 전에 거절한다. binary(8) padding·GUID의 JDBC CHAR/String → text·BIT → boolean·VARCHAR 공백·NULL과 변조 탐지를 확인했다 | [값 타입 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerValueTypesIntegrationTest.java) |
| 원천 읽기·서버 행 제한 | forward-only/read-only statement·positive fetchSize=1에서 외부 `responseBuffering=full`을 adaptive로 덮어쓴 실제 값을 확인했다. 10행 fixture의 setMaxRows(2)는 첫 결과 2행과 같은 SQL batch의 `@@ROWCOUNT=2`로 서버 제한을 대조했다 | 엔진 통합 테스트, [statement 단위 회귀](../../migration-tool/src/test/java/nuri/migration/jdbc/SourceReadStatementsTest.java) |
| 공개 workflow·물리 읽기 전용 | 실제 READ_ONLY DB에서 discover → 객체별 review → plan → validate → dry-run의 scalar/MAX 본문 변환·PASS artifact·target/control 무변경을 확인했다. JDBC read-only 신호는 false로 보존하며 실제 INSERT·UPDATE는 오류 3906으로 거절된다. READ_WRITE source·승인/ack/freeze 누락·target drift·UNVERIFIED COMMIT을 차단한다 | [workflow 통합 테스트](../../migration-tool/src/test/java/nuri/migration/SqlServerWorkflowPostgresIntegrationTest.java) |
| 직접 엔진의 프로세스 종료 | 1,001행·8쌍 MAX 값은 SQL Server 물리 저장량 144MiB, PostgreSQL UTF-8 대상 내용 합계 152MiB다. 최대 힙 128MiB JVM을 500·504 영속 checkpoint에서 각각 강제 종료하고 새 JVM으로 재개·재반복했다. 전체 내용 SHA-256·checkpoint·무중복과 binary/text 변조의 종료 코드 2를 확인했다 | [SQL Server JVM 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlSqlServerCrashRecoveryIntegrationTest.java) |
| 배포 CLI | 실제 bootJar·외부 JDBC JAR의 13단계에서 discover·review·validate·dry-run을 확인했다. source driver 누락·실행 가능한 app/driver JAR의 digest 변경·driver ack 누락/불일치를 거절하며 업무/control 쓰기는 없다. isolated 외부 driver COMMIT 거절과 adapter UNVERIFIED는 각각 유지한다 | [배포 CLI 시험](../../migration-tool/src/test/java/nuri/migration/SqlServerPackagedCliIntegrationTest.java) |

MAX reader와 SQL Server preflight·가시성 proof는 본문 오류 뒤 자원 정리 중 발생한 JVM fatal 오류를 전파한다.
수정 전 실패·수정 후 통과를 확인했고, 최종 관련 단위 시험 148건과 `compileJava compileTestJava`가 통과했다.
변경한 adapter·visibility proof·source statement·LOB reader·fatal boundary 5개 클래스의 strict Delta PIT는
145/149(97.32%)로 75% 기준을 통과했다. 기존 incremental 결과 114개를 재사용했고, survivor 4개·미실행/무커버리지 0개다.
이는 전체 ETL 클래스나 제품 전체의 변이 분석 결과가 아니다. 관련 문서·메모리·Atlas·PIT 실행 경로·SAST 계약 70건도 통과했다.

공개 가시성 범위는 catalog 옵션 없이 `--schemas=dbo`와 위 관계형 객체 종류를 명시한다.
sysadmin은 DENY를 우회하므로 이 증명은 최소권한 SELECT-only 계정의 가시성 자격이 아니다.
원천 SQL 이름의 `DB.schema.table`은 현재 DB일 때만 허용하며 다른 catalog는 target 상태 생성 전에 차단한다.
Microsoft driver의 `setReadOnly(true)`만으로 쓰기 금지를 판단하지 않는다. 해당 driver 버전의 preflight는
실제 연결 catalog와 `DB_NAME()`이 같고 `DATABASEPROPERTYEX(...,'Updateability')=READ_ONLY`인 비시스템 DB에서만
누락된 JDBC 힌트의 차단을 물리 증거 경고로 바꾼다. `connectionReadOnlySignal=false`, privilege·UNVERIFIED 경고와
기존 `--ack-adapter`·`--ack-source-freeze`·공개 COMMIT 금지는 유지한다.

SQL Server의 VARBINARY/VARCHAR/NVARCHAR는 ResultSet 안에서 bounded stream으로 읽어 `byte[]`/`String` 본문을
변환·checksum·target/checkpoint에 결속한다. MAX 정렬 키의 페이지 lookahead와 자기 참조 키 pre-mint에도 같은 읽기 제한을 적용한다.
자기 참조 초과 키는 ID 생성·target 접근 전에 실패하고 Reader·ResultSet·Statement가 닫히는 것을 별도 단위 시험으로 확인했다.
값별 상한은 **바이너리 32MiB, 문자 16,777,216 UTF-16 단위**, 행 보관 추정치는 64MiB다.
페이지는 최대 500행 또는 마지막 행을 포함한 뒤 누적 8MiB로 나눈다. 임시 본문 복사·JDBC 버퍼·keymap/checkpoint를
포함한 전체 JVM 힙의 고정 상한이 아니며, 128MiB 시험과 최대 크기 단일 값 시험도 서로 다른 fixture다.
앞선 ResultSet 컬럼을 다시 읽지 않고 왼쪽부터 한 번씩 소비한다. 기존 JDBC Timestamp의 영속 checksum 의미와
이전 LocalDateTime 표현 run의 [reconciliation 절차](migration-recovery-runbook.md#재개와-reconciliation)는 유지한다.

직접 엔진의 COMMIT 시험은 승인형 공개 load의 vendor/driver 자격을 부여하지 않는다.
최소권한 계정·database snapshot/SNAPSHOT isolation·운영 freeze의 이행·재시작 사이 snapshot·GB/TB 규모·처리량·
전체 힙 보장·운영 cutover와 전체 백업 복원은 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다.
Oracle 19c `19.3.0.0.0`은 별도로 실측했으며 범위와 결과는 [Oracle 19c 후속 단계 실측](#이관-oracle-19c-후속-단계-실측)을 따른다.
Tibero는 라이선스 파일 부재로 기동하지 못해 discover·load를 아직 실측하지 않았다.
이번 SQL Server 및 Oracle Free 결과를 이들 환경의 자격으로 승계하지 않는다.

## Tibero 및 Oracle 19c 실행 환경 점검

2026-09-16 `tiberoofficial/tibero:7.2.6`을 실제로 내려받았다. linux/amd64 이미지 digest는
`sha256:9132b7e399d5f5384848823c531b63c2d060f9e0b297b0afc6aaa6c6d0905614`다.
이미지의 설치 압축파일에서 `tibero7-jdbc-17.jar`를 확보하고 `com.tmax.tibero.jdbc.TbDriver` 클래스를 확인했다.
드라이버 SHA-256은 `2e8ad3e9bdb8bfb8c2cdc03692f504e3f43c8b7f7c546fc705ffb37785425de2`다.
드라이버와 실행 근거는 Git에서 제외하는 로컬 build 경로에 보관하며 운영 의존성에는 추가하지 않았다.

설치 압축파일에는 license 디렉터리만 있고 `license.xml`이 없다. hostname `egov-migration-tibero`,
2 CPU·4GiB 메모리·외부 네트워크 없는 폐기용 컨테이너의 실제 설치·기동은 종료 코드 1로 실패했다.
고정 오류는 `Can't open the license file`이며 요구 경로는 `/opt/tibero7/license/license.xml`이다.
이 이미지는 별도 발급한 demo/유료 라이선스와 발급 hostname의 일치를 요구한다([배포 안내](https://hub.docker.com/r/tiberoofficial/tibero)).
점검용 컨테이너와 생성한 자격증명 파일을 정리하고 이미지·드라이버만 보존했다.

Oracle 19c의 `container-registry.oracle.com/database/enterprise:19.3.0.0`도 실제 `docker pull`로 확인했지만
anonymous token 요청이 `401 Unauthorized`로 거절돼 내려받지 못했다. Oracle Registry의 licensed 이미지는
계정·저장소별 약관 수락·Auth Token 인증이 필요하다([현재 인증 문서](https://docs.oracle.com/en/operating-systems/oracle-linux/podman/registries.html)).
별도 직접 빌드는 사용할 수 있는 `LINUX.X64_193000_db_home.zip`을 제공해야 한다([공식 빌드 지침](https://github.com/oracle/docker-images/blob/main/OracleDatabase/SingleInstance/README.md)).

별도로 공개 community 게시자의 `fugeritorg/oracle-19.3.0-ee:2025.0` linux/amd64 이미지를 내려받았다.
시험에 사용하는 pin은 `fugeritorg/oracle-19.3.0-ee@sha256:6a29a3c7924de980b9cf10ef8c7e6120fe2db8e3fc32b2087aa59a845e4c63ac`이다.
이는 공식 Oracle Registry 이미지가 아니며, 게시자는 개발용 이미지로 안내한다([게시자 배포 안내](https://hub.docker.com/r/fugeritorg/oracle-19.3.0-ee)).
이 community 이미지를 폐기용 Oracle 19c EE/PDB로 기동해 [후속 단계](#이관-oracle-19c-후속-단계-실측)를 실측했다.
Tibero discover·load는 유효한 `license.xml`과 발급 hostname을 확보한 뒤 검증할 미완료 항목이다.
어댑터의 `UNVERIFIED`와 공개 COMMIT 금지는 유지한다.
로컬 근거는 `migration-tool/build/reports/tibero-availability-20260916`과 `migration-tool/build/reports/oracle19c-rehearsal-20260916`이다.

## 이관 Oracle 19c 후속 단계 실측

2026-09-16 Oracle Database 19c Enterprise Edition **19.3.0.0.0**, CDB·PDB `ORCLPDB1`,
문자 집합 `AL32UTF8`, ojdbc11 **23.26.3.0.0**, PostgreSQL **17.10**을 실제 JDBC와 Oracle 사전 조회로 확인했다.
위 community 이미지 pin을 사용했으며 일반 local 계정의 `ORACLE_MAINTAINED=N`, `COMMON=NO`와
CREATE SESSION·CREATE TABLE·CREATE SEQUENCE·UNLIMITED TABLESPACE 네 권한을 대조했다.
서로 다른 시험 **22건이 모두 통과**했으며 skip은 0건이다.

| 검증 범위 | 고유 시험 수 | 확인한 결과 |
|---|---:|---|
| 직접 엔진 | 6 | scalar·native BLOB/CLOB의 COMMIT·ROLLBACK, NULL/빈 값, 오류 행 정정 후 재개·재반복·전체 값·무중복·변조 탐지 |
| 승인 workflow | 4 | discover → plan → 객체별 review → validate → DRY_RUN, source 본문 대조·target 무쓰기·target drift·UNVERIFIED 공개 COMMIT 거절 |
| JVM 종료와 복구 | 1 | 1,001행·8쌍의 큰 BLOB/CLOB, 합계 152MiB를 최대 힙 128MiB JVM의 영속 checkpoint 500·504에서 각각 강제 종료 후 재개·재반복·전체 SHA-256·무중복·본문 변조 종료 코드 2 |
| 가시성 | 6 | owner·빈/미존재 schema·다른 owner 일부 SELECT·CURRENT_SCHEMA 변경·미지원 범위·메타데이터 실패의 판정 |
| 값 타입·checkpoint | 3 | NUMBER(38,9)/(38,0)·RAW·자정이 아닌 DATE·TIMESTAMP(6)·finite BINARY_FLOAT/DOUBLE·Unicode NCLOB의 전체 값, namespace/소문자 table에 결속한 checkpoint SHA·재개·변조 탐지 및 시간대→local timestamp 변환 거절 |
| 배포 bootJar | 1 | 별도 자식 JVM 16단계 통과: driver 누락·원본 raw isolated manifest 거절·discover·미검토 plan 거절·review·validate·app/driver JAR 변조·adapter/freeze ack 거절·501행 DRY_RUN·UNVERIFIED 공개 COMMIT 거절, target/control 무쓰기 |
| 물리 메타데이터 | 1 | 12개 컬럼의 JDBC/물리 구조·NULL/빈 LOB, native TIMESTAMP 원본 표현·typed microseconds·시간대 대조 |

최초 22건 실행의 12건 통과·10건 실패, 영향 회귀 11건 실행의 10건 통과·1건 실패,
마지막 메타데이터 1건 실행의 1건 통과를 보존했다.
첫 회차의 엔진 6·workflow 4·JVM 복구 1, 두 번째 회차의 가시성 6·값 타입 3·배포 JAR 1에서
21건의 통과를 집계하고 마지막 물리 메타데이터 1건을 더해 고유 22건을 확인했다.
두 회차에 중복된 시간대 변환 거절 시험은 한 번만 센다. 최종 22건은 각 회차의 성공 근거를 합산한 결과다.
테스트 계정의 비밀번호를 Oracle 19c의 30-byte 제한 안으로 보정했고, 실제 RAW JDBC 코드
`VARBINARY(-3)`와 native `oracle.sql.TIMESTAMP` 표현에 맞춰 기대값을 수정했다.
마지막 메타데이터 시험은 12개 컬럼의 DatabaseMetaData·ResultSetMetaData·USER_TAB_COLUMNS,
native TIMESTAMP 원본 소수초와 별도 `getTimestamp()`의 `123456000` nanos·`OffsetDateTime`을 대조한다.

배포 JAR 시험은 **수정하지 않은 원본 Oracle JAR을 명시 JVM module path에 넣고 BUNDLED evidence와 전체 JAR SHA-256을 결속**한다.
원본의 `Class-Path: oraclepki.jar`를 가진 raw isolated JAR은 기존 `LocalDriverJarPolicy`에서 계속 거절한다.
별도 Java 21 probe에서도 module path의 암묵 manifest 의존성 미노출과 원본 CodeSource·전체 JAR SHA를 확인했다.
Oracle driver와 Testcontainers는 테스트 전용이며 배포 bootJar에 포함하지 않는다.
이 경로가 isolated driver의 공개 COMMIT 허용이나 어댑터 자격 승격을 부여하지 않는다.

19c fixture는 Test JVM마다 원천 하나를 공유하고 JVM 종료 시 정리한다. 원천은 4 CPU·6GiB 메모리·1GiB shared memory이며
최초 cold DBCA는 약 20분이었다. cold-start 상한은 30분이고 ready 로그·JDBC·실제 버전·PDB·charset 확인은 모두 필수다.
전체 범위를 재현하려면 아래처럼 하나의 Test task에 여섯 클래스를 선택한다.

```powershell
$env:MIGRATION_ORACLE19C_IMAGE = 'fugeritorg/oracle-19.3.0-ee@sha256:6a29a3c7924de980b9cf10ef8c7e6120fe2db8e3fc32b2087aa59a845e4c63ac'
./gradlew.bat :migration-tool:test --no-daemon --warning-mode fail --console=plain `
  --tests 'nuri.migration.EtlOraclePostgresIntegrationTest' `
  --tests 'nuri.migration.OracleWorkflowPostgresIntegrationTest' `
  --tests 'nuri.migration.EtlOracleCrashRecoveryIntegrationTest' `
  --tests 'nuri.migration.OracleDiscoveryVisibilityIntegrationTest' `
  --tests 'nuri.migration.OracleMetadataIntegrationTest' `
  --tests 'nuri.migration.OraclePackagedCliIntegrationTest'
```

직접 엔진 COMMIT의 성공과 공개 승인 load의 vendor/driver 자격은 별도다. `UNVERIFIED`·`MANUAL_ONLY`,
adapter/freeze 승인과 공개 COMMIT 금지는 유지한다. 다른 Oracle release/RU, 최소권한·SCN/일관성·운영 freeze,
GB/TB 규모·전체 JVM 힙 보장·cutover·전체 백업 복원은 [복구 런북](migration-recovery-runbook.md#전체-롤백과-cutover)의 별도 검증이다.
Tibero는 위 라이선스 기동 실패로 discover·load를 아직 실측하지 않았다.

## 이관 Oracle Free 표준화 리허설

2026-10-15 Oracle Free 를 원천으로 표준화 이관 전체를 시험 클래스 하나에서 돌렸다([리허설 시험](../../migration-tool/src/test/java/nuri/migration/OracleStandardizationRehearsalIntegrationTest.java), ADR-0029 L4-B, [DEC-OPS-323](../../.agent/memory/decisions.md)). 합성 데이터만 쓴다. 공개 workflow 는 DRY_RUN 까지 가고, COMMIT 은 승인 게이트 아래의 엔진으로 한다(위 vendor 리허설과 같은 길). Oracle 의 `UNVERIFIED`·`MANUAL_ONLY` 등급과 공개 COMMIT 차단은 그대로다 — 합성 데이터와 Free 이미지는 기관 증거가 아니다.

| 항목 | 값 |
|---|---|
| 원천 이미지 | `gvenzl/oracle-free@sha256:f5ff19033860d662c821cb04eb10483fa94f14f78eae252d054291ea07028093`(`23-slim-faststart`). 시험 지원 클래스가 이 digest 로 고정한다 — 기존 Oracle 시험 6개도 같은 이미지를 쓴다 |
| 원천 버전 | Oracle AI Database 26ai Free Release 23.26.3.0.0, `VERSION_FULL` 23.26.3.0.0(일반 계정이 읽는 `PRODUCT_COMPONENT_VERSION` 에서 읽었다) |
| 문자 집합 | `NLS_CHARACTERSET` AL32UTF8, `NLS_NCHAR_CHARACTERSET` AL16UTF16 |
| 드라이버 | ojdbc11 23.26.3.0.0, JAR SHA-256 `764cc3f88454d1be117e155d01ed617467b984c9c68f13090dd6083799d2bb8c`. inventory 의 BUNDLED 드라이버 증거가 이 JAR 바이트에 결속된다 |
| 대상 | PostgreSQL 17.10(`postgres:17-alpine`), V2_128 형태의 표준 사전(동의어·허용값·폐기 여부). 원천과 달리 digest 로 고정하지 않은 태그라 다시 받으면 버전이 바뀔 수 있다(재현 한계) |

fixture 는 한글 `COMMENT ON` 이 달린 `LEG_USER` 1,300행이다. 가입일 `CHAR(8)` 에 자리표시 `00000000` 12행·달력에 없는 날짜 3행(키 10·600·1,300)·공백 8자 5행, 자정이 아닌 `DATE`, 소수 초가 든 `TIMESTAMP(6)`, 사용 여부 `CHAR(1)` 의 플래그 `1` 4행, 공백으로 채운 `CHAR(3)` 상태 코드, 정밀도 없는 `NUMBER` 키, BLOB·CLOB 을 둔다. DDL·DML 은 19c 에도 있는 구문만 썼다(19c 에서는 실행하지 않았다).

| 단계 | 결과 |
|---|---|
| discover | 소유자 범위, 가시성 결과 없음, 드라이버 증거 = 번들 ojdbc JAR 바이트 |
| profile | 위반 수가 fixture 와 정확히 같다(자리표시 12·달력 3·공백 5). `TIMESTAMP(6)` 1,300값을 시간형으로 세고 연도 범위를 낸다(R1). 표·컬럼 코멘트가 사전 뷰에서 온다(대조 `NOT_IN_INVENTORY`, R2). `CHAR(3)` 값 1,300개 모두 끝 공백이 있다 |
| term-suggest | 이름이 표준 약어와 다른 컬럼(최종 로그인·종료 시각·사용 여부)도 코멘트 용어명으로 `EXACT` 후보를 받는다. 프로파일·후보·원장 초안에 시험이 찾는 원시 값(달력 오류·자리표시 가입일·이름·메모)과 일회용 접속 정보가 없다 |
| 원장 확정·mapping-generate | 시험이 검토자·업무담당 역할로 초안을 확정한다 — 가입일 `ymd8` + nullify(자리표시 12·공백 5) + 승인 예외 3, 최종 로그인 `ymdhms14`, 종료 시각 `ymd8-truncate`, `CHAR(3)` 상태 코드 `trim` + codemap, `CHAR(1)` 사용 여부 codemap(선언 길이 1 은 R3 대상이 아니다), 비표준 대상(U1) 4. 만든 mapping 의 컬럼 처리·isolate 가 원장과 대상 컬럼마다 같다. 격리하는 보존 키 표라 L4-C 뒤에는 skeleton 에 `verify.referencedBy: none` 과 사유를 둔다(P3) |
| plan·review·validate | `commitReady=true`. 공개 COMMIT 은 `--archive-dir` 없이 거절되고, 있어도 `UNVERIFIED` 로 거절된다. 보관 디렉터리·대상은 비어 있다 |
| 공개 DRY_RUN | `PASS`, 읽음 1,300, nullified 17, 격리 3(순번 10·600·1,300), 대상 무쓰기. 실행 JSON 에 값이 없다 |
| 엔진 COMMIT·verify | 1,297행 적재, 격리 키 반출 3행(순번·정렬 키·위반, 저장소 밖 임시 디렉터리), verify `PASS`. 대상 값이 원천에서 따로 계산한 표준화 결과와 모두 같다. 정밀도 없는 `NUMBER` 키의 시퀀스가 격리한 마지막 키 뒤로 가서 온라인 다음 번호가 1,301 이다 |
| 부정 | 원장 상한 2 → 셋째 격리 행(1,300)에서 `ISOLATION_CAP_EXCEEDED`. trim 없는 `CHAR(3)` codemap 원장은 생성기가, 손으로 쓴 같은 mapping 은 plan 의 원장 대응 검사(coverage)가 같은 판정으로 거부한다(R3). 그 mapping 을 엔진에 바로 넣으면 `unmapped: fail` 이라 첫 행에서 `CODEMAP_UNMAPPED` 로 멈춘다. 다른 driver JAR 로 load 하면 드라이버 증거 불일치로 거절하는 단계는 기존 [packaged CLI 시험](../../migration-tool/src/test/java/nuri/migration/OraclePackagedCliIntegrationTest.java)(`changed-source-driver`)이 덮어 리허설에 두지 않았다 |
| TIMESTAMP 정렬 키 | 1,001행이 page 경계 둘을 넘어도 소수 초까지 같은 값으로 쓰이고, 같은 run 을 다시 돌려도 무중복이다. 첫 경계에 걸친 중복 키는 dry-run 이 `SQL_EXECUTION_FAILED` 로 멈춘다 |
| 조회·나눈 매핑(L3c·L3d 병합 뒤) | 주문 1,001행을 두 매핑으로 나누고(`ord_h`·`ord`), `ord` 가 사용자 표를 별칭으로 조회한다. 나눈 매핑이 읽는 `TIMESTAMP(6)` 와 조회 표의 `TIMESTAMP(6)` 이 모두 `ymd8-truncate` 를 지나 원천에서 따로 계산한 값과 같고, checkpoint 는 매핑마다 1,001행이다(제어 스키마 V2). 조회 표의 `CHAR(3)` 코드는 trim 없는 codemap 이면 첫 행에서 `CODEMAP_UNMAPPED` 로 멈춘다. `TIMESTAMP` 를 조회 키로 쓰면 승인 load 의 live 원천 검사가 실행 전에 조회 키 계열로 거부하고, 실행기에 바로 넣어도 행마다 `LOOKUP_KEY_TYPE` 으로 멈춘다(심층 방어) |

탐침이 남긴 드라이버 사실은 아래와 같다. 출력은 클래스 이름·null 여부·건수뿐이다.

- **R1** `TIMESTAMP(6)` 은 JDBC `TIMESTAMP`(93)인데 `getObject` 가 `oracle.sql.TIMESTAMP` 를 준다. `DATE` 는 `java.sql.Timestamp` 다. 도메인 변환기·보관 덤프·프로파일러가 이 값을 시각으로 보지 못해, 드라이버가 알린 클래스가 `java.` 밖이면 드라이버가 준 지역 일시(`getObject(…, LocalDateTime.class)`)를 `Timestamp` 로 바꾼다. 시간대 있는 두 타입(-101·-102)은 그대로 둔다. 두 클래스의 `toString` 은 이 fixture(2025년, 일광절약 간격 밖)에서 소수 초가 있어도 없어도 같았고 탐침이 단언한다. JVM 시간대를 Asia/Seoul 로 두고 일광절약 간격의 `1987-05-10 02:30` 을 읽으면 드라이버의 지역 일시는 그대로였지만 `getTimestamp` 는 한 시간 밀었다 — 정렬 키라면 keyset 커서가 그 사이 행을 건너뛴다. 그래서 그런 값은 바꾸지 않고 `LOCAL_TIMESTAMP_IN_ZONE_GAP` 으로 멈춘다(탐침이 단언한다). 드라이버가 지역 일시 변환을 미지원(`SQLFeatureNotSupportedException`)이 아닌 다른 오류로 거절하면 `getObject` 로 물러나지 않고 `LOCAL_TIMESTAMP_READ_FAILED` 로 멈춘다 — 값마다 표기가 갈리면 정렬 digest 가 어긋난다(단위 시험). 프로파일러는 이런 고정 사유를 `FAILED` 행의 `failureReason` 에 남긴다 — SQLSTATE 가 없어 종전에는 원인이 사라졌다.
- **R2** 드라이버 기본 설정은 `REMARKS` 를 주지 않는다(표·컬럼 8개 중 0). 사전 뷰 `ALL_TAB_COMMENTS`·`ALL_COL_COMMENTS` 는 3건을 준다.
- **R3** `CHAR`·`NCHAR` 은 선언 길이까지 공백으로 채워 온다. 적합성 추정은 공백을 깎아 세고 codemap 은 깎지 않고 대조하므로 생성기가 trim 을 요구한다(모든 vendor).
- **R7** 실행기 순서(읽기 전용 → READ COMMITTED → autocommit 끔)로 연 트랜잭션에서도 다른 세션의 커밋이 다음 문장에 보였다(COUNT 2 → 3) — 문장 단위 스냅숏이었다(원인은 판정하지 않았다). 그래서 여러 문장을 읽는 load 는 source freeze 에 기댄다.

```sh
./gradlew :migration-tool:test --tests 'nuri.migration.OracleStandardizationRehearsalIntegrationTest' --console=plain
```

2026-10-15 로컬에서 두 번 실행해 두 번 모두 3건이 통과했다(실패·skip 0, 컨테이너 기동 포함 88.9초·76.3초). 검토 반영 뒤 다시 실행해 3건이 통과했다(47.9초). main(L3c·L3d)을 합친 뒤 조회·나눈 매핑 시험을 더해 4건이 통과했다(57.1초). 통합 검토 지적을 반영한 뒤 다시 실행해 4건이 통과했다(53.6초). 본 리허설은 DRY_RUN 실행 JSON 이 형식 5(기본 매핑의 매핑 id·제어 스키마·조회 기록 없음, 원천 행 수만 판정한 대사 기록 — L4-C 병합 뒤)인지와, 엔진 COMMIT 전후 제어 스키마가 V2 이고 checkpoint 의 매핑 id 가 기본 매핑('')인지도 본다. CI 실행 기록은 아직 없다 — PR CI 의 이관 shard 가 돌린다(배정은 duration profile 이 정한다). 수정 R1·R2·R3 을 하나씩 되돌리면 리허설이 각각 프로파일의 시간형 수, 프로파일 코멘트, 생성기 거부 단언에서 붉다. 일광절약 간격 판정을 되돌리면 `JdbcLobReaderTest` 가 붉다. 검토 반영 뒤 R3 판정은 생성기와 coverage 가 함께 쓰는 `LoadCapabilities` 로 옮겼다 — 판정을 끄거나 선언 길이 1 제외를 빼면 `LoadCapabilitiesTest`·`TermLedgerValidatorTest`·`MappingGeneratorTest` 가 붉다. PIT 는 `migration-collect` 1,024 mutations·91%(146초), 검토 반영 뒤 `migration-validate` 1,190 mutations·95%(103초), `migration-standardize` 978 mutations·92%(102초)다. main(L3c·L3d)을 합친 뒤 `migration-validate` 1,250 mutations·94%, `migration-standardize` 1,038 mutations·92%, `migration-collect` 1,024 mutations·91% 였고, 통합 검토 지적(프로파일러 사유)을 반영한 뒤 `migration-collect` 는 1,025 mutations·92%(108초)다. R3 판정에는 살아남은 변이가 없고, R2 의 소유자 없는 표 분기와 사전 뷰 읽기 실패 분기에서 빈 코멘트를 돌려주는 변이 둘이 살아남는다(빈 코멘트는 코멘트가 없는 것으로 보아 결과가 같다). R1 의 판정(`JdbcLobReader`)은 PIT 범위 밖이고 단위 시험·리허설이 지킨다.

통합 검토 뒤 읽기 경로와 새 판정을 하나씩 되돌려 다시 돌렸다. 한 번에 변이 하나이고, 모두 의도한 단언에서 붉었다(JUnit XML 은 로컬에만 있다).

| 되돌린 것 | 붉어진 시험과 단언 |
|---|---|
| 조회 표 읽기(`readLookupRows`)를 `getObject` 로 | 리허설 조회·나눈 매핑 시험 — 조회 컬럼 `join_ymd` 가 `DOMAIN_VIOLATION(UNSUPPORTED_VALUE_TYPE)` |
| `JdbcLobReader` 의 `TIMESTAMP` 변환을 끔 | 같은 시험 — 나눈 매핑 `ord_h` 의 `ord_ymd` 가 `DOMAIN_VIOLATION(UNSUPPORTED_VALUE_TYPE)` |
| live 원천 검사가 `TIMESTAMP` 조회 키를 받게 | 같은 시험 — 승인 load 의 조회 키 거부 단언(오류 0건) |
| 정렬 경계 읽기를 `getObject` 로 | `EtlSourcePagingTest` 경계 시험. 리허설 경계 시험은 이 fixture 에서 두 표기가 같아 통과한다 |
| 자기참조 키 읽기를 `getObject` 로 | `SqlServerSelfReferenceReadTest` 드라이버 고유 TIMESTAMP 시험 |
| 프로파일러 읽기를 `getObject` 로 | `SourceProfilerTest` Oracle 시험의 시간형 수(1 → 0)와 사유 시험 |
| 일반 오류 거절 처리(`LOCAL_TIMESTAMP_READ_FAILED`) 제거 | `JdbcLobReaderTest` 거절 시험 — 드라이버 `SQLException` 이 그대로 나온다 |
| 프로파일러가 사유를 버리게 | `SourceProfilerTest` 사유 시험 — `failureReason` 이 null |
| `failureReason` 의 `@JsonInclude(NON_NULL)` 제거 | `CollectionArtifactCodecTest` — 사유 없는 프로파일 본문에 키가 생긴다 |

한계: 1,300행 합성 fixture 라 `ORA-01555`·운영 규모·장시간 세션은 재지 않았다. 19c 에서는 실행하지 않았다(지원 클래스가 `MIGRATION_ORACLE19C_IMAGE` 를 받지만 이 클래스로 돌려 본 적은 없다). Tibero 는 라이선스가 없다. 탐색은 여전히 `REMARKS` 만 읽어 inventory 에 Oracle 코멘트 해시가 없다. R1 은 Oracle 에서만 실측했다 — 시간대 있는 값을 JDBC `TIMESTAMP` 와 고유 클래스로 알리는 다른 드라이버는 타입 이름(zone·tz)으로만 가린다. CUBRID 드라이버(11.3.1·11.3.2)는 시각 타입을 모두 `java.sql.Timestamp` 로 알려 R1 판정 밖이다(바이트코드 확인, 실행하지 않았다). Tibero 드라이버는 확인하지 않았다. `DATE` 처럼 드라이버가 `java.sql.Timestamp` 로 주는 값은 R1 판정 밖이라 JVM 시간대의 일광절약 간격에서 밀릴 수 있다(실행으로 확인하지 않았다) — 그런 시각이 있을 수 있는 데이터는 고정 오프셋 시간대(`-Duser.timezone=UTC`)로 실행한다. R3 은 고정 길이 문자만 막는다 — 끝 공백이 든 `VARCHAR` 코드는 적합성 추정이 공백을 깎아 세지만 codemap 은 깎지 않고 대조하므로, 프로파일의 끝 공백 수(`trailingSpaces`)를 보고 원장에 `trim` 을 적는다. 위 조회·나눈 매핑 시험은 엔진 수준의 읽기(R1·R3 적용)만 본다. 원장→mapping-generate 를 거치는 승인 workflow 의 분할·조회와 보관 덤프·대사의 Oracle 단계는 아래 O2 가 본다.

### O2 — 분할·조회·보관 덤프·load 안 대사(ADR-0029 L4)

L4-C(load 안 대사·공통코드 대사·실행 JSON 형식 5)를 합친 뒤 같은 시험 클래스에 O2 리허설을 더했다(시험 메서드 `splitLookupDumpAndReconciliationRehearsalRunsOnAnOracleSource`, 새 시험 클래스 없음). 원천 표 넷과 대상 표 둘이다.

- `LEG_EMP` 1,200행(keyset page 셋) — 정밀도 없는 `NUMBER` 키, `''` 로 넣은 이름 12행(Oracle 은 NULL 로 저장한다), 자리표시 가입일 `00000000` 8행, 자정이 아닌 `DATE`, `NUMBER(12,2)` 급여, 공백으로 채운 `CHAR(3)` 상태, 부서 조회에 짝이 없는 코드 2행, `NUMBER(3)` 직급 번호, 이메일 없는 24행, 앞 3행만 값이 있는 BLOB, 마이크로초가 든 `TIMESTAMP(6)` 변경 시각, 1/8 단위 소수가 든 정밀도 없는 `NUMBER` 비율, 자정인 `DATE` 계약 날짜
- `LEG_DEPT`(`VARCHAR2` 키)·`LEG_GRADE`(`NUMBER(10,0)` 키) — 조회만 한다. 두 `NUMBER` 키는 드라이버가 모두 scale 0 값으로 주므로 이 fixture 는 조회 키 정규화를 가리지 않는다(정규화는 `LookupResolverTest` 가 본다)
- `LEG_LOG_OLD` 400행(`TIMESTAMP(6)`·`RAW(16)`·`NUMBER(12,2)`) — 적재하지 않고 덤프만 한다
- 대상 기본 표와, 기본 표의 대리키를 물리 FK 로 가리키는 확장 표

| 단계 | 결과 |
|---|---|
| discover | 사용자 이름을 소문자로 적어도, Oracle 이 저장한 꼴(대문자)로 적어도 통과하고 두 inventory 의 객체가 같다. 종전에는 대문자로 적으면 inventory 의 owner(= schema = 사용자 이름)가 credential 검사에 걸려 멈췄다 — 아래 결함 절의 후속(DEC-OPS-326)으로 고쳤다 |
| 원장 확정·mapping-generate | 시험이 검토자·업무담당 역할로 확정한다 — 분할 id 둘(`emp`: 대리키 `EMP_` 채번·조회 둘, `emp_ext`: 이메일·사진과 같은 원천을 fkRef 로 가리키는 대리키), 조회 경로(via) 둘, 덤프만 하는 표의 외부 보관 셋과 정렬 키 이관 제외, 조회 키 이관 제외. 표준 용어는 가입일(`ymd8` + nullify 8)·상태 코드(`trim` + codemap)뿐이고 나머지는 비표준 대상(U1)이다 — 변경 시각·비율은 변환 없이, 계약 날짜는 `type: date` 로 옮긴다. 만든 mapping 이 원장과 대응한다(coverage 0건) |
| plan·review·validate | 조회만 하는 표 `LOOKUP_INPUT`, 덤프만 하는 표 `EXPORT_ONLY` 로 `commitReady=true` |
| 공개 DRY_RUN | `PASS`, 두 매핑 각 1,200행 읽음·무쓰기, 부서 조회 짝 없음 2(`maxMissing` 2 안), 덤프할 행 400(파일 없음). 형식 5 대사는 두 매핑 모두 원천 행 수(`SOURCE_ROWS`)만 판정해 `PASS`, 쓰기 세션 검사는 `NOT_CHECKED` |
| 엔진 COMMIT | 승인 plan 의 대상 fingerprint(제약 포함)를 다시 읽어 같은지 보고, 승인 load 와 같은 조립(runner 의 `approvedReconciliationPlan` — 원장 검증·live 표준 용어·공통코드 쓰기 전 게이트)으로 대사 계획을 만든다. 나눈 두 매핑은 원천 집계 문장 하나를 나눠 쓴다. 두 매핑 각 1,200행 적재, nullified 8, 짝 없음 2. 덤프 400행 = 읽은 400행이고, 기록 일시(`TIMESTAMP(6)` → R1 로 `Timestamp` → ISO 지역 일시)·RAW(`$base64`)·`NUMBER(12,2)` 가 원천 fixture 와 같다. `NUMBER(12,2)` 는 덤프 원문 토큰에 지수 표기가 없다 — 이 fixture 의 값으로는 쓰기 설정을 가리지 않는다(아래) |
| 대사(verify) | 두 매핑 `PASS`, 쓰기 세션 `ORIGIN`. 기본 매핑은 원천 행 수, NULL 계정 10컬럼(`''`→NULL 12행·nullify 8행 포함), 합(정밀도 없는 `NUMBER` 는 `SUM(col)` — 소수가 든 비율의 합이 맞는다, `NUMBER(12,2)` 는 `DECIMAL(38,2)` 캐스트), 최소·최대(`NUMBER` 셋·`DATE`·`TIMESTAMP(6)` — 마지막은 원천 집계 결과도 R1 을 지난다), codemap 분포, 형식 도메인(가입일), 조회 NULL 하한, 표본 240행×9컬럼이 모두 `PASS` 다. 판정하지 않은 검사는 설계상 대상 밖(조회·문자 합·비표준 도메인·fkRef·LOB)과 계약 날짜의 최소·최대(값은 그대로인데 날짜와 일시의 종류만 바뀐다, `UNSUPPORTED_VALUE_TYPE`)뿐이고, 집계 실패·원천 타입 모름으로 물러난 검사는 없다 — 두 매핑의 `NOT_COVERED` 목록을 정확히 단언한다. nullify 한 가입일은 설계상 사유 없이 표본에서 빠진다(표본은 실행기의 NULL 대체를 다시 하지 않는다). 확장 매핑은 원천 행 수·이메일 NULL 계정·표본(240행×1컬럼)이 `PASS` 다. 확장 표의 fkRef 는 물리 FK 로 증명(`PROVEN`), 유일 인덱스 2개 `PASS`, 상태 코드는 대상 1,200행을 메타 허용값과 대조해 `PASS`, 대조 원천이 없는 비표준 부서 코드는 `UNRECONCILED`(1,200행, 서명 대상) |
| 증거의 값·접속 정보 | 프로파일·후보·원장 초안·mapping·두 실행 JSON(형식 5 — 대사 기록을 그대로 싣는다)에 시험이 찾는 원시 값(이름·이메일·부서명·직급명·자리표시 가입일, 키 7 행의 급여·입사 일시, 덤프 표의 기록 일시·RAW), URL·비밀번호·보관 경로가 없다. 접속 사용자 이름(대소문자 무시)은 schema 한정 원천 이름(`OWNER.표`, 그 꼴로 시작하는 원장 행 id)에만 있다 |
| 대상 값 | 직원 행(변경 시각은 마이크로초까지, 비율, 계약 날짜 포함)이 원천에서 따로 계산한 표준화 결과와 같다. 확장 행은 같은 원천 행의 기본 행과 대리키를 함께 쓰고(다른 원천 행과 짝 지은 대조군은 0행), 대리키는 원천 행마다 한 번 채번했다 |
| 집계 실패 물러남 | 실행기 순서로 연 Oracle 읽기 전용 READ COMMITTED 트랜잭션에서 savepoint 를 만들 수 있고, 수치로 더할 수 없는 합(SQLSTATE 42000)을 savepoint 로 되돌린 뒤 같은 트랜잭션이 이어진다(COUNT 1,200 — Oracle 은 문장 단위로 되돌리므로 savepoint 가 없어도 이 수는 같다). savepoint 해제는 드라이버가 지원하지 않는다(`SQLFeatureNotSupportedException` — 실행기는 무시한다). 시험이 넷을 모두 단언한다. 그런 합을 끼운 대사 계획으로 실행기를 돌리면 COUNT 전용 문장으로 물러나 1,200행을 읽고, 원천 행 수·NULL 계정은 재고 그 묶음의 합·최소·최대는 `SOURCE_AGGREGATE_FAILED` 로 판정하지 않는다 |

L4-C 가 확인하지 못한 것으로 남긴 Oracle 동작은 위 실측으로 닫는다 — 집계 문장(`CAST(… AS DECIMAL(38,s))`, 정밀도 없는 `NUMBER` 의 `SUM(col)`, `DATE`·`TIMESTAMP(6)` 최소·최대)이 Oracle 에서 실패 없이 돌았고, `TIMESTAMP(6)` 집계 결과는 R1 을 지나 판정됐으며(L4-C 명세 F19), 읽기 전용 트랜잭션의 savepoint 와 실패 뒤 물러남이 동작한다. 정규형도 어긋나지 않았다 — `NUMBER` 는 `BigDecimal`, `DATE`·`TIMESTAMP(6)` 은 `Timestamp` 로 와서 대상 PostgreSQL 값과 같은 정규형으로 비교됐다.

**O2 가 찾은 결함 1 — 보관 id 에 실린 사용자 이름(L3e, main 코드).** 2026-10-16 첫 실행에서 공개 DRY_RUN 이 실행 증거를 쓰지 못하고 `database credential이 artifact에 포함될 수 없습니다` 로 멈췄다. 생성기가 보관 id 를 소문자 `schema_표_보존기한` 으로 만들었고, Oracle 은 로그인 사용자가 schema 소유자여야 가시성을 증명하므로(위 탐색 실측) 그 schema 가 곧 사용자 이름이다. 승인 workflow 의 credential 검사는 8자 이상 사용자 이름을 설정에 적은 그대로(대소문자 구분) 찾으므로, 사용자 이름을 소문자로 적은 설정에서 보관 기록의 id·덤프 파일 이름에 실린 소문자 사본이 걸렸다. 관측한 것은 공개 DRY_RUN 이다 — COMMIT 도 같은 증거 경로를 지나므로 같다고 본다(추론, Oracle 공개 COMMIT 은 `UNVERIFIED` 라 실행할 수 없다). 보관 id 를 표 이름(schema 제외)과 보존 기한으로 만들도록 고쳤다. 같은 이름의 표가 둘이면 종전대로 `_2` 를 붙인다. 이 규칙 전에 만든 mapping 을 다시 생성하면 보관 id 가 바뀌어 mapping digest 가 달라지므로 plan 부터 다시 승인한다.

이 수정은 소문자 사본만 없앤다. owner(= 사용자) 이름은 schema 한정 원천 이름(`OWNER.표`)과 그 꼴로 시작하는 원장 행 id(64자 이하면 `OWNER.표.컬럼` 그대로)로 inventory·plan·mapping·실행 JSON(`tables[].source`·`lookupMisses[].source`·`reconciliation.mappings[].source`·`archives[].ledgerEntries`·`codeSets[].ledgerEntry`)에 남는다. 그래서 사용자 이름을 Oracle 이 저장한 꼴(대문자)로 적은 설정은 첫 산출물인 inventory 에서 credential 검사에 걸려 discover 부터 멈췄다 — O2 가 실측했다. 소문자로 적은 설정은 산출물에 같은 이름이 대문자로 남는데도 대소문자만 달라 통과했다. 8자 미만 이름은 단어 경계로 찾고 마침표는 경계이므로 길이와 상관없이 같다(코드 판독). schema 이름이 접속 사용자 이름과 같은 대소문자인 다른 vendor 원천도 같았다(코드 판독, 실행하지 않았다).

**후속(2026-10-16, DEC-OPS-326).** 원천 사용자 이름이 원천 schema 이름(inventory 의 discovery scope·객체 schema, term-suggest 는 프로파일의 표 schema)과 대소문자 없이 같으면, 그 이름은 inventory(term-suggest 는 프로파일)가 이미 싣는 schema 이름이라 사용자 이름 검사에서 뺀다. 쓰려는 산출물 자체에는 그 이름이 없을 수 있다(scope 에만 있는 schema 등) — 산출물 전체로는 새 값이 아니다. 비밀번호·URL·endpointId 와 대상 접속 정보는 그대로 막는다 — 비밀번호가 schema 이름과 같아도 멈춘다. 새로 드러나는 값은 없다. 종전에도 소문자 설정에서 같은 이름이 대문자로 산출물에 남았고, 검사는 대소문자만 달라 통과했을 뿐이다. 리허설은 대문자로 적은 설정의 discover 가 통과하고 inventory 의 객체가 소문자 설정과 같은지 본다. 산출물에 접속 계정 이름을 남기지 않으려면 owner 와 다른 읽기 전용 이관 계정으로 접속한다.

**O2 가 찾은 결함 2 — 대사 분류의 사유 누락(L4-C 코드).** 분류기는 쓸 수 있는 검사를 판정하지 않을 때 사유를 남겨야 하는데(`ColumnClassifier` 계약) 두 경우를 사유 없이 뺐다. Oracle `DATE` 는 inventory 에 JDBC `TIMESTAMP` 로 와서, `type: date` 로 date 에 옮기면 최소·최대가 사유 없이 빠졌다 — O2 의 계약 날짜가 그 경우이고, 같은 옮김을 `DATE` 로 알리는 원천은 최소·최대를 판정한다. Oracle `BINARY_FLOAT`·`BINARY_DOUBLE`(드라이버 고유 JDBC 100·101)은 부동소수로 판정되지 않아 합·최소·최대가 `FLOAT` 사유 없이 빠졌다(코드 판독, 단위 시험만). 값은 그대로인데 날짜와 일시의 종류만 바꾸는 옮김은 최소·최대를 `UNSUPPORTED_VALUE_TYPE` 으로, 두 고유 타입은 `FLOAT` 으로 남기도록 고쳤다. nullify 컬럼의 표본 제외는 계약대로라 바꾸지 않았다.

O2 의 새 판정과 단언을 하나씩 되돌려 다시 돌렸다. 한 번에 변이 하나이고, 모두 의도한 단언에서 붉었다(JUnit XML 은 로컬에만 있다). 위 열 줄은 첫 판에서, 아래 여섯 줄은 검토 반영 뒤(2026-10-16) 돌렸다. 덤프 쓰기의 지수 없는 수 설정(`WRITE_BIGDECIMAL_AS_PLAIN`)을 끄는 변이는 붉지 않았다 — 이 fixture 에서 드라이버가 지수 표기가 될 값을 주지 않았다. 그 설정은 `ArchiveFileWriterTest`(`1E+3` → `1000`)가 지킨다.

| 되돌린 것 | 붉어진 단언 |
|---|---|
| `JdbcLobReader` 의 `TIMESTAMP` 변환(R1)을 끔 | 공개 DRY_RUN 의 `<archives>` — 덤프 값 종류 거부(`ARCHIVE_VALUE_TYPE_UNSUPPORTED`). R1 이 덤프 경로에도 적용된다는 증거다 |
| 정밀도 있는 `NUMBER` 합을 `DECIMAL(38,0)` 으로 캐스트 | verify — `salary_amt` 의 `SUM` 불일치 |
| 원천 최소·최대를 바꿔 읽음 | verify — `hired_dt` 의 `MIN_MAX` 불일치 |
| 실행기가 원천 NULL 문자를 `''` 로 씀 | verify — `emp_nm`·`email_addr` 의 `NON_NULL` 불일치 |
| 표본 재계산에서 codemap 을 뺌 | verify — `stat_cd` 의 `SAMPLE` 불일치 |
| 조회 NULL 하한을 엄격 부등호로 | verify — `dept_nm` 의 `LOOKUP_NULL_FLOOR` |
| 덤프만 하는 표의 첫 행을 쓰지 않음 | 공개 DRY_RUN 의 `<archives>` — 덤프 행(399) ≠ 읽은 행(400) |
| RI 트리거 증명을 끔 | 참조 기록의 `PROVEN` 단언(실제 `SCANNED`) |
| 집계 실패 뒤 COUNT 전용으로 물러나지 않음 | 물러남 단계 — 실행기가 `SOURCE_AGGREGATE_FAILED` 로 행을 읽지 않는다 |
| 원천 `COUNT(*)` 를 1 늘림 | O1·O2 의 공개 DRY_RUN 이 `SOURCE_ROWS` 불일치로 멈춘다 — DRY_RUN 의 대사가 Oracle 원천 집계로 판정한다 |
| 원천 집계 결과 읽기(`readAggregateRow`)를 `getObject` 로 | 기본 매핑 판정 목록 — `updated_at` 의 `MIN_MAX` 가 `PASS` 대신 `NOT_COVERED` 다. 집계 결과도 R1 을 지난다는 증거다(L4-C 명세 F19) |
| 정밀도 없는 `NUMBER` 합도 `DECIMAL(38,0)` 으로 캐스트 | verify — `rate` 의 `SUM` 불일치 |
| 날짜와 일시의 종류만 바뀌는 옮김의 사유를 뺌(결함 2) | 기본 매핑 `NOT_COVERED` 정확 목록(`contract_dt` 의 `MIN_MAX` 가 빠진다)과 `ColumnClassifierTest` |
| Oracle 고유 부동소수 타입(100·101)을 부동소수에서 뺌(결함 2) | `ColumnClassifierTest` — 사유가 비고, 조회 컬럼의 합·최소·최대 사유도 빠진다(단위 시험만) |
| 보관 id 에 schema 를 다시 넣음(결함 1) | 만든 mapping 의 사용자 이름 검사(schema 식별자 밖 1곳). `MappingGeneratorTest` 4건이 기대 id 에서 붉다 |
| credential 검사가 사용자 이름을 보지 않게 | DEC-OPS-326 전에는 대문자 사용자 이름 discover 의 거절 단언이 잡았다. 지금은 `MigrationWorkflowRunnerTest` 의 schema 가 아닌 원천 사용자 이름 하나만 실린 plan 거절이 잡는다 |

2026-10-16 로컬에서 클래스 전체를 실행해 5건이 통과했다(첫 판: 실패·skip 0, 컨테이너 기동 포함 90.0초, O2 17.7초). 검토 반영 뒤 다시 실행해 5건이 통과했다(실패·skip 0, 컨테이너 기동 포함 72.0초, O2 16.0초). 같은 실행에서 generate·validate·verify·etl·jdbc·profile·suggest·artifact·lookup·archive 패키지와 `MigrationWorkflowRunnerTest`·`TermSuggestPostgresIntegrationTest` 를 함께 돌려 95클래스 980건이 실패 0 이었다(skip 3 — Windows 심볼릭 링크 2·POSIX 권한 1). O2 만 따로 돌리면 Gradle·컨테이너 기동 포함 62~68초였다. PIT `migration-standardize` 는 보관 id 수정 뒤 1,036 mutations·92% 다. 분류기를 고친 뒤 `migration-verify` PIT 는 돌리지 않았다 — L4-C 브랜치가 넓힌 범위의 시험 목록으로 다시 잰다. O2 로 이 클래스의 시간이 늘지만 이관 duration profile 의 이 클래스 값(88,875ms)은 고치지 않았다 — L4-C 병합 뒤 새 main 위로 O2 를 옮길 때 이 클래스를 포함해 profile 을 실측으로 다시 만든다(지금 `migration-verification-contract` 의 2건 red 는 L4-C 의 새 시험 클래스 16개가 profile 에 없어서다). CI 실행 기록은 아직 없다.

한계: 1,200행 합성 fixture 라 `ORA-01555`(snapshot too old)·운영 규모·장시간 세션은 재지 않았다. 공개 COMMIT 은 Oracle 이 `UNVERIFIED` 라 엔진 COMMIT 으로 갈음했고 증거 등급은 그대로다. 19c 에서는 실행하지 않았다. 원천 READ COMMITTED 에서 원천 집계와 본 읽기는 다른 문장이라, 대사의 원천 행 수 일치는 source freeze 를 전제로 한다(위 R7). 대상 PostgreSQL 이미지는 digest 로 고정하지 않았다. 판별력을 red 로 확인하지 않은 단언이 있다 — 유일 인덱스 2개 `PASS`, keymap 1회 채번, DRY_RUN 의 조회 짝 없음 기록, 공통코드 대사의 행 수, 집계 묶음 공유, 확장 매핑 표본의 컬럼 수, savepoint 탐침의 네 관측, 그리고 L4-B 리허설에 더한 DRY_RUN codemap 결과 종류 수(병합 조정).

## 이관 CUBRID 실행 환경과 검증 경계

2026-09-16 공식 `cubrid/cubrid:11.4` 이미지의 고정 digest
`sha256:1248b77ad39888df9e064655937188ab99fe056ed7e35b57d06155a015dc1791`와
로컬 엔진 **11.4.6.1963**, JDBC **11.3.1.0050**을 확인했다. 사용한 원본
`JDBC-11.3.1.0050-cubrid.jar`의 SHA-256은
`38C1293B629FEF5C4F6F57A1F4E52C98BAAD4872BC4C0EB59587CE03DE54AC66`이다.
엔진·JDBC 버전은 서로 다른 번호 체계를 사용하므로 같은 숫자로 맞춰 쓰지 않는다.
공급자 공개 이미지·드라이버를 사용하는 환경이며 별도 hostname 결속 라이선스 파일은 필요하지 않다.
엔진은 Apache 2.0, JDBC 등 커넥터는 BSD 3-Clause 조건을 따른다
([공식 이미지](https://hub.docker.com/r/cubrid/cubrid),
[공식 엔진 릴리스](https://github.com/CUBRID/cubrid/releases/tag/v11.4.6.1963),
[공식 라이선스](https://dev.cubrid.org/dev-guide/license)).

같은 환경의 UTF-8 DB에서 전용 adapter preflight와 owner 한정 discovery를 실행했다. CUBRID의 공개
`db_class`·`db_auth`는 현재 계정 권한으로 결과가 줄어드므로 완전성·SELECT-only 증명에는 사용할 수 없다.
준비 계정에는 원천 테이블 SELECT 외에 아래 두 내부 catalog의 SELECT가 필요하다. adapter는 이를 통해
권한이 없는 테이블과 UPDATE-only 테이블도 포함한 owner 전체 객체·권한을 대조하며, catalog 권한 누락,
SELECT 누락, 쓰기 권한, grant option, PUBLIC 외 그룹 상속 중 하나라도 있으면 preflight를 차단한다.

```sql
GRANT SELECT ON _db_class TO <migration_user>;
GRANT SELECT ON _db_auth TO <migration_user>;
```

실제 reader 계정에서 숨은 테이블과 UPDATE-only 테이블을 만든 부정 시험은
`READ_ONLY_SIGNAL_MISSING` 차단을 유지했고, 해당 객체를 제거하거나 SELECT-only로 교정한 뒤에는
preflight blocking 0, schema 1, table 3, column 9, identity 1, non-system grant 3을 수집했다.
AUTO_INCREMENT는 JDBC `getColumns`의 누락 필드에 의존하지 않고 `db_serial`의 class/attribute
연결을 사용하며, 일반 sequence 목록에서는 이 내부 serial을 제외한다.

실측 fixture의 scalar 1행과 BLOB/CLOB 1행은 `EtlExecutor` DRY_RUN에서 각각 read 1,
transformed 1, written 0, error 0이었다. BLOB 4 bytes와 한글·emoji CLOB(UTF-16 17 code units,
UTF-8 23 bytes)은 JDBC LOB 객체에서 `byte[]`·`String`으로 분리된 뒤 원본과 일치했다.
별도 PostgreSQL 17.9 target에 대한 내부 엔진 COMMIT rehearsal도 2행·checkpoint 2개 적재,
동일 run 무중복 재개, BLOB/CLOB 변조 checksum 실패와 복구 후 PASS를 확인했다. 이 직접 호출은
공개 workflow 밖의 엔진 rehearsal이며 승인·driver 격리 gate를 해제하거나 충족한 것으로 보지 않는다.

CUBRID 전용 adapter는 **UNVERIFIED·MANUAL_ONLY**를 유지하며 공개 COMMIT을 차단한다.
외부 JDBC JAR의 digest 결속·격리 driver COMMIT 금지와 source freeze 승인도 그대로 적용한다.
이번 데이터 경계는 작은 LOB와 테이블당 1행이다. 500행 초과 page 전환, 32 MiB BLOB/
16,777,216 UTF-16 code-unit CLOB 상한, 저메모리 대용량, 프로세스 장애복구, 운영 cutover는 아직
CUBRID 실측이 아니다.
로컬 근거의 위치는 `build/cubrid-verification`이며 자격증명이나 원시 행을 이 문서에 옮기지 않는다.

## 이관 프로세스 종료와 큰 필드

`./gradlew :migration-tool:test --tests '*EtlCrashRecoveryPostgresIntegrationTest'`는 별도 JVM을
실제로 강제 종료한다. 격리 PostgreSQL에 1,501행, 최대 1MiB binary 필드와 대형 Unicode text,
합계 30MB를 넘는 payload를 만들고, 자식 JVM heap은 128MiB로 제한한다.

첫 500행과 체크포인트가 커밋된 뒤 다음 청크의 DB 작업을 대기시켜 JVM을 종료한다. 미완료
청크가 남지 않는지 확인한 다음 새 JVM으로 재개하고 전체 값의 일치, 재반복의 무중복,
바이너리 변조의 검증 실패를 확인한다. `EtlPartialLoadRecoveryPostgresIntegrationTest`의
일반 오류 후 재개 시험도 함께 유지한다.

Gradle `test`와 PIT의 minion JVM 모두 `migration.drill.classpath`를 전달한다. 전달이 빠지면
테스트 자체가 실패하며, 기존 PostgreSQL 종료·재개 검사는 PIT에도 계속 포함한다. 자식 JVM은 별도로
실행되므로 그 프로세스의 코드를 PIT가 변이했다는 뜻은 아니다. 동일 JVM의 검증·변환 단위
테스트가 각 변이 분석 범위의 탐지율을 책임진다.

이것은 PostgreSQL text/bytea와 ETL·체크포인트 엔진의 복구 증거다. 다른 vendor의 JDBC
Blob/Clob 스트리밍, GB/TB 규모, 운영 승인·cutover 전체 절차를 검증했다는 뜻은 아니다.
실제 도입 DB의 버전·최소권한·스냅샷·LOB 형식에 대한 도입 시험은 계속 필요하다.

## 클라이언트 IP 신뢰 경계 리허설

2026-09-14에 운영 오버레이(`docker-compose.yml` + `docker-compose.prod.yml`)를 격리 Docker 스택으로 올려
[ADR-0019](../02-architecture/decisions/ADR-0019-client-ip-trust-boundary.md)의 경계를 전체 경로로 실측했다.
환경은 Windows Docker Desktop 29.1이다. 이 PC의 기존 컨테이너·네트워크와 겹치지 않게 저장소 밖 오버레이로
컨테이너 이름·서브넷(172.29.50.0/24)·루프백 호스트 포트만 바꿨다. edge 덮어쓰기, Next 비공개,
`TRUSTED_EDGE_PROXY`, `SPRING_PROFILES_ACTIVE: prod`는 그대로 뒀다.

재현 순서는 다음과 같다. 비밀값은 폐기용으로 생성해 파일로만 전달한다.

1. 현재 작업 트리로 api·frontend 이미지를 빌드한다.
2. 새 운영 DB이므로 [인가 전환 런북](authorization-cutover-runbook.md)과 같은 순서를 따른다.
   앱의 Flyway를 `SPRING_FLYWAY_TARGET=2.99`로 실행하고, 폐기용 표식 해시로 Contract SQL을 실행한 뒤 스택을 올린다.
3. 네트워크 안의 고정 주소(172.29.50.200) 컨테이너와 호스트에서 초기 관리자로 로그인한다.
   성공 로그인만 `tb_login_log.lgn_ip_addr`에 남으므로 그 값을 판정에 쓰고,
   `tb_login_policy.ip_addr`로 허용 IP를 하나만 둔 뒤 거부 여부를 본다.

| 경로 | 수정 전(신뢰 = 서브넷 /24) | 수정 후(신뢰 = Next 고정 주소 /32) |
|---|---|---|
| 컨테이너 → edge, 위조 XFF | 실제 주소 기록 | 실제 주소 기록 |
| 호스트 → edge, 위조 XFF | 게이트웨이 주소 기록(위조 무시) | 같음 |
| 호스트 → api 공개 포트, 위조 XFF | **위조 IP 기록** | 게이트웨이 주소 기록 |
| 컨테이너 → api:8080, 위조 XFF | **위조 IP 기록** | 실제 주소 기록 |
| IP 제한: 호스트 → edge, 허용 IP로 위조 | 403 | 403 |
| IP 제한: 호스트 → api 공개 포트, 허용 IP로 위조 | **200(우회)** | 403 |
| 컨테이너 → Next:3000 직접, 위조 XFF | 위조 IP 기록 | 위조 IP 기록(잔여 위험) |

원인은 신뢰 대역에 도커 게이트웨이가 포함된 것이다. 공개 포트로 직접 온 요청은 Docker Desktop·rootless Docker·
호스트 루프백 경유에서 출발지가 게이트웨이 주소로 바뀐다. 그래서 Next 컨테이너에 고정 주소를 주고 운영
`TRUSTED_PROXIES`를 그 /32 하나로 좁혔다. 동적 할당은 `ip_range`로 분리하고, 게이트웨이는 명시한다.
`ip_range`를 주면 도커가 게이트웨이를 그 구간 첫 주소로 잡는 것도 이 리허설에서 확인했다.
`ConfigSafetyLinterTest`가 이 정합과 위반 형태 12종을 고정한다.

남은 경계는 다음과 같다.

- egov-net 안의 다른 컨테이너가 edge를 거치지 않고 Next에 직접 요청하면 위조 XFF가 전달된다.
  Next는 edge만 도달한다는 네트워크 가정에 의존한다. 스크레이퍼 등 부가 컨테이너를 같은 네트워크에 둘 때 이 가정이 약해진다.
- 기존 배포에 `ip_range`를 더하면 compose가 네트워크를 다시 만들어야 하므로 점검 창에서 `down` 뒤 `up`으로 반영한다.
- 운영 호스트의 실제 LB·TLS 종단·Linux iptables 경로와 IPv6는 이 리허설 범위 밖이다.

## ZAP 주간 스캔 경고 분류

주간 실행 `35489408892`(2026-09-20, 리포트 아티팩트 `zap_baseline_frontend`·`zap_fullscan_api`)의
WARN-NEW 11건을 인스턴스 근거까지 열어 전수 분류했다. 이 워크플로는 2026-08-02 이후 매주 성공했지만
경고를 사람이 읽은 기록이 없었다 — WARN 은 빌드를 막지 않으므로 신호가 쌓이기만 했다.

### 수리한 것

| 규칙 | 실측 근거 | 조치 |
|---|---|---|
| `10024` 민감정보 URL 노출 | 스캐너가 `/login?password=…&userId=…` 를 실제로 만들어 냈다. 로그인 `<form>` 에 `method` 가 없어 HTML 기본값이 GET 이었다. | 폼에 `method="post"`. `handleSubmit` 이 `preventDefault` 하므로 하이드레이션 뒤 동작은 불변이고, 그 전 제출만 URL 에 값을 남기지 않게 된다. |
| `90004` COOP 부재(프런트 3건) | 문서 응답에 `Cross-Origin-Opener-Policy` 가 없었다. | `same-origin` 을 문서 응답 공통으로 부여한다. 새 창 링크 3곳은 이미 `rel="noopener noreferrer"` 라 동작 변화가 없고, 규율이 개별 링크에서 문서 단위로 올라간다. |
| `90004` CORP 부재(API 1건) | `/v3/api-docs` 에 `Cross-Origin-Resource-Policy` 가 없었다. | `same-origin`. 브라우저가 이 서버 바이트를 직접 `<img src>` 로 읽는 경로가 없다(첨부는 전부 인증 axios → object URL) 하고 CORS fetch 는 이 헤더의 대상이 아니라 안전하다. |

분류 중 ZAP 이 지목하지 않은 결함 하나가 함께 드러났다 — 두 CSP 가 `report-to csp-endpoint` 를
선언하는데 그 그룹을 정의하는 `Reporting-Endpoints` 헤더가 저장소 어디에도 없어 **최신 리포팅
경로가 선언만 있고 동작하지 않았다.** 수집기는 이미 `application/reports+json` 을 파싱하고 있었으므로
빠진 것은 그룹 정의 하나였다. 선언·그룹 정의·수집기 세 자리가 같은 경로를 가리키는지는
`csp-policy` 계약이 묶는다.

### URL-state census 가 같은 자리를 다르게 판정하고 있었다

`method="post"` 를 넣고 census 를 재생성하자 기록 하나가 사라졌다(form-producer 55 → 54).
지워진 `URL-B5F403F23CA8B7` 은 이 로그인 폼을 `form-producer`·`intercepted-submit` 으로 분류하고
`currentBehavior` 에 이렇게 적고 있었다 — *"Form submission is intercepted before native navigation
(named-handler-prevent-default); no URL state is emitted."*

그 문장은 **하이드레이션 뒤에만 참이다.** census 는 소스의 `preventDefault` 를 보고 "URL 상태가
나오지 않는다" 고 판정했고, 스캐너는 그 판정이 성립하지 않는 창에서 실제로 그 URL 을 만들어 냈다.
정적 분석이 런타임 가정을 사실로 승격한 형태이며, 같은 축의 다른 `intercepted-submit` 기록도
같은 가정 위에 있다 — 이 절은 그 사실을 남기고 일괄 점검은 하지 않는다.

### 기록하고 유지하는 것

| 규칙 | 판정 근거 |
|---|---|
| `10055` style-src unsafe-inline (10) | [GAP-FE-001](../../.agent/memory/known-gaps.md) 의 accepted-risk. 재개 조건은 sonner 의 nonce 지원 또는 교체이며 `csp-policy` 계약이 세분화 시도를 red 로 잡는다. |
| `10049` Non-Storable Content (8) | nonce CSP 가 전 페이지를 동적 렌더로 돌린 결과의 `no-store`([DEC-OPS-011](../../.agent/memory/decisions.md)). 의도한 동작이다. |
| `10094` Base64 Disclosure (5) | 근거가 CSS module 해시 클래스명과 생성 operation 이름이다. 오탐이지만 우리 응답 내용을 보는 규칙이라 끄지 않는다 — 진짜 base64 노출이 생기면 같은 규칙이 말해야 한다. |
| `10019` Content-Type 부재 (2) | `/help` 는 307 리다이렉트, `/sitemap.xml` 은 라우트가 없어 404 다. 둘 다 본문 없는 응답이다. |
| `10031` 사용자 제어 HTML 속성 (2) | `redirect` 파라미터다. `resolveInternalRedirect` 가 내부 절대경로만 통과시킨다. |
| `10111` 인증 요청 식별 (1) | 로그인 폼을 찾았다는 정보성 보고다. |
| `40042` Spring Actuator 정보 노출 (1) | `/actuator/health` 의 `{"status":"UP"}`. health probe 를 이 경로로 두는 것은 [DEC-OPS-069](../../.agent/memory/decisions.md) ④ 의 결정이고, 운영 오버레이는 actuator 를 앱 포트에 노출하지 않는다. |
| `10104` User Agent Fuzzer (5) | 스캐너가 User-Agent 를 바꿔 응답 차이를 보는 정보성 규칙이다. |

`90005`(Sec-Fetch-* 부재, 12건)만 [.zap/rules.tsv](../../.zap/rules.tsv) 에 `IGNORE` 로 등재했다 —
그 헤더는 브라우저가 요청에 붙이는 것이고 ZAP 의 클라이언트는 붙이지 않으므로 응답 쪽에서
고칠 대상 자체가 없다. 나머지는 WARN 으로 남겨 다음 실행에서도 보이게 한다.

### 이 분류가 증명하지 않는 것

이 스캔은 **미인증 공개 표면**만 본다(baseline 40 URL · full 8 URL). 로그인 뒤 관리자 화면은
대상이 아니며, 인증 ZAP 증거는 [DEC-OPS-111](../../.agent/memory/decisions.md) 로 기관 채택 수명의
`operational-assurance` 통제로 이전했다. WARN 이 0 이 되는 것도 목표가 아니다 — 유지 판정한
8건은 다음 실행에서도 그대로 보고된다.

### API 스캔이 API 를 스캔하지 않고 있었다 (2026-09-24)

위 분류의 API 리포트(`zap_fullscan_api`)는 경고가 난 URL 이 `/v3/api-docs`·`/actuator/health`·
`/robots.txt`·`/sitemap.xml`·`/` 다섯 개뿐이었다. full-scan 은 대상 URL 에서 링크를 따라가는 방식이라
JSON 문서 안의 API 경로를 찾지 못한다 — **문서화된 연산 387개 중 어느 것도 스캔된 적이 없었고,**
워크플로는 매주 성공했다. 인증도 없어 두드렸더라도 대부분 401 에서 멈췄을 것이다.

바꾼 것:

- API 는 `zaproxy/action-api-scan` 으로 OpenAPI 정의를 읽어 스캔한다. 그 앞에서 E2E 개발 시드 관리자로
  로그인해 토큰을 `/api/v1/auth/me` 로 확인하고(값은 로그에서 가린다), 능동 스캔은 액세스 토큰 유효시간
  (60분) 안인 40분에서 끊으며, 스캔 뒤 세션이 살아 있었는지 확인해 끊겼으면 잡을 실패시킨다.
- OpenAPI 서버 URL 이 `/api/v1` 을 다시 붙이고 있었다. 경로가 이미 `/api/v1` 로 시작하므로 "서버 URL +
  경로" 를 호출 주소로 삼는 도구(Swagger UI 의 Try it out, API 스캐너)는 `/api/v1/api/v1/...` 을 불렀다.
  서버 URL 에서 기본 경로를 뺐고, 두 번 붙는 조합은 `OpenApiDocumentationTest` 가 막는다.
- 첫 실행에서 응답 535건이 429 였다. 스캔 잡에서만 요청 제한 한도를 올린다(compose 는 값 없이 전달하므로
  다른 실행은 앱 기본값 그대로다).
- `WorkflowManifestLinterTest` 가 이 형태 — OpenAPI 스캔, 스캔 앞 로그인·토큰 확인, 40분 상한(60분 미만),
  스캔 뒤 세션 확인, 요청 제한 상향 — 를 고정한다. 변형 8종이 red 다.

| 실행 | 가져온 URL | 스캔한 URL | 429 | 세션 유지 | WARN |
|---|---|---|---|---|---|
| 2026-09-20 주간(full-scan) | — | 경고 URL 5개 | — | 인증 없음 | 4종 |
| 2026-09-24 `35995292959`(API 스캔·인증) | 341 | 1956 | 535 | 200 | 7종 |
| 2026-09-24 `36000424317`(한도 상향) | 341 | 2008 | 0 | 200 | 7종 |

한도를 올리자 SQL 인젝션 경고가 730건에서 130건으로, 경로 조작이 45건에서 30건으로 줄었다 — 1차 경고의
대부분은 429 와 정상 응답의 차이였다. 반대로 서버 오류 응답은 98건에서 166건으로 늘었다 — 요청이 실제로
핸들러에 닿으며 숨어 있던 500 이 드러난 것이다. 2차의 서버 오류 166건, SQL 인젝션 130건, 경로 조작 30건,
오류 정보 노출 12건, JSON 응답의 저장형 XSS 약점 6건, 버퍼 오버플로 2건, CORP 1건의 분류와 수리는 다음
변경에서 한다. 500 응답의 대부분은 입력 오류가 500 으로 떨어지는 처리 누락으로 재현됐다(필수 파라미터 누락,
없는 필드로 정렬, 정렬 식이 아닌 값). `/api/v1/public/debug/error` 의 500 은 의도다 — 운영
프로파일에서 등록되지 않는 오류 처리 확인용 엔드포인트이고, 스캔 환경이 e2e 프로파일이라 잡혔다.

### API 스캔 경고 분류와 수리 (2026-09-24)

한도 상향 실행 `36000424317` 의 경고 7종을 인스턴스 근거까지 열고, 로컬 격리 스택(버리는 DB `authz_e2e`)에서
같은 요청을 다시 보내 분류했다. 수리는 두 번이다 — 1차 수리 뒤 CI 실행 `36010895046` 에 남은 서버 오류 127건을
원인별로 다시 묶고, 로컬 스캔에서 API 로그의 예외 타입으로 남은 원인을 확인해 2차로 고쳤다.

| 규칙 | 건수(수리 전 → 1차 뒤) | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| `100000` 서버 오류 응답 | 166 → 127 | 수리 | 잘못된 입력이 500 이 됐다. 1차에 고친 것은 필수 파라미터 누락(`GET /api/v1/comments`), 없는 필드로 정렬(`sort=sort`), 정렬 식이 아닌 값(`sort=[crtDt,DESC]`)이다 — 전역 예외 처리기가 `ResponseEntityExceptionHandler` 를 상속하지 않아 Spring 이 기본으로 400 을 주는 예외까지 최상위 처리로 떨어졌다. 1차 뒤 127건은 이름 없는 쿼리 파라미터(`?=`) 88건, 수천 자 정렬 값 16건(속성 경로 깊이 가드), 점 경로 정렬 10건(`sort=www.google.com`), 잘리거나 경계가 없는 multipart 본문 6건, 날짜가 아닌 팝업 게시 일자 1건과 의도한 6건이다. | 누락 예외·모르는 정렬 필드·정렬 검사 거부·`?=` 는 400. 정렬 쪽은 같은 예외 타입이 코드 결함에서도 나오므로 정렬 검사 프레임이거나 해석하지 못한 속성이 요청의 `sort` 값에 있을 때만 좁힌다. `sort` 값 형식(속성 경로 최대 5단·조각 64자)은 저장소에 닿기 전에 인터셉터가 본다. multipart 는 가장 안쪽 원인이 형식 거부일 때만 400 이고 서버 쪽 IO 실패는 500 으로 남긴다. 팝업 게시 일자는 `YYYY-MM-DD` 날짜가 아니면 400. 의도한 6건은 미구현 표면의 501 3건과 운영에서 등록되지 않는 `/api/v1/public/debug/error` 3건이다. |
| `30001` 버퍼 오버플로 | 2 → 22 | 수리 | 수리 전 2건의 실체는 첨부 포함 게시글 등록·수정의 입력 검사 누락이다. `@RequestPart("board")` 에 `@Valid` 가 없어 JSON 경로의 제목 필수·본문 4000자·비밀글 Y/N 검사를 통째로 건너뛰었고, 서비스가 실패한 뒤 `finally` 의 메트릭 기록이 null 태그로 NPE 를 내 500 이 됐다. 화면은 첨부가 있으면 이 경로를 쓴다. 1차 뒤 22건은 수천 자 정렬 값 16건과 잘린 multipart 6건이라 위 서버 오류와 원인이 같다. | 두 파라미터에 `@Valid`. 입력 계약 게이트가 제약 있는 요청 DTO 를 `@Valid`/`@Validated` 없이 받는 컨트롤러를 막는다(목록 본문은 원소 타입의 `@Valid` 만 인정). |
| `90022` 오류 정보 노출 | 12 → 2 | 수리 | 수리 전 12건은 모두 정렬 오류의 500 이고, 1차 뒤 2건은 디버그 엔드포인트와 팝업 날짜다. 응답 본문은 일반 문구라 내부 정보는 새지 않았다. | 위 수리로 사라진다(디버그 엔드포인트는 의도). |
| `90004` CORP 부재 | 1 → 0 | 수리 | `/v3/api-docs` 는 두 번째(레거시) 보안 체인이 처리한다. 2026-09-23 수리가 CORP 를 API 체인에만 붙여 정작 지적된 이 경로에는 헤더가 가지 않았다. | 레거시 체인에도 `same-origin`. |
| `40018` SQL 인젝션 | 130 → 123 | 오탐 | 등록·수정(POST·PUT)은 참·거짓 조건 비교이고 근거가 비어 있다. `POST /api/v1/schedules` 를 같은 두 값으로 재현하자 응답 차이는 새 번호(3 대 4) 하나, 수정은 응답 `timestamp` 1초 차이뿐이었고 두 값은 글자 그대로 저장됐다. 조회(GET)는 ZAP 이 비교한 두 조건값을 로컬에서 그대로 다시 보내자 CI 두 실행의 28건과 로컬 두 실행의 324건이 모두 상태와 본문(응답 시각 제외)이 같았다. 로컬 쓰기 334건은 요청 본문 공격이라 표본으로 판정했고, 그중 42건은 서버가 요청에서 읽지 않는 서버 소유 필드(`frstRgtrId`·`lastMdfrId`·`mdfcnDt`)가 대상이다. `size=12-2` 같은 수식형은 숫자가 아니면 페이지 요청이 기본값으로 떨어지는 것이라 전혀 다른 문자열을 넣어도 같은 응답이다. 네이티브 SQL 은 모두 이름 붙은 파라미터로 바인딩하고 문자열 결합은 0건이며, 사용자 입력으로 QueryDSL 경로를 만드는 것은 `QuerydslDynamicPathLinterTest` 가 막는다. | 유지(WARN). |
| `6` 경로 조작 | 30 → 31 | 오탐 | 공격값이 URL 에 이미 있는 이름·숫자(`community`·`events`·`10`)이고 대상은 코드값 필드다. 이 필드들은 파일 경로로 쓰이지 않으며 첨부 접근은 숫자 키다. 차이는 위와 같은 번호·시각이다. | 유지(WARN). |
| `2` 사설 IP 노출 | 0 → 0(로컬 1) | 유지 | 관리자 전용 로그인 로그 상세가 기록된 접속 IP(로컬 도커 망 주소)를 보여 준 것이다. 그 화면의 목적이 접속 IP 확인이다. | 유지(WARN). |
| `40014` JSON 응답의 저장형 XSS 약점 | 6 → 3 | 유지 | 저장한 `<script>` 가 `application/json` 응답에 그대로 돌아온 것이다(ZAP 도 낮은 신뢰로 표시). 화면은 React 가 글자로 이스케이프하고, HTML 로 그리는 두 곳은 `DOMPurify` 를 거치며, 알림 링크는 내부 경로로 정규화된다. | 유지(WARN). |

한도를 넘는 업로드는 스캔이 아니라 재현 중에 찾았다 — 11MB 파일을 올리면 "서버 내부 오류" 가 났다. 서블릿
업로드 한도 예외를 받는 처리기가 없었다. edge nginx 가 본문 한도를 넘긴 요청에 주는 것과 같은 413 으로 돌려준다.

`/v3/api-docs` 의 CORP 누락은 2026-09-23 분류가 "수리했다" 고 적은 항목이다. 그 수리는 헤더 계약 테스트
(`/api/v1/health`)만 보고 지적된 URL 을 다시 확인하지 않았다 — 이번에 문서 경로 단언을 함께 두었다.

| 실행 | 환경 | 스캔한 URL | 서버 오류 | SQL 인젝션 | 경로 조작 | 오류 정보 노출 | 버퍼 오버플로 | CORP | 의도 밖 500 |
|---|---|---|---|---|---|---|---|---|---|
| `36000424317`(수리 전) | CI | 2008 | 166 | 130 | 30 | 12 | 2 | 1 | 160 |
| `36010895046`(1차 수리 뒤) | CI | 1981 | 127 | 123 | 31 | 2 | 22 | 0 | 121 |
| 2차 수리 뒤 | 로컬 | 1432 | 6 | 477 | 23 | 1 | 0 | 0 | 0 |

"의도 밖 500" 은 서버 오류에서 의도한 501·디버그 엔드포인트를 뺀 수다. 로컬 실행은 CI 와 같은 ZAP 이미지·OpenAPI
가져오기·관리자 인증·규칙 파일·40분 상한이고, 의도 밖 500 은 API 로그의 최상위 오류 기록으로도 셌다(스캔 중 5건 모두 디버그 엔드포인트). 로컬의 SQL 인젝션 경고가 CI 보다 많은 것은 위 재현대로 조건과 무관한 응답 차이다. 2차 수리 도중의
첫 로컬 실행은 같은 PC 에서 빌드를 함께 돌려 응답이 느려졌다 — 40분 안에 URL 896개만 스캔했고 두 요청의 응답 시각이
갈려 참·거짓 비교 경고가 562건으로 늘어 수치 비교에서 뺐다. 그 실행에서 쓴 것은 남은 500 의 예외 타입뿐이다(잘린
multipart 본문 110건·팝업 날짜 96건의 로그). 병합 뒤 main 의 주간 스캔이 CI 에서 다시 확인한다.

### 병합 뒤 확인과 쓰기 요청 전수 재현 (2026-09-25)

main 수동 실행 `36062669102`(URL 1981개)의 서버 오류 6건은 모두 의도였다 — 디버그 엔드포인트 3건과 당시 남아
있던 네트워크 모니터링 쓰기 API 의 501 3건이다(뒤의 것은 DEC-OPS-129 로 걷었다). 의도 밖 500 과 버퍼 오버플로는
0건이다.

위 분류는 쓰기 요청 경고를 표본으로만 판정했다. 트래디셔널 리포트에는 요청 본문이 없어 재현할 수 없었기
때문이다. 스캔 종료 직전에 경고의 요청 원문을 내보내는 훅(`zap-api-scan.py --hook`)을 붙여 같은 main 코드를
로컬에서 부하 없이 다시 돌리고(URL 1983개) 전수 재현했다.

| 경고 | 건수 | 재현 방법 | 결과 |
|---|---|---|---|
| SQL 인젝션(조회) | 96 | ZAP 이 비교한 두 조건값을 같은 파라미터로 다시 보낸다 | 96건 모두 같은 응답 |
| SQL 인젝션(쓰기) | 279 | 요청 원문의 공격값을 두 조건값으로 각각 바꿔 보낸다 | 279건 모두 같은 응답. 198건은 입력 검증(400)에서 끝나 SQL 까지 가지 않았고, 나머지는 404·409·410·501 이거나 정상 저장(200) 14건이다 |
| 경로 조작 | 23 | 같은 필드에 경로 의미가 없는 같은 길이의 대조값을 넣는다 | 23건 모두 같은 응답 |

비교에서는 응답 시각, 서버가 새로 매긴 번호, 입력 검증 오류 목록의 순서를 정규화했다. 마지막 것은 이번에 새로
확인한 원인이다 — Bean Validation 은 위반 순서를 보장하지 않아 같은 요청이라도 `errors` 배열과 합친 메시지의
순서가 바뀐다. ZAP 은 그 차이를 조건에 따른 응답 변화로 읽는다. 같은 원인으로 한 필드에 위반이 둘 이상이면
필드마다 첫 오류만 보여 주는 화면의 문구도 요청마다 달라졌다. 2026-09-25 에 서버가 오류를 필드 → 제약 코드 →
문구 순으로 정렬해 내려보내도록 고쳤다([GlobalExceptionHandler](../../foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java)).
제약 코드는 언어와 무관하므로 한국어·영어 응답이 같은 제약의 문구를 고른다. 화면의 첫 오류 포커스는 원래
DOM 순서로 정하므로 바뀌지 않는다. 경로 조작의 대조값은 공격값과 같은 길이로
맞추고 먼저 한 번 저장해 두어, 코드 길이 제한(12자)과 중복 코드 거부가 비교를 가리지 않게 했다.

## 도메인 정합성 보강 (2026-09-25)

템플릿 생성, 첨부 삭제, 회원 승인 경쟁, 메모 보고 권한 표시, 통계 날짜 경계와 대시보드의 집계 의미를
L2 범위로 보강했다. 기존 도메인 권한과 제품 범위를 유지하며 Entity·DDL·공유 DB 데이터는 바꾸지 않는다.

| 대상 | 동작 | 회귀 검증 경로 |
|---|---|---|
| 템플릿 | 등록은 INSERT 전용이다. 기존 ID와 경합 중복은 409로 거부하고 내용·감사 필드를 덮어쓰지 않는다. 사전 존재 확인이 오래됐어도 PK와 persist가 생성 경계를 지킨다. | [실제 JPA·PK 경합](../../api-server/src/test/java/nuri/api/schema/TemplateCreationIntegrityIntegrationTest.java), [HTTP 생성·수정 권한](../../api-server/src/test/java/nuri/api/controller/foundation/controller/system/template/TemplateApiControllerTest.java) |
| 첨부 | 단건 삭제는 삭제 인가 후 DB를 변경하고, 커밋 뒤 실물을 지운다. DB 실패·바깥 트랜잭션 롤백이면 원본 파일이 남는다. 첨부 묶음 전체 삭제 메서드(`deleteFiles`)는 호출자가 없어 2026-10-07 걷었다. | [실물 파일·트랜잭션 완료](../../business-core/src/test/java/nuri/business/service/file/FileDeletionTransactionTest.java) |
| 커뮤니티 | 승인과 반려가 같은 회원 행의 쓰기 잠금을 얻은 뒤 상태를 판정한다. 후행 요청이 이미 승인된 회원을 반려로 지우지 않는다. | [양방향 실제 DB 경합](../../api-server/src/test/java/nuri/api/schema/CommunityDecisionConcurrencyIntegrationTest.java) |
| 메모 보고 | editable은 수정, deletable은 삭제 가능 여부다. 각각 기본 기능 권한과 owner 또는 해당 ALL 권한을 함께 평가한다. 두 필드는 응답 전용이며 실제 쓰기 인가는 서비스가 계속 집행한다. | [권한 조합](../../business-app/src/test/java/nuri/business/service/memoreport/MemoReportServiceTest.java), [생성 계약·요청 위조 차단](../../frontend/src/services/business/memoreport/__tests__/memoReportService.generated-contract.test.ts) |
| 통계 | 날짜 단위 조회는 시작일 0시 이상·종료일 다음날 0시 미만이다. ISO와 yyyyMMdd를 정규화하며 마지막 마이크로초를 포함하고 다음날 행은 제외한다. 형식이 틀리거나 시작일이 늦은 기간은 400이다(통합 검토 후속). | [통계 기간 경계](../../business-core/src/test/java/nuri/business/service/stats/ReportStatsServiceTest.java), [자료 이용 경계](../../business-app/src/test/java/nuri/business/domain/board/DtaUseStatsDateRangeRepositoryTest.java), [게시글 경계](../../business-app/src/test/java/nuri/business/domain/board/BoardRepositoryTest.java) |
| 대시보드 | 오늘 게시글은 한국 시간 하루의 활성 게시글을 기존 통계 포트로 읽는다. 재시작·자정에도 프로세스의 이벤트 누적에 의존하지 않는다. 집계 실패는 가용 여부를 전송해 화면에서 실제 0건과 구분한다. | [시계·집계 실패](../../business-app/src/test/java/nuri/business/service/dashboard/RealTimeDashboardServiceTest.java), [표시·복구](../../frontend/src/components/features/dashboard/__tests__/RealTimeDashboard.test.tsx) |
| 로그인 E2E | SSR 제목·폰트가 먼저 보이더라도 익명 세션 확인의 GET 401을 관찰한 뒤 검사를 끝낸다. 기대 오류의 최소 발생 횟수와 flaky 차단은 유지한다. | [로그인 품질 spec](../../frontend/e2e/quality/login-accessibility.spec.ts) |

### 감사와 증거의 범위

백엔드 헌법의 의존 방향·DTO 경계·권한 재검증·커밋 후 부수효과 규범을 유지한다. 대시보드는 이미 있는
foundation 통계 포트를 쓰며 형제 업무 서비스에 직접 의존하지 않는다. 메모 보고의 loginId 소유 판정과
esntlId 열람 관계를 바꾸지 않는다. 서버는 요청에 섞인 권한 표시값을 역직렬화에서 무시하고 응답 전용으로
선언하며, 생성 Zod·transport는 해당 필드를 요청에 넣으면 거부한다. 실제 쓰기 인가는 별도로 집행한다.

DB 변경 전 읽기 전용 information_schema·표준 메타 조회로 통계 crt_dt가 timestamp(6)이고 게시판명 컬럼은
bbs_ttl임을 확인했다. 날짜 경계 repository 검증은 H2에서 실제 쿼리를 실행하는 증거이며 운영 DB 정합성 증거와
구분한다. 템플릿·회원 경합은 Flyway를 적용한 일회용 PostgreSQL에서 JPA와 실제 Lock 대기를 확인한다.
첨부 검증의 저장소는 실제 임시 파일이지만 repository는 mock이고 커밋 실패를 Spring 트랜잭션 관리자에 주입한다.

새 경합 테스트는 기존 schemaValidationTest에 연결한다. 도메인을 제외한 생성물에는 해당 테스트도 빠지도록
기존 [게이트 원장](../../config/governance/gates.json), [프로필 제거 승인](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json),
[custom 도메인 소유 선언](../../scripts/project-composer-source.mjs)을 함께 결속한다. 보고서 날짜 검증은 게시판
의존 테스트와 분리해 board가 빠져도 남는다. 전역 MockitoSpyBean 없이 기존 TC 컨텍스트를 공유한다.

첨부 삭제는 DB와 파일시스템의 완전한 원자성을 보장하지 않는다. 커밋 뒤 저장소 장애나 프로세스 종료가 발생하면
DB에서 접근할 수 없는 실물이 남을 수 있고, 기존 첨부 무결성 점검에서 고아 **후보**로 조사한다. 자동 복구나
반드시 경보가 발생한다는 의미는 아니다. 대시보드의 날짜 기준은 공식 Docker의 Asia/Seoul 설정과 일치하며,
다른 시간대의 직접 JVM 실행은 감사 시각 저장 기준도 함께 확인해야 한다. 장애 표시 개선은 양쪽 배포가 필요하다.

### 수정 전후 검증 (2026-09-25)

템플릿의 기존 ID 등록, 첨부의 롤백, 메모 권한 조합과 통계 경계는 수정 전 실패를 확인했다. 커뮤니티는
잠금 호출만 원래 조회로 돌린 대조 실행에서 승인 후 반려가 승인 행을 삭제하고, 반대 순서에서는 도메인 오류
대신 DB 오류가 발생함을 확인했다. 수정본에서는 PostgreSQL의 실제 잠금 대기를 관찰한 경합 5건이 모두 통과했다.

Java 전체 모듈의 compileJava·compileTestJava, 파일 영향 검증 52건, 업무 영역 선별 검증과 HTTP 생성·수정 권한
검증을 실행했다. 업무 검증 132건 중 H2 CHAR 반환형의 테스트 비교 1건을 바로잡아 해당 검증을 재실행했다.
하네스 102건은 새 테스트·원장 변경에 따른 동결 manifest 차이만 있었으며, 예상 변경만 반영한 뒤 무결성 검사를
다시 통과했다. 기존 예외나 제외 범위는 늘리지 않았다.

프론트엔드 영향 검증 49건, 앱·E2E TypeScript 검사와 대상 ESLint가 통과했다(기존 hooks/refs 경고 3건).
OpenAPI와 TypeScript·Zod·operation 계약 생성물을 함께 갱신했다. 이 결과는 로컬 영향 검증이며, 전체 CI나
운영 부하 검증을 대신하지 않는다.

로그인 E2E는 전용 워크트리에서 소유권을 검증하는 격리 runner로 일회용 PostgreSQL·API·운영 프론트 빌드를
띄워 실행했다. 익명 세션 요청을 3초 지연한 대조 실행에서 기존 코드는 폰트 검사를 먼저 끝내 기대 401 미발생으로
실패했다. trace의 미완료 요청, 화면과 서버 ERROR 0건을 대조했다. 수정본은 접근성 2종·폰트 각 3회와 인증 준비
2건을 합쳐 11건 모두 통과했고, retry·flaky·skip은 0이었다. 폰트 trace 3개 모두 실제 401을 받았다.
지연 주입은 검증 뒤 제거했고 기대 오류의 발생 횟수·유효기간은 바꾸지 않았다. 생성·원장·독립 모듈 계약 108건도
통과했다. 공유 DB 쓰기는 수행하지 않았으며 격리 runner가 생성한 프로세스·DB만 정리했다.

## 운영 계약 비용 실측 (2026-10-19)

2026-10-19 품질 평가 과제 9("문서 하나만 바꿔도 운영 계약 전체가 돈다")를 실측으로 판정했다. 측정은 이 PC(12 논리 코어, `node --test` 동시 실행 11)에서 다른 무거운 실행 없이 했다.

| 항목 | 값 |
|---|---|
| 계약 파일 | 125개(`scripts/*.test.mjs`, `.agent/scripts/*.test.js`) |
| 최상위 시험 시간 합(CPU 근사) | 68.3분 |
| 로컬 벽시계 | 8.2분(492초) |
| 가장 긴 시험 하나 | core 시작 구성 투영 295초 — 이어 demo 230·collaboration 181·survey 167·approval 128·custom 98초 |
| 그 밖의 큰 파일 | 재사용 프런트 경계 314초·생성기 카탈로그 300초·계약 census 192초·정밀 점검 동치 187초 |
| CI | secret-scan 잡 안에서 약 6분 — 같은 실행의 임계 경로(프런트 커버리지 12.2분)가 아니다 |

판정은 셋이다.

1. **문서 전용 푸시에서 계약을 고르면 신호를 잃는다.** 무거운 투영 시험은 저장소의 `docs`·`.agent/knowledge`·`config`·`scripts` 트리를 통째로 입력으로 복사해(`copyInputs`) 생성물의 문서·메모리 투영까지 대조한다. 문서 한 장의 링크 하나도 투영 결과를 바꿀 수 있어, 정적 참조나 읽기 추적으로 건너뛸 수 있는 무거운 시험이 없다. 문서·메모리 경로를 정적으로 참조하는 계약 56개에 무거운 투영·생성기 시험이 모두 들어간다.
2. **벽시계는 CPU 합이 정한다.** 68.3분을 11개 동시 실행으로 나눈 이상값이 6.2분이고 실측은 8.2분이다. 가장 긴 처리 단위는 시험 하나(core 투영, 약 5분)라 파일을 더 나눠도 줄지 않는다 — 투영 시험은 이미 시작 구성마다 파일 넷에 나뉘어 있다(DEC-OPS-335).
3. **CI 비용은 임계 경로 밖이다.** 운영 계약은 PR 의 병합 대기 시간을 늘리지 않는다.

재개 조건: 로컬 문서 전용 푸시가 12분을 넘거나, CI 의 secret-scan 잡이 임계 경로가 되거나, 시작 구성이 늘어 투영 시험 합이 크게 늘 때 다시 잰다. 그때 후보는 변경하지 않는 투영 시험이 한 프로세스 안에서 준비물 복사와 투영 결과를 나눠 쓰는 것이다(시험마다 다시 복사·투영하지 않기). 시험 수·단언을 줄이는 방식은 쓰지 않는다(H2).

## 운영 계약 비용 재측정 (2026-11-07)

위 재개 조건(로컬 12분 초과)에 닿아 다시 쟀다. 같은 PC 에서 다른 무거운 실행 없이 쟀다. 다만 배경 CPU 사용이 30~40% 라 같은 시험도 실행마다 흔들린다 — 바꾸지 않은 프런트 경계 시험이 두 전체 실행에서 656초·759초였다.

| 항목 | 2026-10-19 | 변경 전 | 변경 뒤 | 네 묶음 제외 |
|---|---|---|---|---|
| 로컬 벽시계 | 8.2분 | 21.0분 | 18.8분 | 15.2분 |
| 최상위 시험 시간 합 | 68.3분 | 178.7분 | 185.8분 | 137.2분 |
| pre-push 자기 검사 계약(`pre-push-ref-contract`, 전체 실행 안) | 목록 밖 | 1,034초 | 650초 | 뺌 |
| CI(secret-scan 잡 안) | 약 6분 | 4.7~6.9분 | — | — |

- **변경 뒤:** 분류기를 한 번 호출로 바꾼 뒤, 하네스 기준선을 다시 결속하기 전의 중간 실행이다. 기준선 계약 2건이 실패했다(2,562 통과). 두 실행 모두 2,564건을 끝까지 돌았으므로 조기 종료로 짧아진 것은 아니다.
- **네 묶음 제외:** 아래 A1 의 네 묶음(시험 파일 36개, 변경 뒤 실행에서 시간 합 2,865초·26%)을 뺀 측정 전용 실행이다. 남은 파일의 시간 합은 변경 뒤 실행과 같은 수준이다(8,281초·8,231초).
- **시간 합의 뜻:** 시간 합은 CPU 시간이 아니라 시험별 경과 시간이다. 그래서 "시간 합 ÷ 동시 실행 11" 은 벽시계를 어림하는 값일 뿐이고, 병목이 CPU 인지 I/O 대기인지는 이 자료로 가리지 못한다. 가장 긴 단일 파일(프런트 경계, 600~760초)이 벽시계의 아래 한계다.

원인은 셋이다. 셋의 기여도는 따로 재지 않았다.

1. **이 PC 의 호출 비용.** 같은 시험이 이 PC 에서는 CI 보다 시험 시간 합으로 8.9배, 벽시계로 2.9배 느리다.
   - 무거운 시험은 파일 수천 개를 반복해 연다. core 투영 시험은 무결성 검사를 약 20번 돈다.
   - 셸·node 프로세스도 많이 띄운다. Windows 에서는 이런 호출 하나의 비용이 크다.
2. **이 PC 에서 특히 느린 시험의 추가.** 이관 작업공간(10/25), pre-push 자기 검사의 정적 검사 순서 시험(10/29), 벤더 증거(11/03), 요구사항 작업공간(11/05)이 더해졌다.
3. **PC 부하.** 배경 CPU 사용, 시험의 파일 생성·삭제를 따라가는 파일 색인 도구, 시험이 지우지 않아 임시 폴더에 쌓인 폴더 36,848개.

바꾼 것:
- **분류기 한 번 호출.** pre-push 가 변경 범위 분류기(Windows 기동 약 1.6초)를 필드마다 다섯 번 부르던 것을 한 번 호출(`--fields`)로 바꿨다.
  - push 마다 분류가 약 8초에서 약 1.6초가 된다.
  - 훅을 수십 번 돌리는 자기 검사 계약은 단독 실행 474초에서 160초가 됐다(멈춤 시험을 더한 뒤 174초).
  - 분류 값을 하나라도 `true`/`false` 로 읽지 못하거나 분류기가 실패하면, 훅은 어떤 검사도 돌리기 전에 멈춘다. 자기 검사 계약이 분류 결과를 주입해 이것을 고정한다.
- **임시 폴더 누수.** 시험 아홉 개가 실행마다 남기던 임시 폴더를 파일 단위 정리로 지운다(고친 뒤 실측 0개).

하지 않은 것과 이유:
- **운영 계약 선택 실행(A1).** 네 묶음을 입력이 바뀐 push 에서만 돌리는 안이다. 네 묶음은 pre-push 자기 검사, 이관·요구사항 작업공간, 벤더 증거, CI 분류기·E2E 분할 시험이다. 넷을 모두 건너뛰는 가장 좋은 경우의 실측 단축은 3.6분(18.8→15.2분)이다. 그래도 넣지 않는다.
  - **실제 단축은 그보다 작다.** 분류기 묶음은 Java 소스 전체(보호 컬럼 census)와 `frontend/src` 전체(E2E 분할의 import 해석)를 읽어 거의 모든 제품 push 에서 돈다. 벤더 증거 묶음은 엔티티·SQL·잠금 표지가 있는 Java 소스, 스키마 시험, `ci.yml` 을 입력으로 삼는다.
  - **입력을 기계로 다 모을 수 없다.** import 그래프는 시험이 실행 중에 읽는 파일을 다 잡지 못한다. 설계 검토의 반례 셋이 그 예다: `frontend/tsconfig.json` 의 제외 목록, 산출물 내보내기 스크립트의 AI 규칙, Playwright 설정의 CI workers. 그래서 36개 파일의 읽기 의존을 손으로 원장에 적고 계속 맞춰야 한다.
  - **빠뜨린 비용이 단축보다 크다.** 원장에서 빠진 입력이 있으면 로컬은 통과하고 CI(secret-scan 잡의 전체 카탈로그)에서야 붉어진다. 그러면 CI 한 바퀴(약 20분)를 잃는다.
  - 그래서 DEC-OPS-364 의 전수 실행을 유지한다.
  - **다시 볼 조건:** 이 PC 의 운영 계약이 다시 크게 늘 때, 또는 묶음 시험이 실행 중에 읽는 경로를 기계로 모을 수단(예: CI 전체 실행에서 읽은 경로 기록)이 생길 때.
- **투영 시험의 변조 묶기(B).** 변조마다 무결성 검사를 한 번 도는 사슬은 core 구성에서만 돈다(검사 10번, 30.2초, 번당 약 3초).
  - 사슬을 통째로 없애도 카탈로그 시간 합의 0.3% 다.
  - 묶어서 줄일 수 있는 것은 그 일부다. lock 변조 둘은 같은 파일을 바꾼다. 첫 스냅숏 변조의 기대 정규식(`snapshot hash mismatch`)은 기능 선언 스냅숏 변조의 오류에도 맞는다. 이런 변조는 한 검사에 묶을 수 없다.
  - 반복 검사 경로 전체(단독 core 170초 중 58초)를 없애는 시험 전용 해시 캐시는 운영 경로와 다른 캐시 경로를 새로 들여야 해서 값어치가 낮다.

남은 큰 몫은 저장소 밖이다. 쌓인 임시 폴더 정리, 파일 색인 도구에서 작업 트리·임시 폴더 제외, Defender 예외(보안 판단)는 사용자 결정으로 남긴다.
