# ADR-0036 — 목록 페이지는 1 기반 `page`·`size` 하나로, 자원을 만드는 POST 는 201 과 새 식별자로 통일한다

- 상태: Accepted
- 결정일: 2026-10-19
- 승인: 사용자가 2026-10-19 API 규약 초안의 권고안을 모두 승인했다 — 페이지 P-A(이름 통일 A2 포함), 상태 코드 S-A, 백엔드 헌법 제6조 4·5항 신설, 같은 부류 결함 5건 정정. `/api/v1` 의 저장소 밖 소비자가 없음을 확인하고, v1 안에서 `page` 의 뜻을 바꾸는 것을 [API 문서 가이드](../../03-guides/api-documentation-guide.md) §3("중대한 변경은 v2")의 예외로 승인했다.
- 부분 대체: API 문서 가이드 §2 의 "생성·삭제라는 이유만으로 문서 예시의 `201`·`204`를 실제 구현에 강제하지 않는다" 가운데 생성 부분(삭제 204 는 여전히 쓰지 않는다), [프런트엔드 아키텍처](../frontend-architecture.md) §3 의 "0-based `page` 와 `pageIndex`·`pageUnit` 등 입력 별칭은 각 서비스가 명시적으로 정규화한다".

## 맥락

main `682d203f3` 실측에서 페이지 파라미터를 받는 연산은 74개였다. 요청 번호는 Spring `Pageable`(39)과 `int page`(5)가 0 기반, `BaseSearchDto`(24)와 `int pageIndex`(6)가 1 기반이었고, 응답 `PageResponse.page` 는 67개 모두 1 기반이었다. 같은 연산 안에서 요청 0·응답 1 인 비대칭이 42개였고, 그 차이를 화면 32곳·서비스 14곳의 ±1 산술과 별칭 정규화가 메웠다. Spring 은 모르는 query 이름을 무시하고 `Pageable` 은 범위 밖 값을 조용히 깎으므로, 이름이나 기준을 틀린 호출은 red 없이 다른 페이지를 받았다 — 그룹 화면의 건수 선택, E2E 배너·팝업 정리의 첫 10건, 부하 시험의 첫 페이지 누락, 온라인 투표 관리의 0 기반 URL, 외부인사 화면의 `size: 200` 이 같은 부류였다.

생성 응답은 "200·201 혼재" 가 아니라 410개 연산 모두 200 이었다. 실제 불일치는 본문이었다 — 이름으로 고른 생성 POST 59개 가운데 `data` 가 식별자인 것 29, DTO 8, 없음 22.

## 결정

1. **페이지 번호는 1 기반 하나다.** 모든 목록은 `page`(1 이상, 기본 1)와 `size`(1~100)를 받고, 응답은 `PageResponse` 하나이며 `page` 는 요청과 같은 번호다. `spring.data.web.pageable.one-indexed-parameters=true`·`max-page-size=100` 이 `Pageable` 을, `BaseSearchDto` 의 HTTP 이름 `page`·`size` 가 나머지를 같은 규약에 둔다. 0 기반 변환은 서버 경계(리졸버·`BaseSearchDto#toPageable`) 한 곳에만 있다.
2. **목록은 `Pageable` 또는 `BaseSearchDto` 로만 받는다.** `@RequestParam int page/pageIndex` 로 받던 11개 핸들러를 옮겼다 — 정렬을 받지 않던 목록은 `@UnsortedPageable` 로 정렬을 걷어 정렬의 허용 범위를 넓히지 않는다. 후속 작업 목록은 Spring `Page` 원형 대신 `PageResponse` 를 돌려준다.
3. **잘못된 입력은 400 이다.** `PaginationRequestFilter` 가 `/api/` 아래 GET 에서 `page` 1 미만·정수 아님, `size` 범위 밖, 서버가 읽은 적 없는 옛 이름(`pageNo`·`pageSize`·`recordCountPerPage`·`firstIndex`·`lastIndex`)을 400 으로 거부한다. 리졸버는 `page=0` 을 조용히 첫 페이지로 깎으므로 이 경계가 없으면 옛 0 기반 호출이 한 칸씩 밀린다.
4. **옛 이름 `pageIndex`·`pageUnit` 은 한 릴리스 동안 별칭이다.** 뜻이 같으므로 필터가 `page`·`size` 로 옮겨 받고 경고 로그를 남긴다. 새 이름과 함께 오면 400 이다. 스펙에는 싣지 않고 `page`·`size` 설명에 폐기 예정임을 적는다. 다음 릴리스에서 별칭을 걷으면 그 이름도 400 이 된다.
5. **`PageResponse` 의 다섯 필드는 스펙에서 필수다.** 생성 계약이 선택·nullable 로 만들던 것을 바로잡는다.
6. **자원을 만드는 POST 는 201 이고 본문 `data` 는 새 식별자다.** 핸들러는 `@ResponseStatus(HttpStatus.CREATED)`(스펙이 201 을 쓰게 한다)와 `ApiResponse.created(…)`(본문 `status` 201)를 함께 쓰고, `ResponseEntity` 면 `ResponseEntity.status(HttpStatus.CREATED)` 로 HTTP 상태를 본문과 같게 둔다. `data` 가 없던 생성 응답에 식별자를 더했다(덧붙이기). 식별자를 담은 DTO 를 돌려주던 8개는 그대로 둔다 — DTO 가 식별자를 싣고, 바꾸면 소비자를 깨는 변경이다. `Location` 헤더는 넣지 않는다. 행위형 POST 와 PUT·PATCH·DELETE 는 200 + envelope 그대로다(204 는 헌법 제6조 1항과 충돌해 쓰지 않는다).
7. **규약을 헌법에 둔다.** 백엔드 헌법 제6조에 4항(페이징)·5항(성공 상태 코드)을 신설한다.

