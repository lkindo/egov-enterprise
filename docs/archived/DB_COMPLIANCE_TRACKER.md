# DB Compliance Tracker: Enterprise Standardization Final Report

본 문서는 `egov-enterprise` 프로젝트의 91개 테이블 전수에 대한 데이터베이스 현대화 및 표준화 최종 결과를 기록한다.

## 🏁 표준화 요약 (Final Summary)

- **전체 대상**: 91개 테이블
- **표준화 이행**: 100% (91/91)
- **컬럼 코멘트 이행**: 100% (91/91)
- **최종 업데이트**: 2026-05-14
- **관리 체계**: 7개 핵심 도메인 통합 마이그레이션 스크립트

| 도메인 | 테이블 수 | 표준화 상태 | 컬럼 코멘트 | 인덱스 표준 | 통합 스크립트 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Common (공통)** | 12 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_common_domain.sql` |
| **Auth (인증/권한)** | 10 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_auth_domain.sql` |
| **BBS (게시판)** | 7 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_bbs_domain.sql` |
| **Community (커뮤니티)** | 7 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_community_domain.sql` |
| **Collaboration (협업)** | 9 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_collaboration_domain.sql` |
| **Survey (설문)** | 6 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_survey_domain.sql` |
| **Utility (유틸리티/로그)** | 40 | ✅ 100% | ✅ 100% | ✅ 100% | `standardize_utility_domain.sql` |
| **Total** | **91** | **✅ 100%** | **✅ 100%** | **✅ 100%** | **8 Standardization Scripts** |

---

## 🛠️ 표준화 이행 기술 리포트

### 1. 명명 규칙 (Naming Conventions)
- **약어 표준화**: `sj` -> `ttl`, `cn` -> `expln`, `dc` -> `expln`, `at` -> `yn`, `de` -> `ymd` 등 헌법 기준 전수 교정.
- **도메인 접미사 강제**: 코드(`_CD`), 제목(`_TTL`), 설명(`_EXPLN`), 일자(`_YMD`), 시각(`_TM`), 여부(`_YN`) 등 SSOT 준수.

### 2. 데이터 타입 제약 (Hard-Stop Constraints)
- **코드 도메인**: `VARCHAR(12)` - 기업용 표준 코드 길이 준수.
- **일자 도메인**: `CHAR(8)` - `YYYYMMDD` 고정 형식.
- **시각 도메인**: `CHAR(6)` - `HHMMSS` 고정 형식.
- **텍스트 도메인**: 제목 `VARCHAR(300)`, 설명 `VARCHAR(4000)`.

### 3. 메타데이터 가시성 (Metadata Visibility)
- **전 컬럼 코멘트 적용**: 모든 테이블 및 컬럼에 대해 `COMMENT ON` 구문을 적용하여 데이터 사전(Data Dictionary) 동기화 완료.

---

## 📂 마이그레이션 파일 목록 (`docs/03-guides/standardization/`)

1. `standardize_common_domain.sql`: 공통 코드, 파일, 메뉴 등 기초 테이블
2. `standardize_auth_domain.sql`: 사용자, 권한, 롤, 로그인 정책 등 보안 테이블
3. `standardize_bbs_domain.sql`: 게시판 마스터, 게시물, 댓글, 스크랩 등
4. `standardize_community_domain.sql`: 커뮤니티, 동호회, 블로그 정보 및 가입 내역
5. `standardize_collaboration_domain.sql`: 일정, 보고, 일기, 부서 업무 등
6. `standardize_survey_domain.sql`: 설문 정보, 문항, 응답 내역, 템플릿
7. `standardize_utility_domain.sql`: 로그(시스템/웹/개인정보), SMS, 팝업, 주소록 등 유틸리티 전수
8. `standardize_index_names.sql`: 91개 테이블 인덱스 및 제약 조건(PK/FK/UK/IX) 명칭 표준화

---
*Last Updated: 2026-05-14*
*Managed by: Antigravity Governance Engine*
