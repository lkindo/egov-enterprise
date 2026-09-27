# 근거 기반 개선 루프: 권한·공개 범위 결정 제안

**상태: 사용자 검토용 미승인 제안.** 2026-09-27 현재 소스를 대조한 R4 결정 입력물이며 규범, Accepted ADR, 승인 기록을 대체하지 않는다. 이 문서 작성으로 권한·응답·데이터는 바뀌지 않는다. R4-3의 브라우저 토큰 비공개 원칙만 기존 승인 이행으로 분리한다.

[재평가](adversarial-reassessment-2026-09-27.md)와 [실행 프롬프트](../03-guides/evidence-first-improvement-loop-prompt.md)의 후속이다. 아래 표의 권한은 [permission catalog](../../config/governance/permission-catalog.json)와 [operation bindings](../../config/governance/authorization-policies.json)의 현재 계약이다. 기본 그룹은 초기 배정일 뿐 실제 운영 계정의 보유 권한을 뜻하지 않는다. live DB, 실제 외부 API 소비자, 운영 설정은 이번 문서에서 실측하지 않았다.

## 한 번에 검토할 선택지

| 항목 | A — 권고안 | B — 대안 | 결정 범위 |
|---|---|---|---|
| R4-1 주소록 사용자 검색 | 검색 응답을 사용자 식별·선택용 최소 정보로 축소 | 연락처 조회를 별도 명시 권한에 한정 | 현재 수동 주소록의 연락처는 보존 |
| R4-2 고권한 계정 초기화 | 권한 관리·초기화 권한 보유자는 추가 권한을 가진 담당자만 초기화 | 고권한 초기화 전용 권한을 만들고 담당자를 별도 지정 | 그룹 이름으로 상하관계를 만들지 않음 |
| R4-3 브라우저 토큰 | **이미 승인된 비공개 원칙을 구현** | 신규 선택 대상 아님 | 직접 백엔드 API 계약 변경은 분리 |
| R4-4 공지·FAQ 작성 | 지정 게시판에 별도 작성 권한 추가 | 일반 게시판과 같은 공동 작성 범위 유지 | 읽기 범위와 다른 게시판은 보존 |
| R4-5 투표 관리 화면 | 관리 진입에 `POLL_READ`와 `POLL_READ_ALL` 모두 요구 | `POLL_READ`로 조회 화면 진입, 기능별 쓰기 권한 적용 | 설문 권한을 투표 권한으로 자동 배정하지 않음 |
| R4-6 행사 승인 필드 | 일반 행사 편집에서 서버가 승인 값을 보존 | 외부 승인 결과를 기록하는 수동 정보로 명시 | 별도 승인 워크플로를 새로 만들지 않음 |
| R4-7 만족도 평가자 | 다른 열람자에게 평가자 신원을 공개하지 않음 | 게시글 열람 권한자에게 서버가 해석한 이름 표시 | 인증·소유권·감사 기록은 두 안 모두 보존 |
| R6 부록 설문 삭제 단위 | 현재 답변 1행 삭제를 명확히 표시 | 한 사람의 전체 제출 취소로 변경 | B는 별도 제품 결정·동시성 검증 필요 |

이 표의 A/B 선택은 로컬 구현의 제품 의미를 정하기 위한 것이다. 운영 권한 배정·DB 변경·기존 데이터 정리·배포를 승인한 것으로 해석하지 않는다. R4-1의 기존 API 계약 변경 전에는 저장소 내 호출부와 알려진 외부 소비자의 전환 범위를 확정한다. 미확인 소비자가 없다고 가정하지 않는다.

## 이미 정해진 경계

[ADR-0016](../02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md)은 명시 권한의 합집합, 기능/API별 인가, 추가 자원 소유권 검사와 JavaScript에 토큰을 공개하지 않는 원칙을 승인했다. `ADMIN`이라는 이름만으로 모든 작업을 허용하는 새 예외는 제안하지 않는다.

