# ⚖️ API 및 백엔드 아키텍처 헌법 (API & Backend Constitution)

## 전문 (Preamble)
본 헌법은 `egov-enterprise` 프로젝트의 백엔드 서비스 안정성을 확보하고, 비즈니스 로직의 투명한 흐름을 보장하기 위해 제정되었다. 모든 서버 측 코드는 본 헌법이 정한 계층 분리 및 도메인 무결성 원칙을 준수해야 하며, 본 헌법은 DB 표준화 헌법과 상호 보완하여 시스템 전체의 기술적 기강을 확립한다.

---

## 제1장 아키텍처 구조 및 의존성 (Architecture & Dependency)

### 제1조 (모듈별 책임 분립)
본 프로젝트는 멀티 모듈 구조를 가지며, 각 모듈은 다음의 책임을 엄격히 준수한다.
1. **`foundation`**: 프로젝트 전반에 사용되는 공통 유틸리티, 예외 클래스, 상수와 함께 공통 응답 래퍼(`ApiResponse`·`PageResponse`)·에러 코드 체계(`ErrorCode`)·보안 백본(JWT/IAM/filter)·공통 엔티티(`BaseEntity`/`BaseTimeEntity`) 등 프레임워크 백본을 포함하며, 다른 어떤 모듈에도 의존하지 않는 최하위 모듈이다.
2. **`business-core`**: 재사용 가능한 admin 코어 도메인(user·auth·menu·code·organization·system 등)의 비즈니스 로직, 엔티티(Entity), 리포지토리(Repository) 및 공용 테스트 하네스를 포함하는 프레임워크의 심장부이다. 외부 통신(API)이나 UI 로직으로부터 완전히 격리되어야 한다.
3. **`business-app`**: 개별 프로젝트 고유 도메인(board·informalsanction·schedule·notification·memoreport·event·reward·survey·promotion·community 등 — `nuri.business.service`·`nuri.business.domain` 아래 기능 패키지)의 비즈니스 로직·엔티티·리포지토리를 포함하며, `business-core`를 기반으로 확장한다. 외부 통신(API)이나 UI 로직으로부터 완전히 격리되어야 한다. survey·promotion(배너·팝업)·community의 모듈 경계는 [ADR-0001](../../../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md)과 `ServiceLayerIsolationTest`를 따른다.
4. **`api-server`**: 외부 요청의 진입점으로서 컨트롤러(Controller)와 API 관련 DTO를 관리한다. 비즈니스 로직을 직접 구현하지 않고 `business-core`/`business-app`의 서비스를 호출하는 역할에 집중한다.
5. **`migration-tool`**: 레거시 시스템을 표준 스키마로 이관하는 독립 실행형 ETL CLI 도구이다. 파생 프로젝트의 데이터 이관 시에만 선택적으로 포함하며, `foundation`에 의존하지 않는다.
6. **프레임워크 재사용성 불변식(도메인 삭제가능성)**: `business-core`(재사용 admin 코어)는 신규 SI/재개발에서도 삭제되지 않는 **필수 커널**만을 담고, `business-app`의 개별 업무 도메인은 파생 프로젝트에 따라 **통째로 삭제·교체 가능**해야 한다(도메인 삭제가능성). 이를 물리적으로 보장하기 위해 ⓐ `business-app` 내 형제(sibling) 업무 도메인 간의 직접 상호참조와 ⓑ 재사용 코어 서비스의 샘플 도메인 의존을 금지한다. 새 서비스 계층 app→app 결합은 결합 원장(`config/governance/cross-domain-coupling-census.json`) 등재와 사유가 있어야 하며, 엔티티 수준의 기존 결합(게시판·보상 승인 클러스터)은 해결된 것으로 간주하지 않는다. 필수↔샘플 오케스트레이션은 `DashboardItemProvider`·`CommunityBoardAccessPort`·`TemplateReferenceContributor` 등 `foundation` 포트(DIP)와 이벤트로 역전하며, 사용자 삭제는 `business-core`가 발행하는 `UserDeletionEvent`를 각 도메인이 구독한다. 집행(범위가 서로 다르다): `nuri.business.domain` 형제 슬라이스는 [DomainIsolationTest](../../../../business-app/src/test/java/nuri/business/DomainIsolationTest.java), 샘플 도메인의 `business-core` 재유입은 [ServiceLayerIsolationTest](../../../../business-core/src/test/java/nuri/business/ServiceLayerIsolationTest.java), 서비스 계층 결합은 [CrossDomainCouplingLinterTest](../../../../api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java).

