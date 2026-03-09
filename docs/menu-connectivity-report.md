# 메뉴 연결 상태 분석 보고서

> **분석 기준**: Supabase DB (`nmenuinfo`, `nprogrmlist`) + 프론트엔드 페이지 + 백엔드 컨트롤러  
> **분석 일시**: 2026-03-09

---

## 분석 방법론

| 레이어 | 확인 방법 |
|--------|----------|
| **DB** | `nmenuinfo.modern_route` 컬럼 — 프론트엔드 라우트 현대화 경로 |
| **프론트엔드** | `/frontend/src/app/**/page.tsx` 파일 존재 여부 |
| **백엔드** | 각 모듈의 `*Controller.java` 파일 존재 여부 |

---

## 요약 통계

| 상태 | 건수 |
|------|------|
| ✅ 정상 연결 (DB + 프론트엔드 + 백엔드 모두 있음) | **34개** |
| ❌ 프론트엔드 화면 없음 (`modern_route` = null) | **50개** |
| 🖥️ 화면은 있으나 DB 메뉴 미등록 | **22개** |
| 🔌 백엔드 미구현 (Controller 없음) | **9개** |
| 🔀 라우트 중복 (여러 메뉴 → 같은 화면) | **15건** |
| 📂 디렉터리 노드 (메뉴 그룹, 실제 기능 없음) | **28개** |

> **전체 leaf 메뉴 약 80개 중 프론트엔드 정상 연결: 34개 (42.5%)**

---

## ✅ Category 1: 정상 연결 메뉴

> DB `modern_route` ↔ 프론트엔드 `page.tsx` ↔ 백엔드 Controller 모두 연결된 상태

