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
6. **프레임워크 재사용성 불변식(도메인 삭제가능성)**: `business-core`(재사용 admin 코어)는 신규 SI/재개발에서도 삭제되지 않는 **필수 커널**만을 담고, `business-app`의 개별 업무 도메인은 파생 프로젝트에 따라 **통째로 삭제·교체 가능**해야 한다(도메인 삭제가능성). 이를 물리적으로 보장하기 위해 ⓐ `business-app` 내 형제(sibling) 업무 도메인 간의 직접 상호참조와 ⓑ 재사용 코어 서비스의 샘플 도메인 의존을 금지한다. 이 불변식은 두 아키텍처 게이트로 기계 강제된다 — `DomainIsolationTest`(`business-app`: `nuri.business.domain` 형제 슬라이스 상호의존 금지, 코어·게시판 클러스터만 동결 예외)와 `ServiceLayerIsolationTest`(`business-core`: 재사용 코어 서비스의 샘플-in-core 의존 금지). 필수↔샘플 오케스트레이션은 `DashboardItemProvider`·`UserDeletionEvent` 등 `foundation` 포트(DIP)로 역전한다.

### 제2조 (의존성 방향의 원칙)
1. 의존성은 반드시 **하향식(`api-server` -> `business-app` -> `business-core` -> `foundation`)**으로만 흐르도록 설계한다. (`migration-tool`은 이 계층에 속하지 않는 독립 실행형 도구이다.)
2. 하위 모듈이 상위 모듈을 참조하는 역방향 의존성이나, 모듈 간 순환 참조(Circular Dependency)는 엄격히 금지한다.

---

## 제2장 도메인 무결성 (Domain Integrity)

### 제3조 (엔티티 노출 금지)
1. JPA Entity 클래스는 절대 `api-server` 레이어의 외부로 노출되지 않음을 원칙으로 한다. 본 원칙은 `ArchitectureTest.controller_should_not_depend_on_entity`(api-server ArchUnit 게이트)로 기계 강제된다 — `nuri.api..` 패키지가 `@Entity` 애노테이션 클래스에 의존하면 빌드를 실패시키며, 해당 규칙의 `because` 절이 본 조항(제3조 1항)을 명시적으로 인용하여 조문↔게이트를 쌍방으로 결속한다.
2. 외부와의 데이터 교환은 반드시 전용 DTO(`Request`, `Response`)를 통해서만 수행한다.

### 제4조 (변환 책임의 소재 및 Facade 격리)
1. 비즈니스 레이어(`business-core`/`business-app`)의 비대화(God Class) 안티패턴을 방지하기 위해, 프레젠테이션 맞춤형 최종 API 응답(Response DTO) 조립 책임은 진입점인 `api-server` 모듈 내의 **Facade 클래스 또는 Controller-Level Mapper**로 전면 이관한다.
2. `business-core`/`business-app`의 핵심 서비스 레이어는 프론트엔드 UI 스펙에 종속되지 않은 순수 도메인 처리 결과(내부 전송용 Base DTO)만 반환하여 비즈니스 응집도를 극대화한다.
3. 데이터의 변경이 없는 단순 복합 조회성 화면의 경우, 비즈니스 서비스나 Entity 맵핑을 거치지 않고 QueryDSL 등을 통해 데이터베이스에서 프레젠테이션 DTO로 직행하는 **조회 전용 프로젝션(CQRS 지향)** 방식을 명시적으로 허용하여 레이어 간 병목을 우회한다.

