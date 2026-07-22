# 관리자 메뉴 완성도·UI/UX 전수 감사 (2026-07-22)

> 등급 L0(읽기 전용 분석) · 코드 변경 없음 · Claude Code 워크플로우 60 에이전트(실패 0)
> 범위: `/admin/**` 95개 라우트 + `tb_menu_info` 88행 · 확정 발견 294건(high 26 / medium 201 / low 67)
> 방법: 도메인 12분할 감사 → 도메인별 회의론자 검증 → 횡단 4축(메뉴-라우트 정합·디자인 일관성·접근성/성능·백엔드 격차) → 고심각도 2렌즈 배치 반증(4건 탈락) → 종합 + 완결성 비평

## 메인 에이전트 직접 재검증 로그 (SOP §2.3)

위임 산출물 중 아래 항목은 메인 에이전트가 원본 파일을 직접 열어 재확인했다. 전부 사실로 확정.

| 항목 | 재검증 근거 | 판정 |
|---|---|---|
| 정책 저장 시 본문 소실 | `PolicyApiController.updatePolicy` 가 `policyMap.getOrDefault("title", type)` / `getOrDefault("content", "")` 로 수신, FE 는 `{plcyTtl, plcyCn}` 전송 | 확정 |
| 신규 메뉴 라우트 입력 부재 | `MenuAdminClient.tsx` 모달 필드 = menuNm·menuOrdr·useYn 3개뿐 (modernRoute 입력 없음) | 확정 |
| 메뉴 설명·아이콘 조용한 소실 | `MenuService.updateMenuManage` 가 `vo.getMenuExpln()`(FE 미전송=null)로 무조건 덮어씀, `Menu.update()` 전량 대입 | 확정 |
| 시드 메뉴 404 | menu_sn 8744343/8808554 → `/admin/community/boards/selectBoardList` 디스크 부재(실제 라우트는 `select-board-list`) | 확정 |
| F-2 발송메일 전건 노출 | `MailApiController` GET·GET/{id}·DELETE 에 `@PreAuthorize` 없음 + `MailService` 발신자 스코핑 없음 + `ApiSecurityConfig` 는 `/api/v1/admin/**` 만 관리자 제한(그 외 authenticated) + middleware 가 `/admin/collaboration` 을 일반 사용자에게 개방 | 확정 |
| F-3 주소록 상세 IDOR | `AddressBookApiController.getAddressBook` 에 `@AuthenticationPrincipal` 없음(PUT/DELETE 에는 있음), `AddressBookService.getAddressBook` 소유자 검증 없음 | 확정 |
| F-5 디버그 엔드포인트 | `MenuUserApiController` 의 `/test/raw`·`/test/programs` 에 권한 애노테이션 없음, `getAllMenus()` 는 권한 필터 미적용 | 확정 |

**보류(deferred)**: 런타임 화면 검증(개발 서버 구동·E2E·브라우저 스크린샷)은 수행하지 않았다. 모든 판정은 정적 근거(소스 코드·DB 실측)에 기반하며, 실제 화면 거동 확인은 개발 서버 구동 후 별도 수행이 필요하다. 착수 시 배치별 게이트는 본문 §7 말미 참조.

**후속 조치 시 주의**: 완결성 비평 F-3 는 도메인 감사 권고 `collab-adbk-01`(주소록 상세 화면을 백엔드 GET 에 배선하라)과 충돌한다. **인가 가드 추가가 선행되지 않으면 잠복 IDOR 이 정식 기능이 된다.**

---

# 관리자 메뉴 전수 감사 — 종합 보고서

**감사 범위**: `/admin/**` 95개 라우트 · 17개 도메인 · 확정 발견 250건
**기준일**: 2026-07-21 / 근거: 전 항목 file:line 실측 (읽기 전용 감사, 코드 미변경)

---

## 1. 총평

관리자 화면은 **시각적 완성도(허브 헤더·지표 카드·DnD·모션)와 실제 동작 사이의 괴리가 이 시스템의 핵심 부채**다. 공통 인프라(`StandardDataTable`의 error/onRetry·페이저·모바일 카드뷰, `useConfirm`, `useAppForm`+generated-zod, `HubSkeleton`, `admin/error.tsx`)는 이미 헌법 요구 수준으로 갖춰져 있으나, **43개 목록 화면 중 error/onRetry를 전달하는 곳은 4개뿐**이고 페이저·확인모달·폼검증도 화면별로 제각각 재구현되어 있다. 더 심각한 축은 계약 불일치다 — 프론트 로컬 인터페이스가 `generated-api.d.ts`를 우회한 결과 **로그·감사·약식결재·메일·주소록에서 목록의 절반 이상이 공백으로 렌더**되고, `plcyTtl↔title`·`menuDc↔menuExpln` 불일치는 저장 시 **원문을 영구 소실**시키면서도 성공 토스트를 띄운다. 여기에 백엔드에 존재하지 않는 엔드포인트를 호출하는 화면(로그 4종·게시판 벌크 4종·코드 계층저장·통계 2종·동기화)과, 반대로 백엔드는 완비됐는데 화면이 없는 기능(설문 문항 CRUD 15종, 휴일·상담·ISG·메인이미지, 부재관리)이 양방향으로 존재한다. 마지막으로 **근거 없는 고정 지표(“99.9%”, “SAFE”, “+125”)와 핸들러 없는 死버튼 40여 개**가 관제·감사 화면에 집중되어 있어, 장애를 은폐하고 운영자에게 거짓 확신을 주는 것이 단순 미관 문제를 넘어선 운영 리스크가 되고 있다. 다만 결함의 상당수는 **이미 존재하는 패턴에 배선만 하면 되는 S~M 규모**이며, 특히 공통 컴포넌트 1~2개 파일 수정으로 40개 화면이 동시에 복구되는 고레버리지 지점이 명확하다.

---

## 2. 메뉴별 완성도 스코어카드

| 도메인 / 메뉴 그룹 | 등급 | 근거 (1줄) |
|---|:--:|---|
| 워크스페이스 > 워크허브(업무/보고/일정) | **B** | CRUD·페이저·확인모달·서버검색이 실동작. 지표 카드 탭 종속(whub-01)·디바운스 부재 정도가 잔여 |
| 공통 컴포넌트 인프라 | **B** | StandardDataTable/useConfirm/useAppForm/HubSkeleton 자산은 헌법 수준. 다만 소비처가 안 씀 |
| 커뮤니티 > 게시판(목록·상세·마법사) | **C** | 목록·작성·상세는 동작하나 정렬/기간 유실·페이지 off-by-one(com-03/04), 마법사 3단계는 저장 경로 없음 |
| 시스템 > 메뉴·프로그램·정책 | **C** | 화면은 완성형이나 저장 시 본문·설명 컬럼 파괴(sys-plcy-01, sys-menu-02), 라우트 입력 UI 부재 |
| 시스템 > 코드(공통/행정/기관)·배너 | **C** | 상세코드 CRUD는 정상. 계층저장 404·검색/페이징 파라미터 불일치·분류/그룹 CRUD 死코드 |
| 보안 > 권한/롤/그룹/부서권한 | **C** | 목록·등록은 동작. 매트릭스 키 불일치·권한 회수 미동작·롤 수정 부재 등 “반영됐다고 믿지만 아님” 유형 |
| 사용자/조직 > 계정관리·부서관리 | **C** | 실 API 연동·일괄액션·D&D 저장 동작. 부서 10건 상한·단일 컬럼 목록·상세 패널 하드코딩 권한 |
| 대시보드(/admin) | **C** | 레이아웃·권한 요약은 정상, 차트/시스템 지표 전량 목데이터 + 동기화 버튼 거짓 성공 |
| 알림(시스템 알림 설정) | **C** | 목록은 뜨나 발송 버튼 미배선(POST API 존재), 10건 상한·삭제 불가 |
| 부가서비스 > SMS·온라인매뉴얼 | **C** | 목록·등록 동작. 페이저 부재·상태 하드코딩·발신번호 고정 |
| 마이페이지관리 | **C** | 조회·토글만 가능, 등록/수정/삭제 UI 부재(백엔드·서비스는 완비) |
| 운영 > 행사·메모보고 | **C** | 목록·등록 동작, 수정/상세 부재. 메모보고는 인가 누락(보안) |
| 협업 > 메일·주소록·스크랩 | **D** | 스크랩 등록/수정 100% 실패, 메일 전건 FAILED·발송일시 공백, 주소록 상세=신규폼 |
| 설문/여론조사 | **D** | 날짜 계약 불일치로 등록 400, 상태 배지 3화면 전부 오판정, 상세=빈 등록폼(중복 생성), 문항 CRUD 화면 없음 |
| 통계(6메뉴) | **D** | 2개 엔드포인트 404 + 차트 dataKey가 백엔드 미채움 필드 + 보고서 탭 미호출 → 실질 유효 화면 0 |
| 시스템 > 로그 7종·감사 타임라인 | **D** | 4종은 백엔드 부재(고아 라우트), 나머지도 필드 불일치로 요청ID·일시·응답시간 공백 |
| 시스템 > 모니터링·네트워크·ISM·옵저버빌리티 | **D** | 네트워크 CUD는 로그만 찍는 스텁(허위 성공), ISM 전 행 빈 껍데기, 관제 지표 하드코딩 |
| 사용자/조직 > 부재관리·개인정보정책 | **D** | 부재 API 완비인데 프론트 서비스 0건 → 사용자 목록 재사용 + 전원 ‘자리비움’ 표시 |
| 결재 양식 관리 / 워크플로우 스튜디오 | **D** | 100% 데모 스캐폴드인데 `use_yn='Y'` 메뉴 3건으로 노출, 전 버튼 무핸들러 |
| 도움말 > 위키/FAQ/Q&A | **D** | bbsId 오배선(FAQ→공지사항, 위키→일정게시판) + `?tab` 미파싱으로 3메뉴 동일 화면 |

