# 📄 정밀 점검 결과: 미연결 및 대체 메뉴 보고서 (Updated: 2026-02-28)

데이터베이스의 주요 메뉴가 프론트엔드의 실제 구현 경로와 다르거나 누락된 항목들에 대한 점검 결과입니다. 
**[참고]** 현재 프론트엔드 경로와 일치하도록 데이터베이스(`nprogrmlist`) 업데이트가 수행되었습니다.

## � 데이터베이스 업데이트 완료 (DB Updated to Current Paths)

아래 메뉴들은 기존 DB URL이 레거시였으나, 현재 프론트엔드 아키텍처에 맞게 DB 값이 수정되었습니다.

| 프로그램 한글명 | 이전 DB URL | 수정된 DB URL (Implementation Path) | 상태 |
| :--- | :--- | :--- | :--- |
| **당직관리** | /admin/user/bndt | `/uss/ion/duty` | ✅ 반영완료 |
| **사용자부재관리** | /admin/user/user-absnce | `/uss/ion/user-absences` | ✅ 반영완료 |
| **기념일관리** | /admin/user/annvrsry-main | `/uss/ion/anniversaries` | ✅ 반영완료 |
| **행사관리/신청** | /admin/user/event-* | `/uss/ion/events` | ✅ 반영완료 |
| **휴가관리** | /admin/system/vacation | `/uss/ion/vacation` | ✅ 반영완료 |
| **휴가승인관리** | /admin/uss/ion/vcatn | `/approvals` | ✅ 반영완료 |
| **포상승인관리** | /admin/uss/ion/reward | `/admin/system/reward` | ✅ 반영완료 |
| **직원경조사승인관리** | /admin/uss/ion/ctsnn | `/admin/system/ctsnn` | ✅ 반영완료 |
| **팝업창관리** | /admin/uss/ion/popup | `/admin/system/banner` | ✅ 반영완료 |
| **마이페이지관리** | /admin/user/indvdlpge-cntnts | `/mypage` | ✅ 반영완료 |
| **쪽지관리** | /admin/uss/ion/note | `/note` | ✅ 반영완료 |
| **서버정보관리** | /admin/system/server-eqpmn | `/admin/system/server` | ✅ 반영완료 |
| **스크랩 목록** | /cop/scp/selectScrapList | `/cop/scp/selectScrapList` | ✅ 유지 |
| **지식관리 (DAM)** | /admin/dam/kno | `/admin/dam/kno` | ✅ 유지 |

## 🔴 실제 미구현 메뉴 (Truly Missing - Action Required)

프론트엔드 전체 소스 코드 검색 결과, 아래 기능들은 현재 어떠한 경로로도 접근할 수 없으며 추가 구현이 필요한 항목입니다.

### 1. 시스템 및 인프라 관리
*   **프로그램 변경 요청**: `프로그램변경요청처리/관리/이력` (/admin/system/program-change-*)
*   **당직 세부 기능**: `당직체크관리` (/admin/user/bndt-ceck)
*   **달력 설정**: `공휴일관리(달력)` (/admin/system/holiday)
*   **인프라 기타**: `기관코드수신`, `바로가기메뉴관리`, `시스템이력관리`, `우편번호관리`

### 2. 대외 연계 (Integration)
*   **연계 관리**: `연계기관관리`, `연계메시지관리`, `연계현황관리`, `시스템연계관리`

### 3. 협업 및 사용자 지원 (Admin Support)
*   **회의 관리**: `회의관리`, `회의실관리`, `회의실예약관리`
*   **사전/용어**: `용어사전`, `행정전문용어사전`
*   **조직 관리**: `부서관리` (/admin/user/dept-manage)
*   **메모/일지**: `메모보고`, `메모할일관리`, `일지관리` (Simple Diary)
*   **쪽지/명함**: `명함관리`, `내명함목록` (Address book과 별도 존재)
*   **기타**: `문자메시지`, `템플릿관리`

### 4. 대화형 및 컨텐츠 유틸리티
*   **커뮤니티 확장**: `온라인Poll관리/참여`, `RSS태그관리/서비스`, `Wiki기능`, `뉴스관리`, `Twitter연동`
*   **사이트 추천**: `추천사이트관리`, `사이트관리`

---
*최종 업데이트: 2026-02-28*