### 제5조 (도메인 캡슐화)
1. 비즈니스 규칙과 상태 전이 로직은 가급적 엔티티(Entity) 내부에 캡슐화하여 도메인 모델의 자율성을 보장한다.
2. 서비스 레이어는 트랜잭션 경계 관리와 계층 간 흐름 제어에 집중한다.
3. **엔티티 빌더·생성자 규범 (Phase 5.2 빌더 규범)**: 영속 엔티티(`@Entity`)는 Lombok `@SuperBuilder` 상속 필드 섀도잉(빌드는 성공하나 런타임에 값이 유실되는 결함)을 원천 차단하기 위해 다음을 준수한다. — **(a)** 클래스 레벨 `@SuperBuilder`/`@Builder`/`@AllArgsConstructor` 선언을 금지하고, 빌더는 정적 팩토리(`create(...)`)에 `@Builder` 를 배치한다. **(b)** 수동 빌더 클래스 내부에 인스턴스 필드를 선언하지 않고 Lombok 이 생성한 빌더 메서드로 위임 체이닝한다(`this.field(value)` 형태 — 로컬 필드 대입 금지). **(c)** 엔티티 기본 생성자는 non-public(`@NoArgsConstructor(access = PROTECTED)`)으로 선언하여 JPA 프록시 보장 및 무분별한 외부 인스턴스화를 방지한다. **집행**: 규칙(c)는 `EntityConventionArchTest`(business-core·business-app, ArchUnit)가 회귀 차단하며, 규칙(a)·(b)는 Lombok 애노테이션이 `RetentionPolicy.SOURCE` 라 바이트코드에 흔적이 남지 않아 ArchUnit 으로 탐지 불가하므로 코드리뷰·Checkstyle 로 보완한다. (상세 메커니즘·골든 패턴: `.agent/knowledge/lombok-superbuilder-shadowing`)

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
1. 컨트롤러의 권한 체크(`@PreAuthorize`)와 별개로, 중요한 비즈니스 로직이 포함된 서비스 레이어에서는 리소스 소유권 및 관리 권한을 명시적으로 재검증해야 한다. 서비스 레이어 재검증의 표준 수단은 `SecurityUtil.assertOwnerOrAdmin(ownerLoginId)`(loginId 축 소유권/IDOR 방어 가드, 관리자(ADMIN/SYSTEM)는 우회)와 `SecurityUtil.assertAdmin()`(소유 모델이 없는 공유 관리 자원의 쓰기 경로 2차 인가)이다. 이와 짝을 이루는 컨트롤러 1차 인가의 누락은 `SecurityAuthAnnotationLinterTest`(api-server 하네스)로 기계 강제된다 — 비-admin 경로의 쓰기(POST/PUT/DELETE/PATCH) 엔드포인트에 `@PreAuthorize`/`@Secured` 가 없으면 빌드를 실패시키되, 인가를 서비스 계층 소유권 가드에 위임하는 컨트롤러는 `WRITE_AUTHZ_GUARDED_ELSEWHERE` allow-list 로 근거와 함께 예외 관리한다.
2. **인증 주체의 정체성 축 구분**: 인증 주체의 식별자는 두 축으로 구분한다 — `esntlId`(User 엔티티 PK, 시스템 내부 식별자)와 `loginId`(감사 컬럼 `frst_rgtr_id`/`last_mdfr_id` 및 소유권 비교의 표준 축). 소유권 비교 시에는 반드시 대상 도메인의 감사/소유 컬럼이 **실제로 저장하는 축**과 일치시킨다. 대부분의 도메인은 감사 컬럼(loginId)을 소유자 축으로 쓰므로 `SecurityUtil.getCurrentLoginId()`/`assertOwnerOrAdmin()` 을 사용하고, 소유자를 `esntlId` 로 저장하는 도메인(예: `InformalSanction.aplcntId`, `Board.userId`)은 `SecurityUtil.getCurrentEsntlId()` 로 비교하여 축을 일치시킨다. 이름과 달리 `esntlId` 를 반환하여 축을 뒤섞던 `getCurrentUserId()` 는 `@Deprecated` 처리되었으며, 이 회귀(프로덕션 `getCurrentUserId()` 호출 및 도메인 코드의 `SecurityContextHolder` 직접 접근)는 `IdentityAxisLinterTest`(api-server 하네스, 프로덕션 호출 0 + 직접접근 allow-list 동결)로 기계 차단된다. 상세 규약은 `docs/03-guides/identity-model-guide.md` 를 따른다.

### 제9조 (안전한 트랜잭션 관리)
1. 읽기 전용 작업에는 반드시 `@Transactional(readOnly = true)`를 명시하여 성능을 최적화하고 의도치 않은 데이터 변경을 차단한다. 이 원칙은 `ServiceReadOnlyTransactionalLinterTest`(api-server 하네스)로 기계 강제된다 — `@Service` 클래스는 클래스레벨 `@Transactional(readOnly = true)` 를 기본으로 선언하고 쓰기(변경) 메서드만 메서드레벨 `@Transactional` 로 오버라이드하며, 파일 IO·쓰기 전용 등 정당한 예외는 동결(GRANDFATHERED) 베이스라인으로 관리하여 신규 `@Service` 의 누락만 빌드를 실패시킨다.
2. 트랜잭션의 범위는 최소한으로 유지하여 DB 커넥션 점유 시간을 단축한다.