---

## 3. P0 — 즉시 수정 (실사용 차단·데이터 파괴·보안)

### 3-A. 저장 시 데이터가 파괴되는 건 (최우선)

| # | 메뉴 | 증상 | 근거 | 수정 방안 | 노력 |
|---|---|---|---|---|:--:|
| P0-1 | 시스템 정책 `/admin/system/policies` | 리치텍스트로 작성한 개인정보처리방침·저작권 정책을 저장하면 **제목이 `privacy` 코드값으로 덮이고 본문이 빈 문자열로 영구 소실**. 캐시 evict로 공개면 즉시 반영, 화면엔 성공 토스트 | `PolicyAdminClient.tsx:82-84` / `api-server/.../policy/PolicyApiController.java:69-74` | 컨트롤러 바디를 `Map<String,String>`→Policy DTO(`plcyTypeCd/plcyTtl/plcyCn`)+`@Valid`로 승격, FE는 generated-zod `PolicySchema` 사용. 급하면 `PolicyAdminService.updatePolicy`에서 `{title,content}` 매핑 후 codegen 재생성 | S |
| P0-2 | 메뉴 관리 `/admin/system/menus` | `menuDc↔menuExpln` 불일치 + `Menu.update()` 전량 덮어쓰기 → **메뉴 1건 수정 또는 Save Layout 1회로 전 메뉴의 설명·아이콘 경로가 null**(batch-order가 전 노드 순회) | `MenuAdminClient.tsx:425,439` / `types/foundation/menu.ts:7` / `business-core/.../MenuService.java:349` / `Menu.java:107,113` | `menuDc→menuExpln` 개명 + 모달에 설명 textarea 노출, 동시에 `Menu.updateOrder(upMenuSn, menuOrdr)` 전용 메서드를 만들어 정렬 저장이 다른 컬럼을 건드리지 않게 분리 | M |
| P0-3 | 통합 코드 관리 허브 `/admin/system/common-code` | 좌측 Explorer D&D 재배치 후 Save 시 `PUT /codes/cmmn/batch-hierarchy`가 `{codeId}`로 매칭+본문 역직렬화 400 → **재구성 작업 100% 소실**(부서 관리에서 이미 고친 동일 패턴) | `CodeAdminService.ts:104` / `CommonCodeApiController.java:93` / `DeptManageService.java:70` | `@PutMapping("/cmmn/batch-hierarchy")` 신설(`List<CmmnCodeHierarchyDto>`), `DeptApiController:64` 구현을 레퍼런스로. 구현 전까지 D&D·Save 비활성화 | M |
| P0-4 | 포털 UI 관리 `/admin/system/layout` | `--primary`(HSL 채널 토큰)에 HEX 주입 → `hsl(#3b82f6)` 무효색 → **화면 진입만 해도 관리자 전역 강조색 소실**(useEffect가 무조건 적용), `--radius-hub-section` 1rem→4.2rem 변형 | `LayoutManagerClient.tsx:50,68` / `globals.css:18,90` | `hexToHslChannels()` 변환 후 주입, 라운드 스케일을 globals.css 기본값에 맞춤, 저장 전에는 미리보기 컨테이너에만 적용 | M |

### 3-B. 보안 / 권한 (반영 안 되는데 성공 표시)

| # | 메뉴 | 증상 | 근거 | 수정 방안 | 노력 |
|---|---|---|---|---|:--:|
| P0-5 | 메모보고 관리 `/admin/operation/memo-reports` | ‘전체’ 탭이 비-admin 경로 `/api/v1/memo-reports`를 호출하고 컨트롤러 GET에 `@PreAuthorize` 없음 + 서비스에 소유자 필터 없음 → **로그인만 하면 조직 전체의 비정형 보고 열람 가능** | `memoReportService.ts:23` / `MemoReportApiController.java:29` / `MemoReportService.java:27` / `ApiSecurityConfig.java:134-140` | 전체 조회를 `/api/v1/admin/operation/memo-reports`로 분리하고 `@AdminOnly` 부여(또는 현 GET에 `hasRole('ADMIN')`). 비관리자에게는 ‘전체’ 탭 비노출 | M |
| P0-6 | 권한 정책 관리 `/admin/security/authority` | 사용자 체크 해제 후 저장해도 **권한이 회수되지 않음**(업서트 전용 API). 성공 토스트 후 invalidate하면 다시 체크된 상태로 복귀 | `SecurityHubClient.tsx:170-183,247-254` / `UserAuthorityManageService.java:61-88` | mutationFn에서 (기존 `regYn='Y'`) − (현재 선택) 차집합을 계산해 `deleteUserAuthorities` 동시 호출(Promise.all), `onError` 추가, 회수 N건은 useConfirm | M |
| P0-7 | 권한 정책 관리 (매트릭스) | Visualizer가 `{authorCode,authorNm}` 소비 / 부모는 `{authrtCd,authrtNm}` 전달 → **컬럼 헤더 공백 + 전 셀 DENIED 표시**, 토글 시 undefined 키로 저장 요청 | `SecurityMatrixVisualizer.tsx:20-23,141-148,172-181` / `SecurityHubClient.tsx:198-204` | Visualizer 인터페이스를 `AuthorInfo`로 교체하고 필드명 통일. `authoritiesPromise: Promise<any>`를 `Promise<PageResponse<AuthorInfo>>`로 좁혀 tsc가 재발을 잡게 함 | S |
| P0-8 | 권한 정책 관리 (역할 수정) | `handleOpenAuthorEdit(auth)`가 인자를 무시하고 `selectedAuthorCode` 기반 값을 폼에 채움 → **다른 역할을 열어 그대로 저장하면 의도치 않은 역할이 덮어써짐** | `SecurityHubClient.tsx:270-273,300-303,394` | `editingAuthor` 상태 신설(SecurityGroupClient.tsx:107-111 패턴과 동일 정렬) | S |
| P0-9 | 약식결재 `/admin/system/ism` | FE 로컬 인터페이스가 DTO와 전면 불일치(`infrmlSanctnId` vs `ifmlAtrzId` …) + `selectFieldsList`가 존재하지 않는 키만 복사 → **전 행 `{}`**, 승인 버튼 미렌더·삭제는 `/ism/undefined`. 승인 코드도 `'Y'` vs `'C'` 불일치로 잠복 | `IsmAdminService.ts:5` / `ism/page.tsx:26` / `IsmClient.tsx:85,129` / `SanctionStatus.java:13` / `InformalSanctionService.java:138-143` | **단일 배치로 처리**: 로컬 `InfrmlSanctn` 삭제 후 `InformalSanctionDto` import, `selectFieldsList` 키 교체, 접근자·상태코드(`A/C/R`) 정정, 결재함에서 삭제 버튼 제거 | M |

### 3-C. 호출 경로가 틀려 화면이 비는 건

