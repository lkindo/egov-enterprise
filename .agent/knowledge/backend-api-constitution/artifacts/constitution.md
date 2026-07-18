# ⚖️ API 및 백엔드 아키텍처 헌법 (API & Backend Constitution)

## 전문 (Preamble)
본 헌법은 `egov-enterprise` 프로젝트의 백엔드 서비스 안정성을 확보하고, 비즈니스 로직의 투명한 흐름을 보장하기 위해 제정되었다. 모든 서버 측 코드는 본 헌법이 정한 계층 분리 및 도메인 무결성 원칙을 준수해야 하며, 본 헌법은 DB 표준화 헌법과 상호 보완하여 시스템 전체의 기술적 기강을 확립한다.

---

## 제1장 아키텍처 구조 및 의존성 (Architecture & Dependency)

### 제1조 (모듈별 책임 분립)
본 프로젝트는 멀티 모듈 구조를 가지며, 각 모듈은 다음의 책임을 엄격히 준수한다.
1. **`foundation`**: 프로젝트 전반에 사용되는 공통 유틸리티, 예외 클래스, 상수와 함께 공통 응답 래퍼(`ApiResponse`·`PageResponse`)·에러 코드 체계(`ErrorCode`)·보안 백본(JWT/IAM/filter)·공통 엔티티(`BaseEntity`/`BaseTimeEntity`) 등 프레임워크 백본을 포함하며, 다른 어떤 모듈에도 의존하지 않는 최하위 모듈이다.
2. **`business-core`**: 재사용 가능한 admin 코어 도메인(user·auth·menu·code·organization·system·survey 등)의 비즈니스 로직, 엔티티(Entity), 리포지토리(Repository) 및 공용 테스트 하네스를 포함하는 프레임워크의 심장부이다. 외부 통신(API)이나 UI 로직으로부터 완전히 격리되어야 한다.
3. **`business-app`**: 개별 프로젝트 고유 도메인(board·informalsanction·schedule·notification·memoreport·operation 등)의 비즈니스 로직·엔티티·리포지토리를 포함하며, `business-core`를 기반으로 확장한다. 외부 통신(API)이나 UI 로직으로부터 완전히 격리되어야 한다.
4. **`api-server`**: 외부 요청의 진입점으로서 컨트롤러(Controller)와 API 관련 DTO를 관리한다. 비즈니스 로직을 직접 구현하지 않고 `business-core`/`business-app`의 서비스를 호출하는 역할에 집중한다.
5. **`migration-tool`**: 레거시 시스템을 표준 스키마로 이관하는 독립 실행형 ETL CLI 도구이다. 파생 프로젝트의 데이터 이관 시에만 선택적으로 포함하며, `foundation`에 의존하지 않는다.

### 제2조 (의존성 방향의 원칙)
1. 의존성은 반드시 **하향식(`api-server` -> `business-app` -> `business-core` -> `foundation`)**으로만 흐르도록 설계한다. (`migration-tool`은 이 계층에 속하지 않는 독립 실행형 도구이다.)
2. 하위 모듈이 상위 모듈을 참조하는 역방향 의존성이나, 모듈 간 순환 참조(Circular Dependency)는 엄격히 금지한다.

---

## 제2장 도메인 무결성 (Domain Integrity)

### 제3조 (엔티티 노출 금지)
1. JPA Entity 클래스는 절대 `api-server` 레이어의 외부로 노출되지 않음을 원칙으로 한다.
2. 외부와의 데이터 교환은 반드시 전용 DTO(`Request`, `Response`)를 통해서만 수행한다.

### 제4조 (변환 책임의 소재 및 Facade 격리)
1. 비즈니스 레이어(`business-core`/`business-app`)의 비대화(God Class) 안티패턴을 방지하기 위해, 프레젠테이션 맞춤형 최종 API 응답(Response DTO) 조립 책임은 진입점인 `api-server` 모듈 내의 **Facade 클래스 또는 Controller-Level Mapper**로 전면 이관한다.
2. `business-core`/`business-app`의 핵심 서비스 레이어는 프론트엔드 UI 스펙에 종속되지 않은 순수 도메인 처리 결과(내부 전송용 Base DTO)만 반환하여 비즈니스 응집도를 극대화한다.
3. 데이터의 변경이 없는 단순 복합 조회성 화면의 경우, 비즈니스 서비스나 Entity 맵핑을 거치지 않고 QueryDSL 등을 통해 데이터베이스에서 프레젠테이션 DTO로 직행하는 **조회 전용 프로젝션(CQRS 지향)** 방식을 명시적으로 허용하여 레이어 간 병목을 우회한다.

### 제5조 (도메인 캡슐화)
1. 비즈니스 규칙과 상태 전이 로직은 가급적 엔티티(Entity) 내부에 캡슐화하여 도메인 모델의 자율성을 보장한다.
2. 서비스 레이어는 트랜잭션 경계 관리와 계층 간 흐름 제어에 집중한다.