### 제2조 (의존성 방향의 원칙)
1. 의존성은 반드시 **하향식(`api-server` -> `business-app` -> `business-core` -> `foundation`)**으로만 흐르도록 설계한다. (`migration-tool`은 이 계층에 속하지 않는 독립 실행형 도구이다.)
2. 하위 모듈이 상위 모듈을 참조하는 역방향 의존성이나, 모듈 간 순환 참조(Circular Dependency)는 엄격히 금지한다.

---

## 제2장 도메인 무결성 (Domain Integrity)

### 제3조 (엔티티 노출 금지)
1. JPA Entity 클래스는 절대 `api-server` 레이어의 외부로 노출되지 않음을 원칙으로 한다 — `nuri.api..` 패키지는 `@Entity` 애노테이션 클래스에 의존하지 않는다. 집행: `ArchitectureTest.controller_should_not_depend_on_entity`(api-server ArchUnit 게이트).
2. 외부와의 데이터 교환은 반드시 전용 DTO(`Request`, `Response`)를 통해서만 수행한다.

### 제4조 (변환 책임의 소재)
1. 최종 API 응답(Response DTO)은 그 기능을 소유한 비즈니스 레이어(`business-core`/`business-app`)의 서비스가 조립해 반환하는 것이 기본이고, `api-server` 의 컨트롤러는 그것을 공통 응답 래퍼(제6조)에 담아 내보낸다(래퍼의 예외는 제6조 3항). 엔드포인트의 응답 계약이 서비스 DTO 와 달라야 할 때 — 공개 응답에서 내부 식별자·감사 정보를 빼거나, 여러 결과를 한 응답으로 엮거나, 느슨한 내부 값의 타입·필수 여부를 고정할 때 — 에 한해 `api-server` 에 그 엔드포인트의 응답 DTO(또는 조립만 맡는 Facade)를 두고 서비스 DTO 에서 변환한다. 이 변환은 필드 선택·계약값 정규화·조립까지이며 업무 규칙과 트랜잭션 경계는 서비스에 남긴다. 컨트롤러와 그 응답 DTO 는 엔티티를 참조하지 않는다(제3조 1항). 이미 좁혀 둔 응답 계약은 변환 위치를 옮기더라도 넓히지 않는다. *(2026-11-22 사용자 결정으로 개정, DEC-OPS-424)*
2. 서비스가 반환하는 DTO 는 API 계약이며 특정 화면의 표시 방식에 종속되지 않는다 — 화면이 필요로 하는 서버 판정(예: 수정 가능 여부)과 사용자가 저장한 표시 설정(예: 팝업의 위치·크기)은 데이터로 싣되, 화면이 정할 안내 문구·색·배치를 서비스가 정해 싣지 않는다.
3. 데이터의 변경이 없는 단순 복합 조회성 화면의 경우, 비즈니스 서비스나 Entity 맵핑을 거치지 않고 QueryDSL 등을 통해 데이터베이스에서 프레젠테이션 DTO로 직행하는 **조회 전용 프로젝션(CQRS 지향)** 방식을 명시적으로 허용하여 레이어 간 병목을 우회한다.

### 제5조 (도메인 캡슐화)
1. 비즈니스 규칙과 상태 전이 로직은 가급적 엔티티(Entity) 내부에 캡슐화하여 도메인 모델의 자율성을 보장한다.
2. 서비스 레이어는 트랜잭션 경계 관리와 계층 간 흐름 제어에 집중한다.
3. **엔티티 빌더·생성자 규범 (Phase 5.2 빌더 규범)**: 영속 엔티티(`@Entity`)는 Lombok `@SuperBuilder` 상속 필드 섀도잉(빌드는 성공하나 런타임에 값이 유실되는 결함)을 원천 차단하기 위해 다음을 준수한다. — **(a)** 클래스 레벨 `@SuperBuilder`/`@Builder`/`@AllArgsConstructor` 선언을 금지하고, 빌더는 정적 팩토리(`create(...)`)에 `@Builder` 를 배치한다. **(b)** 수동 빌더 클래스 내부에 인스턴스 필드를 선언하지 않고 Lombok 이 생성한 빌더 메서드로 위임 체이닝한다(`this.field(value)` 형태 — 로컬 필드 대입 금지). **(c)** 엔티티 기본 생성자는 non-public(`@NoArgsConstructor(access = PROTECTED)`)으로 선언하여 JPA 프록시 보장 및 무분별한 외부 인스턴스화를 방지한다. **집행**: 규칙(a)는 [GH-ENTITY-LOMBOK-SOURCE](../../../../api-server/src/test/java/nuri/api/harness/EntityLombokSourceLinterTest.java)가 `business-core`·`business-app`의 `@Entity` 원문을 전수 검사하여 회귀 차단하고, 규칙(c)는 [ARCH-BUSINESS-CORE-ENTITY-CONVENTION](../../../../business-core/src/test/java/nuri/business/architecture/EntityConventionArchTest.java)과 [ARCH-BUSINESS-APP-ENTITY-CONVENTION](../../../../business-app/src/test/java/nuri/business/architecture/EntityConventionArchTest.java)이 차단한다. 규칙(b)의 Lombok 생성 빌더 내부 상태와 수동 편의 메서드 위임 의미는 현재 기계 게이트가 완전히 증명하지 못하므로 코드리뷰와 실제 `build()` 결과 단위 테스트로 보완한다. (상세 메커니즘·골든 패턴: `.agent/knowledge/lombok-superbuilder-shadowing`)