| # | 메뉴 | 증상 | 근거 | 수정 방안 | 노력 |
|---|---|---|---|---|:--:|
| P0-10 | 댓글 관리 `/admin/system/comments`, 모니터링 COMMENTS 탭 | `AdminService('/comments')` → `admin/system/comments`로 조립되나 실제는 `/api/v1/admin/comments` → **목록·삭제 전부 404**, 화면엔 “데이터가 없습니다” | `CommentAdminService.ts:20` / `ApiService.ts:84` / `CommentApiController.java:21` | `ApiService('admin/comments')` 직접 상속으로 1줄 수정(IsmAdminService:26 선례). 동시에 삭제 mutation에 useConfirm+onError 추가(현재 404라 잠복 중, 고치는 순간 실데이터 파괴 위험) | S |
| P0-11 | 외부인사정보 `/admin/operation/external-hr`, 포상관리 `/admin/operation/rewards` | 백엔드는 순수 `List<T>` 반환, FE는 `res.list` 파싱 → **DB에 데이터가 있어도 영구 빈 테이블**, 등록 성공해도 목록 미반영 → 중복 등록 유발 | `ExternalHrApiController.java:19` / `RewardManageApiController.java:18` / `OperationAdminService.ts:37` / `ExternalHrClient.tsx:64` / `RewardManageClient.tsx:60` | 컨트롤러를 `Pageable`+`PageResponse.of()`로 승격(EventApiController와 동일) → 페이징 부재(ops-03)도 동시 해소. 임시로는 서비스에서 배열 정규화 | M |
| P0-12 | 게시판 마스터 콘솔 `/admin/community/boards/master` | 설정 모달 저장이 **항상 400**(부분 DTO 전송 — `bbsTypeCd/bbsAtrbCd` @NotBlank, `atchPsbltyFileSz` @NotNull 누락) → 게시판 명칭·활성화 전환 자체 불가 | `BoardMasterListClient.tsx:85,96` / `BoardMasterDto.java:25,29,35` | `handleEdit`에서 `{...board, bbsTtl, bbsExpln, useYn}` 전체 스프레드(즉시 적용 가능) 또는 PATCH 엔드포인트 신설 | S |
| P0-13 | 게시글 목록 `/admin/community/boards/select-board-list` | `useBoardList` queryFn이 `orderBy/startDate/endDate`를 버림 → **조회수순·댓글순·기간 필터 전부 무동작**(백엔드는 지원) | `hooks/api/use-board-list.ts:22-24` / `BoardApiController.java:36` | 구조분해에 3개 파라미터 추가 + `BoardUserService.getPosts` 타입 확장 | S |
| P0-14 | 게시글 목록 (동일) | URL은 1-based인데 훅이 0-based Pageable에 그대로 전달 → **필터 걸린 1페이지에 11~20번째가 표시, 상위 10건은 도달 불가**(SSR 경로는 정상이라 동일 화면 내 불일치) | `use-board-list.ts:25` / `BoardListServer.ts:30` | `page: Math.max(0, page-1)` 보정 + 주석 정정, 훅 인터페이스를 한 곳으로 수렴 | S |
| P0-15 | 설문 등록·온라인poll `/admin/survey/manage/create`, `/admin/survey/polls` | FE는 `yyyy-MM-dd`(10자) 전송, DTO는 `@Size(max=8)` → **등록이 항상 400**. 기존 DB 3행은 `'2026-05-'`로 잘려 저장됨 | `OnlinePollManageDto.java:33-38` / `SurveyManageCreateClient.tsx:55-56` / `OnlinePollAdminClient.tsx:53-54` / `V2_0__baseline.sql:7288` | 전송 직전 `yyyyMMdd` 변환 + 표시용 공용 포매터(`lib/format-date.ts`) 도입, 잘린 3행 백필 스크립트 | S |
| P0-16 | 설문 3화면(관리/폴/참여) | 저장 포맷 vs 판정 로직 불일치 → **모든 설문 ‘종료’(Invalid Date) / 모든 설문 ‘예정’(`'-' < '0'`) / 종료된 설문도 ‘Live Now’로 투표 개방** | `SurveyManageClient.tsx:78-79` / `OnlinePollAdminClient.tsx:153-168` / `OnlinePollParticipateClient.tsx:58,208` | P0-15 선행 후 `lib/poll-status.ts`의 `isPollActive(bgng,end,today)` 단일 유틸로 3화면 통일(8자 문자열 비교만 사용) | S |
| P0-17 | 스크랩 등록/상세 `/admin/collaboration/scraps/*` | `useYn/userId` @NotBlank 미전송 → **등록 100% 400**. 상세는 `setFormData(response)` 전면 교체로 `scrapUrl` undefined → TypeError로 요청조차 안 나감 | `InsertScrapClient.tsx:18,44` / `SelectScrapDetailClient.tsx:34,52,59` / `ScrapDto.java:32,37` | `useYn:'Y'` 추가 + `userId` @NotBlank 제거(컨트롤러가 `currentLoginId()` 주입 중), 상세는 `setFormData(prev=>({...prev,...res}))` 병합 | S |
| P0-18 | 스크랩 전 화면 | 서비스가 `scrapUrl/scrapExpln`을 builder에 안 담고, update는 자기 기존값 재대입 → **링크 보관이라는 기능 자체가 동작하지 않음** | `ScrapService.java:48,60,72` | builder에 두 필드+`useYn` 추가, `entity.update(dto...)`로 정정, `convertToDto`에 매핑 추가. 프론트 무수정으로 정상화 | S |
| P0-19 | 메일 이력 `/admin/collaboration/mail-history` | 결과코드 `S/F/P`인데 화면은 `'1'`만 성공 판정 → **정상 발송 메일도 전부 붉은 FAILED**. `crtDt`(미존재) 참조로 **발송일시 전건 공백** | `MailHistoryHubClient.tsx:113,123-125,285,296` / `MailAsyncProcessor.java:54,65` / `SentMailDto.java:38,53` | 배지 3분기(S/F/P) + `sndngDe`로 교체, 로컬 `SentMail` 인터페이스 폐기 후 generated 타입 사용 | S |
| P0-20 | 상세 시스템 로그 / 감사 타임라인 | `SysLogDto`(dmndId/ocrnYmd/prcsTm) vs 구계약 로컬 인터페이스 → **요청ID 공백·발생일자 ‘-’·응답시간 ‘ms’만 표시**. 감사 타임라인은 `key`·`isSelected` 모두 undefined → 전 카드 선택 강조 + React key 중복 | `SystemLogAdminService.ts:5` / `SystemLogsSystemClient.tsx:38,47,76` / `AuditAdminService.ts:5` / `AuditTimelineClient.tsx:139,143` / `TimelineItem.tsx:89,97,113` | 로컬 인터페이스 삭제 → `components['schemas']['SysLogDto']` 참조로 통일, 접근자 일괄 정정, `isSelected`에 null 가드 | S |
| P0-21 | 통계 허브 전 탭 | 심층 차트 dataKey가 `creatCo/inqCnt`인데 백엔드 `convertToStatsDto`는 `statsDate/statsCo`만 채움 → **모든 통계 탭 차트가 축만 있는 빈 그래프** | `IntelligenceHubClient.tsx:244-258` / `StatisticsApiController.java:89-96` | dataKey를 `statsCo`로 교체하고 두 번째 Area 제거(1파일 수정으로 4탭 복구) | S |
| P0-22 | 화면통계 `/admin/stats/screen`, 통계 허브 | `/statistics/screen`·`/statistics/menu`가 백엔드에 부재 → **허브 첫 진입마다 404**, 최다 상호작용 차트·운영 매트릭스·엑셀 내보내기 전부 빈 값 | `StatsAdminService.ts:44-46,59-61` / `StatisticsApiController.java:20-86` / `generated-api.d.ts:3541~3626` | 백엔드에 `/screen`·`/menu` 신설(권장) 또는 `/connect`로 재배선 + `getMenuStats` 제거. 어느 쪽이든 `isError` 분기 추가 | M |
| P0-23 | 보고서통계 `/admin/stats/report` | REPORTS 탭에 연결된 useQuery가 없어 **백엔드 `/report`가 정상인데 화면은 다른 탭의 잔여 차트를 보여줌** | `IntelligenceHubClient.tsx:46-74,213` / `StatsAdminService.ts:48-51` | `enabled: activeTab==='REPORTS'` 쿼리 추가 + 데이터 선택 분기 삽입 | S |
| P0-24 | 지식 허브(위키/FAQ/Q&A) | bbsId 매핑이 실 DB와 어긋남 — **FAQ 탭엔 공지사항, 위키 탭엔 일정 게시판**. 그 화면에서 등록하면 엉뚱한 게시판에 저장 | `KnowledgeHubClient.tsx:34-50` / `knowledgeService.ts:38-44,61-78` | 인라인 매핑 삭제 후 `knowledgeService.BBS_IDS` 단일 참조 + DB 실측값(AAAA=공지, CCCC=업무, DDDD=Q&A, EEEE=일정)으로 정정. FAQ는 전용 API로 이관(P1 참조) | M |
| P0-25 | 위키/FAQ/Q&A 3메뉴 | `?tab=` 쿼리를 클라이언트가 읽지 않아 **서로 다른 3개 메뉴가 전부 FAQ 화면으로 착지** | `KnowledgeHubClient.tsx:33-42` / `help/faq/page.tsx:5` / `help/qna/page.tsx:5` | `getInitialCategory`에 `searchParams.get('tab')` 분기 추가(SurveyHubClient `resolveTab` 패턴) + 카테고리 클릭 시 `router.replace('?tab=')` | S |
| P0-26 | 로그인 정책 관리 | 메뉴 ‘로그인정책관리’(9020120)가 **접속 이력 조회 탭**으로 연결, 실제 정책 편집 화면 2개는 어느 메뉴에서도 도달 불가 | `MonitoringHubClient.tsx:67,496` / `security/login-policy/page.tsx:1-5` / `user/login-policy/page.tsx:7-23` | `tb_menu_info` 9020120 `modern_route`를 `/admin/security/login-policy`로 정정 + 캐시 evict 확인, 중복 라우트 1개는 redirect | S |
| P0-27 | 부서 이동 일괄 액션 `/admin/user/manage` | 부서 목록 useEffect가 `activeTab==='DEPTS'`일 때만 실행 → **USERS 탭에서 ‘부서 이동’ 모달이 항상 빈 상자**, 실행 시 “부서를 선택해주세요” 무한 반복 | `UserOrgHubClient.tsx:238,273,976,1008` | useEffect의 탭 가드 제거(departments 의존성만), `deptsData` 쿼리의 `enabled` 해제 | S |
| P0-28 | 프로그램 관리 / 배너·팝업 / 부서권한 / 로그인정책 | 서버 페이징이 정상인데 페이저 미연결 또는 파라미터 무시 → **첫 10건 이후 자산에 UI로 접근 불가**(배너 11번째부터 수정·게시중단 불가, 11번째 부서엔 권한 배포 불가) | `ProgramAdminClient.tsx:79,224` / `BannerAdminClient.tsx:165,174` / `SecurityDeptAuthorityClient.tsx:43-61` / `LoginPolicyAdminClient.tsx:52-56` / `standard-data-table.tsx:400` | 각 화면에 `page` state + `pagination` prop 전달(컴포넌트가 이미 지원). 배너는 `{page:0,size:20}`로 교체하고 `total` 기반 지표로 정정 | S~M |

---

## 4. P1 — UX 최적화 고레버리지 (한 번 고치면 다수 화면 동시 개선)

우선순위는 **① 공통 컴포넌트 1파일 수정 → 40+ 화면 복구** 순으로 정렬했다.