---

## 제3장 API 통신 표준 (API Standards)

### 제6조 (응답 포맷의 통일)
1. 모든 API 응답은 전사 공통 래퍼(Wrapper) 클래스인 `ApiResponse`를 사용해야 한다.
2. 응답 데이터는 `data` 필드에 담으며, 메시지와 상태 코드를 포함하여 프론트엔드와의 통신 규격을 일원화한다.

### 제7조 (에러 핸들링 및 예외 처리)
1. 모든 예외는 `GlobalExceptionHandler`에서 중앙 집중식으로 처리한다.
2. 에러 응답 시 내부 기술 스택(Stack Trace 등)이 노출되지 않도록 하며, 사전에 정의된 에러 코드와 메시지만을 반환한다.

---

## 제4장 보안 및 회복탄력성 (Security & Resilience)

### 제8조 (권한의 이중 검증)
1. 컨트롤러의 권한 체크(`@PreAuthorize`)와 별개로, 중요한 비즈니스 로직이 포함된 서비스 레이어에서는 리소스 소유권 및 관리 권한을 명시적으로 재검증해야 한다.

### 제9조 (안전한 트랜잭션 관리)
1. 읽기 전용 작업에는 반드시 `@Transactional(readOnly = true)`를 명시하여 성능을 최적화하고 의도치 않은 데이터 변경을 차단한다.
2. 트랜잭션의 범위는 최소한으로 유지하여 DB 커넥션 점유 시간을 단축한다.

### 제10조 (외부 연동 및 비동기 작업의 안전성)
1. 외부 연동 등 비동기 작업 시 반드시 재시도(`@Retryable`) 및 서킷 브레이커 패턴을 적용하여 시스템의 회복탄력성을 확보한다.
2. 외부 서버 API나 타 기관 연동 구간은 호출 유형에 따라 타임아웃을 차등 적용하되, 한쪽의 병목이 전체 스레드 고갈로 전파되지 않도록 벌크헤드(Bulkhead) 및 서킷 브레이커 패턴을 의무 적용한다.
   - **실시간 OLTP 동기 연동**: 최대 3초 이내 타임아웃 및 빠른 실패(Fail-Fast) 지향.
   - **외부 결제/인증 트랜잭션 (PG 등)**: 최대 10초 이내 타임아웃 적용.
   - **비동기/배치/대용량 파일 연동**: 전용 스레드 풀 및 MQ 등으로 작업 공간을 격리하고, 비즈니스 요건에 맞춰 타임아웃 상향 조정.


### 제11조 (인증 정보 보호 및 OWASP 준수)
1. `.env` 파일과 설정 파일에 비밀번호, API Key 등 민감 정보를 하드코딩하지 않는다. 반드시 환경변수를 사용한다.
2. 백엔드 빌드 시 `failBuildOnCVSS=7` 설정에 따라 보안 취약점이 발견되면 수정을 우선한다.

---

## 제5장 개발 및 운영 표준 (Development & Operation)

### 제12조 (Java 21 최신 기능의 활용)
1. 데이터 전달 객체(DTO)는 불변성(Immutability)과 가독성을 위해 Java **Record** 클래스 사용을 권장한다.
2. 고부하 I/O 작업 시 Java 21의 **Virtual Threads** 활용을 적극 검토하되, 다음의 호환성 위험을 사전에 반드시 검증해야 한다.
   - ThreadLocal 의존 코드(MDC, SecurityContext 등)와의 전파 호환성.
   - **[Pinning 경고]** `synchronized` 블록 내에서의 Carrier Thread Pinning 현상. 특히 HikariCP 등 JDBC 커넥션 풀과 결합 시 Pin된 Virtual Thread가 커넥션을 점유한 채 양보하지 못하면 커넥션 고갈(Pool Exhaustion)을 유발하므로, 크리티컬 I/O 구간은 `ReentrantLock`으로의 전환을 필수 검토한다.

### 제13조 (표준 로깅 및 보안)
1. 모든 로깅은 SLF4J 인터페이스를 통해 수행하며, 로그 레벨(ERROR, WARN, INFO, DEBUG)을 용도에 맞게 엄격히 구분한다.
2. 로그에 비밀번호, 주민등록번호, 계좌번호 등 **민감한 개인정보가 평문으로 기록되지 않도록** 반드시 마스킹 처리하거나 기록을 금지한다.
3. 장애 추적을 위해 모든 로그에는 `MDC(Mapped Diagnostic Context)`를 활용하여 요청 ID(Trace ID)를 포함한다.

---

## 제6장 영속성 무결성 (Persistence Integrity)

