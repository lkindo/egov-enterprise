# 모듈별 도메인-메뉴 연계 리포트

> **분석 기준**: `menu-connectivity-report.md` + 백엔드 모듈별 도메인(Entity) 구조
> **분석 일시**: 2026-03-10

---

## 1. 개요
본 리포트는 각 모듈(Core IAM, Operation, Workspace, System Admin)에 존재하는 도메인 엔티티들이 실제 어떤 메뉴와 연결되어 있는지, 그리고 연결 작업이 누락된 항목은 무엇인지 분석한 결과입니다.

---

## 2. 모듈별 도메인 목록 및 메뉴 연계 상태

### 👮 IAM 모듈 (`module-core-iam`)
사용자 인증 및 권한 관리 관련 도메인

| 도메인(Entity) | 연결 메뉴 | 연결 상태 | 비고 |
|--------------|---------|----------|------|
| User / GeneralUser / EnterpriseUser | 일반회원관리, 업무사용자관리, 기업회원관리 | ✅ 정상 | `/admin/user/manage` 통합 화면 사용 |
| Author / Role | 권한관리, 롤관리 | ✅ 정상 | `/admin/security/authority`, `/admin/security/role` |
| Group | 그룹관리 | ✅ 정상 | `/admin/security/group` |
| UserAbsence (삭제됨) | 사용자부재관리 (삭제됨) | - | - |
| DeptManage | 부서관리 | ❌ 누락 | 화면 구현 필요 (Category 2) |
| TermsInfo (삭제됨) | 약관관리 (삭제됨) | - | - |
| Commute (삭제됨) | 근태관리 (삭제됨) | - | - |

### 🏢 Operation 모듈 (`module-operation`)
업무 지원 및 인사/복지 관리 도메인

| 도메인(Entity) | 연결 메뉴 | 연결 상태 | 비고 |
|--------------|---------|----------|------|
| Anniversary (삭제됨) | 기념일관리 (삭제됨) | - | - |
| Holiday (삭제됨) | 휴일관리 (삭제됨) | - | - |
| Reward (삭제됨) | 포상관리 (삭제됨) | - | - |
| Event (삭제됨) | 행사/이벤트/캠페인 (삭제됨) | - | - |
| Duty (삭제됨) | 당직관리 (삭제됨) | - | - |
| Vacation (삭제됨) | 휴가관리, 휴가승인관리 (삭제됨) | - | - |
| Survey / QestnrInfo (설문) | 설문관리, 설문템플릿관리 | ✅ 정상 | `/admin/survey/manage` |
| OnlinePoll (온라인Poll) | - | ⚠️ 미연결 | 백엔드 있음, 화면 작업 필요 (Category 2) |
| Commute (삭제됨) | 근태관리 (삭제됨) | - | - |
| Sms (문자) | 문자메시지 | ⚠️ 미연결 | 백엔드 있음, 화면 작업 필요 (Category 2) |
| DAM (삭제됨) | 지식관리 (삭제됨) | - | - |
| Congratulation (삭제됨) | 직원경조사관리 (삭제됨) | - | - |
| Meeting (삭제됨) | 회의실관리, 회의실예약관리 (삭제됨) | - | - |
| Campaign (삭제됨) | - | - | - |
| Counsel (삭제됨) | 상담관리, 상담답변관리 (삭제됨) | - | - |

### 🛠️ Workspace 모듈 (`module-workspace`)
협업 및 개인 업무 정보 도메인