---

## 제3장 API 통신 표준 (API Standards)

### 제6조 (응답 포맷의 통일)
1. 모든 API 응답은 전사 공통 래퍼(Wrapper) 클래스인 `ApiResponse`를 사용해야 한다.
2. 응답 데이터는 `data` 필드에 담으며, 메시지와 상태 코드를 포함하여 프론트엔드와의 통신 규격을 일원화한다.
3. **binary/stream 예외** *(DEC-OPS-016)*: 파일 다운로드·전체 결과 export 등 JSON 으로 표현할 수 없는 binary/stream 응답에 한하여 `ResponseEntity<Resource>`(또는 스트리밍 등가물 `ResponseEntity<StreamingResponseBody>`)의 공통 래퍼 밖 반환을 제한적으로 허용한다. 허용 조건은 다음 3가지의 동시 충족이다 — ① `Content-Disposition: attachment` 헤더 명시, ② 명시적 `produces` 미디어 타입 선언(다운로드 대상 타입이 요청마다 동적인 경우 응답 시점의 명시적 `Content-Type` 지정으로 갈음), ③ `ResponseContractLinterTest` 의 binary 허용 census(양방향 exact) 등재. JSON 으로 표현 가능한 응답을 이 예외로 우회하는 것은 금지한다.
4. **페이징** *([ADR-0036](../../../../docs/02-architecture/decisions/ADR-0036-api-paging-and-created-status-conventions.md))*: 목록은 요청·응답·URL·화면 모두 1 기반이며 이름은 `page`(1 이상)·`size`(1~100) 하나다. 응답은 `PageResponse` 이고 `page` 는 요청과 같은 번호다 — Spring `Page` 원형을 내보내지 않는다. 컨트롤러는 목록을 `Pageable`(`spring.data.web.pageable.one-indexed-parameters=true`) 또는 `@Valid BaseSearchDto` 로만 받고 페이지 값을 `@RequestParam` 으로 직접 받지 않는다. 0 기반 변환은 리졸버와 `BaseSearchDto#toPageable` 에만 있다. 범위 밖 값과 서버가 읽지 않는 옛 이름은 `PaginationRequestFilter` 가 400 으로 거부하며, 옛 이름 `pageIndex`·`pageUnit` 은 ADR-0036 이 정한 한 릴리스 동안만 별칭으로 받는다. `PageableConstructionLinterTest` 가 바인딩·설정 일치·시험 리졸버·스펙을 검사한다.
5. **성공 상태 코드** *(ADR-0036)*: 자원을 만드는 POST 는 HTTP 201 과 `ApiResponse.created(새 식별자)`(식별자를 담은 DTO 포함)를 돌려주고, `@ResponseStatus(HttpStatus.CREATED)` 로 스펙에도 201 을 쓴다. 그 밖의 성공(조회·행위형 POST·갱신·삭제)은 200 이다. HTTP 상태와 본문 `status` 는 같다. 어느 POST 가 자원 생성인지는 이름이 아니라 새로 주소를 갖는 자원이 생기는지로 판정한다. 집행: `ResponseContractLinterTest` 의 생성 census.

### 제7조 (에러 핸들링 및 예외 처리)
1. 모든 예외는 `GlobalExceptionHandler`에서 중앙 집중식으로 처리한다.
2. 에러 응답 시 내부 기술 스택(Stack Trace 등)이 노출되지 않도록 하며, 사전에 정의된 에러 코드와 메시지만을 반환한다.

---

## 제4장 보안 및 회복탄력성 (Security & Resilience)