### 201 분류 기준과 판단

기준은 이름이 아니라 "요청이 새 주소를 갖는 자원 하나를 만들고, 그 자원을 식별자로 다시 부를 수 있는가" 다(H4). 이름이 생성형이어도 전체 교체 저장이나 참여 기록은 200 이다.

| 구분 | 연산(핸들러) | 판단 근거 |
|---|---|---|
| 201 — 생성(식별자 본문 있던 것) | 게시글·게시글+첨부·만족도·댓글·첨부 업로드(4경로 1핸들러)·결재·부서 업무·업무함·일정·스크랩·메모 보고·알림·행사·배너·팝업·도움말 2종·게시판 마스터·부서·사용자·설문 복제(2경로) | 새 행의 식별자를 이미 돌려줬다 — 상태만 201 |
| 201 — 생성(DTO 본문) | 권한 그룹 생성·복제, 커뮤니티, 외부인사, 포상, 결재선 저장, 결재 임시저장 | DTO 가 새 식별자를 싣는다 — 본문 유지 |
| 201 — 생성(본문에 식별자 추가) | 주소록·행정코드·분류코드·공통코드·상세코드(코드 ID·상세코드 쌍)·사용자 그룹·로그인 정책(사용자 ID)·메뉴·정책(유형 코드)·설문·문항·선택지·설문 템플릿(각 2경로)·템플릿·온라인 투표·업무보고 | 종전 `data` 없음 — 새 식별자를 더한다(없던 22개 연산 중 200 에 남는 메뉴 할당 저장 1개를 뺀 21개, 쪽지 포함) |
| 201 — 초안 "판단 필요" | 메일 발송, 문자 발송, 쪽지 발송(식별자 추가), 공개 가입(DTO 유지) | 발송 이력·쪽지·계정이라는 자원이 생기고 목록·상세로 다시 부른다(메일 `/mails/{id}`, 쪽지 `/notes/{noteSn}`) |
| 200 — 초안 "판단 필요" | 설문 응답 제출 | 참여 기록이다 — 답변 N행이 생기지만 응답은 (설문, 본인)으로 식별하고 새 식별자가 없다. 본문은 저장한 답변 수다. 투표와 같은 부류 |
| 200 — 생성형 이름 | 권한별 메뉴 할당 저장(`createMenuCreation`) | 전체 교체 저장 — 새 자원이 아니다 |
| 200 — 생성형 이름 | 인터넷서비스안내 등록(`registerIsg`) | 같은 날 별도 작업에서 API·화면을 퇴역한다 — 퇴역과 함께 census 행을 걷는다 |
| 200 — 이름 밖 POST 29개 | 투표·읽음 표시(2)·메일 재발송·커뮤니티 가입 신청·인증과 MFA(11)·결재 보완 요청·보완 답변·재상신·재알림·참조자 추가·결재자 확인·사용자 권한 일괄 저장·후속 작업 재처리·부서 권한 일괄 저장·기관코드 수신 처리·게시판 일괄 상태·일괄 삭제·관리자 알림 발송 | 상태 전이·행위·전체 교체·일괄 처리다. 재상신은 같은 문서의 새 차수(같은 식별자), 가입 신청은 (커뮤니티, 사용자) 행의 상태 전이(재신청은 같은 행), 관리자 알림 발송·참조자 추가는 여러 행을 만들고 건수를 돌려준다 |