| menu_no | 메뉴명 | modern_route | 백엔드 Controller |
|---------|--------|-------------|-----------------|
| 1020000 | 로그인정책관리 | `/admin/user/login-policy` | `LoginPolicyManageController` |
| 2010000 | 권한관리 | `/admin/security/authority` | `AuthorController` |
| 2020000 | 권한그룹관리 | `/admin/security/authority` | `AuthorController` |
| 2030000 | 그룹관리 | `/admin/security/group` | `GroupController` |
| 2040000 | 롤관리 | `/admin/security/role` | `RoleController` |
| 2050000 | 부서권한관리 | `/admin/security/dept-authority` | `AuthorController` |
| 3020000 | 사용자통계 | `/admin/stats/user` | `StatisticsController` |
| 3030000 | 접속통계 | `/admin/stats` | `StatisticsController` |
| 3040000 | 화면통계 | `/admin/stats/screen` | `StatisticsController` |
| 4010000 | 게시판속성관리 | `/admin/community` | `BBSManageController` |
| 4020000 | 게시판사용정보 | `/cop/bbs/selectBoardList` | `BoardController` |
| 4040000 | 스크랩 목록 | `/cop/scp/selectScrapList` | `ScrapController` |
| 4050000 | 커뮤니티관리 | `/admin/community` | `CommunityController` |
| 4070000 | 부서일정관리 | `/smart-toolkit/schedule/dept` | `ScheduleController` |
| 4080000 | 일정관리 | `/smart-toolkit/schedule` | `ScheduleController` |
| 4100000 | 전체일정관리 | `/smart-toolkit/schedule` | `ScheduleController` |
| 4150000 | 주소록관리 | `/cop/adb/selectAddressBookList` | `AddressBookController` |
| 4160000 | 간부일정관리 | `/smart-toolkit/schedule` | `LeaderScheduleController` |
| 4170000 | 부서업무함관리 | `/smart-toolkit/dept-job` | `DeptJobController` |
| 4180000 | 부서업무정보 | `/smart-toolkit/dept-job` | `DeptJobController` |
| 4190000 | 주간/월간보고관리 | `/smart-toolkit/work-report` | `MemoReportController` |
| 4200000 | 메모할일관리 | `/smart-toolkit/work-report` | `MemoReportController` |
| 4210000 | 메모보고 | `/smart-toolkit/work-report` | `MemoReportController` |
| 5010000 | 기업회원관리 | `/admin/user/manage` | `EntrprsManageController` |
| 5020000 | 업무사용자관리 | `/admin/user/manage` | `UserManageController` |
| 5040000 | 일반회원관리 | `/admin/user/manage` | `MberManageController` |
| 5110000 | FAQ관리 | `/admin/help/faq` | `FaqController` |
| 5180000 | 상담관리 | `/admin/help/qna` | `QnaController` |
| 5190000 | 상담답변관리 | `/admin/help/qna` | `QnaController` |
| 5200000 | 설문관리 | `/admin/survey/manage` | `SurveyController` |
| 5210000 | 설문조사 | `/survey/response` | `SurveyController` |
| 5220000 | 설문템플릿관리 | `/admin/survey/manage` | `SurveyController` |
| 5230000 | 응답자관리 | `/admin/survey/manage` | `SurveyController` |
| 5240000 | 질문관리 | `/admin/survey/manage` | `SurveyController` |
| 5250000 | 항목관리 | `/admin/survey/manage` | `SurveyController` |
| 5320000 | 행사/이벤트/캠페인 | `/uss/ion/events` | `EventController` |
| 5430000 | 사용자부재관리 | `/uss/ion/user-absences` | `UserManageController` |
| 5490000 | 쪽지관리 | `/note` | `NoteController` |
| 5500000 | 받은쪽지함관리 | `/note` | `NoteController` |
| 5510000 | 보낸쪽지함관리 | `/note` | `NoteController` |
| 5560000 | 휴가관리 | `/uss/ion/vacation` | `VacationController` |
| 5570000 | 휴가승인관리 | `/uss/ion/vacation` | `VacationController` |
| 5580000 | 당직관리 | `/uss/ion/duty` | `DutyController` |
| 5590000 | 당직체크관리 | `/uss/ion/duty` | `DutyController` |
| 5600000 | 포상관리 | `/admin/system/reward` | `RewardController` |
| 5610000 | 포상승인관리 | `/admin/system/reward` | `RewardController` |
| 5620000 | 기념일관리 | `/uss/ion/anniversaries` | `AnniversaryController` |
| 5630000 | 기념일목록 | `/uss/ion/anniversaries` | `AnniversaryController` |
| 5640000 | 행사신청관리 | `/uss/ion/events` | `EventController` |
| 5650000 | 행사접수관리 | `/uss/ion/events` | `EventController` |
| 5660000 | 행사접수승인관리 | `/uss/ion/events` | `EventController` |
| 6010000 | 공통분류코드 | `/admin/system/common-code` | `CcmManageController` |
| 6020000 | 공통상세코드 | `/admin/system/common-code` | `CcmManageController` |
| 6030000 | 공통코드 | `/admin/system/common-code` | `CcmManageController` |
| 6130000 | 메뉴리스트관리 | `/admin/system/menus` | `MenuController` |
| 6150000 | 메뉴생성관리 | `/admin/system/menus/by-authority` | `MenuCreateController` |
| 6160000 | 사이트맵 | `/admin/system/menus` | `MenuController` |
| 6180000 | 프로그램리스트관리 | `/admin/system/programs` | `ProgramApiController` |

---

## ❌ Category 2: 프론트엔드 화면 없음 (`modern_route = null`)

> DB에 `modern_route`가 등록되지 않아 프론트엔드 화면으로 연결되지 않는 메뉴