### 제8조 (권한의 이중 검증)
1. 컨트롤러의 권한 체크(`@PreAuthorize`)와 별개로 중요한 비즈니스 로직에서는 리소스 소유권과 해당 업무의 기능 권한을 재검증한다. 표준 수단은 `SecurityUtil.assertPermission(permissionCode)`, `assertOwnerOrPermission(ownerLoginId, permissionCode)`, `assertOwnerOrPermissionByEsntlId(ownerEsntlId, permissionCode)`다. 소유자 외 대행이 허용된 자원에만 해당 도메인의 명시 권한을 사용한다. 결재자·수신자·참여자 본인처럼 대행이 허용되지 않는 조건은 엄격한 소유권·관계 검사로 유지하며, helper 통일을 이유로 완화하지 않는다.
2. **명시적 기능 인가** *([ADR-0016](../../../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md))*: 보호 핸들러는 `@PreAuthorize("@permissionPolicy.allowed(authentication, '<컨트롤러 FQN>#<메서드>')")`로 정확한 handler 정책을 평가한다. HTTP 게이트와 메서드 게이트는 같은 `authorization-policies.json` 바인딩과 `permission-catalog.json`을 사용한다. 공개·인증 전용 핸들러도 같은 형태로 선언하고, 접근 분류(`PUBLIC`·`AUTHENTICATED`·`PERMISSION`·`DENY`)는 `authorization-policies.json`의 `operationBindings`에 둔다. 핸들러의 메서드 인가 식은 자기 바인딩을 가리키는 이 형태 하나이며, 인가 합성 애노테이션이나 다른 SpEL로 대신하지 않는다. 집행: `SecurityAuthAnnotationLinterTest`. 그룹 이름·단일 role·기존 역할 계층은 인가 근거가 아니며 복수 그룹의 명시 기능을 합산한다. 메뉴 표시 권한은 API 사용 권한을 부여하지 않는다. SYSTEM 소속의 개인정보 로그 제외는 기능 보유 여부 및 다른 그룹 배정과 관계없이 유지한다.
3. **인증 주체의 정체성 축 구분**: `esntlId`는 사용자 내부 PK, `loginId`는 감사 컬럼 `frst_rgtr_id`/`last_mdfr_id` 및 해당 도메인의 소유권 비교 축이다. 반드시 대상 도메인의 실제 저장 축과 일치시킨다. 감사 컬럼 소유권은 `getCurrentLoginId()`와 `assertOwnerOrPermission()`을 사용하고, `InformalSanction.aplcntId`·`Board.userId` 등 내부 PK 소유권은 `getCurrentEsntlId()` 및 그 축의 가드를 사용한다. `getCurrentUserId()`는 혼동을 피하기 위해 deprecated이며 새 사용을 금지한다. `IdentityAxisLinterTest`는 프로덕션의 옛 헬퍼 호출과 승인되지 않은 직접 SecurityContext 접근을 차단한다. 상세 규약은 [정체성 가이드](../../../../docs/03-guides/identity-model-guide.md)를 따른다.
4. 권한 배정이 없으면 빈 기능 집합으로 판정하며 암묵적인 USER·ADMIN 폴백을 두지 않는다. 인증과 장기 연결은 현재 계정·DB 권한을 재확인한다. 권한 관리 쓰기와 사용자 상태 변경은 직렬화 잠금 획득 뒤 현재 변경자의 활성 상태·필요 권한을 재검증하며, 마지막 활성 권한관리자를 제거하는 운영 변경을 거부한다. 로그인 실패에 따른 보안 잠금은 별도 방어로 유지한다.

### 제9조 (안전한 트랜잭션 관리)
1. 읽기 전용 작업에는 반드시 `@Transactional(readOnly = true)`를 명시하여 성능을 최적화하고 의도치 않은 데이터 변경을 차단한다. `@Service` 클래스는 클래스레벨 `@Transactional(readOnly = true)` 를 기본으로 선언하고 쓰기(변경) 메서드만 메서드레벨 `@Transactional` 로 오버라이드하며, 파일 IO·쓰기 전용 등 정당한 예외는 동결(GRANDFATHERED) 베이스라인으로 관리한다. 집행: `ServiceReadOnlyTransactionalLinterTest` — 신규 `@Service` 의 클래스레벨 선언 누락만 본다(쓰기 메서드의 오버라이드 누락은 보지 못한다).
2. 트랜잭션의 범위는 최소한으로 유지하여 DB 커넥션 점유 시간을 단축한다.