[결정 인덱스](../../.agent/memory/decisions.md)의 DEC-OPS-035는 수신자 연락처의 서버 해석, 069는 주소록 사용자 검색 UI 미노출, 169는 연결 사용자 ID의 읽기 전용 경계를 기록한다. 이 결정을 연락처 포함 검색 API의 폐쇄 승인으로 확대하지 않는다. DEC-OPS-046의 투표 득표수 은닉과 DEC-OPS-173의 만족도 신규 등록 설정도 유지한다.

[ADR-0011](../02-architecture/decisions/ADR-0011-retire-anonymous-satisfaction-password-proof.md)은 만족도의 인증 소유권과 소유자 없는 레거시 행의 별도 moderation을 승인했다. DEC-OPS-063의 수정·삭제 버튼 노출과 서버 최종 인가 역시 신원 표시 정책과 별개다. [현재 결정 대기 레지스트리](pending-decisions.md)의 행사 사업코드·연도 의미 문제는 승인 필드의 새 워크플로를 승인한 기록이 아니다.

## R4-1 — 주소록 사용자 검색 응답

현재 근거: [AddressBookApiController](../../api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java), [AddressBookService](../../business-app/src/main/java/nuri/business/service/addressbook/AddressBookService.java), [검색 projection](../../business-app/src/main/java/nuri/business/domain/addressbook/AddressBookRepositoryImpl.java), [AddressBookUserDto](../../business-app/src/main/java/nuri/business/service/addressbook/dto/AddressBookUserDto.java).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| `ADBK_READ` 보유자 | `/address-books/search-users` 검색 | 최소 2글자·최대 페이지 크기 20; 로그인 ID·이름·이메일·휴대전화 응답 |
| `ADBK_READ` 없는 사용자 | 같은 API 검색 | operation permission에서 거부 |
| 자기 소유 또는 허용된 공유 주소록의 열람자 | 수동 입력 연락처 조회 | 기존 주소록 공유·소유권 계약 적용; 검색 API와 다른 자원 |

검색 DTO에는 사무실·집 전화 슬롯도 있지만 현재 검색 projection은 두 값을 `null`로 만든다. 따라서 여섯 필드가 항상 실데이터로 노출된다고 단정하지 않는다. 현재 검색의 활성 계정 필터도 최소 사용자 검색과 대조해야 한다.

**A 권고:** 검색 전용 응답을 [UserSearchDto](../../business-core/src/main/java/nuri/business/service/user/dto/UserSearchDto.java)의 식별자·이름·부서·부재 정보 수준으로 제한하고 활성 계정만 선택하게 한다. 기존 `userId`의 로그인 ID를 내부 사용자 키로 조용히 바꾸지 말고 명시적인 응답 계약 전환으로 처리한다. 수동 주소록 연락처와 연결 사용자의 읽기 전용 ID는 보존한다. **B:** 업무상 직접 연락처 조회가 필요하면 별도 연락처 조회 권한과 필요한 필드만 정의한다. 기본 `ADBK_READ`나 관리자 그룹 이름에 이 권한을 자동 부여하지 않는다.

소비자 영향: [AddressbookUserService](../../frontend/src/services/business/user/addressbook/AddressbookUserService.ts)의 검색 반환형, OpenAPI와 생성 계약을 같이 전환한다. 현행 사용자 검색 UI 미노출은 유지한다. [recipient-picker](../../frontend/src/app/components/ui/recipient-picker.tsx)의 최소 사용자 선택 및 서버 발송용 연락처 해석은 유지한다. 실제 비브라우저 소비자의 존재는 미확인이다.

검증: 허용 주체의 정상 검색·길이/페이지 경계가 통과하고, 권한 없는 검색·비활성 사용자 노출·응답의 연락처 필드 재도입이 실패해야 한다. 수동 주소록 연락처와 발송 기능은 계속 동작해야 한다. 복구는 검색 기능을 일시 차단하거나 합의된 버전 계약으로 전환하는 방식이며, 축소 후 무심코 넓은 응답을 되살리지 않는다.

## R4-2 — `USER_PASSWORD`의 고권한 대상 초기화