### P1-1. 조회 실패를 “데이터 없음”으로 위장하는 문제 일괄 해소 — **최고 레버리지**
- **범위**: `StandardDataTable` 소비 43화면 중 39화면(로그 7종, 보안 3종, 운영 7종, 협업 3종, 설문 3종, 통계, 코드, 알림 …)
- **현상**: `error`/`onRetry` prop과 `ErrorStateDisplay`가 이미 구현돼 있는데(`standard-data-table.tsx:34,327`) 대부분 화면이 `const { data, isLoading }`만 구조분해. 게다가 `providers.tsx:52`에 `throwOnError`가 없어 `admin/error.tsx` 경계에도 도달하지 않고, 일부 서버 컴포넌트는 `.catch(() => [])`로 삼킨다.
- **조치**:
  1. 각 화면 `useQuery`에 `isError, error, refetch` 추가 → `error={...} onRetry={() => refetch()}` 전달 (로그 6종은 동일 템플릿이라 기계적 일괄 처리 가능)
  2. 서버 컴포넌트의 `.catch(()=>[])` 제거 또는 `fetchError` 플래그를 클라이언트로 전달 (`menus/page.tsx:21`, `logs`, `network/page.tsx:22`, `hpcm/page.tsx:11`, `ism/page.tsx:21`, `polls/page.tsx:22`, `stats/page.tsx:24-26`)
  3. `providers.tsx`에 `throwOnError: (e) => e?.response?.status >= 500` 추가
  4. `status-displays.tsx:76,83` — Empty State의 실패 문구(“조회하지 못했습니다”)를 중립 안내로 바꾸고 `window.location.reload()` 버튼 제거
- **노력**: L (화면 수는 많지만 건당 2~3줄)

### P1-2. 불투명 `bg-white` 토큰화 — 공통 테이블 1파일이 43화면을 좌우
- **현상**: 다크 테마 `--foreground: 210 40% 98%` 위에 `bg-white`가 얹혀 **흰 배경 흰 글자(대비 ~1.05:1)**. admin 하위 60파일 198~219건.
- **조치**: **`standard-data-table.tsx:220,413`부터** (`bg-white`→`bg-card`) — 이 한 파일로 43화면 페이지 번호·검색창이 동시 복구. 이후 상위 파일 순: `UserOrgHubClient`(14) → `MonitoringHubClient`(12) → `sanctn/WorkflowHubClient`(11) → `AdminStatsClient`(10) → `CommonCodeClient`·`SecurityMatrixVisualizer`(7). 판별은 design-tokens.md R1(불투명→`bg-card`, 의도적 다크→`bg-surface-inverse`, `bg-white/NN` 오버레이는 유지).
- **재발 방지**: `eslint.config.mjs`의 `enforce-design-tokens` 정규식에 `\bbg-white\b(?!\/)` 추가(현재 `-(red|blue|…)-([1-9]00)`만 탐지해 `bg-white`를 전혀 못 잡음)
- **노력**: L

### P1-3. `StandardModal`을 Radix Dialog로 내부 교체 — 19화면 접근성 동시 해결
- **현상**: 수제 포털이라 **ESC 닫기·포커스 트랩·포커스 복귀·X 버튼 접근명·배경 inert가 전부 없음**(`standard-modal.tsx:28,33,58,64,76`). 같은 저장소의 `components/ui/dialog.tsx`(Radix)를 쓰는 8화면은 문제 없음 → 기술 부재가 아닌 구현 분기.
- **조치**: 외부 API(`isOpen/onClose/title/children/footer/maxWidth`)를 유지한 채 내부만 `<Dialog>`로 재작성 → **19개 소비 화면 무수정**. 수동 `document.body.style.overflow` 조작(33-42행)도 제거(모달 중첩 시 조기 복구 버그 동반 해소).
- **노력**: M

### P1-4. 페이지네이션·검색·선택 상태 규약 통일
- **페이저 3종 공존**: 내장 스테퍼(41화면, 총 건수·페이지 번호 없음) / `PagePagination`(7) / `BoardPagination`(1). → `standard-data-table.tsx:400-430`을 `PagePagination`으로 교체하고 `totalCount` prop 추가(‘총 N건 · n/m’). `SurveyStatsClient.tsx:160`은 0-base 전달 중이므로 `+1` 보정 동반.
- **검색 상태 갇힘**: 검색어가 컴포넌트 내부 `useState`에만 있어 초기값 주입·초기화·지우기 불가 → `search` prop에 `value`/`onClear` 추가, 제출·지우기 버튼(+aria-label) 노출, 빈 결과 문구에 검색어 포함. (`standard-data-table.tsx:41,183,207,215`)
- **선택 상태 오작동(데이터 정합)**: `selectedIds`는 페이지 이동 시 초기화되지 않는데 `selectedItems`는 현재 페이지만 필터 → **“8개 선택됨”인데 3건만 처리**. 페이지/검색 변경 시 `setSelectedIds(new Set())` 추가, `keyField` 미전달 시 개발 경고. (`standard-data-table.tsx:182-196,244,257`)
- **노력**: M~L

### P1-5. 근거 없는 지표 카드 일괄 제거 — 신뢰도 회복
- **범위**: 로그 대시보드 KPI 4종, 감사 KPI(+125/+42/고정 8), 메뉴·프로그램·코드 허브 6종, 보안 7종, 운영 5화면, 통계(78.4%·99.9%·전국 지도·브라우저 파이·증감 배지), 협업 3종, 설문 허브, 마이페이지 2종, 대시보드(CPU/DB/지연), 모니터링 하네스·토폴로지.
- **원칙**: (a) 계산 가능한 값으로 대체(`total`, `useYn='N'` 비율, ‘라우트 미지정 메뉴 수’ 등) (b) 산출 근거가 없으면 **카드 삭제** (c) 유지가 필요하면 `/actuator` 실측 배선 또는 ‘샘플/데모 데이터’ 배지 명시.
- **특히 즉시**: `MonitoringHubClient.tsx:743` StatusIndicator가 status와 무관하게 항상 초록 → **PostgreSQL DOWN도 정상으로 표시**. 같은 파일 `:319-322`에 올바른 분기가 이미 있으므로 재사용(S).
- **노력**: M (건수는 많으나 대부분 삭제)

### P1-6. 핸들러 없는 死버튼 40여 개 정리
- **대표**: 리포트 추출·감사 증명서 발급·실시간 모니터링·알림 정책·유지보수 파이프라인 실행·데이터셋 내보내기·강제 새로고침·Execute Global Report·Export·시뮬레이션 완료·노드 검색·상세 필터·환경 설정·권한 설정·콘텐츠 동기화·행 관리(⋮) 13건 등.
- **원칙**: 구현 계획 없으면 **삭제**(disabled+‘준비 중’은 차선). 단, 이미 자산이 있는 것은 배선이 더 싸다 — 내보내기는 `DataExportExcel` 재사용, 새로고침은 `refetch()`/범위 한정 `invalidateQueries`, ‘권한 설정’은 `/admin/security/authority` 딥링크.
- **노력**: S~M

### P1-7. URL 상태 동기화(탭·검색어·페이지) — 공유·새로고침·사이드바 하이라이트 복구
- **범위**: 로그 7종+감사, 사용자/조직 4탭, 통계 6탭, 협업 허브, 설문, 보안 허브, 모니터링 허브(탭 클릭 시 `/hub` 이탈로 메뉴 활성화 해제), work-hub.
- **패턴**: `useSearchParams` + `router.replace('?tab=…&page=…', {scroll:false})`, `activeTab`은 URL 파생값. 탭이 곧 라우트인 경우(`/admin/stats/*`, `/smart-toolkit/*`)는 `router.push(TAB_ROUTE_MAP[tab])`.
- **1줄 수정으로 끝나는 건**: `MonitoringHubClient.tsx:84-85` push 대상을 `usePathname()` 또는 `/admin/system/monitoring/hub`로.
- **노력**: M

### P1-8. 검색 디바운스 + 페이지 리셋 공통화
- 타이핑 한 글자마다 서버 요청이 나가는 화면 10여 곳(감사, 모니터링, 워크허브, 지식허브, 사용자, 보안 허브, 행사, 메모보고, 댓글). 검색 시 `setPage(1)` 누락으로 **3페이지에서 검색하면 빈 화면**.
- `lib/hooks/useDebouncedValue(300ms)` 신설 → queryKey에는 디바운스 값만, `onChange`에서 `setPage(1)` 동시 호출. 또는 `StandardDataTable` 내장 submit 검색으로 통일(저장소 기존 패턴).
- **노력**: S

### P1-9. 파괴적 액션 확인 모달 통일 (native confirm 12건 → `useConfirm`)
- 보안 4곳, 협업 4곳, 운영 2곳, 게시판 상세, 기관코드. 대상 식별자(이름)를 본문에 노출 + `variant:'destructive'`. **P0-10(댓글 404) 수정과 반드시 같은 배치**로 — 지금은 404 덕에 삭제가 안 되지만 고치는 순간 무확인 1클릭 삭제가 활성화된다.
- **노력**: S

### P1-10. 아이콘 전용 버튼 aria-label 66건 + 정적 게이트 도입
- 목록 ‘관리’ 열의 수정/삭제가 스크린리더에서 모두 “버튼” → **오삭제 위험**. `aria-label={`${item.menuNm} 삭제`}` 형태로(BoardMasterListClient:232 선례).
- **재발 방지**: `eslint-plugin-jsx-a11y` 미설치 상태 → 추가 후 `control-has-associated-label`, `click-events-have-key-events`, `no-static-element-interactions`를 error로.
- **동반**: onClick만 있는 비인터랙티브 div 7건 — 특히 `OnlinePollParticipateClient.tsx:211,254`는 **키보드 사용자가 투표 자체를 완료할 수 없음**(radiogroup/button으로 교체).
- **노력**: M