| menu_no | 메뉴명 | 레거시 URL | 백엔드 상태 |
|---------|--------|-----------|------------|
| 1010000 | 로그인 | `/login` | 화면 있으나 DB 미등록 (별도 처리) |
| 3010000 | 게시물통계 | `/admin/stats/bbs-stats` | `StatisticsController` 있음 ✓ |
| 3050000 | 보고서통계 | `/admin/stats` | `StatisticsController` 있음 ✓ |
| 3060000 | 자료이용현황통계 | `/admin/stats/dta-use-stats` | `StatisticsController` 있음 ✓ |
| 4030000 | 템플릿관리 | `/cop/tpl/selectTemplateList` | Controller 없음 ✗ |
| 4060000 | 문자메시지 | `/cop/sms/selectSmsList` | `SmsController` 있음 ✓ |
| 4090000 | 일지관리 | `/cop/smt/dsm/selectDiaryList` | Controller 없음 ✗ |
| 4110000 | 메일발송 | 레거시 URL | `MailController` 있음 ✓ |
| 4120000 | 발송메일내역 | 레거시 URL | `MailController` 있음 ✓ |
| 4130000 | 명함관리 | `/cop/ncm/selectNcrdList` | `NameCardController` 있음 ✓ |
| 4140000 | 내명함목록 | `/cop/ncm/selectMyNcrdList` | `NameCardController` 있음 ✓ |
| 5030000 | 부서관리 | `/admin/user/dept-manage` | `DeptManageController` 있음 ✓ |
| 5050000 | 마이페이지관리 | `/mypage` | Controller 없음 ✗ |
| 5060000 | 약관관리 | `/admin/user/stplat` | `TermsApiController` 있음 ✓ |
| 5070000 | 저작권보호정책 | `/admin/user/cpyrht-prtc-policy` | Controller 없음 ✗ |
| 5080000 | 개인정보보호정책확인 | `/admin/user/indvdl-info-policy` | Controller 없음 ✗ |
| 5090000 | 도움말 | `/help` | `HelpController` 있음 ✓ |
| 5100000 | 용어사전 | `/admin/user/word-dicary` | Controller 없음 ✗ |
| 5140000 | 행정전문용어사전 | `/admin/uss/olh/admin-word` | Controller 없음 ✗ |
| 5150000 | 행정전문용어사전관리 | `/admin/uss/olh/admin-word` | Controller 없음 ✗ |
| 5160000 | 온라인매뉴얼 | `/admin/uss/olh/online-manual` | Controller 없음 ✗ |
| 5170000 | 사용자온라인매뉴얼 | `/admin/uss/olh/online-manual` | Controller 없음 ✗ |
| 5260000 | 회의관리 | `/admin/user/meeting` | `MeetingController` 있음 ✓ |
| 5270000 | 온라인poll관리 | `/admin/uss/olp/online-poll` | `OnlinePollController` 있음 ✓ |
| 5280000 | 온라인poll참여 | `/admin/uss/olp/online-poll` | `OnlinePollController` 있음 ✓ |
| 5290000 | 뉴스관리 | `/admin/uss/ion/news` | `NewsController` 있음 ✓ |
| 5300000 | 사이트관리 | `/admin/uss/ion/site` | `RecomendSiteController` 있음 ✓ |
| 5310000 | 추천사이트관리 | `/admin/uss/ion/site` | `RecomendSiteController` 있음 ✓ |
| 5330000 | 외부인사정보 | `/admin/uss/ion/external-hr` | Controller 없음 ✗ |
| 5340000 | 팝업창관리 | `/admin/system/banner` | `PopupManageController` 있음 ✓ |
| 5350000 | 정보알림이 | `/admin/notifications` | `NotificationController` 있음 ✓ |
| 5360000 | 배너관리 | `/admin/system/banner` | `BannerController` 있음 ✓ |
| 5370000 | MYPAGE배너관리 | `/admin/system/banner` | `BannerController` 있음 ✓ |
| 5380000 | 로그인화면이미지관리 | `/admin/uss/ion/login-image` | Controller 없음 ✗ |
| 5390000 | 최근검색어 목록 | `/admin/uss/ion/recent-search` | `RecentSearchwordController` 있음 ✓ |
| 5400000 | 메인이미지관리 | `/admin/uss/ion/main-image` | `MainImageController` 있음 ✓ |
| 5410000 | 메인이미지 반영결과보기 | `/admin/uss/ion/main-image` | `MainImageController` 있음 ✓ |
| 5420000 | 통합링크관리 | `/admin/uss/ion/unity-link` | `UnityLinkManageController` 있음 ✓ |
| 5450000 | Wiki기능 | `/admin/uss/ion/wiki` | `WikiBookmarkController` 있음 ✓ |
| 5460000 | RSS태그관리 | `/admin/uss/ion/rss` | `RssController` 있음 ✓ |
| 5470000 | RSS태그서비스 | `/admin/uss/ion/rss` | `RssController` 있음 ✓ |
| 5480000 | Twitter연동 | `/admin/uss/ion/twitter` | Controller 없음 ✗ |
| 5520000 | 회의실관리 | `/admin/user/mtg-place` | `MeetingController` 있음 ✓ |
| 5530000 | 회의실예약관리 | `/admin/user/mtg-place-resve` | `MeetingController` 있음 ✓ |
| 5540000 | 직원경조사관리 | `/admin/system/ctsnn` | `CongratulationManageController` 있음 ✓ |
| 5550000 | 직원경조사승인관리 | `/admin/system/ctsnn` | `CongratulationManageController` 있음 ✓ |
| 6050000 | 행정코드관리 | `/admin/system/common-code/groups` | `CcmManageController` 있음 ✓ |
| 6060000 | 기관코드수신 | `/admin/system/instt-code-recptn` | Controller 없음 ✗ |
| 6190000 | 프로그램변경요청관리 | `/admin/system/programs/requests` | `ProgramApiController` 있음 ✓ |
| 6210000 | 프로그램변경이력 | `/admin/system/programs/history` | `ProgramApiController` 있음 ✓ |

