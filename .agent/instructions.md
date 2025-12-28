# 프로젝트 지침 (egov-enterprise)

이 파일은 Antigravity 에이전트가 `egov-enterprise` 프로젝트를 수행할 때 항상 준수해야 할 핵심 규칙과 지침을 정의합니다. 에이전트는 모든 세션 시작 시 이 파일을 읽고 따라야 합니다.

## 1. 언어 및 소통 규칙
- **기본 언어**: 모든 대화, 소스 코드 주석(신규 작성 시), 문서화(Artifacts)는 **한국어**를 원칙으로 한다.
- **기술 용어**: 전문 기술 용어는 원문을 병기한다 (예: 영속성 계층(Persistence Layer)).
- **투명성**: 작업 시작 전 `implementation_plan.md`를 통해 계획을 공유하고, 완료 후 `walkthrough.md`로 결과를 보고한다.

## 2. 기술 스택 및 코딩 표준
- **Backend**: Java 21, Spring Boot 3.3.x, eGovFrame RTE 5.0.0.
- **호환성 인증 (중요)**: 모든 신규/마이그레이션 코드는 **전자정부프레임워크 5.0 호환성 인증 지침**을 준수한다.
  - 서비스 클래스는 `EgovAbstractServiceImpl`을 상속받아 구현한다.
  - 예외 처리는 `EgovBizException` 또는 프로젝트 공통 예외(`BusinessException`)를 적절히 활용한다.
  - 인터페이스와 구현체의 분리 규칙을 엄격히 따른다.
- **Frontend**: 
  - **레거시 유지**: 기존 화면 수정/기능 보강 시 JSP + JSTL 환경을 유지하여 일관성을 확보한다.
  - **신규 기능**: 가급적 REST API 테마로 개발하되, JSP UI가 필요한 경우 표준 디자인 가이드라인(`index.css`)을 따른다.
- **Persistence**: Spring Data JPA 중심 (신규 로직). 
  - **MyBatis 정리 기준**: 관련 기능을 JPA로 100% 이관하고, E2E 테스트(Playwright)를 통해 기능 검증이 완료된 시점에 MyBatis 관련 파일(`Mapper XML`, `DAO`, `VO`)을 삭제한다.
  - 삭제 전, 해당 매퍼를 참조하는 다른 모듈이 없는지 `grep` 검색 등으로 반드시 확인한다.
- **Security**: Spring Security 6.x 기반. 
  - `/api/v1/**` 경로는 JWT 기반 Stateless 인증을 적용한다.
  - `.do` 및 기타 레거시 경로는 Session 기반 Stateful 인증을 적용한다.
- **코드 품질**: 
  - Strict Typing 준수 (Java: Generics 활용, TypeScript: `any` 사용 금지).
  - 로깅 시 `log.info`, `log.error` 등을 사용하며, `System.out.println`은 절대 사용하지 않는다.
  - 에러 처리 시 예외를 절대 무시하지 않는다. Typed Result 패턴 또는 컨텍스트를 포함한 Throw 필수.
- **Testing**: 
  - E2E 테스트: Playwright를 사용하며, 주요 기능 변경 시 관련 테스트 실행/보강.
  - 단위 테스트: 핵심 비즈니스 로직에 대해 JUnit5/Mockito 기반 테스트 작성.
- **API 문서화**: REST API는 Swagger/OpenAPI 3.0 어노테이션(`@Operation`, `@Tag` 등)을 필수로 적용.
- **의존성 정책**: 새로운 라이브러리 추가 시 반드시 사용자와 장단점(용량, 보안 취약점, 라이선스)을 검토 후 결정.

## 3. 보안 및 데이터 관리
- **비밀번호**: 신규 비밀번호는 BCrypt 필수. 레거시 로그인은 `DelegatingPasswordEncoder`의 `{egov}` 접두어를 통해 지원.
- **민감 정보**: API Key, DB 패스워드 등은 절대 소스 코드에 하드코딩하거나 커밋하지 않는다 (`.env` 또는 환경 변수 활용).
- **데이터베이스**: PostgreSQL을 주력으로 사용하며, 스키마 변경 시 JPA 엔티티와 일치시킨다.

- **작업 프로세스**:
  - **PLANNING 모드**: 코드 수정 전 반드시 분석 결과를 공유하고 사용자의 승인을 받는다.
  - **EXECUTION 모드**: 코드를 수정하기 전 Unified Diff를 보여주고 확답을 받는다.
  - **파괴적 작업 금지**: `rm -rf`, `sudo`, 외부 네트워크를 통한 임의 스크립트 실행(`curl | sh`)은 절대 금지한다.
  - **Git 컨벤션**: 커밋 메시지는 `[Type] Description` 형식을 권장한다 (예: `[Feat] 사용자 로그인 로직 개선`, `[Fix] 게시판 페이징 오류 수정`).
  - **빌드 및 배포**: 로컬 빌드는 반드시 `./gradlew clean build`를 사용하여 일관성을 유지한다.

## 5. 상세 구현 가이드
- **패키지 네이밍**: `com.company.project.{module}.{layer}` 구조를 따른다. (예: `com.company.project.service.code`)
- **JPA 성능 최적화**: 
  - N+1 문제 방지를 위해 `Fetch Join` 또는 `@EntityGraph`를 적극 활용한다.
  - 대량 데이터 조회 시 `Stream` 처리나 `QueryDSL`을 고려한다.

## 5. 모듈별 특이사항
- **api-server**: 진입점 컨트롤러 통합(BBS, Common Code) 및 JSP/API 조화.
- **common-service/domain**: 비즈니스 로직 및 엔티티 집중화.
- **common-security**: 인증/인가 로직 중앙 관리.
- **common-core**: 전사 공통 유틸리티(Crypto, Exception 등).

---
*이 규칙은 사용자 요청에 따라 언제든 업데이트될 수 있으며, 업데이트 시 에이전트는 즉시 새로운 규칙을 적용한다.*