### P1-11. 로딩 UI 정상화
- `src/app/admin/loading.tsx` **신설**(현재 admin 전용 loading이 0개라 전역 전체화면 스피너 오버레이가 사이드바까지 덮음) → `AdminStatsLoading`+`HubSkeleton` 재사용으로 7개 async 페이지 자동 커버. **노력 S, 체감 효과 큼**.
- `<table>` 밖에서 `TableSkeleton`(=`<tr>`)을 렌더해 **로딩 중 완전 백지**인 2화면(`survey/hub/page.tsx:13`, `monitoring/hub/page.tsx:8`) 즉시 교체.
- 영문 조어 1줄 fallback 13화면 → 실제 레이아웃 1:1 스켈레톤(`common-code/page.tsx:60-80`이 모범 사례).
- **노력**: S~M

### P1-12. 도메인 단위 Error Boundary
- 현재 `error.tsx`는 `/admin` 1개뿐 → 한 화면 오류가 관리자 전체를 대체하고 reset 시 서브트리 전체 재마운트. `admin/{system,security,community,survey,collaboration,operation,user,stats}/error.tsx`에 `export { default } from '../error'` 재수출 8개 추가.
- **노력**: S

---

## 5. P2 — 다듬기 (접근성·정보밀도·일관성)

| 항목 | 대상 | 조치 | 노력 |
|---|---|---|:--:|
| h1 2중 렌더 | 41화면(PageHeader + HubHeader) | `HubHeader.tsx:41` h1→h2 강등, “전자정부/HUB” 하드코딩 제거, subtitle은 PageHeader `description`으로 흡수, `mb-12`→`mb-8` | M |
| 영문 컬럼 헤더 | 사용자·롤·그룹·부서권한·웹로그·설문통계 | “Protocol/Core Identity/Clearance/MANAGEMENT/RANK/SELECTION” → 한글(번호/사용자 정보/권한/관리/순위/선택) | S |
| 레이아웃 이중 여백 | 15+ 화면 | 루트 layout이 이미 `max-w-7xl p-6/md:p-12/lg:p-16` 제공 → 화면별 `p-8~p-10` 제거, 본문 폭을 `상속(목록)` / `max-w-4xl(단일 폼)` 2종으로 수렴, `app/admin/layout.tsx` 신설 | M |
| 브레드크럼 2원화 | 53화면 하드코딩 vs 4화면 DynamicBreadcrumb | `page-header.tsx:26-46`을 `<DynamicBreadcrumb/>` 호출로 교체, 메뉴 SSOT 기반 라벨 해석 | M |
| 토스트 경로 2원화 | sonner 직접 호출 16파일 | `useToast`로 수렴(문자열 정규화 페일세이프 부재로 `[object Object]` 노출 위험), 필요한 옵션은 useToast 시그니처에 추가 | S |
| 모바일 카드뷰 부재 | shadcn Table 직접 조립 4화면 | `StandardDataTable`로 이관(dc-05와 동일 작업). 임시로는 저우선 열에 `hidden md:table-cell` | M |
| 차트 축·그리드 색 | `IntelligenceHubClient.tsx:218-255` | `useChartColors()` 사용(같은 저장소 `standard-chart-wrapper`가 이미 채택). 현행 `#cbd5e1` 눈금은 **라이트 모드에서 1.6:1**로 AA 미달 | S |
| 반응형 | 통계 허브 헤더/카드 패딩, 롤·그룹 `w-[450px]` 고정 | `flex-col sm:flex-row`, `p-4 md:p-8 lg:p-12`, `w-full sm:w-[450px]` | S |
| 권한 매트릭스 표 시맨틱 | `SecurityMatrixVisualizer` | `scope="col"`/`<th scope="row">`, 셀 버튼에 `aria-label`(역할×메뉴)+`aria-pressed`, 전체화면 ESC·aria-label | M |
| 탭 시맨틱 | 수제 탭 12화면 | `role="tablist/tab/tabpanel"` 또는 `components/ui/tabs.tsx`(Radix)로 교체, 중복 표준 `standard-tabs.tsx` 삭제 | M |
| `<label>` 미연결 18건 | 템플릿·폴·사용자 일괄변경·권한별 메뉴 | `useAppForm`+`FormLabel` 이관(인라인 에러도 동시 해결) 또는 `id/htmlFor` 부여 | M |
| axe 커버리지 | 95라우트 중 2개만 스캔 | `expectNoA11yViolations()` 헬퍼 + 기존 e2e가 이미 방문하는 41라우트에 1줄씩, 미방문 53라우트는 `24-a11y-sweep.spec.ts` 일괄 | M |
| `invalidateQueries()` 무인자 | 모니터링·협업·메일·보안 허브 | queryKey 한정으로 좁힘(현재 클릭 한 번에 메뉴·알림 등 전역 재요청) | S |
| dynamic loading fallback | 대시보드·모니터링 차트 7건 | 동일 높이 Skeleton 지정(CLS 제거). 통계 5라우트는 recharts 정적 import → `next/dynamic` 전환 | S~M |
| 폴링 | `/admin/observability` | 수기 `setInterval(5s)`가 백그라운드에서도 액추에이터 5종 호출 → `useQuery(refetchInterval)`로 이관 | S |
| 로그 상세 미연결 | 시스템/로그인 로그 | 구현된 `getSystemLog/getLoginLog`를 `onRowClick`+Drawer로 배선(현재 잘린 값 확인 불가) | M |
| 인코딩 손상 | `operation/events`, `memo-reports`, `rough-map` metadata | UTF-8 재저장(BOM 제거), 저장소 전역 `'?됱궗'`,`'硫붾え'` 패턴 grep | S |
| 死라우트 정리 | `/admin/sanctn/workflow`, `/admin/security/audit`, `/admin/user/login-policy`, 설문 껍데기 5종, 커뮤니티 중복 4종 | 삭제 또는 `next.config` redirect. **과거 오삭제 사고 전례가 있으므로 `tb_menu_info.modern_route`+소스 문자열+e2e POM 3중 확인 후 진행** | S~M |

---

## 6. 제품 결정이 필요한 항목 (에이전트 단독 판단 불가)

| # | 항목 | 선택지 | 결정 시 파급 |
|---|---|---|---|
| D-1 | **로그 4종**(사용자/웹/개인정보/전송) | (A) 백엔드 컨트롤러 4개 신설 + 메뉴 등록 (B) 라우트·서비스·타입 삭제 | 개인정보 접근·전송 로그는 컴플라이언스 증적 화면. 존치 시 L 규모 백엔드 작업. 현재는 대시보드 5개 카테고리 중 3개도 빈 목록 |
| D-2 | **네트워크 관리** `/admin/system/network` | (A) `tb_ntwrk_info` 엔티티·서비스 신설 (B) CUD를 501로 바꾸고 화면 비활성 | GET도 하드코딩 mock 6건이라 “쓰기 3개 구현”이 아니라 **도메인 자체 신설** 결정 사안 |
| D-3 | **결재 양식 관리 / 워크플로우 스튜디오** | (A) `tb_sanctn_form` + 컨트롤러 신설 (B) `use_yn='Y'` 메뉴 3건(1050000·9030200·9010500)을 내리거나 `/approvals`로 재매핑 | 현재 데모 스캐폴드가 최상위 메뉴로 노출 중. (B)가 즉시 조치로 비용 최소 |
| D-4 | **설문 도메인 전체** | (A) 문항·항목 CRUD 15개 엔드포인트를 화면에 배선 (B) 껍데기 5개 라우트 삭제 후 후일 재개 | 백엔드·DB 실데이터(문항 2건·항목 4건)가 이미 존재. 미배선 시 설문 기능 자체가 사용 불가 |
| D-5 | **미노출 백엔드 API 4종** — 휴일(`/calendar/holidays`), 상담(`/cnslt`), ISG, 메인이미지 | (A) 관리 화면 신설 (B) 샘플 모듈로 분리해 foundation 커널에서 제외 | 프레임워크 재사용 목표(§framework-reusability)와 직결. 휴일은 일정·근태·결재 전제라 (A) 우선순위 높음 |
| D-6 | **메뉴 SSOT 재편** | ① 이름 다른 18개 메뉴가 9개 라우트 중복 지목 ② 부모-자식이 동일 경로(9020100↔9020110) ③ 고아 라우트 19개 ④ 통계 6메뉴 = 실제 4화면 | 그룹 노드 `modern_route=''` 처리 + 중복 `use_yn='N'` + 고아 편입/삭제 판정. **마이그레이션 1건으로 처리 가능하나 정보구조 결정 필요** |
| D-7 | **테마 설정 저장 위치** | (A) `tb_` 사이트 테마 테이블 + `/site-theme` API + SSR 주입 (B) “내 브라우저에만 저장” 으로 문구 정직화 | 현재 localStorage뿐인데 “전체 플랫폼 적용”으로 안내. (B)는 S, (A)는 L |
| D-8 | **댓글 및 평가 관리** | 만족도(Satisfaction) 도메인은 business-app에 실존하나 **API 미노출** → (A) 컨트롤러 신설 (B) 메뉴명을 ‘댓글 관리’로 정정 | 메뉴명이 약속한 ‘평가’ 기능 부재. 동시에 모니터링 허브 껍데기 구조 분리 여부도 결정 |
| D-9 | **게시판 마스터 벌크/물리삭제 4종** | (A) `/deletable`·`/physical`·`/batch/status`·`/batch/delete` 신설(+`@AdminOnly`) (B) 화면에서 해당 액션 제거 | 현재 확인 모달까지 통과한 뒤 404 — 파괴적 작업에서 가장 나쁜 UX |
| D-10 | **게시판 권한 매트릭스(마법사 3단계)** | (A) 게시판별 권한 테이블 + API 신설 (B) 마법사에서 단계 삭제 | 운영자가 ‘익명 쓰기 금지’를 설정했다고 믿지만 아무 정책도 적용되지 않는 **보안 오인 상태** |
| D-11 | **부서 목록 전량 로드** | 조직도는 페이징과 상극 → (A) `/departments/tree` 또는 `Pageable.unpaged` (B) size=1000 | 부서 11건 초과 시 계층 저장이 `sortOrdr` 충돌 유발. 현행 3건이라 잠복 |
| D-12 | **FAQ 정본 경로** | (A) 전용 `/api/v1/faqs` 채택(하드코딩 bbsId 제거) (B) 게시판 통합 유지 + bbsId를 공통코드화 | (A)가 시드 데이터 의존을 끊어 신규 구축 환경에 유리. 단 FaqApiController는 작성자 `"SYSTEM"` 하드코딩·`@PreAuthorize` 부재라 보강 선행 필요 |
| D-13 | **로그 검색 조건의 URL 반영** | 검색어까지 URL에 넣을지 (민감정보 노출 우려) | 협업·공유 편의 vs 개인정보. 페이지·탭만 URL, 검색어는 제외하는 절충안 가능 |
| D-14 | **死서비스 처리** | `SyncAdminService`+`syncActions`(백엔드 부재), `PopupAdminService.deletePopups` | 모킹 테스트가 false-green을 만드는 상태 — 삭제 또는 백엔드 신설 중 택1 |