### 제10조 (외부 연동 및 비동기 작업의 안전성)
1. 외부 연동 등 비동기 작업 시 재시도(`@Retryable`, Spring Retry)를 적용하여 일시적 장애에 대한 회복탄력성을 확보한다. 단, 받는 쪽이 중복을 걸러 내지 못하는 외부 발송(메일·문자)은 보내지 않았음이 확실한 실패만 다시 보내고, 결과를 알 수 없는 실패는 중복 발송을 막기 위해 다시 보내지 않고 실패·미확인으로 기록한다. 발송의 재시도와 결과 기록(DB)의 재시도는 경계를 나눠, 결과 기록의 일시 실패는 발송을 되풀이하지 않고 기록만 재시도한다. 같은 식별자로 다시 전달되고 받는 쪽이 중복을 걸러 내는 전달(업무 알림의 재전달 등)은 이 제한의 대상이 아니다. Spring Framework 7 core retry 로의 전환은 [DEC-OPS-125](../../../../docs/archived/operational-decisions-history.md#dec-ops-125)에 따라 보류한다. 서킷 브레이커 패턴은 전용 라이브러리(예: Resilience4j) 미도입 상태로, 현 시점에서는 의무가 아니라 **향후 도입 대상(권고)** 이다.
2. 외부 서버 API나 타 기관 연동 구간은 한쪽의 병목이 전체 스레드 고갈로 전파되지 않도록 작업 공간을 격리한다. 현행 실행자는 용도별로 나뉘고 각각 상한(유계 풀·큐 또는 동시성 상한)을 둔다 — 설정: [foundation AsyncConfig](../../../../foundation/src/main/java/nuri/foundation/core/config/AsyncConfig.java)·[api-server AsyncConfig](../../../../api-server/src/main/java/nuri/config/AsyncConfig.java)·[영속 작업 실행자](../../../../business-core/src/main/java/nuri/business/service/system/job/DurableWorkSchedulingConfig.java). 감사·알림의 수락 거부는 계측하고, 외부 발송의 거부는 요청 스레드에서 실행하지 않고 예외와 실패 상태로 드러낸다. 이 격리를 정식 서킷 브레이커 도입 완료로 해석하지 않는다. 아래의 호출 유형별 **차등 타임아웃**과 정식 **서킷 브레이커·벌크헤드**(예: Resilience4j)는 현재 미도입으로, 의무가 아니라 도입 시 준수를 지향하는 **권고 기준**이다.
   - **실시간 OLTP 동기 연동**: 최대 3초 이내 타임아웃 및 빠른 실패(Fail-Fast) 지향.
   - **외부 결제/인증 트랜잭션 (PG 등)**: 최대 10초 이내 타임아웃 적용.
   - **비동기/배치/대용량 파일 연동**: 전용 스레드 풀 및 MQ 등으로 작업 공간을 격리하고, 비즈니스 요건에 맞춰 타임아웃 상향 조정.
3. **커밋-후 부수효과의 안전성**: 외부 발송·별도 트랜잭션(REQUIRES_NEW) 등 부수효과는 반드시 발행 트랜잭션의 **커밋 이후**에만 기동한다. 부모 커밋 전에 별도 스레드/트랜잭션으로 후속 작업을 기동하면 그 작업이 부모의 미커밋 행을 `READ_COMMITTED` 로 보지 못해 유실·no-op 되는 결함이 발생한다. 외부 발송(메일·문자)은 [ADR-0033](../../../../docs/02-architecture/decisions/ADR-0033-encrypted-mail-delivery-snapshot.md)·[DEC-OPS-341](../../../../docs/archived/operational-decisions-history.md#dec-ops-341)에 따라 발송 이력과 발송 의도를 업무 트랜잭션 안에서 영속 작업(`tb_sys_job`, `DurableWorkPort.enqueue`)으로 함께 저장하는 것이 표준이다. 실행기(`DurableWorkDispatcher`)는 커밋된 의도만 집어 유형별 처리기(`MailDeliveryWorkHandler`·`SmsDeliveryWorkHandler`)로 넘기므로, 롤백된 업무는 발송되지 않고 프로세스가 중단돼도 의도가 남는다([재처리 운영](../../../../docs/04-operations/durable-work-recovery.md)). 그 밖의 커밋-후 부수효과(업무 이벤트 발행 등)는 `TransactionUtils.runAfterCommit(...)`(`foundation`)으로 감싼다. 특히 커밋-전-async 파손을 유발하는 `@Async` + `@TransactionalEventListener` 동시 선언은 `AsyncTransactionalListenerArchTest`(api-server 하네스)로 기계 차단된다.


### 제11조 (인증 정보 보호 및 OWASP 준수)
1. `.env` 파일과 설정 파일에 비밀번호, API Key 등 민감 정보를 하드코딩하지 않는다. 반드시 환경변수를 사용한다.
2. 백엔드 의존성 취약점은 `dependencyCheckAnalyze`의 `failBuildOnCVSS=7` 기준으로 확인하고 발견 시 수정을 우선한다. [주간·수동 OWASP workflow](../../../../.github/workflows/dependency-check.yml)의 스캔은 advisory 이므로 그 green 을 취약점 부재나 병합 차단 증거로 표현하지 않으며, 전체 스캔의 운영 증거와 후속 처리 차이는 [GAP-DEP-001](../../../memory/known-gaps.md)에 남긴다. 실행 경로와 PR 의존성 차단의 정본은 [CI 가이드](../../../../docs/03-guides/cicd-pipeline.md#보안-스캔)다.
3. 비밀번호, 세션 비밀, 인증·복구 토큰, 일회용 코드와 소유 증명용 비밀은 HTTP path 또는 query parameter 등 URL request-target로 받거나 전달하지 않는다. 인증된 주체와 서버측 권한 검증으로 대체할 수 없는 별도 비밀 증명이 실제로 필요하면 독립적인 제품·위협 검토를 먼저 거쳐 보호된 request body의 전용 DTO로 설계한다. 백엔드 진입 경계는 금지된 credential-like query 이름을 발견하면 값을 읽거나 로그하지 않고 `400 Bad Request`로 거부하며, 정적 API 계약은 같은 계열의 path·query endpoint 선언을 차단한다. 이 방어는 애플리케이션 앞단의 proxy·WAF·container가 이미 받은 request-target의 로그 잔존 가능성을 제거하지 않으므로 배포 계층의 query redaction·보존·접근 통제를 별도로 적용한다. 일반 개인정보성 업무 검색어를 제한적으로 허용하는 ADR-0009를 이 예외의 근거로 사용할 수 없다. 첫 적용인 만족도는 ADR-0011에 따라 익명 비밀번호 증명을 퇴역하고 수정·삭제를 인증 owner-or-admin과 서비스 계층 재검증으로 제한한다.
4. 소스 시큐어코딩 점검은 승인된 [ADR-0015](../../../../docs/02-architecture/decisions/ADR-0015-secure-coding-ci.md)에 따라 required `secure-coding`이 수행하며, CodeQL 의 High/Critical(보안 점수 7.0 이상)은 기존·신규 여부와 관계없이 차단한다. 승인 오탐은 [개별 검토 목록](../../../../config/security/false-positive-review.json)에 결속된 범위로만 관리한다. 시크릿·의존성 검사와 SAST는 서로 다른 검사이며, 분석 대상·생략·오류 처리·예외 결속의 상세 계약은 ADR과 [CI 가이드](../../../../docs/03-guides/cicd-pipeline.md#시큐어코딩-정적-분석-sast)를 따른다.

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
3. 장애 추적을 위해 요청을 처리하는 동안의 로그에는 그 요청의 Trace ID 가 실리게 한다. `traceId` MDC 키는 Micrometer/OTel 브리지가 단독으로 쓰며 애플리케이션 코드는 그 키를 만들거나 덮어쓰지 않는다 — 응답 헤더의 추적 ID 와 로그의 값이 달라지지 않게 한다([MdcLoggingFilter](../../../../business-core/src/main/java/nuri/business/security/filter/MdcLoggingFilter.java)). 추적이 꺼져 있거나 활성 span 이 없어 값이 없을 때에도 임의의 ID 를 만들어 채우지 않는다(응답 헤더는 생략한다).
4. 민감한 개인정보의 조회·내려받기는 응답을 보내기 전에 접근 기록을 남긴다([ADR-0025](../../../../docs/02-architecture/decisions/ADR-0025-enterprise-completeness-and-durable-operations.md)). 대상 핸들러는 `@PrivacyAccess` 로 선언하고 값에는 항목 설명만 적으며(실제 개인정보 값은 적지 않는다), [PrivacyAccessCensusLinterTest](../../../../api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java)가 원장과 대조한다.

---

## 제6장 영속성 무결성 (Persistence Integrity)

### 제14조 (N+1 방어 전략의 하이브리드화 및 OOM 방어)
1. JPA Entity 연관 관계 로딩 시 무작정 `Fetch Join`만을 강제할 경우 발생하는 OOM(Out of Memory) 및 다중 컬렉션의 카테시안 곱 에러를 방어하기 위해 다음과 같은 **투트랙 하이브리드 조회 전략**을 엄격히 준수한다.
   - **XToOne(1:1, N:1) 관계**: 기존과 동일하게 **Fetch Join**을 필수 적용하여 쿼리 폭증(N+1 문제)을 단일 쿼리로 최우선 차단한다.
   - **XToMany(1:N) 관계 및 페이징 동반 쿼리**: 컬렉션 조회 및 `Pageable` 페이징이 동반된 조회 쿼리에서는 `Fetch Join` 사용을 **절대 금지**하여 메모리 페이징 참사를 막는다. 대신 `application.yml`의 `default_batch_fetch_size` 혹은 엔티티의 `@BatchSize`를 적용한 **In-clause 병합 지연 로딩(Lazy + Batch)** 방식을 표준 방어 기제로 채택한다.
2. 논리 삭제(`use_yn`)는 질의마다 조건을 명시해 가리고 서비스 경계에서 켜는 Hibernate 필터를 두지 않는다 — 삭제 행까지 볼 관리자 경로는 그 조건을 빼는 것을 메서드 이름·인자로 드러낸다(DEC-OPS-423 ①). `del_yn` 처럼 도메인이 따로 설계한 삭제 표지의 조회·소유권·수거 조건은 그 도메인이 정한다. 엔티티 수준의 자동 필터(`@SQLRestriction`·Hibernate `@Filter`)를 쓰더라도 논리 삭제 여부가 명시적으로 설계된 도메인 엔티티에 한하며, 물리 삭제(Hard Delete)를 기본으로 설계된 도메인 테이블은 그 대상에서 철저히 제외한다. 논리 삭제의 채택 기준은 [DB 헌법 제8조 2·3항](../../db-standard-constitution/artifacts/constitution.md#제8조-audit-컬럼-및-삭제-규범)을 따른다.
3. 본 조의 배치-페치/N+1 방어 전략은 `@QueryCountGuard(max = N)` **표적 통합 가드레일**로 회귀 검증한다 — 대표 조회 경로의 쿼리 실행 횟수 상한을 고정하는 스팟체크이며, 전 엔티티를 훑는 보편 ArchUnit 린터가 아니다. 어느 서비스가 표적인지는 이 조문이 아니라 해당 테스트 소스가 정본이다(계측 자체의 검증: `QueryCountGuardrailIntegrationTest`). 신규 컬렉션 조회 경로 추가 시 해당 가드레일 커버리지 확장을 함께 검토한다.
4. DB 벤더에 따라 달라지는 SQL 구문은 앱 SQL 포트(`VendorSqlDialect`)의 구현에만 둔다 — 정본은 PostgreSQL 이고 다른 DB 는 벤더 어댑터가 맡는다([ADR-0047](../../../../docs/02-architecture/decisions/ADR-0047-multi-database-composer-and-vendor-sql-boundary.md)). 새 질의는 Hibernate 가 벤더 문법을 만들 수 있으면 HQL 로 쓰고, 벤더마다 달라야 하는 것만 포트로 보낸다. 포트 밖에 남은 기존 위치는 [벤더 SQL 원장](../../../../config/governance/vendor-sql-ledger.json)에 처리 방식과 규칙별 개수로 동결돼 있고, [VendorSqlPortabilityLinterTest](../../../../api-server/src/test/java/nuri/api/harness/VendorSqlPortabilityLinterTest.java)가 실제 개수와 원장이 정확히 같은지 본다 — 늘리지 않으며, 줄였으면 같은 변경에서 원장도 낮춘다. 이 게이트는 구문만 보므로 이식 판정은 벤더 DB 실행으로 한다.

---

## 제7장 데이터 정합성 및 메타 검증 (Integrity & Meta Validation)

### 제15조 (동시성 제어 및 데이터 정합성 방어)
1. 다중 사용자의 동시 접근(수정/삭제)이 예상되는 중요 엔티티(예: 재고, 결재 등)는 JPA `@Version`을 통한 **낙관적 락(Optimistic Lock)** 적용을 기본으로 하여 정합성을 보호한다. 단, 대량 배치 업데이트(Bulk Update) 시에는 JPA 영속성 컨텍스트를 거치지 않고 JPQL/QueryDSL의 벌크 연산(`executeUpdate`)을 사용할 수 있으며, 이 경우 버전 충돌 검증은 애플리케이션 레벨에서 사전/사후 카운트 비교 등 명시적인 대안 정합성 검증 로직으로 대체한다.
2. 트랜잭션 충돌 비용이 극도로 높은 크리티컬 섹션 로직에 대해서는 **비관적 락(Pessimistic Lock)** 정책을 명시적으로 설계하여 반영해야 한다.
3. 날짜와 시각은 한국 표준시로 처리한다(DEC-OPS-396). 운영 코드는 UTC 를 시각의 기준으로 쓰지 않고 `ServiceTime` 을 거치며, 시간대 없는 컬럼에 저장하는 엔티티 필드는 `LocalDateTime` 이고 순간 값은 `Instant` 를 쓴다. 앱과 시험·변이 시험 JVM 의 기본 시간대는 한국 표준시다(시험은 `test.timezone` 으로 다른 시간대에서도 돌려 볼 수 있다). 순간 값(`Instant`)의 API 표기(`Z`), 이관 도구, 거버넌스 원장의 UTC 는 이 항의 범위 밖이다. [ServiceTimeZoneLinterTest](../../../../api-server/src/test/java/nuri/api/harness/ServiceTimeZoneLinterTest.java)가 집행한다.

### 제16조 (Data Validation 연쇄 동기화 및 돌연변이 테스트 증명)
1. 백엔드 DTO 및 프론트엔드 Zod 유효성 검증의 최대 길이(max) 및 필수 여부(NotNull)는 DB 물리 스키마와 표준 메타의 제약조건에 부합해야 한다. DB→Entity→DTO→OpenAPI→TypeScript/Zod 계약의 현행 검증 범위는 다음과 같다.
   - [InputContractMirrorLinterTest](../../../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java)는 [입력 계약 census](../../../../config/governance/input-contract-mirror-census.json)의 표적 필드(실제 저장 경로가 확인된 것)에 한해 Entity·DTO 제약과 커밋된 OpenAPI 를 대조하고, 제약이 있는 요청 DTO를 `@Valid`·`@Validated` 없이 받는 컨트롤러 파라미터를 차단한다. DTO 전체의 의미 계약을 전수 보장하는 게이트는 아니다.
   - `ApiDocsPathCoverageLinterTest`는 Controller `@*Mapping`과 `api-docs.json`의 경로를 오프라인으로 대조한다. `api-docs.json` 의 신선도와 프론트엔드 생성물(`codegen:verify`·`codegen:verify:zod`)의 재생성 일치는 CI 가 검증한다([API 문서 가이드](../../../../docs/03-guides/api-documentation-guide.md#api-문서-자동-내보내기-정적-추출)).
   - `:api-server:schemaValidationTest`는 격리 PostgreSQL에 Flyway를 적용하고 Hibernate 매핑 및 표적 스키마·데이터 계약을 검증한다. 승인된 표준 정합의 회귀는 [StandardLengthMigrationIntegrationTest](../../../../api-server/src/test/java/nuri/api/schema/StandardLengthMigrationIntegrationTest.java)와 [DeferredStandardDesignMigrationIntegrationTest](../../../../api-server/src/test/java/nuri/api/schema/DeferredStandardDesignMigrationIntegrationTest.java)가 보호한다.
   - **실행 대상 DB의 live 메타·물리 스키마와 모든 DTO 필수·길이 제약을 직접 전수 대조하는 하네스는 아니다.** 실제 대상의 `information_schema`와 `meta_standard_domains` 조회 및 설계 리뷰를 생략할 수 없다. 남은 의미 계약은 [GAP-CONTRACT-001](../../../memory/known-gaps.md)에 추적한다. 비즈니스 사양에 따라 DB 한계보다 좁은 길이 또는 논리 검증을 각 레이어에 선언할 수 있으나 물리 한계를 약화하지 않는다.
2. 테스트 코드 무결성을 검증하기 위한 돌연변이 테스트(Mutation Testing)는 전체 모듈이 아니라 CI 매트릭스에 범위로 등록한 핵심 크리티컬 비즈니스 서비스(결제, 보안, 데이터 정합성 등)에서 수행한다. 변경 영향 분류가 실행할 범위를 고르고, 고른 범위는 등록된 대상 클래스 전체를 검증한다(변경된 줄만 보는 증분 검증이 아니다). 핵심 서비스 기준 **Mutation Score 75% 이상**을 최저 품질 기준으로 삼는다. 이 기준은 `build.gradle` 의 `mutationThreshold`(환경변수 `STRICT_MUTATION=true` 일 때 75 와 범위별 하한 가운데 큰 값)로 기계 강제하며, 범위별 하한의 정본은 [게이트 원장](../../../../config/governance/gates.json)의 `QUALITY-BACKEND-MUTATION-SCORE`(`scopeFloors`)다([ADR-0044](../../../../docs/02-architecture/decisions/ADR-0044-ci-tuning-values-and-pit-scope-floors.md)). **CI는 제품(`mutation-scope`)·이관 도구(`mutation-scope-migration`) 범위에 `STRICT_MUTATION=true`로 범위별 하한(최저 75%)을 하드 게이트하며, required check인 `mutation-test`가 두 결과를 따로 집계하므로 실행 대상 범위 하나라도 미달하거나 기대된 실행이 빠지면 병합이 차단된다.** 로컬에서 `STRICT_MUTATION`을 지정하지 않은 PITest 실행은 `mutationThreshold=0`의 리포트 전용이다. 범위로 등록하지 않은 일반 보조 비즈니스 서비스 및 단순 CRUD 로직은 돌연변이 테스트 강제 의무에서 영구히 면제한다 — 면제 여부는 등록된 대상 클래스 패턴이 정한다.


---

## 제8장 부칙 (Supplementary Provisions)

### 제17조 (명명 규칙과의 동기화)
1. 백엔드 변수 및 필드 명칭은 **DB 표준화 헌법**에 정의된 용어 사전과 100% 일치해야 한다. (예: DB `crt_dt` -> Java `crtDt`)

### 제18조 (시행일)
본 헌법은 공포된 즉시 효력을 발생하며, 신규 기능 개발 및 기존 코드 리팩토링 시 최우선 지침으로 적용된다.