---

## 🖥️ Category 3: 프론트엔드 화면은 있으나 DB 메뉴 미등록

> `page.tsx`는 존재하지만 `nmenuinfo`에 매핑이 없는 경로들 — DB에 메뉴 등록 필요

| 프론트엔드 경로 | 설명 | 비고 |
|----------------|------|------|
| `/admin/collaboration` | 협업 관리 (레거시 통합 페이지) | 여러 메뉴의 구 URL 타겟 |
| `/admin/dam/kno` | 지식 자산 관리 | DB 메뉴 없음 |
| `/admin/dam/kno/[id]` | 지식 자산 상세 | DB 메뉴 없음 |
| `/admin/dam/kno/create` | 지식 자산 생성 | DB 메뉴 없음 |
| `/admin/notifications` | 알림 관리 | `modern_route` 없음 (5350000 미매핑) |
| `/admin/observability` | 시스템 모니터링 | DB 메뉴 없음 |
| `/admin/sanctn/forms` | 전자결재 양식 | DB 메뉴 없음 |
| `/admin/security/audit` | 보안 감사 | DB 메뉴 없음 |
| `/admin/system/audit` | 시스템 감사 | DB 메뉴 없음 |
| `/admin/system/banner` | 배너 관리 | `modern_route` 없음 (5360000 미매핑) |
| `/admin/system/comments` | 댓글 관리 | DB 메뉴 없음 |
| `/admin/system/congratulations` | 경조사 | DB 메뉴 없음 |
| `/admin/system/ecc` | ECC 관리 | DB 메뉴 없음 |
| `/admin/system/ism` | ISM 관리 | DB 메뉴 없음 |
| `/admin/system/network` | 네트워크 관리 | DB 메뉴 없음 |
| `/admin/system/vacation` | 휴가 관리 (시스템) | DB 메뉴 없음 |
| `/admin/terms` | 약관 관리 | `modern_route` 없음 (5060000 미매핑) |
| `/admin/workflow` | 워크플로우 | DB 메뉴 없음 |
| `/approvals` | 결재 | DB 메뉴 없음 |
| `/cop/cmy/selectCommunityList` | 커뮤니티 목록 | DB 메뉴 없음 |
| `/search` | 통합 검색 | DB 메뉴 없음 |
| `/survey/stats` | 설문 통계 | DB 메뉴 없음 |
| `/uss/ion/welfare` | 복지 | DB 메뉴 없음 |
| `/vacation` | 휴가 (사용자용) | DB 메뉴 없음 |