---

## 7. 권장 실행 순서

### 1차 배치 — “거짓말하는 화면 끄기” (2~3일, 대부분 S)
**목표: 데이터 파괴 정지 + 장애 은폐 제거**

1. **데이터 파괴 4건**: P0-1(정책 소실) → P0-2(메뉴 설명 null) → P0-3(코드 계층저장) → P0-4(테마 토큰 파괴)
2. **보안 3건**: P0-5(메모보고 인가) → P0-6(권한 회수) → P0-8(역할 수정 대상)
3. **1줄~수줄 계약 정정 묶음**: P0-7·10·12·13·14·15·16·17·18·19·20·21·23·25·27
4. **공통 파일 3건(파급 최대)**: `standard-data-table.tsx` `bg-white`→`bg-card`(43화면), `admin/loading.tsx` 신설(7화면), `MonitoringHubClient` StatusIndicator 색 분기
5. `<table>` 밖 TableSkeleton 2건(백지 로딩) 제거

> **예상 효과**: 운영자가 “저장했는데 사라진다 / 전부 실패로 보인다 / 데이터가 없다”고 느끼는 사례의 대부분이 소멸. 다크 모드 판독 불가 43화면 동시 복구. 리스크 낮음(대부분 국소 수정), 컴파일 게이트(`tsc --noEmit` + `gradlew compileJava`)만 통과하면 됨.

### 2차 배치 — “패턴 통일” (1~2주, M~L)
**목표: 헌법 정합 + 다수 화면 동시 개선**

1. **P1-1 error/onRetry 일괄 전달**(39화면) + `throwOnError` + `.catch(()=>[])` 제거 + P1-12 도메인 error.tsx 8개
2. **P1-3 StandardModal → Radix**(19화면 접근성 일괄 해결)
3. **P1-4 페이저/검색/선택 규약 통일** + P0-28(페이저 미연결 4화면)
4. **P1-5 하드코딩 지표 카드 정리** + **P1-6 死버튼 정리** (같은 배치로 — 둘 다 “삭제”가 기본값이라 함께 리뷰하는 편이 효율적)
5. **P1-2 나머지 `bg-white` 60파일** + eslint 정규식 보강
6. **P1-8 디바운스+페이지 리셋**, **P1-9 confirm 통일**(P0-10과 반드시 동반), **P1-10 aria-label + jsx-a11y 도입**

> **예상 효과**: 화면 간 조작법 편차 해소(검색·페이지 이동·삭제 확인·오류 표시가 전 도메인 동일). 접근성 axe 위반 대량 감소. 지표 신뢰도 회복으로 관제·감사 화면이 실제 판단 근거가 됨.

### 3차 배치 — “구조 정리” (제품 결정 이후)
**목표: 메뉴 SSOT 정합 + 기능 결손 해소**

1. **D-6 메뉴 SSOT 재편 먼저** — 중복 18메뉴·고아 19라우트·부모/자식 동일경로 정리 (마이그레이션 1건). ⚠ **화면 정상화 후 메뉴 등록** 순서 준수(깨진 화면을 노출하지 않기 위해)
2. D-3(결재/워크플로우 목업 메뉴 하차) → D-1(로그 4종) → D-2(네트워크) → D-9(게시판 벌크) 순으로 “삭제 vs 구현” 확정분 실행
3. D-4(설문 문항 CRUD) · D-5(휴일 우선) · P0-22(통계 엔드포인트) — 백엔드 신설 동반 L 작업
4. 부재관리(P0 usr-01/bg-05, L) · 주소록 상세(M) · 마이페이지 CRUD(M) 등 “백엔드는 있는데 화면이 없는” 결손 해소
5. P2 전량(레이아웃·브레드크럼·토스트·영문 헤더·모바일·차트 색·axe 스윕)

> **예상 효과**: 메뉴 개수 대비 실제 기능 수의 과장이 사라지고, 사이드바에서 클릭한 메뉴 = 실제 화면이라는 신뢰 회복. 백엔드에만 존재하던 기능(설문 문항·휴일·부재·상담)이 실사용 가능해짐.

---

### 배치별 검증 게이트 (§0.6 HARD)
- 프론트: `npx tsc --noEmit` + `next build` (RSC 경계) — 1·2차 배치 필수
- 백엔드: `./gradlew compileJava compileTestJava` — P0-1/3/5/9/11, D-1~D-5·D-9 포함 시
- 계약 변경 시: `pnpm -C frontend codegen:file` + `codegen:zod` 재생성 후 diff 확인 (P0-1, P0-3, D-9, D-12)
- 다크/라이트 육안 검증: P1-2 치환 후 필수 (토큰 치환은 tsc가 잡지 못함)
- 라우트 삭제 시: `tb_menu_info.modern_route` + 소스 문자열 + e2e POM 3중 grep (2026-07-11 오삭제 전례)

---

## 완결성 비평 (Completeness Critic)

### A. 감사 커버리지 실측 vs 주장

**라우트 전수**: `frontend/src/app/admin` 하위 `page.tsx` = **95개**, `app` 전체 = **120개**. 반면 domainSummaries의 `pages` 합계는 **115** — 실제 admin 라우트(95)를 초과한다. 즉 "pages"는 라우트가 아니라 컴포넌트/클라이언트 파일 수를 센 것이고, **라우트 기준 커버리지는 검증된 적이 없다**.

**admin 내 무발견 화면 4건** (전부 직접 확인):
- `/admin/collaboration/scraps`, `/admin/collaboration/address-book`, `/admin/help` — 각각 6줄 defaultTab 래퍼(`CollaborationHubClient`/`KnowledgeHubClient` 재렌더). 실질 위임이므로 누락은 정당.
- `/admin/system/common-code/codes` — 21줄 redirect 스텁. **정당하지 않다**: 화면에 인코딩 깨진 문자열이 그대로 출력된다(아래 F-7).

**진짜 사각지대는 admin 밖이다.** 감사는 "/admin 전수"를 자임했지만, tb_menu_info의 **살아있는(use_yn='Y') 메뉴가 가리키는 목적지**를 통째로 건너뛰었다:

| 라이브 메뉴 | 실제 목적지 | 감사 상태 |
|---|---|---|
| 1060100~1060300 (스마트툴킷 3종) | `/smart-toolkit/*` (6 라우트) | **미감사** — 대신 use_yn='N'인 `/admin/work-hub`를 whub-01~05로 정밀 감사 |
| 1050100 (결재) | `/approvals` (ApprovalHubClient **493줄**) | **미감사** — sanc-01이 "실제 결재는 /approvals에만 존재"라고 스스로 적고도 열지 않음 |
| 1020300 (쪽지함) | `/note` (326줄) | **미감사** |

즉 **폐기된 진입점은 정밀 감사하고, 사용자가 실제로 쓰는 화면은 열지 않았다.** 아래 F-8이 그 화면에서 즉시 나온 결함이다.

### B. 감사 축 자체의 누락

발견 200여 건 전체를 훑어도 **한 번도 등장하지 않는 축**: ① 국제화(i18n) ② 권한별 화면 분기·데이터 스코핑("누가 보는가") ③ 세션 만료 UX ④ 내보내기/인쇄 역량 ⑤ 인코딩 무결성 전수 ⑥ 2차 내비게이션 표면(Ctrl+K 팔레트). 특히 ②는 감사가 `collab-adbk-01`에서 **인가 없는 엔드포인트에 화면을 배선하라고 권고**하는 사고로 이어졌다(F-3).

---

## 추가 발견 8건

