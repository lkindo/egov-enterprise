# 프로젝트 지침 (egov-enterprise)

이 파일은 Antigravity 에이전트가 `egov-enterprise` 프로젝트를 수행할 때 항상 준수해야 할 핵심 규칙과 지침을 정의합니다. 에이전트는 모든 세션 시작 시 이 파일을 읽고 따라야 합니다.

---

## 1. 언어 및 소통 규칙
- **기본 언어**: 모든 대화, 소스 코드 주석(신규 작성 시), 문서화(Artifacts)는 **한국어**를 원칙으로 한다.
- **기술 용어**: 전문 기술 용어는 원문을 병기한다 (예: 영속성 계층(Persistence Layer)).
- **투명성**: 작업 시작 전 `implementation_plan.md`를 통해 계획을 공유하고, 완료 후 `walkthrough.md`로 결과를 보고한다.

---

## 2. 기술 스택 및 코딩 표준

### 2.1 Backend
- **Core**: Java 21, Spring Boot 3.3.x, eGovFrame RTE 5.0.0.
- **호환성 인증 (중요)**: 모든 신규/마이그레이션 코드는 **전자정부프레임워크 5.0 호환성 인증 지침**을 준수한다.
  - 서비스 클래스는 `EgovAbstractServiceImpl`을 상속받아 구현한다.
  - 예외 처리는 `EgovBizException` 또는 프로젝트 공통 예외(`BusinessException`)를 적절히 활용한다.
  - 인터페이스와 구현체의 분리 규칙을 엄격히 따른다.
- **Persistence**: Spring Data JPA 중심 (신규 로직).
  - **MyBatis 정리 기준**: 관련 기능을 JPA로 100% 이관하고, E2E 테스트(Playwright)를 통해 기능 검증이 완료된 시점에 MyBatis 관련 파일(`Mapper XML`, `DAO`, `VO`)을 삭제한다.
  - 삭제 전, 해당 매퍼를 참조하는 다른 모듈이 없는지 `grep` 검색 등으로 반드시 확인한다.
- **Security**: Spring Security 6.x 기반.
  - `/api/v1/**` 경로는 JWT 기반 Stateless 인증을 적용한다.
```markdown
```markdown
  - `.do` (Legacy JSP/Spring MVC) 및 기타 레거시 경로는 하위 호환성을 위해 세션(Session) 기반 인증을 적용한다. `legacy` 폴더 내의 파일들은 참조용(Reference Only)으로 관리하며, 실제 프로젝트 동작에 영향을 미치지 않고 로직이나 DB 스키마 확인 용도로만 활용한다.
```
```
- **API 문서화**: REST API는 Swagger/OpenAPI 3.0 어노테이션(`@Operation`, `@Tag` 등)을 필수로 적용.

### 2.2 Frontend
- **Core**: Next.js 15, React 19, Tailwind CSS 4.
- **스킬 탐색 원칙 (최우선)**: 모든 새 기능 구현, 설계, 리뷰 시 로컬 스킬보다 **글로벌 스킬 저장소(`C:\Users\lkind\.gemini\antigravity\global_skills`)**를 최우선으로 탐색하고 참조한다. 특히 `vercel-react-best-practices`, `web-design-guidelines` 등 검증된 최신 가이드라인을 먼저 리서치한다.
- **React Best Practices**: 모든 React 관련 작업 시 반드시 글로벌 스킬(`vercel-react-best-practices/SKILL.md`)을 읽고 해당 지침을 준수하며 작업한다. 로컬 스킬 저상소는 보조적으로 활용한다.
  - TanStack Query 5를 통한 서버 상태 관리.
  - 컴포넌트 구조화 및 타입 안정성 확보.
- **의존성 정책**: 새로운 라이브러리 추가 시 반드시 사용자와 장단점(용량, 보안 취약점, 라이선스)을 검토 후 결정.

