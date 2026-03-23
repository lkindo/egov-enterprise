# 🗺️ 시스템 메뉴 구조 최적화 및 UX 개선 로드맵

본 문서는 전자정부 표준프레임워크 엔터프레임 프로젝트의 메뉴 시스템에 대한 종합 분석 결과와 이를 개선하기 위한 세부 실행 계획을 담고 있습니다.

## 1. 종합 분석 리포트 (Current State Analysis)

### 1.1 데이터 무결성 및 링크 오류 (Critical Errors)
소스 코드(`src/app/admin`)와 DB 데이터 대조 결과, 메뉴 용도와 실제 화면이 일치하지 않는 치명적인 매핑 오류가 발견되었습니다.

| 메뉴번호 | 메뉴명 | 현재 경로 (오류) | 실제 구현 경로 (정정 대상) | 이슈 심각도 |
| :--- | :--- | :--- | :--- | :--- |
| `2050000` | 온라인 매뉴얼 관리 | `/admin/sanctn/forms` | `/admin/uss/olh/online-manual` | **치명적** (결재화면 노출) |
| `9020120` | 로그인정책관리 | `/admin/system/monitoring` | `/admin/user/login-policy` | **경로 소외** (전용 페이지 미사용) |
| `9030130` | 댓글 및 평가 관리 | `/admin/system/monitoring` | `/admin/system/comments` | **경로 소외** (모니터링으로 오연결) |
| `2070000` | 상담 관리 (Q&A) | `/admin/help/faq` | `/admin/help/qna` (구현 필요) | **UX 사기** (FAQ만 반복 노출) |

### 1.2 네비게이션 사용자 경험(UX) 이슈
*   **경로 과밀화 (Route Overcrowding)**: `/admin/work-hub` 경로에 6개 이상의 서로 다른 관리 영역(일정, 업무, 보고)이 집중되어 있어 메뉴의 구분이 무의미함.
*   **계층 구조의 부적절성**: '권한 관리'와 '부서 관리'가 '사용자 관리'의 하위에 깊게 매몰되어 있어 관리자 접근성이 떨어짐.
*   **비직관적 네이밍**: '스마트 일정/일지 관리' 등 추상적 표현이 많아 실제 기능을 즉각적으로 유추하기 힘듦.

---

## 2. 최적화 실행 계획 (Detailed Execution Plan)

### Phase 1: 즉각적인 경로 정정 (Immediate Fixes)
잘못 연결된 `modern_route`를 실제 구현된 페이지로 즉시 재매핑합니다.

**[SQL 가이드]**
```sql
-- 온라인 매뉴얼 경로 수정
UPDATE nmenuinfo SET modern_route = '/admin/uss/olh/online-manual' WHERE menu_no = '2050000';

-- 로그인 정책 관리 경로 수정
UPDATE nmenuinfo SET modern_route = '/admin/user/login-policy' WHERE menu_no = '9020120';

-- 댓글 관리 전용 페이지 연결
UPDATE nmenuinfo SET modern_route = '/admin/system/comments' WHERE menu_no = '9030130';

-- 문자 메시지 전용 서비스 연결
UPDATE nmenuinfo SET modern_route = '/admin/uss/ion/sms' WHERE menu_no = '1020100';
```

### Phase 2: 계층 구조 및 UX 재설계 (Structural Redesign)
논리적인 흐름에 따라 메뉴의 위치를 재배치합니다.

1.  **권한 관리 계층 최상위화**:
    *   기존: `시스템관리 > 계정관리 > 사용자관리 > 권한관리`
    *   변경: `시스템관리 > 보안 및 권한 관리 > 권한관리 / 사용자관리 (병렬)`
2.  **워크스페이스 메뉴 세분화**:
    *   `work-hub`를 통합 대시보드로 유지하되, 각 하위 메뉴 클릭 시 쿼리 파라미터(예: `?tab=schedule`)를 통해 즉시 해당 영역이 강조되도록 로직 보강.

### Phase 3: 네이밍 고도화 및 직관성 개선
| 기존 명칭 | 개선 명칭 (Proposal) | 사유 |
| :--- | :--- | :--- |
| 스마트 일정/일지 관리 | **개인 및 부서 일정** | 기능의 명확성 확보 |
| 통신 및 커뮤니케이션 | **통합 메일/메시지함** | 구체적인 매체 명시 |
| 정보 알림이 | **시스템 알림 설정** | '알림' 기능의 주체 명시 |
| 자료이용현황통계 | **콘텐츠 사용량 통계** | '자료'보다 현대적인 용어 사용 |

---

## 3. 사후 검증 및 유지보수 가이드 (Verification)

*   **메뉴 로딩 테스트**: 모든 메뉴를 순차적으로 클릭하여 `404 Error` 또는 엉뚱한 페이지 로딩 여부 확인.
*   **모바일 반응성 체크**: 특히 깊은 Depth(3단계 이상)를 가진 메뉴가 모바일 UI에서 잘림 현상 없이 노출되는지 확인.
*   **데이터 일관성**: 프로그램 관리와 메뉴 정보 간의 `progrm_file_nm` 조인 정합성 정기 점검.

---
> [!TIP]
> 본 계획을 실행한 후에는 반드시 `db_dump.sql`에 반영하여 로컬 환경과 클라우드 DB의 정합성을 유지하시기 바랍니다.