### F-1 · i18n 인프라 완비, 소비율 0% — 영어 사용자에게 관리자 화면 100% 한국어
- **메뉴/라우트**: `/admin/**` 전역
- **근거**: `frontend/package.json:67` (next-intl ^4.13.2) · `frontend/src/app/layout.tsx:127` (`<NextIntlClientProvider>` 마운트) · `frontend/src/i18n/request.ts:14` (NEXT_LOCALE 쿠키 → 카탈로그 동적 로드) · `frontend/messages/ko.json`·`en.json` (**102키 완전 동기, 누락 0, 그중 `admin.*` 61키**) · `frontend/src/i18n/locale.ts:6` (`"향후 로케일 스위처 컴포넌트에서 사용한다"`) · `useTranslations|useMessage` 사용 admin 파일 = **0 / 183**
- **유형**: 완성도 (미감사 축)
- **영향**: 프로바이더·쿠키 스위칭·양방향 카탈로그가 전부 살아 있고 `admin.user.title`~ 61개 키가 **ko/en 양쪽에 번역까지 완료**되어 있는데, 이를 읽는 컴포넌트가 하나도 없다. `NEXT_LOCALE=en` 쿠키를 심어도 바뀌는 것은 로그인/대시보드 일부뿐이고 관리자 화면은 전부 한국어 리터럴이다. 게다가 **로케일 스위처 UI가 존재하지 않아**(`setLocale` 호출부 0건) 사용자는 전환 수단조차 없다. 즉 i18n은 "구축됨"이 아니라 "빌드에만 포함된 미사용 의존성"이며, 다국어를 전제로 한 SI 재사용 시 즉시 부채로 드러난다.
- **개선안**: (a) `app/components/layout/header.tsx`에 로케일 토글(ko/en)을 추가하고 `setLocale()` 후 `router.refresh()`. (b) 이미 번역된 61키를 실제 소비 — `UserOrgHubClient`의 컬럼/버튼 라벨을 `useMessage().t('admin.user.userNm')` 형태로 치환해 파일럿 1화면을 완주시킨 뒤 패턴 확정. (c) 다국어를 하지 않기로 결정한다면 next-intl·messages·i18n 디렉터리를 제거해 "될 것 같은데 안 되는" 상태를 끝낸다. **결정 없이 방치가 최악.**
- **노력**: (a)+(c) S / 전면 이관 L

### F-2 · 발송메일 전건이 전 직원에게 열려 있음 (스코핑 부재 + 비-admin 라우트 개방)
- **메뉴/라우트**: 메일 및 통합 메시지 센터 `/admin/collaboration/mail-history`
- **근거**: `frontend/src/middleware.ts:145` (`'/admin/collaboration'` 을 `USER_ACCESSIBLE_ADMIN_PATHS`로 개방) · `frontend/src/services/business/mail/MailService.ts:18` (`super('/mails')` — admin 경로 아님) · `api-server/.../mail/MailApiController.java:22,30,42,55` (`@RequestMapping("/api/v1/mails")`, GET·GET/{id}·DELETE 전부 **@PreAuthorize 없음**) · `business-app/.../mail/MailService.java:31` (`sentMailRepository.findAll(pageable)`), `:38` (`searchSentMails` — 발신자 조건 없음), `:87` (`deleteMail` — 소유자 검증 없음)
- **유형**: 데이터정합/보안
- **영향**: 로그인만 하면 누구나 `/admin/collaboration/mail-history`에 진입해 **조직 전체가 발송한 메일 목록**(제목·발신자·수신자)을 보고, `GET /mails/{id}`로 **본문(emlCn)** 까지 읽으며, `DELETE /mails/{id}`로 **타인의 발송 이력을 삭제**할 수 있다. 같은 도메인의 스크랩(`ScrapService.java:27` `findByFrstRgtrIdAndUseYn`)과 주소록 목록(`AddressBookService.java:32` `wrterId` 스코핑)은 소유자 필터가 걸려 있어, **메일만 스코핑에서 빠진 것**이 확실하다. 기존 감사는 이 화면을 collab-mail-01/02/03·collab-metric-01로 4번 열어보고도 "배지 색"과 "필드명"만 지적했다 — 누가 보는지는 묻지 않았다.
- **개선안**: ① `MailService.getSentMailList`에 발신자(userId) 파라미터를 추가하고 `SentMailRepository`에 `findBySndrIdAndDsptchRsltCd...` 계열 조건을 넣어 본인 발송분만 반환. 관리자 전수 조회가 업무상 필요하면 `/api/v1/admin/system/mails` 를 분리 신설하고 `@AdminOnly` 부착. ② `getSentMail`/`deleteMail`에 `SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId())` 추가 — **같은 저장소의 `AddressBookService.java:94,141`에 동일 가드가 이미 있으므로 그대로 복제**. ③ 그 전까지는 `middleware.ts`의 `ADMIN_ONLY_SUBPATHS`에 `/admin/collaboration/mail-history`를 추가해 화면을 즉시 닫는다(1줄, 즉시 적용 가능).
- **노력**: ③ S / ①② M

### F-3 · 주소록 상세 조회 IDOR — 쓰기는 막고 읽기는 뚫림, 그런데 감사는 여기 배선을 권고
- **메뉴/라우트**: 주소록관리 상세 `/admin/collaboration/address-book/select-address-book-detail/[id]`
- **근거**: `api-server/.../addressbook/AddressBookApiController.java:41-44` (`GET /{adbkId}` — `@AuthenticationPrincipal` **없음**, POST:51·PUT:60·DELETE:71 에는 있음) · `business-app/.../AddressBookService.java:39-48` (`getAddressBook` — findById 후 소유자 검증 없이 `adbkMan` 구성원 전원 반환) · 대조군 `:94` `assertOwnerOrAdmin(...) // [IDOR] 소유자/관리자만 수정(PII)` · `:141` 동일 주석
- **유형**: 데이터정합/보안
- **영향**: PUT/DELETE에는 `// [IDOR]` 주석까지 달아 명시적으로 막아둔 반면 **읽기 경로만 빠졌다**. `adbkId`를 알거나 열거하면 임의 사용자의 개인 주소록 명칭과 구성원 목록(사번·이름, `AddressBookUser` 매핑)을 조회할 수 있고, `/admin/collaboration`이 비-admin 개방(F-2 근거와 동일)이라 공격 표면은 전 직원이다. **더 심각한 것은 감사 결과 자체**: `collab-adbk-01`이 "백엔드 GET /{adbkId}가 이미 구현되어 있는데 화면이 쓰지 않는다"며 **이 엔드포인트에 useQuery를 배선하라고 권고**했다 — 그대로 이행하면 잠복 IDOR이 정식 기능이 된다.
- **개선안**: `AddressBookService.getAddressBook` 첫 줄에 `SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());` 추가(공개범위 `rlsScopeCd`가 '전체공개'인 건은 예외 허용 — 그 경우 `if (!"1".equals(entity.getRlsScopeCd())) assert...` 형태). 이후에 collab-adbk-01의 화면 배선을 진행한다. **순서를 바꾸면 안 된다.**
- **노력**: S

### F-4 · 권한 거부·세션 만료가 전부 무언(無言) — 사유 파라미터를 만들어 보내고 아무도 읽지 않음
- **메뉴/라우트**: `/admin/**` 전역 → `/` 및 `/login`
- **근거**: `frontend/src/middleware.ts:219-221` (비-admin 차단 시 `fallbackUrl.searchParams.set('auth_error','unauthorized')` 후 `/` 리다이렉트) · `auth_error` 소비처 = **0건**(app/·components/·contexts/·lib/ 전수 grep) · `frontend/src/lib/api/client.ts:152` (`/login?expired=true&redirect=...`) · `frontend/src/app/components/ui/session-expiry-warning.tsx:83` (동일 `?expired=true`) · `frontend/src/app/login/LoginClient.tsx:29` (`searchParams.get('redirect')`만 읽음, **`expired` 미참조**) · `beforeunload` 리스너 = 앱 전체 0건
- **유형**: UX (미감사 축)
- **영향**: 세 갈래 모두 사유를 URL에 실어 보내지만 어느 화면도 표시하지 않는다. ① 일반 사용자가 사이드바/Ctrl+K로 관리 메뉴를 누르면 **아무 설명 없이 홈으로 튕긴다** — "클릭이 씹혔다"로 인식하고 반복 클릭한다. ② 토큰 재발급 실패 시 `window.location.href`로 **하드 이동**하는데 로그인 화면에 "세션이 만료되었습니다" 한 줄이 없어 사용자는 자신이 왜 로그아웃됐는지 모른다. ③ 이 하드 이동은 `beforeunload` 가드가 전무하므로 **작성 중이던 게시글·설문·메일 본문이 경고 없이 전부 소실**된다(감사는 sys-menu-04에서 beforeunload를 '메뉴 트리 한정' 권고로만 다뤘다). ④ `redirect`에 `window.location.pathname`만 넣어 쿼리스트링(탭·검색·페이지)이 유실되므로 재로그인 후 작업 맥락도 복원되지 않는다.
- **개선안**: (a) `LoginClient`에서 `searchParams.get('expired')==='true'` 이면 폼 상단에 `role="status"` 안내 배너 렌더. (b) `client.ts:152`의 redirect 값을 `pathname + search`로 확장. (c) 루트 `app/page.tsx`(또는 `UnifiedDashboardClient`)에서 `auth_error==='unauthorized'` 수신 시 toast/배너로 "해당 화면은 관리자 전용입니다" 표시. (d) 장문 입력 폼(게시글 작성·메일 발송·설문 등록)에 `dirty` 상태 기반 `beforeunload` 가드를 공용 훅(`useUnsavedGuard`)으로 추가.
- **노력**: (a)(b)(c) S / (d) M