| 도메인(Entity) | 연결 메뉴 | 연결 상태 | 비고 |
|--------------|---------|----------|------|
| AddressBook (주소록) | 주소록관리 | ✅ 정상 | `/cop/adb/selectAddressBookList` |
| Board / BBS (게시판) | 게시판속성관리 | ✅ 정상 | `/admin/community` |
| Scrap (스크랩) | 스크랩 목록 | ✅ 정상 | `/cop/scp/selectScrapList` |
| Schedule (일정) | 일정관리, 전체일정관리 | ✅ 정상 | `/smart-toolkit/schedule` |
| DeptJob (부서업무) | 부서업무함관리, 부서업무정보 | ✅ 정상 | `/smart-toolkit/dept-job` |
| MemoReport (보고) | 주간/월간보고관리, 메모보고 | ✅ 정상 | `/smart-toolkit/work-report` |
| Note (쪽지) | 쪽지관리, 받은쪽지함, 보낸쪽지함 | ✅ 정상 | `/note` |
| NameCard (삭제됨) | 명함관리 (삭제됨) | - | - |
| Faq (FAQ) | FAQ관리 | ✅ 정상 | `/admin/help/faq` |
| Qna (QnA) | 상담관리 | ✅ 정상 | `/admin/help/qna` |
| Help (도움말) | 도움말 | ⚠️ 미연결 | 화면 작업 필요 (Category 2) |
| Wiki (위키) | Wiki기능 | ⚠️ 미연결 | 백엔드 있음, 화면 작업 필요 (Category 2) |
| Banner / Popup | 팝업창관리, 배너관리 | ⚠️ 미연결 | 백엔드 있음, 화면 작업 필요 (Category 2) |
| News (삭제됨) | 뉴스관리 (삭제됨) | - | - |
| RecomendSite (삭제됨)| 추천사이트관리 (삭제됨) | - | - |
| RecentSearchWord (삭제됨) | 최근검색어 목록 (삭제됨) | - | - |
| Mail (메일) | 메일발송, 발송메일내역 | ⚠️ 미연결 | 백엔드 있음, 화면 작업 필요 (Category 2) |

### ⚙️ System Admin 모듈 (`module-system-admin`)
시스템 설정 및 운영 관리 도메인

| 도메인(Entity) | 연결 메뉴 | 연결 상태 | 비고 |
|--------------|---------|----------|------|
| Menu | 메뉴리스트관리, 사이트맵 | ✅ 정상 | `/admin/system/menus` |
| Program | 프로그램리스트관리 | ✅ 정상 | `/admin/system/programs` |
| Stats (통계) | 사용자통계, 접속통계, 화면통계 | ✅ 정상 | `/admin/stats/*` |
| Log (로깅) | - | ❌ 미등록 | 시스템 관리 내부 기능으로 동작 중 |
| SysHistory (삭제됨) | - | - | - |
| Template (템플릿) | - | ❌ 미구현 | `TemplateController` 부재 (Category 4) |
| Zip (삭제됨) | 우편번호관리 (삭제됨) | - | - |

---

## 3. 요약 및 분석 결과

### ⚠️ 연결 누락 주요 항목 (도메인 기준)
1. **IAM (계정관리)**: `DeptManage` (부서관리), `TermsInfo` (약관관리) - 백엔드는 준비되었으나 화면 현대화 연동 필요
2. **Operation (업무지원)**: `OnlinePoll` (온라인Poll), `Sms` (문자)
3. **Workspace (협업)**: `Wiki` (위키), `Banner/Popup` (팝업/배너), `Mail` (메일)

- **화면 우선순위**: 백엔드가 이미 각 모듈(`module-operation`, `module-workspace`)에 분산되어 구현되어 있으므로, 프론트엔드 라우트 매핑(`modern_route`) 업데이트가 우선적으로 수행되어야 함.

---

## 4. 권고사항
- **현대화 경로 등록**: `module-operation`과 `module-workspace`에 속한 ⚠️ 미연결 항목들에 대해 `modern_route`를 정의하고 DB에 업데이트해야 함.
- **도메인-메뉴 매핑 자동화**: 새로운 도메인(Entity) 생성 시 메뉴 메타데이터도 함께 정의하는 표준 프로세스 수립 필요.
- **누락 도메인 검토**: 백엔드 기능이 식별되지 않는 도메인에 대해 실제 사용 여부를 파악하여 기능을 구현하거나 정리(Clean up) 필요.
