# 통합 메뉴 및 아키텍처 개편 결과 보고서 (Final Report)

## 1. 개요
본 보고서는 2026-03-11~12일에 걸쳐 진행된 **관리자 모듈 통합 및 전사적 메뉴 구조 개편**의 최종 결과를 기록한 문서입니다. `Workspace`와 `Operation`에 분산되어 있던 관리 기능을 `module-system-admin`으로 일원화하고, 사용자 중심의 메뉴 체계를 재구축하였습니다.

*   **최종 업데이트 일시**: 2026-03-12
*   **주요 변경 사항**: 
    - 관리자 도메인(Banner, Popup, Community, Survey, Consult, QnA)을 `module-system-admin`으로 이관.
    - DB 메뉴(`nmenuinfo`) 계층 구조 전면 재편 (4대 대분류 체계 도입).
    - 백엔드 패키지 구조 최적화 및 의존성 정형화.

---

## 2. 개편된 통합 메뉴 구조 (System Architecture)

현재 데이터베이스(`nmenuinfo`)에 최종 반영된 메뉴 계층 구조입니다.

| 대분류 (Menu ID) | 중분류 (Menu ID) | 메뉴명 | 담당 모듈 (Backend) | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| **1000000.  🏢 Workspace** | 1010000. 개인 도구 | 일정관리, 쪽지관리, 주소록관리 | `module-workspace` | 개인 생산성 도구 |
| | 1020000. 협업 도구 | 내 주소록 등 | `module-workspace` | 팀 단위 협업 |
| **2000000. 💬 Community** | 2010000. 소통 공간 | 각 게시판 및 커뮤니티 | `module-workspace` | 사용자 참여 콘텐츠 |
| **3000000. 🙋‍♂️ Service** | 3010000. 고객 지원 | 설문참여, 상담등록, Q&A | `module-operation` | 사용자 요청 및 참여 |
| **5000000. ⚙️ System Admin** | 5010000. User & Auth | 사용자/권한/롤 관리 | `module-system-admin` | 시스템 보안/계정 |
| | 5020000. Content Admin| 배너/팝업/게시판/커뮤니티 관리 | `module-system-admin` | **[통합]** 콘텐츠 관리 |
| | 5030000. Service Admin | 설문/상담/Q&A 관리 | `module-system-admin` | **[통합]** 운영 지원 관리 |

---

## 3. 백엔드(Backend) 리팩토링 상세

### 3.1. 모듈별 역할 재정의
*   **`module-system-admin`**: 중앙 통제 센터. 모든 관리자용 API와 마스터 설정 정보를 보유.
*   **`module-workspace`**: 사용자 업무 지원. (게시판 엔티티는 공유하되, 관리 로직은 이관됨)
*   **`module-operation`**: 사용자 접점 서비스 수행. (설문 응답 등 사용자 로직만 보유)

### 3.2. 패키지 경로 현행화
모든 관리자 관련 서비스는 아래 경로로 통합되었습니다.
- **Content**: `com.company.project.service.system.content` (Banner, Popup, Community)
- **Service**: `com.company.project.service.system.service` (Survey, Consult, QnA)

---

## 4. 해결된 이슈 및 향후 과제

*   **[Fixed] 상담(Counsel) 기능 복원**: 백엔드 로직이 `module-system-admin`으로 이관되며 정상화되었습니다.
*   **[Fixed] 메뉴 번호 체계 정형화**: 뒤섞여 있던 메뉴 ID를 100만 단위 대분류로 정리하여 향후 확장성을 확보했습니다.
*   **[Ongoing] Frontend 경로 업데이트**: 백엔드 API 경로는 통합되었으나, 프론트엔드 라우트(`/admin/system/...`)와 API 호출 주소의 일관성 유지를 위한 추가 싱크 작업이 권장됩니다.

---
**보고자**: Antigravity Assistant
**보고서 위치**: `docs/integrated-menu-report.md`