### F-5 · 프로덕션 API에 인증만 통과하면 열리는 디버그 엔드포인트 2개 (전체 메뉴·프로그램 덤프)
- **메뉴/라우트**: (화면 없음) `GET /api/v1/menus/test/raw`, `GET /api/v1/menus/test/programs`
- **근거**: `api-server/.../menu/MenuUserApiController.java:52` (`@GetMapping("/test/raw")`), `:68` (`@GetMapping("/test/programs")`) — 둘 다 `@PreAuthorize` 없음 · `business-core/.../menu/MenuService.java:200` (`getAllMenus()` — **권한 필터 없음**) · 대조군 `:82-83` (`getMenuHierarchy()` — SecurityContext authorities 기반 `MenuAuthority` 필터 + isAdmin 분기)
- **유형**: 완성도/보안
- **영향**: 정상 경로(`/menus/head`, `/menus/left`)는 권한별 메뉴 매핑을 제대로 적용하는데(사이드바는 role 필터링이 **정상 동작**한다 — 이 부분은 결함 아님), `test/raw`는 그 필터를 우회해 **비활성(use_yn='N') 메뉴와 관리자 전용 라우트를 포함한 전체 메뉴 트리**를, `test/programs`는 **전체 프로그램 목록**을 반환한다. 일반 사용자가 관리 화면의 존재와 정확한 `modernRoute`를 열거할 수 있어 정찰 창구가 된다. 이름(`/test/`)과 `getRawMenus`/`getPrograms`라는 시그니처상 개발 중 임시 추가분이 그대로 남은 것이다.
- **개선안**: 두 메서드를 **삭제**한다(대체 경로가 이미 있으므로 기능 손실 0). 진단 용도를 유지해야 한다면 `@AdminOnly` 부착 + 경로를 `/api/v1/admin/system/menus/diagnostics`로 이동. 재발 방지로 `SecurityAuthAnnotationLinterTest`에 "컨트롤러 매핑 경로에 `/test` 세그먼트 금지" 룰을 추가.
- **노력**: S

### F-6 · 동작하는 CSV 내보내기 컴포넌트가 1곳만 쓰이고, 감사는 '내보내기 버튼을 삭제하라'고 반복 권고
- **메뉴/라우트**: 기관코드 `/admin/system/codes/institution`, 감사 타임라인 `/admin/system/audit`, 옵저버빌리티 `/admin/observability`, 모니터링 허브 `/admin/system/monitoring/hub`
- **근거**: `frontend/src/app/components/ui/data-export-excel.tsx:16-45` (**동작하는 구현** — headers 매핑 + `\uFEFF` BOM + Blob 다운로드, 엑셀 한글 정상) · `frontend/src/lib/utils/exportUtils.ts` (+ 테스트 존재) · 전체 소비처 = `frontend/src/app/admin/stats/AdminStatsClient.tsx:136` **단 1곳** · 무동작 내보내기 버튼: `InstitutionCodeClient.tsx:283`, `AuditTimelineClient.tsx:79`, `observability/page.tsx:158`, `MonitoringHubClient.tsx:688`
- **유형**: 완성도 (미감사 축)
- **영향**: 감사는 이 버튼들을 sys-inst-01·sys-log-13·sys-mon-12·sys-mon-16에서 각각 "제거하거나 준비 중 표기"로 처리했다. 그러나 **BOM 포함 CSV 다운로드는 이미 만들어져 검증까지 돼 있다** — 즉 4건 모두 "삭제"가 아니라 `<DataExportExcel data={...} headers={...} />` 한 줄 치환으로 **실제 기능이 된다**. 행정 업무에서 목록 엑셀 반출은 필수 요구인데, 감사가 축을 세우지 않아 "있는 자산을 버리는" 방향의 권고가 4번 반복됐다.
- **개선안**: 4개 지점의 죽은 버튼을 `DataExportExcel`로 교체한다. 예: 기관코드 → `<DataExportExcel data={list} headers={[{label:'기관코드',key:'instCd'},{label:'기관명',key:'allInstNm'}]} filename="기관코드" />`. 서버 전량 반출이 필요한 대용량 목록(로그)은 백엔드 스트리밍 엔드포인트를 별건으로 검토하되, **현재 페이지 반출만으로도 4개 화면의 죽은 버튼이 즉시 해소**된다. 아울러 `data-export-excel.tsx:14`의 JSDoc 인코딩 손상(F-7)도 함께 복구.
- **노력**: S

### F-7 · 인코딩 손상(mojibake) 전수 미실시 — 화면에 직접 출력되는 건까지 누락
- **메뉴/라우트**: 통합 코드 관리(리다이렉트 경유) `/admin/system/common-code/codes` 외
- **근거**: `frontend/src/app/admin/system/common-code/codes/CommonCodeCodesClient.tsx:16` — **화면 본문 `<p>` 태그**: `통합 관리님붾㈃쇰줈 ?대룞 중..` · `frontend/src/app/components/ui/data-export-excel.tsx:14` · `frontend/src/app/components/ui/standard-chart-wrapper.tsx:158` · 손상 문자열 포함 파일 **30개 이상**(app/·lib/·services/·hooks/·components/ 전수 grep, 손상 라인 66줄)
- **유형**: 일관성
- **영향**: 기존 감사는 ops-19(metadata 3건)와 mr-11(rough-map 1건)만 잡고 **전수 스윕을 하지 않았다**. 실제로는 CP949→UTF-8 이중 변환 잔재가 30개 파일에 남아 있고, 그중 `CommonCodeCodesClient.tsx:16`은 metadata가 아니라 **사용자가 실제로 보는 로딩 안내 문구**다(`/admin/system/common-code/codes` 진입 시 리다이렉트 전 표시). 나머지는 대부분 주석/JSDoc이라 즉시 피해는 없으나, 유지보수자가 원 의도를 읽을 수 없고 SI 인계 시 품질 신뢰를 떨어뜨린다.
- **개선안**: `grep -rlP "님붾|꽣\?꾨|釉님|쇰줈"` 로 30개 파일을 확정한 뒤 UTF-8로 일괄 복구한다. 우선순위 1은 사용자 노출 4건(`CommonCodeCodesClient.tsx:16`, `operation/events/page.tsx:5-6`, `operation/memo-reports/page.tsx:6`, `operation/rough-map/page.tsx:5-6`). 재발 방지로 CI에 손상 시그니처 grep 게이트를 추가(`.githooks/pre-push`에 1줄).
- **노력**: S

### F-8 · [미감사 화면] 전자결재 `/approvals` — '보관함' 탭이 '처리 이력'과 동일 데이터, 검색은 무동작, 페이저 없음
- **메뉴/라우트**: 전자결재 결재함 `/approvals` (tb_menu_info 1050100, **use_yn='Y' 실사용 메뉴**)
- **근거**: `frontend/src/app/approvals/ApprovalHubClient.tsx:34` (`type ApprovalTab = 'PENDING'|'HISTORY'|'ARCHIVE'`) · `:47-54` (queryFn은 `PENDING`이면 `getPending`, **그 외 전부 `getMyHistory`** — ARCHIVE 분기 없음) · `:264-265` (ARCHIVE NavButton은 정상 렌더·클릭 가능) · `:48` (`queryKey: ['approvals', activeTab, searchWrd]` — searchWrd가 키에만 있고 `:51-53` 서비스 인자에 **미전달**) · `:301-304` (검색 Input 실존, placeholder `"결재 요청 검색..."`) · `:51,:53` (`size: 50` 고정, 페이저 없음)
- **유형**: 완성도/데이터정합
- **영향**: 이 화면은 감사가 sanc-01에서 "실제 결재는 /approvals에만 존재한다"고 스스로 지목하고도 열지 않은, **493줄짜리 실사용 결재함**이다. 결함 3종: ① '보관함' 탭을 눌러도 '처리 이력'과 **글자 하나 다르지 않은 목록**이 나온다(결재자는 종결 문서를 분리 조회할 수 없다). ② 검색어를 입력하면 queryKey가 바뀌어 로딩·재요청은 발생하지만 서버에는 전달되지 않아 **결과가 그대로 되돌아온다** — collab-hub-01·sys-log-09와 완전히 동일한 패턴이 미감사 영역에도 있었다는 증거. ③ `size:50` 고정에 페이저가 없어 결재 이력 51건째부터 접근 불가. 결재는 감사·법적 증적이 필요한 도메인이라 ③은 시간이 지날수록 악화된다.
- **개선안**: ① `ApprovalUserService`에 `getArchive()`(또는 `getMyHistory({status:'ARCHIVED'})`)를 추가하고 queryFn을 3분기로 확장. 백엔드에 보관 상태 구분이 없다면 **ARCHIVE 탭을 제거**하는 편이 정직하다(:264-265 NavButton 삭제). ② `getPending`/`getMyHistory` 파라미터에 `searchWrd`를 실어 보내고, 백엔드 미지원이면 검색 Input(:301)을 숨긴다. ③ `page` state + `StandardDataTable`의 `pagination` prop 또는 `PagePagination` 연결, `size`를 10~20으로 하향.
- **노력**: M

---

### C. 후속 권고

1. **커버리지를 라우트 기준으로 재정의**하라. `find src/app -name page.tsx` = 120개를 SSOT로 삼고, 감사 대상은 "/admin"이 아니라 **tb_menu_info에서 use_yn='Y'인 modern_route의 합집합**이어야 한다. 현 기준으로는 폐기 화면을 정밀 감사하고 라이브 화면을 놓치는 F-8류가 반복된다.
2. **미감사 잔여 화면 우선순위**: `/approvals`(493줄, 부분 착수 = F-8) → `/note`(326줄) → `/smart-toolkit/dept-job/*` 6라우트 → `/survey/response/*`.
3. **F-2·F-3·F-5는 코드 변경 전 사용자 승인이 필요한 보안 사안**으로 분리 보고할 것. 특히 F-3은 기존 감사 권고(collab-adbk-01)와 **충돌**하므로, 해당 권고를 이행하기 전에 반드시 선행 수정해야 한다.

**1줄 요약**: 감사는 admin 95개 라우트 중 화면 4건과 **라이브 메뉴가 가리키는 admin 외부 화면 9건**을 누락했고, i18n·권한 스코핑·세션 UX·내보내기·인코딩이라는 5개 축을 통째로 빠뜨려 그 결과 메일 전건 노출(F-2)과 주소록 읽기 IDOR(F-3, 감사가 배선을 권고한 엔드포인트)이 발견되지 않았다.