## 3. 보안 및 데이터 관리
- **비밀번호**: 신규 비밀번호는 BCrypt 필수. 레거시 로그인은 `DelegatingPasswordEncoder`의 `{egov}` 접두어를 통해 지원.
- **인증**: HttpOnly 쿠키 기반 인증을 지향하며, 클라이언트의 CSRF 공격 방지를 위해 적절한 보안 조치를 취한다.
- **민감 정보**: API Key, DB 패스워드 등은 절대 소스 코드에 하드코딩하거나 커밋하지 않는다 (`.env` 또는 환경 변수 활용).
- **데이터베이스**: PostgreSQL을 주력으로 사용하며, 스키마 변경 시 JPA 엔티티와 일치시킨다.

---

## 5. 작업 프로세스
- **PLANNING 모드**: 코드 수정 전 반드시 분석 결과를 공유하고 사용자의 승인을 받는다.
- **EXECUTION 모드**: 코드를 수정하기 전 Unified Diff를 보여주고 확답을 받는다.
- **파괴적 작업 금지**: `rm -rf`, `sudo`, 외부 네트워크를 통한 임의 스크립트 실행(`curl | sh`)은 절대 금지한다.
- **Git 컨벤션**: 커밋 메시지는 `[Type] Description` 형식을 권장한다.
  - 예: `[Feat] 사용자 로그인 로직 개선`, `[Fix] 게시판 페이징 오류 수정`
- **빌드 및 배포**: 
  - Backend: `./gradlew clean build`
  - Frontend: `pnpm build` (현재 `npm` 또는 `yarn` 사용 여부 확인 필요)
- **Ralph Loop**: 작업 진행 현황을 `task.md` 또는 전용 태스크 파일에 기록하고 주기적으로 업데이트한다.

---

## 6. 상세 구현 가이드

### 6.1 패키지 네이밍
- Backend: `com.company.project.{module}.{layer}` (예: `com.company.project.service.code`)
- Frontend: `@/components/{feature}`, `@/services/{module}`, `@/hooks` 구조

### 6.2 JPA 성능 최적화
- N+1 문제 방지를 위해 `Fetch Join` 또는 `@EntityGraph`를 적극 활용한다.
- 대량 데이터 조회 시 `Stream` 처리나 `QueryDSL`을 고려한다.

### 6.3 Frontend Form 패턴
- **Form 컴포넌트**: `react-hook-form` + `zodResolver`로 스키마 검증.
- **Dialog 래핑**: CUD 작업은 `Dialog` 컴포넌트로 래핑하여 모달 UX 제공.
- **예시**: `CommonCodeForm.tsx`, `MenuForm.tsx`, `ProgramForm.tsx` 참조.

---

## 7. 모듈별 특이사항
- **api-server**: 진입점 컨트롤러 통합(BBS, Common Code) 및 JSP/API 조화.
- **common-service/domain**: 비즈니스 로직 및 엔티티 집중화.
- **common-security**: 인증/인가 로직 중앙 관리.
- **common-core**: 전사 공통 유틸리티(Crypto, Exception 등).
- **frontend**: Next.js 기반 관리자 SPA. `/admin/*` 경로로 접근.

---

## 8. 현재 진행 상황 및 우선순위

### 완료된 작업 (1단계: Core Foundation)
- [x] 시스템 관리 (`sym`) - Backend API, Frontend CUD 완료
- [x] 보안 관리 (`sec`) - 권한/롤/그룹
- [x] 사용자 관리 (`uss`) - 통합 사용자

### 진행 중인 작업 (2단계: Collaboration & Content)
- [/] 게시판 (`cop.bbs`) - BoardService, FileAdapter 구현, 테스트 진행 중
- [/] 커뮤니티 (`cop.cmy`) - 기본 기능 이관 완료
- [/] 프론트엔드 리팩토링 - React 베스트 프랙티스 적용 및 아키텍처 개선 중

### 예정된 작업 (3~4단계)
- [ ] 일정 관리 (`cop.smt.sdm`)
- [ ] 약관 관리 (`uss.umt`)
- [ ] 온라인 도움말/설문 (`uss.olh`, `uss.olp`)
- [ ] 통계/시스템 연계 (`sts`, `ssi`)

---

*이 규칙은 사용자 요청에 따라 언제든 업데이트될 수 있으며, 업데이트 시 에이전트는 즉시 새로운 규칙을 적용한다.*
*최종 수정일: 2026-02-26*
