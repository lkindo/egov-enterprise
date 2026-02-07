---
description: 전자정부프레임워크 5.0 모듈 마이그레이션 및 메뉴 연결 표준 워크플로우
---

# 모듈 마이그레이션 워크플로우 (Module Migration Workflow)

> **참조**: 프로젝트 지침은 [`.agent/instructions.md`](../.agent/instructions.md)를 따릅니다.

---

## 1단계: 사전 분석 (Analysis)
- **소스 확인**: `egovframework.com.[module]` 패키지 확인
- **의존성 확인**: `User`, `File`, `CmmCode` 등 타 모듈 의존성 식별
- **테이블 확인**: `com_DDL_postgres.sql` 내 테이블 및 `COMT` 접두어 제거 여부 확인
- **레거시 참조**: `legacy` 폴더 내 파일은 로직/스키마 확인 용도로만 활용 (Reference Only)

---

## 2단계: [Backend] 도메인 및 서비스 구현
- **Entity/Repository**: `common-domain`에 JPA Entity 및 Repository 생성
  - `@Entity`, `JpaRepository` 사용
  - N+1 방지: `@EntityGraph` 또는 `Fetch Join` 활용
- **Service**: `common-service`에 Service Interface 및 Impl 구현
  - `EgovAbstractServiceImpl` 상속 (전자정부프레임워크 5.0 호환)
  - 예외: `EgovBizException` 또는 `BusinessException` 활용
- **Legacy Cleaning**: 불필요한 `VO`, `DAO` 파일 식별 및 제거 계획 수립

---

## 3단계: [Web] 하이브리드 어댑터 구현
- **Adapter**: `api-server`에 `[Module]Adapter.java` 구현 (Entity -> Legacy Map 변환)
- **Controller**: 레거시 Controller(`Egov[Module]Controller`)에 신규 Service 주입 및 Adapter 연결
- **패키지 정리**: `egovframework.let` 패키지 import를 `egovframework.com` 또는 신규 패키지로 전환

---

## 4단계: [Frontend] Next.js UI 구현 (해당 시)
> 관리자 화면이 필요한 경우 Next.js 기반으로 구현

- **페이지 생성**: `frontend/src/app/admin/[module]/page.tsx`
- **컴포넌트**: `frontend/src/components/admin/[module]/`에 Form/Table 컴포넌트 생성
- **서비스**: `frontend/src/services/[module]Service.ts`에 API 호출 함수 구현
- **타입 정의**: `frontend/src/types/[module].ts`에 TypeScript 인터페이스 정의
- **Form 패턴**: `react-hook-form` + `zod` + `Dialog` 래핑
- **Prerendering 주의**: 클라이언트 컴포넌트에서 API 호출 시 `export const dynamic = 'force-dynamic'` 선언

---

## 5단계: [System] 시스템 데이터 등록 (Menu/Security)
- **프로그램(URL) 등록**: `NPROGRMLIST` 테이블에 Controller URL 등록
- **메뉴 연결**: `NMENUINFO` 테이블에 메뉴 구조 등록 및 프로그램 ID 매핑
- **권한 설정**: `NMENUCREATDTLS` 및 `NAUTHORINFO`에 권한별 접근 제어 설정
- **보안 Config**: `EgovSecurityConfig.java`에 antMatcher 패턴 등록 및 접근 허용

---

## 6단계: [Verification] 검증 및 테스트
- **Backend 단위 테스트**: JUnit5 + Mockito로 Service 로직 검증
- **Frontend 빌드 검증**: `pnpm build` 성공 확인
- **화면 테스트**: 렌더링, 500 에러 여부, 데이터 바인딩 확인
- **기능 테스트**: CRUD(등록/수정/삭제/조회) 정상 동작 확인 (DB 반영 확인)
- **로그 확인**: `LogManageController` 및 `p6spy` SQL 로그 확인

---

## 7단계: [Finalize] 완료 처리
// turbo
- `task.md` 체크리스트 업데이트
- Git 커밋: `[Feat] [module] 마이그레이션 완료`

---

*최종 수정일: 2026-02-07*