현재 근거: [UserService](../../business-core/src/main/java/nuri/business/service/user/UserService.java)의 `updatePasswordByAdmin`, [UserApiController](../../api-server/src/main/java/nuri/api/controller/UserApiController.java), [AuthorizationAdministrationService](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| `USER_PASSWORD` 보유자 | 존재하는 일반·권한 관리 계정의 비밀번호 초기화 | 대상의 유효 권한을 구분하지 않고 허용; 잠금 해제·refresh token 폐기 동반 |
| 해당 권한 없는 사용자 | 다른 계정 초기화 | 거부 |
| 본인 | 본인 비밀번호 변경 | 별도 경로의 기존 비밀번호 증명 적용 |

따라서 현재 문제는 위임 권한으로 초기화할 수 있는 대상의 범위다. 실제 위임자가 존재한다거나 관리자 탈취가 실행됐다는 증거는 아니다.

**A 권고:** 대상이 `AUTHRT_GRANT`, `AUTHRT_ASSIGN`, `USER_PASSWORD` 중 하나라도 보유하면 보호 대상으로 정의한다. 보호 대상 초기화는 행위자가 `USER_PASSWORD`와 `AUTHRT_GRANT`, `AUTHRT_ASSIGN`을 모두 가진 경우에만 허용한다. 일반 대상은 현재 `USER_PASSWORD`로 유지한다. 판정은 최신 유효 권한을 사용하고 그룹 이름·로그인 ID를 하드코딩하지 않는다. **B:** 고권한 초기화 전용 권한을 신설하여 별도 지정한 담당자만 수행하게 한다. 그 권한의 최초 부여 대상까지 결정해야 한다.

소비자 영향: [UserOrgHubClient](../../frontend/src/app/admin/user/UserOrgHubClient.tsx)의 대상별 실패 설명, 서버 인가와 테스트가 달라진다. 단순 버튼 숨김으로 끝내지 않는다. 본인 변경 경로, 계정 잠금 해제, refresh token 폐기와 마지막 권한 관리자 보호는 보존한다.

검증: 일반 대상 초기화는 성공하고, 위임 초기화 담당자가 보호 대상을 로그인 ID 또는 내부 키로 지정해도 거부돼야 한다. 선택한 추가 권한을 가진 담당자는 성공해야 한다. 요청으로 대상 권한을 위조하거나 권한 회수 후 초기화할 수 없어야 한다. 복구는 보호 대상 초기화를 잠정 차단하고 지정 담당자의 승인된 복구 절차를 사용한다. 폐기한 토큰을 되살리거나 관리자 예외를 자동 확대하지 않는다.

## R4-3 — 브라우저 BFF 우회 응답: 기존 승인 이행

현재 근거: [일반 rewrite](../../frontend/next.config.ts), [BFF reissue](../../frontend/src/app/api/auth/reissue/route.ts), [BFF 응답 계약](../../frontend/src/lib/auth/auth-reissue-contract.ts), [AuthApiController](../../api-server/src/main/java/nuri/api/controller/foundation/auth/AuthApiController.java), [origin 검사](../../frontend/src/proxy.ts).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| 브라우저 세션 | `/api/auth/reissue` 호출 | HttpOnly 쿠키 갱신; 응답은 그룹·권한·버전이고 토큰 본문 없음 |
| 동일 origin에서 실행되는 JavaScript | 일반 rewrite의 `/api/v1/auth/reissue` 호출 | 백엔드 토큰 응답 본문에 도달하는 경로 존재 |
| 직접 백엔드 API 소비자 | 백엔드 reissue 호출 | 토큰 응답 계약 존재; 실제 소비자 목록은 미확인 |

동일 origin 실행 권한을 얻은 스크립트가 토큰을 읽을 수 있는 경계이며, 이 사실만으로 외부 origin의 CSRF 성공을 주장하지 않는다. 토큰의 JavaScript 비공개는 ADR-0016에 이미 승인돼 있으므로 원칙 자체는 다시 묻지 않는다.

**최소 구현안:** Next의 `/api/v1/auth/reissue`에 명시적 Route Handler를 두어 기존 BFF의 안전한 응답·쿠키 처리로 연결한다. 일반 rewrite에 앞서는 실제 route 우선순위를 검증한다. backend API의 직접 호출 계약은 이 변경에서 유지한다. 같은 인증 prefix의 로그인 응답에도 토큰 본문 우회가 있는지 대조하고, 접근 가능한 브라우저 별칭은 각 BFF 계약으로 연결한다. 실제 비브라우저 소비자가 이용하는 경계의 변경은 별도 계약 검토 대상이다.

검증 순서: (1) 현재 별칭으로 재발급했을 때 브라우저 응답에 토큰이 나타나는 회귀 사례를 red로 확인한다. (2) 기존 BFF의 정상 재발급·안전한 오류·쿠키 테스트를 재사용해 별칭을 검증한다. (3) 실제 Next HTTP 경로에서 별칭이 generic rewrite를 우회하지 못하고 토큰 없이 쿠키가 갱신되는지 확인한다. 잘못된 origin, 만료/폐기 토큰, 401·429·5xx 응답 의미, `HttpOnly`·`Secure` 정책, 일반 업무 API rewrite를 함께 검증한다. 핸들러 직접 호출 테스트만으로 경로 우선순위가 입증됐다고 하지 않는다.

변경 파일 후보는 새 `frontend/src/app/api/v1/auth/reissue/route.ts`, 기존 인증 Route Handler 및 가까운 테스트다. API 계약을 바꾸지 않으면 백엔드 DTO·DB 변경은 필요하지 않다. 공유 구현은 현재 BFF를 재사용하는 최소 수준으로 제한한다. 장애 시 별칭을 안전하게 거부하도록 복구하고 토큰 본문을 다시 공개하지 않는다. 이 문서에는 토큰 값이나 재현용 실제 자격증명을 기록하지 않는다.

## R4-4 — 공지·FAQ의 쓰기 범위

현재 근거: [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [board ID 설정](../../frontend/src/config/board-ids.ts), [서버 게시판 설정](../../api-server/src/main/resources/application.yml), [KnowledgeHubClient](../../frontend/src/app/admin/help/KnowledgeHubClient.tsx).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| `BOARD_CREATE` 보유자 | 구성된 공지·FAQ 게시판에 작성 | 다른 게시판과 공통 생성 경로 사용; 별도 공지 작성 권한 없음 |
| `BOARD_UPDATE` 보유자 | 공지·FAQ 수정 | 작성자 검사 또는 `BOARD_UPDATE_ALL`, 추가 커뮤니티 자원 검사 적용 |
| `BOARD_DELETE` 보유자 | 공지·FAQ 삭제 | 작성자 검사 또는 `BOARD_DELETE_ALL`, 추가 자원 검사 적용 |

기본 구성에서 공지와 도움말 FAQ의 ID는 같을 수 있다. 별도의 지식 FAQ ID와 운영 게시판의 실재 여부는 이름만으로 단정하지 않는다. 서버 설정의 정확한 대상 게시판을 기준으로 삼는다.

**A 권고:** 지정 공지·FAQ 게시판의 생성·수정·삭제에 별도 명시 작성 권한을 추가하되, 기존 동작 권한과 소유권/`*_ALL` 검사도 그대로 요구한다. 최초 편집 담당자는 명시적으로 지정해야 한다. **B:** 현재 공동 작성 범위를 유지하고 제품 문구와 운영 절차에서 이를 분명히 한다. 공지라는 화면 이름만으로 관리자 전용이라는 가정을 하지 않는다.

소비자 영향: 일반·첨부 포함 생성, 답글, 편집·삭제의 서버 진입점과 [게시글 작성 화면](../../frontend/src/app/admin/community/boards/insert-board-article/BoardRegistClient.tsx)의 기능 노출을 같이 맞춘다. 도움말 읽기나 일반 게시판 작성 범위는 변경하지 않는다. 이미 작성된 글을 삭제하거나 작성자를 바꾸지 않는다.

검증: 지정 편집자의 공지 작업과 일반 사용자의 일반 게시판 작업은 성공해야 한다. 일반 사용자가 직접 API·첨부 경로·다른 게시판 ID로 공지 작성 제한을 우회하면 실패해야 한다. 편집 권한이 비밀글·커뮤니티 접근권까지 넓혀서는 안 된다. 복구 시 공지 쓰기를 일시 제한하며, 규칙 제거로 전체 사용자에게 쓰기를 넓히지 않는다.

## R4-5 — 투표 관리 화면과 API의 권한 축

현재 근거: [SurveyManageClient](../../frontend/src/app/admin/survey/manage/SurveyManageClient.tsx), [OnlinePollAdminClient](../../frontend/src/app/admin/survey/polls/OnlinePollAdminClient.tsx), [OnlinePollService](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java), [page authorization](../../frontend/src/lib/auth/page-authorization.ts).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| `SURVEY_READ_ALL` 또는 `SURVEY_RSP_READ` 보유자 | `/admin/survey/manage` 진입 | 화면 접근은 허용될 수 있으나 실제 호출은 `POLL_READ`가 필요한 투표 API |
| `POLL_READ_ALL` 보유자 | `/admin/survey/polls` 진입 | 페이지 허용; 실제 목록 API에는 별도 `POLL_READ` 필요 |
| `POLL_READ`, `POLL_CREATE/UPDATE/DELETE/VOTE` 보유자 | 투표 조회·각 동작 | 해당 operation 권한 적용; 설문 권한만으로 충족되지 않음 |

`/admin/survey/manage`의 상세·생성도 현재 투표 기능을 소비한다. 일반 설문 문항·응답 관리와 구분해야 한다. 페이지 권한 배열은 현재 **OR** 평가이므로 `POLL_READ`, `POLL_READ_ALL`을 나열하는 것만으로 AND가 되지 않는다.

**A 권고:** 투표 관리 화면의 읽기 진입은 `POLL_READ AND POLL_READ_ALL`, 작성 동작은 추가 `POLL_CREATE`, 수정·삭제는 각 권한으로 통일한다. 기존 두 진입 URL은 우선 유지한다. 참여 화면은 조회와 투표 실행을 구분해 각각의 권한을 확인한다. AND 표현이 필요하면 정책 스키마·생성기·소비자를 명시적으로 확장한다. **B:** `POLL_READ`에 조회 화면 진입을 허용하고 쓰기 기능은 각 권한으로 제한한다. 이는 관리 화면의 대상 확대라는 제품 선택이다.

소비자 영향: 페이지와 API 권한 계약·생성물·UI가 함께 달라진다. `SURVEY_*`만 가진 사용자가 투표 화면을 볼 수 있다고 안내하던 흐름을 정리한다. SURVEY 권한을 POLL로 자동 배정하지 않고 실제 필요한 담당자의 배정은 별도로 검토한다. 일반 설문 권한과 진행 중 득표수 은닉은 보존한다.

검증: 투표용 최소 조합으로 목록·상세가 성공하고, 설문 권한만 있거나 A에서 `POLL_READ_ALL`만 있는 사용자는 관리 진입에 실패해야 한다. 읽기 전용 사용자의 쓰기 요청은 거부되고, 투표 기간·중복 투표·미투표자의 득표수 은닉은 유지돼야 한다. 복구는 잘못 연결된 관리 진입을 제한하는 방식으로 수행하며 권한을 자동 추가하지 않는다.

## R4-6 — 행사 승인 필드의 의미

현재 근거: [EventInfoService](../../business-app/src/main/java/nuri/business/service/operation/EventInfoService.java), [EventInfoRequest](../../business-app/src/main/java/nuri/business/service/operation/dto/EventInfoRequest.java), [EventInfoDto](../../business-app/src/main/java/nuri/business/service/operation/dto/EventInfoDto.java), [EventManagementClient](../../frontend/src/app/admin/operation/events/EventManagementClient.tsx).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| `EVENT_CREATE` 보유자 | 행사 생성 시 승인 여부·승인일 전달 | DTO 값을 저장; 별도 승인 권한·절차 없음 |
| `EVENT_UPDATE` 보유자 | 기존 행사 승인 필드 수정 | DTO 값을 저장; 일반 편집과 승인 전이의 구분 없음 |
| 현재 행사 화면 사용자 | 일반 정보 편집 | 숨은 승인 필드는 기존 값을 다시 보내 보존 |

**A 권고:** 일반 생성에서는 미승인 값과 빈 승인일을 서버가 정하고, 일반 편집에서는 기존 승인 필드를 보존한다. 변경 시도는 명시적 오류로 거부하되 기존 화면의 동일 값 재전송은 호환한다. 새 승인 워크플로는 만들지 않는다. 기존 `null`·승인 값을 일괄 보정하지 않는다. **B:** 이 필드를 외부에서 이뤄진 승인의 수동 기록으로 정의하여 `EVENT_CREATE/UPDATE` 담당자가 입력하게 한다. 이 경우 시스템 자체의 승인 통제라고 표현하지 않으며 값·날짜의 정합성과 작성 감사만 검증한다.

소비자 영향: A는 일반 요청 DTO에서 승인 변경을 통제하고 화면의 기존 값 보존 흐름을 유지한다. B는 숨은 값을 그대로 전달하는 화면 대신 의미가 드러나는 입력과 설명이 필요하다. 승인자 지정·다단계 결재·DB 컬럼 추가는 두 안의 자동 후속 작업이 아니다.

검증: 일반 행사 정보 수정으로 기존 승인 필드가 없어지지 않고, A에서 조작한 승인 여부·날짜가 저장되지 않아야 한다. B는 모순된 값·날짜가 실패해야 한다. 권한 없는 행사 쓰기는 두 안 모두 거부한다. 복구 시 승인 필드는 동결하고 일반 편집만 복구한다. 기존 승인 이력을 지우는 데이터 정리는 별도 승인이 필요하다.

## R4-7 — 만족도 평가자 표시

현재 근거: [SatisfactionService](../../business-app/src/main/java/nuri/business/service/board/SatisfactionService.java), [Satisfaction](../../business-app/src/main/java/nuri/business/domain/board/Satisfaction.java), [SatisfactionDto](../../business-app/src/main/java/nuri/business/service/board/dto/SatisfactionDto.java), [SatisfactionSection](../../frontend/src/components/features/satisfaction/SatisfactionSection.tsx).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| 만족도 읽기 권한과 게시글 접근권 보유자 | 평가 목록 조회 | DTO에 `userId/userNm` 슬롯 존재; 새 행은 감사 작성자를 저장하지만 이름을 직접 채우지 않음 |
| 인증된 평가 작성자 | 본인 평가 수정·삭제 | 감사 작성자 기준 소유권 검사; 요청의 표시 이름으로 인가하지 않음 |
| 명시적 `*_ALL` 또는 moderation 권한자 | 허용된 타인 평가 작업 | 각 동작·레거시 무소유자 처리 경계를 별도로 적용 |

현재 화면의 이름 없는 평가가 ‘익명’으로 표시되는 것과 인증·감사 기록이 없는 것은 다르다. 기존 이름 컬럼에 값이 있는 레거시 행도 있을 수 있으므로 전체 행이 익명이라고 단정하지 않는다.

**A 권고:** 다른 열람자에게 신원을 공개하지 않는 표시 정책을 정하고 ‘평가자 비공개’처럼 의미를 명확히 한다. 목록 응답에 로그인 ID나 기존 실명을 우회 수단으로 남기지 않는다. 저장된 감사·레거시 데이터는 삭제하지 않는다. moderation 권한을 신원 열람 권한으로 자동 확대하지 않는다. **B:** 게시글 열람 권한자에게 서버가 감사 작성자를 기준으로 해석한 현재 이름을 보여준다. 이름을 찾을 수 없을 때 ID를 대신 노출하지 않고 일반 문구를 사용한다. 평가 당시 이름이 필요하다면 별도 이력 요구사항으로 다룬다.

소비자 영향: 표시 DTO와 생성 계약, 화면의 이름 대체 문구가 달라진다. 평가 생성 요청에 이름을 추가해 신원을 채우지 않는다. 승인된 수정·삭제 버튼 노출, 서버 인가, 중복 평가, 신규 평가 허용 설정은 그대로 둔다. ‘비공개’를 비인증 평가 재도입으로 해석하지 않는다.

검증: 작성자의 정상 수정·삭제와 허용된 moderation은 성공하고, 타인이나 위조한 이름으로 소유권을 얻는 요청은 실패해야 한다. A는 목록의 신원 필드 재노출, B는 요청 이름의 신뢰·찾을 수 없는 이름의 ID 대체가 실패해야 한다. 게시글 접근권 없는 목록 조회와 소유자 없는 레거시 행의 일반 수정도 거부한다. 복구는 신원 표시를 중단하는 방향으로 하며 DB 감사 기록은 유지한다.

## R6 부록 — 설문 삭제의 단위

현재 근거: [SurveyResultService](../../business-app/src/main/java/nuri/business/service/survey/SurveyResultService.java)의 `deleteResponse`, [SurveyResponseAdminApiController](../../api-server/src/main/java/nuri/api/controller/foundation/controller/system/service/survey/SurveyResponseAdminApiController.java), [SurveyResponseClient](../../frontend/src/app/survey/response/SurveyResponseClient.tsx).

| 주체 | 대상 × 동작 | 현재 결과 |
|---|---|---|
| `SURVEY_RSP_DELETE` 보유자 | `srvyRspnsSn` 하나 삭제 | 질문에 대한 답변 한 행 삭제 |
| 같은 권한자 | 특정 사람의 전체 제출 취소 | 별도 제출 단위 API 없음 |
| 일반 응답자 | 자기 제출 철회 | 현재 관리자 삭제 권한으로 자동 허용되지 않음 |

**A 권고:** 한 행 삭제 의미를 유지하고 확인 문구에 ‘답변 1건’, 해당 질문과 통계 영향을 분명히 한다. 다른 답변이 남으면 재제출이 가능해지는 것으로 안내하지 않는다. **B:** 전체 제출 취소를 별도 기능으로 만든다. 묶음 키는 설문과 감사 작성자이며 표시 이름으로 합치지 않는다. 작성자를 찾을 수 없는 행은 추정해서 삭제하지 않는다. 제출과 같은 잠금 경계를 사용해 전체 삭제의 원자성을 검증한다. 취소 후에는 기간과 기존 제출 권한 조건을 충족할 때 재제출할 수 있도록 할지 명시해야 한다.

검증: A는 선택한 행만 없어지고 다른 답변·사람의 제출은 유지돼야 한다. B는 한 사람의 전체 묶음만 삭제되고 동시 제출과 충돌해 일부만 남지 않아야 한다. 권한 없는 삭제와 다른 설문·동명이인 묶음 삭제는 실패해야 한다. 기존 문항 의미 동결·응답 있는 문항 삭제 제한은 유지한다. 물리 삭제한 데이터는 코드 롤백으로 돌아오지 않으므로 실제 데이터에 적용하기 전 백업·복구 경계를 따로 확인한다.

## 결정 후의 실행 경계

선택이 확정되면 승인된 항목별 권한 표와 소비자 계약을 먼저 고정하고, 가장 가까운 기존 테스트에서 실패 사례를 만든 뒤 최소 구현과 성공 사례를 검증한다. API 변경은 OpenAPI·생성 계약·양단 검증을 같이 수행한다. 필요한 새 명시 권한의 이름·초기 부여 대상은 구현 전에 확정하며 운영 권한 변경은 별도 승인 범위를 따른다.

이번 산출물의 검증은 링크·문서 계약과 현재 소스 대조다. 표의 권고 동작이 실행되거나 검증됐다는 뜻은 아니다. 승인 기록·규범·공용 메모리는 사용자 결정 후 정본 순서에 따라 갱신한다.