### 제10조 (외부 연동 및 비동기 작업의 안전성)
1. 외부 연동 등 비동기 작업 시 재시도(`@Retryable`, Spring Retry)를 적용하여 일시적 장애에 대한 회복탄력성을 확보한다. (현행: `MailAsyncProcessor` 가 `@Retryable`(maxAttempts=3)+`@Recover` 로 SMTP 외부 IO 실패를 재시도한다.) 서킷 브레이커 패턴은 전용 라이브러리(예: Resilience4j) 미도입 상태로, 현 시점에서는 의무가 아니라 **향후 도입 대상(권고)** 이다.
2. 외부 서버 API나 타 기관 연동 구간은 한쪽의 병목이 전체 스레드 고갈로 전파되지 않도록 작업 공간을 격리한다. 현행 격리 수단은 `AsyncConfig` 의 `SimpleAsyncTaskExecutor` 동시성 상한(`setConcurrencyLimit`)으로, 무제한 스레드 생성을 차단하는 **벌크헤드 근사**를 제공한다. 아래의 호출 유형별 **차등 타임아웃**과 정식 **서킷 브레이커·벌크헤드**(예: Resilience4j)는 현재 미도입으로, 의무가 아니라 도입 시 준수를 지향하는 **권고 기준**이다.
   - **실시간 OLTP 동기 연동**: 최대 3초 이내 타임아웃 및 빠른 실패(Fail-Fast) 지향.
   - **외부 결제/인증 트랜잭션 (PG 등)**: 최대 10초 이내 타임아웃 적용.
   - **비동기/배치/대용량 파일 연동**: 전용 스레드 풀 및 MQ 등으로 작업 공간을 격리하고, 비즈니스 요건에 맞춰 타임아웃 상향 조정.
3. **커밋-후 부수효과의 안전성**: 외부 발송·별도 트랜잭션(REQUIRES_NEW) 등 부수효과는 반드시 발행 트랜잭션의 **커밋 이후**에만 기동한다. 부모 커밋 전에 별도 스레드/트랜잭션으로 후속 작업을 기동하면 그 작업이 부모의 미커밋 행을 `READ_COMMITTED` 로 보지 못해 유실·no-op 되는 결함(SMS 미발송, 메일 상태 고착 등)이 발생하므로, 커밋-후 부수효과는 `TransactionUtils.runAfterCommit(...)`(`foundation`)을 표준 수단으로 감싼다. 특히 커밋-전-async 파손을 유발하는 `@Async` + `@TransactionalEventListener` 동시 선언은 `AsyncTransactionalListenerArchTest`(api-server 하네스)로 기계 차단된다.


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
3. 본 조의 배치-페치/N+1 방어 전략은 `QueryCountGuardrailIntegrationTest`(`@QueryCountGuard(max = N)`)로 회귀 검증한다 — 대표 조회 경로의 실제 쿼리 실행 횟수를 상한으로 못박아 N+1 재발을 탐지하는 **표적 통합 가드레일**(전 엔티티를 훑는 보편 ArchUnit 린터가 아니라 `AddressBookService` 등 대표 경로 스팟체크)이다. 신규 컬렉션 조회 경로 추가 시 해당 가드레일 커버리지 확장을 함께 검토한다.

---

## 제7장 데이터 정합성 및 메타 검증 (Integrity & Meta Validation)

### 제15조 (동시성 제어 및 데이터 정합성 방어)
1. 다중 사용자의 동시 접근(수정/삭제)이 예상되는 중요 엔티티(예: 재고, 결재 등)는 JPA `@Version`을 통한 **낙관적 락(Optimistic Lock)** 적용을 기본으로 하여 정합성을 보호한다. 단, 대량 배치 업데이트(Bulk Update) 시에는 JPA 영속성 컨텍스트를 거치지 않고 JPQL/QueryDSL의 벌크 연산(`executeUpdate`)을 사용할 수 있으며, 이 경우 버전 충돌 검증은 애플리케이션 레벨에서 사전/사후 카운트 비교 등 명시적인 대안 정합성 검증 로직으로 대체한다.
2. 트랜잭션 충돌 비용이 극도로 높은 크리티컬 섹션 로직에 대해서는 **비관적 락(Pessimistic Lock)** 또는 Redis 기반 분산 락 정책을 명시적으로 설계하여 반영해야 한다.

