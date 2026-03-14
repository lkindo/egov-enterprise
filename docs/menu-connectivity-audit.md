# 메뉴 연결성 전수 조사 보고서 (Menu Connectivity Audit)

본 보고서는 Supabase DB의 메뉴 정보(`nmenuinfo`), 프로그램 목록(`nprogrmlist`)과 실제 소스 코드(Next.js Frontend, Spring Boot Backend)를 대조하여 분석한 결과입니다.

## 1. 개요
- **분석 대상**: DB 메뉴 110건, 프로그램 101건
- **현재 상태**: 리팩토링 및 백엔드 Gap Fill 작업이 진행됨에 따라 다수의 미싱링크가 해결됨. 주요 기능들이 현대화된 경로와 API에 연결되었음을 확인.

## 2. 주요 발견 사항

### ✅ A. 화면 연결 및 경로 업데이트 (Frontend Progress)
이전 보고서에서 미구현으로 분류되었으나, DB상에서 `modern_route`가 업데이트되거나 경로가 확인된 항목들입니다.

| 메뉴번호 | 메뉴명 | Modern Route | 상태 |
| :--- | :--- | :--- | :--- |
| 3010000 | 게시물통계 | /admin/stats/board | 연결됨 |
| 4030000 | 템플릿관리 | /admin/community/templates | 연결됨 |
| 5330000 | 외부인사정보 | /admin/operation/external-hr | 연결됨 |
| 5335000 | 포상관리 | /admin/operation/rewards | 연결됨 |
| 5400000 | 메인이미지관리 | /admin/system/banner | 연결됨 |
| 6050000 | 행정코드관리 | /admin/system/codes/administ | 연결됨 |
| 6060000 | 기관코드수신 | /admin/system/codes/institution | 연결됨 |

### ⚠️ B. 잔여 화면 미구현 항목 (Remaining Frontend Gaps)
여전히 Modern Route가 정의되지 않았거나 검토가 필요한 항목들입니다.

| 메뉴번호 | 메뉴명 | Modern Route | 상태 |
| :--- | :--- | :--- | :--- |
| 4060000 | 문자메시지 | NULL | 미구현 |
| 4110000 | 메일발송 | NULL | 미구현 |
| 4120000 | 발송메일내역 | NULL | 미구현 |
| 5070000 | 저작권보호정책 | NULL | 미구현 |
| 5080000 | 개인정보보호정책 | NULL | 미구현 |

### 🔌 C. 백엔드 API 연결 완료 (Backend Gap Fill Result)
이전 보고서에서 Controller 누락으로 보고되었으나, 현재 구현이 완료된 항목들입니다.

| 프로그램명 | 한글명 | 관련 메뉴 | 비고 |
| :--- | :--- | :--- | :--- |
| EgovTnextrlHrInfoList | 외부인사정보 | 5330000 | ExternalHrApiController (module-operation) |
| selectRwardManageList | 포상관리 | 5335000 | RewardManageApiController (module-operation) |
| EgovCcmAdministCodeList| 행정코드관리 | 6050000 | AdministCodeApiController (module-system-admin) |
| getInsttCodeRecptnList | 기관코드수신 | 6060000 | InstitutionCodeApiController (module-system-admin) |
| EgovIndvdlpgeCntntsList| 마이페이지관리 | 5050000 | MyPageApiController (module-workspace) |

### 🔄 D. 레거시 경로 및 플레이스홀더 (Legacy & Placeholders)
현대화가 진행 중이거나 임시 경로로 연결된 항목들입니다.

- **레거시 유지**:
  - `4020000 게시판사용정보` -> `/admin/community/boards` (DB 업데이트 완료)
  - `4150000 주소록관리` -> `/admin/collaboration/address-book` (DB 업데이트 완료)
- **화면 공유 (Placeholder)**:
  - `/admin/survey/manage` 경로: 설문지관리, 설문항목관리, 설문관리, 설문진행, 설문통계 5개 메뉴가 동일한 페이지를 공유 중

## 3. 향후 조치 권장
1. **메일/문자 서비스 구현**: `4060000`, `4110000` 등 외부 연동 서비스의 현대화 아키텍처 수립 및 구현.
2. **정책 관련 고정 페이지**: 저작권 및 개인정보보호정책(`5070000`, `5080000`)에 대한 정적/동적 페이지 구현 및 DB 연결.
3. **통계 화면 세분화**: 현재 `/admin/stats` 등으로 뭉뚱그려진 통계 메뉴들을 개별 통계 대시보드 화면으로 분리 구현.