---

## 🔌 Category 4: 백엔드 미구현 (Controller 없음)

> 메뉴는 DB에 있으나 백엔드 Controller가 없는 항목, 또는 Controller는 있으나 메뉴/화면 모두 없는 항목

| 메뉴명 | 레거시/현재 경로 | 백엔드 상태 |
|--------|----------------|------------|
| 템플릿관리 | `/cop/tpl/selectTemplateList` | Controller 없음 ✗ |
| 일지관리 | `/cop/smt/dsm/selectDiaryList` | Controller 없음 ✗ |
| 저작권보호정책 | `CpyrhtPrtcPolicyListInqire` | Controller 없음 ✗ |
| 개인정보보호정책확인 | `listIndvdlInfoPolicy` | Controller 없음 ✗ |
| 행정전문용어사전 | `listAdministrationWord` | Controller 없음 ✗ |
| Twitter연동 | `selectTwitterMain` | Controller 없음 ✗ |
| 기관코드수신 | `getInsttCodeRecptnList` | Controller 없음 ✗ |
| **시스템 연계 관리 (SystemCntc)** | **미등록** | Controller 있음, 메뉴/화면 없음 |
| **장애 관리 (Trobl)** | **미등록** | Controller 있음, 메뉴/화면 없음 |

---

## 🔀 Category 5: 메뉴 라우트 중복

> 동일한 `modern_route`에 여러 메뉴가 연결된 경우 — 화면 내 탭/파라미터로 분기 필요

| modern_route | 연결된 메뉴들 | 메뉴 수 |
|-------------|--------------|--------|
| `/admin/user/manage` | 기업회원관리, 업무사용자관리, 일반회원관리 | 3개 |
| `/admin/system/common-code` | 공통분류코드, 공통상세코드, 공통코드 | 3개 |
| `/admin/community` | 게시판속성관리, 커뮤니티관리 | 2개 |
| `/smart-toolkit/schedule` | 일정관리, 전체일정관리, 간부일정관리 | 3개 |
| `/smart-toolkit/work-report` | 주간/월간보고관리, 메모할일관리, 메모보고 | 3개 |
| `/smart-toolkit/dept-job` | 부서업무함관리, 부서업무정보 | 2개 |
| `/note` | 쪽지관리, 받은쪽지함, 보낸쪽지함 | 3개 |
| `/admin/system/menus` | 메뉴리스트관리, 사이트맵 | 2개 |
| `/admin/help/qna` | 상담관리, 상담답변관리 | 2개 |
| `/uss/ion/vacation` | 휴가관리, 휴가승인관리 | 2개 |
| `/uss/ion/duty` | 당직관리, 당직체크관리 | 2개 |
| `/uss/ion/events` | 행사/이벤트/캠페인, 행사신청, 행사접수, 행사접수승인 | 4개 |
| `/admin/system/reward` | 포상관리, 포상승인관리 | 2개 |
| `/uss/ion/anniversaries` | 기념일관리, 기념일목록 | 2개 |
| `/admin/survey/manage` | 설문관리, 설문템플릿, 응답자, 질문, 항목관리 | 5개 |

---

## 📋 우선 구현 권고 (Priority Matrix)

### 🔴 HIGH — 백엔드 있음, 화면만 추가하면 됨