### 제16조 (Data Validation 연쇄 동기화 및 돌연변이 테스트 증명)
1. 백엔드 DTO 및 프론트엔드 Zod 유효성 검증의 최대 길이(max) 및 필수 여부(NotNull)는 DB 물리 스키마(meta_standard_domains)의 상한 제약조건을 초과할 수 없다. DB→DTO→Zod 로 이어지는 **계약의 동기화**(스펙 신선도 및 산출물 재생성 일치)는 빌드 단계에서 기계 강제된다 — CI(`.github/workflows/ci.yml`)가 커밋된 `api-docs.json` 의 신선도를 `git diff --exit-code api-docs.json` 으로 검증하고, 프론트엔드 `codegen:verify`(`generated-api.d.ts` 재생성 diff)·`codegen:verify:zod`(`generated-zod.ts` 재생성 diff)로 스펙↔산출물의 일치를 확인한다. 나아가 계약체인 **최상류**(백엔드 Controller `@*Mapping` ↔ `api-docs.json` 경로 커버리지)는 `ApiDocsPathCoverageLinterTest` 가 **오프라인(순수 정적, live 서버 불요)** 으로 보호하여, 컨트롤러는 존재하나 스펙에 누락된(또는 그 역의) 경로 드리프트를 차단한다. 다만 **물리 상한(max/NotNull) 초과 여부를 `meta_standard_domains` 와 직접 대조하는 전용 하네스는 현재 존재하지 않으므로**(인접 하네스 `UniqueConstraintMirrorLinterTest` 는 UNIQUE 제약 미러링만, `SchemaNamingLinterTest` 는 명명 규칙만 검증한다), 상한선 초과 방지는 설계·리뷰 단계의 규범 준수로 보증하며 이의 하네스화는 향후 과제로 둔다. 단, 비즈니스 사양에 의해 DB 한계보다 더 좁은 길이로 제한하거나 정규식 등의 논리 검증이 필요할 경우 각 레이어에서 독립적으로 선언하여 도메인 간의 결합도를 완화한다.
2. 테스트 코드 무결성을 검증하기 위한 돌연변이 테스트(Mutation Testing)는 전체 모듈이 아닌 핵심 크리티컬 비즈니스 서비스(결제, 보안, 데이터 정합성 등) 및 Git Diff로 탐지된 변경분(Delta)에 한하여 증분식 검증(Incremental Mutation Strategy)을 수행하며, 핵심 서비스 기준 **Mutation Score 75% 이상**을 품질 기준으로 삼는다. 이 기준은 `build.gradle` 의 `mutationThreshold=75`(환경변수 `STRICT_MUTATION=true` 시)로 기계 강제할 수 있으나, **현행 CI 는 리포트 전용(`STRICT_MUTATION=false` → `mutationThreshold=0`)으로 운영되어 스코어 미달이 빌드를 파손하지 않는다.** 각 대상 클래스의 실측 스코어가 75%를 상회함을 확인한 뒤 `STRICT_MUTATION=true` 로 전환하여 하드 게이트화하며, 미달 상태에서의 전환은 빌드 파손을 유발하므로 금지한다. 일반 보조 비즈니스 서비스 및 단순 CRUD 로직은 돌연변이 테스트 강제 의무에서 영구히 면제한다.


---

## 제8장 부칙 (Supplementary Provisions)

### 제17조 (명명 규칙과의 동기화)
1. 백엔드 변수 및 필드 명칭은 **DB 표준화 헌법**에 정의된 용어 사전과 100% 일치해야 한다. (예: DB `reg_dt` -> Java `regDt`)

### 제18조 (시행일)
본 헌법은 공포된 즉시 효력을 발생하며, 신규 기능 개발 및 기존 코드 리팩토링 시 최우선 지침으로 적용된다.