결과는 생성 POST 56개 연산(48개 핸들러)이 201 이다. 정본 목록은 `ResponseContractLinterTest` 의 생성 census(`CREATED_HANDLERS`)와 200 유지 목록(`CREATION_NAMED_KEEP_200`)이다.

## 검증

같은 불변식을 보던 두 게이트를 넓혔다(새 게이트 없음).

- GH-PAGEABLE-CONSTRUCTION(`PageableConstructionLinterTest`): 컨트롤러의 `@RequestParam` 페이지 값 직접 수신 금지, main·test application.yml·시험용 리졸버(`PageableTestResolvers`)·필터·`BaseSearchDto` 의 페이징 값 일치, 시험 소스의 `new PageableHandlerMethodArgumentResolver()` 금지(공용 팩토리만), `@UnsortedPageable` 의 정렬째 전달 금지, 스펙의 모든 목록이 `page`(최소 1)·`size`(1~100)만 갖고 옛 이름·"Zero-based" 서술이 없으며 응답이 필수 다섯 필드의 `PageResponse` 인지(예외는 xlsx 반출 5개·통합 검색 1개, 사유와 함께 exact).
- GH-RESPONSE-CONTRACT(`ResponseContractLinterTest`): Spring `Page` 원형 반환 금지, 생성 census 양방향 exact(census 핸들러는 POST·`@ResponseStatus(CREATED)`·`ApiResponse.created`·`ResponseEntity.status(CREATED)`, census 밖은 201 을 쓰지 않음, 생성형 이름의 POST 는 census 나 200 유지 목록 중 하나), 스펙의 성공 응답이 연산마다 하나이고 census 연산만 201.
- 규칙마다 합성 위반 fixture 가 의도한 문구로 red 가 되는 시험을 같은 클래스에 둔다.
- `PaginationConventionIntegrationTest` 가 운영과 같은 Spring 컨텍스트에서 `Pageable`·`BaseSearchDto` 목록 하나씩의 1·2페이지 비중복, 옛 이름 별칭, `page=0`·`size` 0·101·옛 이름 400, 생성 POST 의 HTTP 201 = 본문 `status` 201 을 본다.

## 배포와 경계

- 프런트와 백엔드를 **같은 릴리스**로 배포한다. 버전이 섞인 창에서는 페이지가 한 칸 어긋난다. 릴리스 노트에 대조표를 싣는다: `page=0` → 400, 옛 `page=N`(0 기반) → `page=N+1`, `pageIndex`·`pageUnit` 은 한 릴리스 뒤 400, 생성 POST 56개는 201.
- 경계로 줄일 수 없는 잔여 위험은 "옛 0 기반으로 `page≥1` 을 부르는 호출" 하나다 — 같은 이름의 뜻이 바뀌어 400 없이 한 페이지 앞을 받는다. 저장소 밖 소비자가 없다는 확인이 이 결정의 전제다.
- 목록 상한이 2000(Boot 기본, 조용한 깎기)에서 100(400)으로 내려간다. 100 을 넘겨 받던 화면은 끝까지 따라가는 `fetchAllPages` 로 옮긴다.
- 이미 만든 재사용 생성물은 자동으로 바뀌지 않는다(업그레이드 키트 미구현). 새로 만드는 생성물에는 이 규약이 그대로 실린다. 기관 이행 노트는 [재사용 base 가이드](../../03-guides/reusable-base-guide.md)에 둔다.
- 바뀌지 않는 것: `ApiResponse` envelope 필드와 오류 응답, `PageResponse` 의 다섯 필드 이름, binary/stream 예외(DEC-OPS-016), URL allowlist 의 키와 ADR-0009 의 판단, 삭제·갱신의 200, 인가 바인딩·권한 원장, DB 스키마.
