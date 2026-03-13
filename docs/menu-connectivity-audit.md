# 메뉴 연결성 전수 조사 보고서 (Menu Connectivity Audit)

본 보고서는 Supabase DB의 메뉴 정보(`nmenuinfo`), 프로그램 목록(`nprogrmlist`)과 실제 소스 코드(Next.js Frontend, Spring Boot Backend)를 대조하여 분석한 결과입니다.

## 1. 개요
- **분석 대상**: DB 메뉴 109건, 프로그램 101건
- **현재 상태**: 빌드 성공 및 주요 기능 작동 중이나, 비즈니스 공통 모듈 현대화 과정에서 다수의 미싱링크 존재

## 2. 주요 발견 사항

### ⚠️ A. 화면 미구현 및 링크 누락 (Frontend Gaps)
DB에 메뉴는 정의되어 있으나, 화면이 없거나 경로가 연결되지 않은 항목들입니다.

| 메뉴번호 | 메뉴명 | Modern Route | 상태 |
| :--- | :--- | :--- | :--- |
| 3010000 | 게시물통계 | NULL | 미구현 |
| 4030000 | 템플릿관리 | NULL | 미구현 |
| 4110000 | 메일발송 | NULL | 미구현 |
| 4120000 | 발송메일내역 | NULL | 미구현 |
| 5330000 | 외부인사정보 | NULL | 미구현 |
| 5400000 | 메인이미지관리 | NULL | 미구현 |
| 6050000 | 행정코드관리 | NULL | 미구현 |
| 6060000 | 기관코드수신 | NULL | 미구현 |

### 🔌 B. 백엔드 API 미연결 (Backend Gaps)
프로그램 정의는 존재하나 실제 작동할 컨트롤러(Controller)가 없는 항목들입니다.

| 프로그램명 | 한글명 | 관련 메뉴 | 비고 |
| :--- | :--- | :--- | :--- |
| EgovTnextrlHrInfoList | 외부인사정보 | 5330000 | Controller 없음 |
| EgovRewardManageList | 포상관리 | 5340000 | Controller 없음 |
| EgovCcmAdministCodeList | 행정코드관리 | 6050000 | Controller 없음 |
| getInsttCodeRecptnList | 기관코드수신 | 6060000 | Controller 없음 |
| EgovIndvdlpgeCntntsList | 마이페이지관리 | 6020000 | Controller 없음 |

### 🔄 C. 레거시 경로 및 플레이스홀더 (Legacy & Placeholders)
현대화가 진행 중이거나 임시 경로로 연결된 항목들입니다.

- **레거시 유지**:
  - `4020000 게시판사용정보` -> `/cop/bbs/selectBoardList`
  - `4150000 주소록관리` -> `/cop/adb/selectAddressBookList`
- **화면 공유 (Placeholder)**:
  - `/admin/survey/manage` 경로: 설문지관리, 설문항목관리, 설문관리, 설문진행, 설문통계 5개 메뉴가 동일한 페이지를 공유 중

## 3. 향후 조치 권장
1. **NULL 경로 업데이트**: 미구현 화면에 대한 기획 확인 후 `modern_route` 업데이트 또는 메뉴 비활성화.
2. **백엔드 컨트롤러 보완**: `module-operation` 또는 `module-workspace`에 누락된 CRUD API 구현.
3. **레거시 경로 리팩토링**: `/cop/...` 경로를 `/admin/...` 또는 기능을 포함한 명확한 경로로 마이그레이션.