### 제14조 (N+1 방어 전략의 하이브리드화 및 OOM 방어)
1. JPA Entity 연관 관계 로딩 시 무작정 `Fetch Join`만을 강제할 경우 발생하는 OOM(Out of Memory) 및 다중 컬렉션의 카테시안 곱 에러를 방어하기 위해 다음과 같은 **투트랙 하이브리드 조회 전략**을 엄격히 준수한다.
   - **XToOne(1:1, N:1) 관계**: 기존과 동일하게 **Fetch Join**을 필수 적용하여 쿼리 폭증(N+1 문제)을 단일 쿼리로 최우선 차단한다.
   - **XToMany(1:N) 관계 및 페이징 동반 쿼리**: 컬렉션 조회 및 `Pageable` 페이징이 동반된 조회 쿼리에서는 `Fetch Join` 사용을 **절대 금지**하여 메모리 페이징 참사를 막는다. 대신 `application.yml`의 `default_batch_fetch_size` 혹은 엔티티의 `@BatchSize`를 적용한 **In-clause 병합 지연 로딩(Lazy + Batch)** 방식을 표준 방어 기제로 채택한다.
2. JPA 엔티티에는 `del_yn` 또는 `use_yn` 등 논리 삭제 여부가 명시적으로 설계된 도메인 엔티티에 한하여 `@Where(clause = "use_yn = 'Y'")` 또는 글로벌 필터를 선택 적용하며, 물리 삭제(Hard Delete)를 기본으로 설계된 도메인 테이블의 경우 해당 필터 적용 대상에서 철저히 제외하여 아키텍처 크래시를 원천 방어한다.

---

## 제7장 데이터 정합성 및 메타 검증 (Integrity & Meta Validation)

### 제15조 (동시성 제어 및 데이터 정합성 방어)
1. 다중 사용자의 동시 접근(수정/삭제)이 예상되는 중요 엔티티(예: 재고, 결재 등)는 JPA `@Version`을 통한 **낙관적 락(Optimistic Lock)** 적용을 기본으로 하여 정합성을 보호한다. 단, 대량 배치 업데이트(Bulk Update) 시에는 JPA 영속성 컨텍스트를 거치지 않고 JPQL/QueryDSL의 벌크 연산(`executeUpdate`)을 사용할 수 있으며, 이 경우 버전 충돌 검증은 애플리케이션 레벨에서 사전/사후 카운트 비교 등 명시적인 대안 정합성 검증 로직으로 대체한다.
2. 트랜잭션 충돌 비용이 극도로 높은 크리티컬 섹션 로직에 대해서는 **비관적 락(Pessimistic Lock)** 또는 Redis 기반 분산 락 정책을 명시적으로 설계하여 반영해야 한다.

### 제16조 (Data Validation 연쇄 동기화 및 돌연변이 테스트 증명)
1. 백엔드 DTO 및 프론트엔드 Zod 유효성 검증의 최대 길이(max) 및 필수 여부(NotNull)는 DB 물리 스키마(meta_standard_domains)의 상한 제약조건을 초과할 수 없으며, 상한선 초과 여부는 빌드 단계에서 하네스(API Contract Guardian)를 통해 자동 검증한다. 단, 비즈니스 사양에 의해 DB 한계보다 더 좁은 길이로 제한하거나 정규식 등의 논리 검증이 필요할 경우 각 레이어에서 독립적으로 선언하여 도메인 간의 결합도를 완화한다.
2. 테스트 코드 무결성을 검증하기 위한 돌연변이 테스트(Mutation Testing)는 전체 모듈이 아닌 핵심 크리티컬 비즈니스 서비스(결제, 보안, 데이터 정합성 등) 및 Git Diff로 탐지된 변경분(Delta)에 한하여 증분식 검증(Incremental Mutation Strategy)을 수행하며, 핵심 서비스 기준 **Mutation Score 75% 이상**을 품질 기준으로 삼는다. 이 기준은 `build.gradle` 의 `mutationThreshold=75`(환경변수 `STRICT_MUTATION=true` 시)로 기계 강제할 수 있으나, **현행 CI 는 리포트 전용(`STRICT_MUTATION=false` → `mutationThreshold=0`)으로 운영되어 스코어 미달이 빌드를 파손하지 않는다.** 각 대상 클래스의 실측 스코어가 75%를 상회함을 확인한 뒤 `STRICT_MUTATION=true` 로 전환하여 하드 게이트화하며, 미달 상태에서의 전환은 빌드 파손을 유발하므로 금지한다. 일반 보조 비즈니스 서비스 및 단순 CRUD 로직은 돌연변이 테스트 강제 의무에서 영구히 면제한다.


---

## 제8장 부칙 (Supplementary Provisions)

### 제17조 (명명 규칙과의 동기화)
1. 백엔드 변수 및 필드 명칭은 **DB 표준화 헌법**에 정의된 용어 사전과 100% 일치해야 한다. (예: DB `reg_dt` -> Java `regDt`)

### 제18조 (시행일)
본 헌법은 공포된 즉시 효력을 발생하며, 신규 기능 개발 및 기존 코드 리팩토링 시 최우선 지침으로 적용된다.
