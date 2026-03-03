# 📋 메뉴 라우팅 경로 정합성 조사 결과 보고서

## 1. 개요
전자정부 프레임워크 현대화 프로젝트의 SQL 마이그레이션 파일(`docs/migrations/001_add_modern_route_to_menu.sql`)에 정의된 `modern_route`와 실제 프런트엔드(`frontend/src/app`)의 물리적 경로를 대조한 결과입니다.

## 2. 조사 결과 요약
- **총평**: 대다수의 시스템 관리 메뉴(Admin)는 정상적으로 매핑되어 있으나, **협업 도구(Collaborative Tools)** 및 일부 **운영 지원 메뉴**에서 실제 경로와 SQL 정의 간의 불일치가 다수 발견되었습니다.
- **주요 이슈**:
    1. 레거시 경로 구조(`cop/smt/...`)가 새로운 네이밍 컨벤션(`smart-toolkit/...`)을 반영하지 못함.
    2. 복수형(`vacations`)과 단수형(`vacation`)의 혼용.
    3. 구체적인 페이지 경로(예: `/selectBoardList`)와 디렉토리 경로의 혼재.

## 3. 정합성 대조 상세

### ✅ 일치 (정상 작동)
| 메뉴 카테고리 | 매핑된 modern_route | 프런트엔드 경로 |
| :--- | :--- | :--- |
| 메뉴 관리 | `/admin/system/menus` | `admin/system/menus` |
| 공통코드 관리 | `/admin/system/common-code` | `admin/system/common-code` |
| 프로그램 관리 | `/admin/system/programs` | `admin/system/programs` |
| 사용자 관리 | `/admin/user/manage` | `admin/user/manage` |
| 보안 관리 (권한/그룹/롤) | `/admin/security/...` | `admin/security/...` |
| 통계 (사용자/화면) | `/admin/stats/...` | `admin/stats/...` |
| 게시판 (목록) | `/cop/bbs/selectBoardList` | `cop/bbs/selectBoardList` |

### ❌ 불일치 (수정 필요)
| 기능 명칭 | SQL 정의 경로 (Expected) | 실제 물리 경로 (Actual) | 비고 |
| :--- | :--- | :--- | :--- |
| **개인 일정 관리** | `/cop/smt/sim/selectScheduleList` | `/smart-toolkit/schedule` | 경로 체계 전면 다름 |
| **부서 업무 관리** | `/cop/smt/djm/selectDeptJobList` | `/smart-toolkit/dept-job/selectDeptJobList` | 상위 경로 불일치 |
| **주간/월간 보고** | `/cop/smt/wmr/selectReportList` | `/smart-toolkit/work-report` | 경로 체계 전면 다름 |
| **로그 관리** | `/admin/system/logs` | `/admin/system/audit` | 디렉토리명 상이 |
| **휴가 관리** | `/uss/ion/vacations` | `/uss/ion/vacation` | 단/복수 차이 |
| **행사 관리** | `/uss/ion/events` | `/uss/ion/events` | (확인 필요: `uss/ion/events` 하위 index 존재 여부) |
| **설문 참여** | `/survey` | `/survey/response` | 구체적 경로 누락 |
| **설문 관리** | `/survey` (중복 매핑) | `/admin/survey/manage` | 관리자 경로 누락 |

## 4. 조치 제안 (Next Steps)

### 방법 A: SQL 마이그레이션 파일 수정 (추천)
- 프런트엔드의 실제 경로에 맞춰 SQL의 `UPDATE` 구문을 수정합니다.
- 특히 `smart-toolkit` 관련 경로를 최신화해야 합니다.

### 방법 B: 프런트엔드 `next.config.ts`에 `rewrites` 추가
- 레거시 스타일의 경로(`cop/smt/...`)로 요청이 들어와도 실제 경로로 연결되도록 설정을 추가합니다.
- 장점: DB 데이터를 건드리지 않고 유연하게 대처 가능.

## 5. 최종 확인 사항
- [ ] `smart-toolkit` 관련 메뉴들의 정확한 진입점 URL 확정.
- [ ] 관리자 전용 설문 기능과 일반 사용자 설문 참여 기능의 경로 분리.
- [ ] 단수/복수형 폴더명 규칙 통일 (가급적 단수형 추천).

---
*보고서 작성일: 2026-03-03*