| 메뉴명 | 추천 route | 담당 Controller | 예상 공수 |
|--------|-----------|----------------|---------|
| 부서관리 | `/admin/user/dept-manage` | `DeptManageController` | 중 |
| 배너관리 | `/admin/system/banner` | `BannerController` | 중 |
| 팝업창관리 | `/admin/system/popup` | `PopupManageController` | 소 |
| 메인이미지관리 | `/admin/system/main-image` | `MainImageController` | 소 |
| 정보알림이 | `/admin/notifications` | `NotificationController` | 소 |
| 뉴스관리 | `/admin/system/news` | `NewsController` | 소 |
| 도움말 | `/help` | `HelpController` | 소 |
| 메일 발송/내역 | `/admin/mail` | `MailController` | 중 |
| 회의실관리/예약 | `/admin/meeting-room` | `MeetingController` | 중 |
| 직원경조사관리 | `/admin/system/congratulations` | `CongratulationManageController` | 소 |
| 게시물/자료이용 통계 | `/admin/stats/bbs` | `StatisticsController` | 소 |
| 온라인Poll | `/admin/poll` | `OnlinePollController` | 소 |
| 명함관리 | `/admin/namecard` | `NameCardController` | 소~중 |
| 문자메시지 | `/admin/sms` | `SmsController` | 중 |
| Wiki 기능 | `/admin/wiki` | `WikiBookmarkController` | 중 |
| 약관관리 | `/admin/terms` | `TermsApiController` | 소 |
| 프로그램 변경 요청/이력 | `/admin/system/programs/requests` | `ProgramApiController` | 소 |
| 행정코드관리 | `/admin/system/common-code/groups` | `CcmManageController` | 소 |

### 🟡 MEDIUM — 메뉴 등록 + 화면 구현 필요

| 메뉴명 | 비고 |
|--------|------|
| 시스템 연계 관리 (SystemCntc) | 백엔드 있음, 메뉴 DB 등록 + 화면 없음 |
| 장애 관리 (Trobl) | 백엔드 있음, 메뉴 DB 등록 + 화면 없음 |
| 지식 자산 관리 (DAM) | 화면 있음, DB 메뉴 등록 없음 |
| 결재/전자결재 | 화면 있음, DB 메뉴 등록 없음 |
| 시스템 모니터링 | 화면 있음, DB 메뉴 등록 없음 |

### 🟢 LOW — 레거시 기능, 현대화 우선순위 낮음

| 메뉴명 | 비고 |
|--------|------|
| Twitter연동 | 레거시, 현대화 불필요 |
| RSS태그관리/서비스 | 레거시 |
| 행정전문용어사전 | 활용도 낮음 |
| 외부인사정보 | 활용도 낮음 |
| 기관코드수신 | 활용도 낮음 |
| 용어사전 | 활용도 낮음 |
| 온라인매뉴얼 | 활용도 낮음 |

---

## ⚠️ 특이 사항

### SystemCntc / Trobl 미연결

| 항목 | 상태 |
|------|------|
| `SystemCntcController.java` | 백엔드 구현 완료 |
| `TroblController.java` | 백엔드 구현 완료 |
| DB 메뉴 등록 | ❌ 미등록 |
| 프론트엔드 화면 | ❌ 없음 |
| 권장 메뉴 위치 | `시스템 관리 > 서버 인프라 및 장애 관리 (menu_no: 5500)` 하위 |

### DB `modern_route` 업데이트 필요 목록

Category 2 항목 중 백엔드가 이미 구현된 메뉴들은 `nmenuinfo.modern_route`에 경로를 등록하여  
프론트엔드 라우팅과 즉시 연결할 수 있습니다.

```sql
-- 예시: 정보알림이 modern_route 등록
UPDATE nmenuinfo 
SET modern_route = '/admin/notifications' 
WHERE menu_no = 5350000;

-- 예시: 배너관리 modern_route 등록
UPDATE nmenuinfo 
SET modern_route = '/admin/system/banner' 
WHERE menu_no = 5360000;
```
