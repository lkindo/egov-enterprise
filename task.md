# 작업 체크리스트 (Migration Checklist)

## 테스트 계정 정보 (Test Credentials)
> **Common Password**: `1`
- **Admin**: `webmaster`
- **User**: `USER`
- **Enterprise**: `ENTERPRISE`
- **Test**: `TEST1`

- [x] PRD.MD 작성 (완료)
- [x] 프로젝트 구조 분석 (기존 AS-IS vs 목표 TO-BE)
- [x] TRD.MD 작성 (완료)
- [x] LLD.MD 작성 (완료)
- [x] 멀티 모듈 프로젝트 구조 초기화
- [x] 핵심 기술 마이그레이션 (JPA, QueryDSL, JWT)
- [x] 전자정부프레임워크 5.0 표준 준수 (RTE 5.0.0, Crypto)

## 🚀 종합 마이그레이션 로드맵 (Comprehensive Roadmap)

> **📘 작업 가이드**: 각 모듈의 이관 작업은 [모듈 마이그레이션 표준 가이드 (SOP)](C:/Users/sanle/.gemini/antigravity/brain/f15a5c1f-5304-4178-b610-069ac85c2e0f/MODULE_MIGRATION_GUIDE.md)를 준수하여 수행하십시오.

### [1단계] 기반 구축 (Core Foundation - 완료)
**목표**: 시스템 운영 핵심 기능 (완료됨)
- [x] **시스템 관리 (`sym`)** (메뉴/프로그램/공통코드)
- [x] **보안 관리 (`sec`)** (권한/롤/그룹)
- [x] **사용자 관리 (`uss`)** (통합 사용자)

### [2단계] 협업 및 컨텐츠 (Collaboration & Content - 집중)
**전략**: **도메인 클러스터 단위** 이관 및 일괄 승인

#### 📦 클러스터 2-A: 협업 기본세트 (Collaboration Base) - *완료*
**구성**: 게시판(`cop.bbs`) + 파일(`cmm.service`) + 댓글(`cop.cmt`)
    - [/] 게시판 (BBS)
      - [x] BoardService: `createPostWithFiles` 로직 구현
      - [x] EgovArticleController 리팩터링
      - [/] BoardServiceTest 작성 및 검증
구현 (SOP Sec 4)
    - [/] 파일 관리 (File)
      - [x] EgovFileService 구현 (JPA)
      - [x] EgovFileMngController 리팩터링 (신규 서비스 연동)
      - [x] FileAdapter 구현
업로드/다운로드 컨트롤러 및 유틸리티 검증
- [x] **댓글 (`cop.cmt`)**
    - [x] 댓글 Service/Repository 이관
    - [x] 게시판 상세 조회 시 댓글 연동 확인 (Verified by `CommentServiceTest`)

#### 📦 클러스터 2-B: 커뮤니티 확장 (Community Extension)
**구성**: 커뮤니티(`cop.cmy`) + 동호회(`cop.clb`)
- [x] **커뮤니티 (`cop.cmy`)**
    - [x] BBS 클러스터 의존성 연결
    - [x] 커뮤니티 생성/관리 기능 이관
    - [x] `CommunityUser` 관리 및 Admin 기능 구현
    - [x] `CommunityServiceTest` (Unit) 검증 완료

### [3단계] 운영 지원 (Service Operations - 예정)
#### 📦 클러스터 3-A: 업무 지원 (Work Support)
**구성**: 일정(`cop.smt`) + 약관(`uss.umt`)
- [ ] **일정 관리 (`cop.smt`)**
- [ ] **약관 관리 (`uss.umt`)**

#### 📦 클러스터 3-B: 고객 지원 (Customer Help)
**구성**: 도움말(`uss.olh`) + 설문(`uss.olp`)
- [ ] **온라인 도움말** (FAQ/Q&A)
- [ ] **온라인 설문**

### [4단계] 통합 및 통계 (Integration & Analytics - 후반)
- [ ] **통계 (`sts`)**
- [ ] **시스템 연계 (`ssi`)**
- [ ] **디지털 자산 (`dam`)**

---

## 🛠 관리 및 배포 (Management)
- [x] **문서화**
    - [x] `MODULE_MIGRATION_GUIDE.md` (SOP)
    - [x] `COMPREHENSIVE_MODULE_INVENTORY.md` (Inventory)
- [x] **배포 설정**
    - [x] Docker 환경 및 `COMT` 테이블 정리 로직
- [x] **Enterprise 최적화**
    - [x] 패키지 표준화 (`let` -> `com`)
