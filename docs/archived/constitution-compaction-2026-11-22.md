# 헌법 조문 축약 전 원문 (2026-11-22)

2026-11-22 헌법 조문 축약(DEC-OPS-425)에서 줄이거나 고친 항의 **직전 원문**이다. 현행 규범이 아니며 인용·대조용 보관 기록이다 — 현행 조문은 각 헌법 파일이 정본이다.

- 걷은 것은 네 유형이다: 게이트·린터·census 가 어떻게 동작하는지의 설명(규범 문장과 집행 링크만 남겼다), 날짜·사고·실측 같은 경위, 다른 정본(AGENTS·CI 가이드·무중단 이행 가이드·다른 헌법)의 사본, 같은 문서 안의 반복.
- 조·항 번호와 제목은 바뀌지 않았다. 여기에 없는 항은 축약에서 바뀌지 않았다.
- 원문의 상대 링크는 헌법 파일 위치 기준이라 이 문서에서는 열리지 않는다(코드 블록으로 둔다).

## 백엔드 헌법

전체 21429자 → 19867자. 바뀐 항 19개.

### 백엔드 헌법 제1조 (모듈별 책임 분립) — 6항

~~~
6. **프레임워크 재사용성 불변식(도메인 삭제가능성)**: `business-core`(재사용 admin 코어)는 신규 SI/재개발에서도 삭제되지 않는 **필수 커널**만을 담고, `business-app`의 개별 업무 도메인은 파생 프로젝트에 따라 **통째로 삭제·교체 가능**해야 한다(도메인 삭제가능성). 이를 물리적으로 보장하기 위해 ⓐ `business-app` 내 형제(sibling) 업무 도메인 간의 직접 상호참조와 ⓑ 재사용 코어 서비스의 샘플 도메인 의존을 금지한다. 집행 범위는 구분한다 — [DomainIsolationTest](../../../../business-app/src/test/java/nuri/business/DomainIsolationTest.java)는 `nuri.business.domain`의 형제 슬라이스를 검사하며 코어 타깃과 게시판·보상 승인 클러스터의 기존 결합을 명시적으로 관리한다. [ServiceLayerIsolationTest](../../../../business-core/src/test/java/nuri/business/ServiceLayerIsolationTest.java)는 삭제 가능한 샘플 도메인의 `business-core` 재유입을 차단한다. 서비스 계층의 수평 결합은 별도 [CrossDomainCouplingLinterTest](../../../../api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java)가 import·signature·event·인라인 FQN을 포함한 exact census로 동결하며, 현행 서비스 계층 app→app 결합은 0건이다(결합 원장 `config/governance/cross-domain-coupling-census.json`). 새 app→app edge는 원장 등재와 사유 없이 통과하지 않으며, 엔티티 수준의 기존 결합(게시판·보상 승인 클러스터)은 해결된 것으로 간주하지 않는다. 필수↔샘플 오케스트레이션은 `DashboardItemProvider`·`CommunityBoardAccessPort`·`TemplateReferenceContributor` 등 `foundation` 포트(DIP)와 이벤트로 역전하며, 사용자 삭제는 `business-core`가 발행하는 `UserDeletionEvent`를 각 도메인이 구독한다.
~~~

### 백엔드 헌법 제3조 (엔티티 노출 금지) — 1항

~~~
1. JPA Entity 클래스는 절대 `api-server` 레이어의 외부로 노출되지 않음을 원칙으로 한다. 본 원칙은 `ArchitectureTest.controller_should_not_depend_on_entity`(api-server ArchUnit 게이트)로 기계 강제된다 — `nuri.api..` 패키지가 `@Entity` 애노테이션 클래스에 의존하면 빌드를 실패시키며, 해당 규칙의 `because` 절이 본 조항(제3조 1항)을 명시적으로 인용하여 조문↔게이트를 쌍방으로 결속한다.
~~~

### 백엔드 헌법 제4조 (변환 책임의 소재) — 1항

~~~
1. 최종 API 응답(Response DTO)은 그 기능을 소유한 비즈니스 레이어(`business-core`/`business-app`)의 서비스가 조립해 반환하는 것이 기본이고, `api-server` 의 컨트롤러는 그것을 공통 응답 래퍼(제6조)에 담아 내보낸다(래퍼의 예외는 제6조 3항). 엔드포인트의 응답 계약이 서비스 DTO 와 달라야 할 때 — 공개 응답에서 내부 식별자·감사 정보를 빼거나, 여러 결과를 한 응답으로 엮거나, 느슨한 내부 값의 타입·필수 여부를 고정할 때 — 에 한해 `api-server` 에 그 엔드포인트의 응답 DTO(또는 조립만 맡는 Facade)를 두고 서비스 DTO 에서 변환한다. 이 변환은 필드 선택·계약값 정규화·조립까지이며 업무 규칙과 트랜잭션 경계는 서비스에 남긴다. 컨트롤러와 그 응답 DTO 는 엔티티를 참조하지 않는다(제3조 1항). 이미 좁혀 둔 응답 계약은 변환 위치를 옮기더라도 넓히지 않는다. *(2026-11-22 사용자 결정으로 개정, DEC-OPS-424: 종전 조문은 응답 조립을 `api-server` 의 Facade·Controller-Level Mapper 로 **전면** 이관하도록 했으나, 실제로는 서비스 DTO 를 그대로 내보내는 컨트롤러가 다수이고 계약을 좁히거나 엮어야 하는 엔드포인트만 `api-server` 의 응답 DTO 로 변환한다. 조문을 실제로 지켜지고 게이트가 받치는 그 경계에 맞췄다.)*
~~~

### 백엔드 헌법 제6조 (응답 포맷의 통일) — 3항

~~~
3. **binary/stream 예외** *(2026-08-23 사용자 위임 D4 개정 — DEC-OPS-016)*: 파일 다운로드·전체 결과 export 등 JSON 으로 표현할 수 없는 binary/stream 응답에 한하여 `ResponseEntity<Resource>`(또는 스트리밍 등가물 `ResponseEntity<StreamingResponseBody>`)의 공통 래퍼 밖 반환을 제한적으로 허용한다. 허용 조건은 다음 3가지의 동시 충족이다 — ① `Content-Disposition: attachment` 헤더 명시, ② 명시적 `produces` 미디어 타입 선언(다운로드 대상 타입이 요청마다 동적인 경우 응답 시점의 명시적 `Content-Type` 지정으로 갈음 — 현행 동결분 `FileApiController#downloadFile` 이 이 형태다), ③ `ResponseContractLinterTest` 의 binary 허용 census(파일명·핸들러 단위 명시 목록) 등재. 목록 밖 래퍼 이탈 신설과 목록에 남은 stale 행은 해당 린터가 red 로 차단하며(양방향 exact census), JSON 으로 표현 가능한 응답을 이 예외로 우회하는 것은 금지한다.
~~~

### 백엔드 헌법 제6조 (응답 포맷의 통일) — 4항

~~~
4. **페이징** *(2026-10-19 사용자 승인 — [ADR-0036](../../../../docs/02-architecture/decisions/ADR-0036-api-paging-and-created-status-conventions.md))*: 목록은 요청·응답·URL·화면 모두 1 기반이며 이름은 `page`(1 이상)·`size`(1~100) 하나다. 응답은 `PageResponse` 이고 `page` 는 요청과 같은 번호다 — Spring `Page` 원형을 내보내지 않는다. 컨트롤러는 목록을 `Pageable`(`spring.data.web.pageable.one-indexed-parameters=true`) 또는 `@Valid BaseSearchDto` 로만 받고 페이지 값을 `@RequestParam` 으로 직접 받지 않는다. 0 기반 변환은 리졸버와 `BaseSearchDto#toPageable` 에만 있다. 범위 밖 값과 서버가 읽지 않는 옛 이름은 `PaginationRequestFilter` 가 400 으로 거부하며, 옛 이름 `pageIndex`·`pageUnit` 은 ADR-0036 이 정한 한 릴리스 동안만 별칭으로 받는다. `PageableConstructionLinterTest` 가 바인딩·설정 일치·시험 리졸버·스펙을 검사한다.
~~~

### 백엔드 헌법 제6조 (응답 포맷의 통일) — 5항

~~~
5. **성공 상태 코드** *(2026-10-19 사용자 승인 — ADR-0036)*: 자원을 만드는 POST 는 HTTP 201 과 `ApiResponse.created(새 식별자)`(식별자를 담은 DTO 포함)를 돌려주고, `@ResponseStatus(HttpStatus.CREATED)` 로 스펙에도 201 을 쓴다. 그 밖의 성공(조회·행위형 POST·갱신·삭제)은 200 이다. HTTP 상태와 본문 `status` 는 같다. 어느 POST 가 자원 생성인지는 이름이 아니라 새로 주소를 갖는 자원이 생기는지로 판정하며, `ResponseContractLinterTest` 의 생성 census(양방향 exact)가 핸들러·스펙을 함께 고정한다.
~~~

### 백엔드 헌법 제8조 (권한의 이중 검증) — 2항

~~~
2. **명시적 기능 인가** *(2026-09-10 승인 [ADR-0016](../../../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md))*: 보호 핸들러는 `@PreAuthorize("@permissionPolicy.allowed(authentication, '<컨트롤러 FQN>#<메서드>')")`로 정확한 handler 정책을 평가한다. HTTP 게이트와 메서드 게이트는 같은 `authorization-policies.json` 바인딩과 `permission-catalog.json`을 사용한다. 공개·인증 전용 핸들러도 같은 형태로 선언하고, 접근 분류(`PUBLIC`·`AUTHENTICATED`·`PERMISSION`·`DENY`)는 `authorization-policies.json`의 `operationBindings`에 둔다. 핸들러의 메서드 인가 식은 자기 바인딩을 가리키는 이 형태 하나이며, 인가 합성 애노테이션이나 다른 SpEL로 대신하지 않는다([DEC-OPS-235](../../../../docs/04-operations/operational-decisions-index-product.md)에서 적용처 없는 인가 애노테이션을 걷었다). `SecurityAuthAnnotationLinterTest`는 전체 HTTP method·path·handler·SpEL·권한 및 서비스/수동 guard의 exact census와 의도적 위반을 검증한다. 그룹 이름·단일 role·기존 역할 계층은 인가 근거가 아니며 복수 그룹의 명시 기능을 합산한다. 메뉴 표시 권한은 API 사용 권한을 부여하지 않는다. SYSTEM 소속의 개인정보 로그 제외는 기능 보유 여부 및 다른 그룹 배정과 관계없이 유지한다.
~~~

### 백엔드 헌법 제9조 (안전한 트랜잭션 관리) — 1항

~~~
1. 읽기 전용 작업에는 반드시 `@Transactional(readOnly = true)`를 명시하여 성능을 최적화하고 의도치 않은 데이터 변경을 차단한다. 이 원칙은 `ServiceReadOnlyTransactionalLinterTest`(api-server 하네스)로 기계 강제된다 — `@Service` 클래스는 클래스레벨 `@Transactional(readOnly = true)` 를 기본으로 선언하고 쓰기(변경) 메서드만 메서드레벨 `@Transactional` 로 오버라이드하며, 파일 IO·쓰기 전용 등 정당한 예외는 동결(GRANDFATHERED) 베이스라인으로 관리하여 신규 `@Service` 의 누락만 빌드를 실패시킨다.
~~~

### 백엔드 헌법 제10조 (외부 연동 및 비동기 작업의 안전성) — 1항

~~~
1. 외부 연동 등 비동기 작업 시 재시도(`@Retryable`, Spring Retry)를 적용하여 일시적 장애에 대한 회복탄력성을 확보한다. (현행: `MailAsyncProcessor`·`SmsAsyncProcessor` 가 spring-retry 의 `@Retryable`(maxAttempts=3)+`@Recover` 를 쓴다. 외부 전송 자체는 보내지 않았음이 확실한 실패만 다시 보낸다 — 메일은 본문 전송 전의 연결 실패만 재시도하고 문자는 게이트웨이 요청을 다시 보내지 않으며, 결과를 알 수 없는 실패는 중복 발송을 막으려고 실패·미확인으로 기록한다(2026-11-19). 결과 기록(DB)의 일시 실패는 두 처리기 모두 재시도한다. Spring Framework 7 core retry 로의 전환은 [DEC-OPS-125](../../../../docs/04-operations/operational-decisions-index-ci-governance.md)에 따라 보류한다.) 서킷 브레이커 패턴은 전용 라이브러리(예: Resilience4j) 미도입 상태로, 현 시점에서는 의무가 아니라 **향후 도입 대상(권고)** 이다.
~~~

### 백엔드 헌법 제10조 (외부 연동 및 비동기 작업의 안전성) — 2항

~~~
2. 외부 서버 API나 타 기관 연동 구간은 한쪽의 병목이 전체 스레드 고갈로 전파되지 않도록 작업 공간을 격리한다. 현행 실행자는 [foundation AsyncConfig](../../../../foundation/src/main/java/nuri/foundation/core/config/AsyncConfig.java)의 `logExecutor`(가상 스레드·동시성 상한), `auditExecutor`·`notificationExecutor`(각각 유계 풀·큐)와 [api-server AsyncConfig](../../../../api-server/src/main/java/nuri/config/AsyncConfig.java)의 외부 메일·SMS용 `taskExecutor`(유계 풀·큐)로 분리된다. 감사·알림의 수락 거부는 계측하고, 외부 발송의 거부는 요청 스레드에서 실행하지 않고 예외와 실패 상태로 드러낸다. 이 격리를 정식 서킷 브레이커 도입 완료로 해석하지 않는다. 아래의 호출 유형별 **차등 타임아웃**과 정식 **서킷 브레이커·벌크헤드**(예: Resilience4j)는 현재 미도입으로, 의무가 아니라 도입 시 준수를 지향하는 **권고 기준**이다.
~~~

### 백엔드 헌법 제10조 (외부 연동 및 비동기 작업의 안전성) — 3항

~~~
3. **커밋-후 부수효과의 안전성**: 외부 발송·별도 트랜잭션(REQUIRES_NEW) 등 부수효과는 반드시 발행 트랜잭션의 **커밋 이후**에만 기동한다. 부모 커밋 전에 별도 스레드/트랜잭션으로 후속 작업을 기동하면 그 작업이 부모의 미커밋 행을 `READ_COMMITTED` 로 보지 못해 유실·no-op 되는 결함(SMS 미발송, 메일 상태 고착 등)이 발생한다. 외부 발송(메일·문자)은 [ADR-0033](../../../../docs/02-architecture/decisions/ADR-0033-encrypted-mail-delivery-snapshot.md)·[DEC-OPS-341](../../../../docs/04-operations/operational-decisions-index-product.md)에 따라 발송 이력과 발송 의도를 업무 트랜잭션 안에서 영속 작업(`tb_sys_job`, `DurableWorkPort.enqueue`)으로 함께 저장하는 것이 표준이다. 실행기(`DurableWorkDispatcher`)는 커밋된 의도만 집어 유형별 처리기(`MailDeliveryWorkHandler`·`SmsDeliveryWorkHandler`)로 넘기므로, 롤백된 업무는 발송되지 않고 프로세스가 중단돼도 의도가 남는다([재처리 운영](../../../../docs/04-operations/durable-work-recovery.md)). 그 밖의 커밋-후 부수효과(업무 이벤트 발행 등)는 `TransactionUtils.runAfterCommit(...)`(`foundation`)으로 감싼다. 특히 커밋-전-async 파손을 유발하는 `@Async` + `@TransactionalEventListener` 동시 선언은 `AsyncTransactionalListenerArchTest`(api-server 하네스)로 기계 차단된다.
~~~

### 백엔드 헌법 제11조 (인증 정보 보호 및 OWASP 준수) — 2항

~~~
2. 백엔드 의존성 취약점은 `dependencyCheckAnalyze`의 `failBuildOnCVSS=7` 기준으로 확인하고 발견 시 수정을 우선한다. 이 태스크와 일반 빌드의 실행 경로는 동일하지 않다. [주간·수동 OWASP workflow](../../../../.github/workflows/dependency-check.yml)의 스캔 단계는 `continue-on-error`인 advisory이며 리포트 부재는 별도 실패로 남긴다. PR의 신규 runtime High 이상 의존성 차단은 required `secret-scan`의 snapshot readiness·dependency review가 담당한다. 전체 스캔의 운영 증거와 후속 처리 차이는 [GAP-DEP-001](../../../memory/known-gaps.md)에 남기며, advisory green을 취약점 부재나 병합 차단 증거로 표현하지 않는다.
~~~

### 백엔드 헌법 제11조 (인증 정보 보호 및 OWASP 준수) — 4항

~~~
4. 소스 시큐어코딩 점검은 승인된 [ADR-0015](../../../../docs/02-architecture/decisions/ADR-0015-secure-coding-ci.md)에 따라 required `secure-coding`이 수행한다. 코드·설정 변경은 Java와 JavaScript/TypeScript의 CodeQL `security-extended` 전체 분석에서 기존·신규 High/Critical(보안 점수 7.0 이상)을 차단하며, 분석·리포트 오류도 실패시킨다. 문서 전용 변경만 명시적 skip을 허용한다. 승인 오탐은 [개별 검토 목록](../../../../config/security/false-positive-review.json)의 위치·fingerprint·소스/방어 해시·만료일에 결속된 범위로만 관리한다. 시크릿·의존성 검사와 SAST는 서로 다른 검사이며, 상세 실행·예외 계약은 ADR과 [CI 가이드](../../../../docs/03-guides/cicd-pipeline.md#시큐어코딩-정적-분석-sast)를 따른다.
~~~

### 백엔드 헌법 제14조 (N+1 방어 전략의 하이브리드화 및 OOM 방어) — 2항

~~~
2. JPA 엔티티에는 `del_yn` 또는 `use_yn` 등 논리 삭제 여부가 명시적으로 설계된 도메인 엔티티에 한하여 `@SQLRestriction("use_yn = 'Y'")` 또는 Hibernate `@Filter`를 선택 적용하며(Hibernate 7에서 `@Where`는 제거됐다. 현행 엔티티는 둘 다 쓰지 않고 질의마다 `use_yn` 조건을 명시한다), 물리 삭제(Hard Delete)를 기본으로 설계된 도메인 테이블의 경우 해당 필터 적용 대상에서 철저히 제외하여 아키텍처 크래시를 원천 방어한다. *(2026-11-21 문구 정정 — 현행 표기 갱신, 정책 불변)*
~~~

### 백엔드 헌법 제14조 (N+1 방어 전략의 하이브리드화 및 OOM 방어) — 3항

~~~
3. 본 조의 배치-페치/N+1 방어 전략은 `@QueryCountGuard(max = N)` **표적 통합 가드레일**로 회귀 검증한다 — 대표 조회 경로의 실제 쿼리 실행 횟수를 상한으로 못박아 N+1 재발을 탐지하는 스팟체크이며, 전 엔티티를 훑는 보편 ArchUnit 린터가 아니다. 계측 자체(실제 쿼리 계수·비동기 스레드 추적)는 `QueryCountGuardrailIntegrationTest`가, 도메인별 조회 상한은 그 도메인의 쿼리 수 통합 테스트가 검증한다. 어느 서비스가 표적인지는 이 조문이 아니라 해당 테스트 소스가 정본이다. 신규 컬렉션 조회 경로 추가 시 해당 가드레일 커버리지 확장을 함께 검토한다. *(2026-09-14 문구 정정 — DEC-OPS-084 의 표적 이동 반영, 정책 불변)*
~~~

### 백엔드 헌법 제15조 (동시성 제어 및 데이터 정합성 방어) — 2항

~~~
2. 트랜잭션 충돌 비용이 극도로 높은 크리티컬 섹션 로직에 대해서는 **비관적 락(Pessimistic Lock)** 또는 Redis 기반 분산 락 정책을 명시적으로 설계하여 반영해야 한다.
~~~

### 백엔드 헌법 제16조 (Data Validation 연쇄 동기화 및 돌연변이 테스트 증명) — 머리 문장

~~~
   - [InputContractMirrorLinterTest](../../../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java)는 실제 저장 경로가 확인된 표적 필드의 Entity `@Column(length)`와 DTO `@Size(max)`, 필수·enum·중첩 검증·read-only·날짜 계약을 커밋된 OpenAPI와 대조한다. 원장은 [입력 계약 census](../../../../config/governance/input-contract-mirror-census.json)이며, 제약이 있는 요청 DTO를 `@Valid`·`@Validated` 없이 받는 컨트롤러 파라미터도 같은 게이트가 차단한다. DTO 전체의 의미 계약을 전수 보장하는 게이트는 아니다.
~~~

### 백엔드 헌법 제16조 (Data Validation 연쇄 동기화 및 돌연변이 테스트 증명) — 머리 문장

~~~
   - `ApiDocsPathCoverageLinterTest`는 Controller `@*Mapping`과 `api-docs.json`의 경로를 오프라인으로 대조한다. CI는 실제 추출 뒤 `git diff --exit-code api-docs.json`으로 신선도를, 프론트엔드 `codegen:verify`·`codegen:verify:zod`는 `generated-api.d.ts`·`generated-zod.ts`·`generated-operations.ts`의 재생성 일치를 검증한다.
~~~

### 백엔드 헌법 제16조 (Data Validation 연쇄 동기화 및 돌연변이 테스트 증명) — 2항

~~~
2. 테스트 코드 무결성을 검증하기 위한 돌연변이 테스트(Mutation Testing)는 전체 모듈이 아니라 CI 매트릭스에 범위로 등록한 핵심 크리티컬 비즈니스 서비스(결제, 보안, 데이터 정합성 등)에서 수행한다. 변경 영향 분류가 실행할 범위를 고르고, 고른 범위는 등록된 대상 클래스 전체를 검증한다(변경된 줄만 보는 증분 검증이 아니다). 핵심 서비스 기준 **Mutation Score 75% 이상**을 최저 품질 기준으로 삼는다. 이 기준은 `build.gradle` 의 `mutationThreshold`(환경변수 `STRICT_MUTATION=true` 일 때 75 와 범위별 하한 가운데 큰 값)로 기계 강제하며, 범위별 하한의 정본은 [게이트 원장](../../../../config/governance/gates.json)의 `QUALITY-BACKEND-MUTATION-SCORE`(`scopeFloors`)다([ADR-0044](../../../../docs/02-architecture/decisions/ADR-0044-ci-tuning-values-and-pit-scope-floors.md)). **현행 CI는 제품 스코프의 `mutation-scope`와 이관 도구 스코프의 `mutation-scope-migration` 매트릭스에 각각 `STRICT_MUTATION=true`를 주입하여 범위별 하한(최저 75%)을 하드 게이트한다. 두 잡은 변경 영향 분류(`change-scope`)가 해당 범위를 지목할 때만 실행되며, required check인 `mutation-test`가 두 결과를 따로 집계하므로 실행 대상 스코프 하나라도 미달하거나 기대된 실행이 빠지면 병합이 차단된다.** 로컬에서 `STRICT_MUTATION`을 지정하지 않은 PITest 실행은 `mutationThreshold=0`의 리포트 전용이다. 범위로 등록하지 않은 일반 보조 비즈니스 서비스 및 단순 CRUD 로직은 돌연변이 테스트 강제 의무에서 영구히 면제한다 — 면제 여부는 등록된 대상 클래스 패턴이 정한다.
~~~

## 프런트엔드 헌법

전체 14046자 → 13729자. 바뀐 항 8개.

### 프런트엔드 헌법 제10조 (보안 헤더 및 외부 리소스) — 2항

~~~
2. **[최소 보안 헤더 베이스라인]** 보안 헤더는 두 소스로 나뉘며, 이 베이스라인의 약화(헤더 삭제·완화)는 헌법 위반으로 간주한다. **CSP는 `src/proxy.ts`(미들웨어)가 단일 소스**다 — nonce는 요청마다 달라야 하므로 정적 `headers()`로는 만들 수 없고, `next.config.ts`에 CSP가 재유입되면 이중 소스가 된다(`csp-policy` 계약이 차단). 문서 응답 격리 헤더(COOP)와 CSP `report-to` 그룹 정의(`Reporting-Endpoints`)도 `src/proxy.ts`가 문서 응답에 부여하고, 요청 무관 정적 헤더는 `next.config.ts`의 `headers()`가 전역 경로(`/:path*`)에 부여한다.
~~~

### 프런트엔드 헌법 제10조 (보안 헤더 및 외부 리소스) — 3항

~~~
3. **[nonce CSP의 전제와 한계의 정직한 기록]** `script-src`의 `'unsafe-inline'`은 2026-08-20 요청별 nonce로 제거됐다(PPR 포기 제품 결정). 이 승격은 두 가지 실측 제약 위에 서 있으며, 본 조는 이를 은폐하지 않고 기록·추적할 것을 의무화한다.
~~~

### 프런트엔드 헌법 제10조 (보안 헤더 및 외부 리소스) — 전 페이지 동적 렌더가 전제다

~~~
   - **전 페이지 동적 렌더가 전제다**: 정적 프리렌더 HTML의 inline script에는 요청 nonce가 없어 통째로 차단된다(2026-08-20 CI e2e 실측). `cacheComponents`(PPR) 비활성과 루트 layout의 `force-dynamic`을 `csp-policy` 계약이 고정하며, 되돌리려면 nonce CSP 철회가 선행돼야 한다.
~~~

### 프런트엔드 헌법 제10조 (보안 헤더 및 외부 리소스) — `'strict-dynamic'`은 채택하지 않는다

~~~
   - **`'strict-dynamic'`은 채택하지 않는다**: Next.js가 스트리밍 중 삽입하는 lazy chunk `<script src>`에 nonce가 없어 host 허용(`'self'`)이 꺼지면 앱이 전면 파손된다(2026-08-20 CI 실측). 방어는 `'self'`+nonce 조합으로 달성한다.
~~~

### 프런트엔드 헌법 제10조 (보안 헤더 및 외부 리소스) — 잔여 위험

~~~
   - **잔여 위험**: `style-src`의 `'unsafe-inline'`은 [GAP-FE-001](../../../memory/known-gaps.md)의 accepted-risk다. 2026-08-30 측정과 현재 [csp-policy 계약](../../../../frontend/src/__tests__/csp-policy.test.ts)은 React style prop과 sonner의 nonce 없는 `<style>` 주입 때문에 `style-src-elem`·`style-src-attr` 분리만으로 정책을 좁힐 수 없음을 기록한다. sonner의 nonce 지원 또는 교체 시 재측정하며, CSP 리포트 수집 채널 결정은 별도 추적한다.
~~~

### 프런트엔드 헌법 제14조 (검증 기반 개발) — 4항

~~~
4. 컴포넌트 카탈로그를 도입할 경우 public variant·상태를 실제로 렌더하고 CI에서 검증해야 하며, 실행되지 않는 문서를 품질 증거로 간주하지 않는다. Storybook은 CI에서 실행되지 않던 검증 수단이라 2026-08-07 제거했다(커밋 `8af56bdb1`). 다시 들일 때도 이 항의 기준(실제 렌더·CI 검증)을 따른다.
~~~

### 프런트엔드 헌법 제15조 (지원 프로필과 색상 모드의 대비 무결성) — 2항

~~~
2. 테마 전환 시 색상 묻힘(Color Bleeding)을 예방하기 위해, 모든 색상 표현은 하드코딩된 단색 값을 지양하고 시맨틱 컬러 토큰(Semantic Color Tokens)을 사용해야 한다. 다만 토큰화가 오히려 시각을 파손하는 특정 패턴 — `bg-clip-text` 텍스트 그라디언트, 의도적 다크 서피스(`surface-inverse`) 위에 중첩되는 다크 패널, 항상-흰 pill/mark 위 고정 다크 텍스트 등 — 은 `docs/03-guides/design-tokens.md`에 미치환 근거를 기록하는 것을 조건으로 예외적 잔존을 허용한다.
~~~

### 프런트엔드 헌법 제17조 (시행일) — 머리 문장

~~~
본 헌법은 공포된 즉시 효력을 발생하며, 모든 프론트엔드 개발 및 UI 개선 작업의 최상위 지침으로 적용된다. 2026-08-20 개정은 사용자 명시 승인과 `ADR-0003`에 근거한다. 2026-09-05 제4조 URL-state 개정은 사용자 명시 승인과 `ADR-0009`에 근거하며, 개인정보성 검색어의 URL 허용 범위와 잔여 위험을 화면별 계약으로 제한한다. 같은 날 인증 세션 개정은 사용자가 승인한 헌법·하네스 개선 계획과 `ADR-0010`에 근거하며, `Secure` 미설정을 명시적으로 opt-in한 평문 local loopback 개발·검증으로 제한한다. 구체 구현·평가 절차는 해당 ADR과 연결된 architecture·testing·design-token·security 가이드가 소유한다.
~~~

## DB 표준 헌법

전체 9254자 → 7985자. 바뀐 항 15개.

### DB 표준 헌법 제3조 (유형별 접두사) — 1항

~~~
1. 오브젝트의 유형을 식별하기 위해 다음의 접두사를 명칭의 맨 앞에 반드시 부착한다.
~~~

### DB 표준 헌법 제3조 (유형별 접두사) — 2항

~~~
2. **[메타 테이블 예외]** DB 표준 거버넌스의 원천이 되는 3대 메타 테이블(`meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`)은 본 조 1항의 `tb_` 접두사 규정의 적용 대상에서 명시적으로 제외하며, 독자적인 `meta_` 접두사 체계를 유지한다. 또한 본 메타 테이블들은 표준 감사 및 점검 자체의 예외 대상으로 규정하여, 어떠한 표준성 감사도 수행하지 않는다.
~~~

### DB 표준 헌법 제5조 (도메인 기반 설계 프로세스) — 머리 문장

~~~
모든 컬럼은 다음의 3단계 프로세스를 예외 없이 통과해야 한다.
~~~

### DB 표준 헌법 제5조 (도메인 기반 설계 프로세스) — 5항

~~~
5. **[기본키 생성 전략 표준]** 신규 `@Entity` 의 단일 기본키는 서비스 레이어 수동 채번(레거시 egov `IdGnrService`·`nextval`·`MAX+1`·수동 문자열 할당 등)이 아니라 **JPA 관리 생성(`@GeneratedValue`: `SEQUENCE`/`IDENTITY`/`UUID`)**을 사용한다. 이미 데이터가 영속된 기존 수동 PK 엔티티는 동결(grandfathered)하며, 그 생성 전략의 교체는 본 표준이 아닌 별도의 DB 설계결정으로 다룬다. 본 규범은 `api-server/src/test/java/nuri/api/harness/PkGenerationStandardLinterTest.java` 가 강제하여, 동결 베이스라인에 없는 신규 단일 `@Id` 엔티티가 `@GeneratedValue` 없이 도입되는 것을 배포 전에 차단한다(복합키·`@EmbeddedId` 는 매핑/조인 테이블의 정당한 패턴이라 면제). 이는 최근 채번 통일(레거시 `EgovIdGnrService` 전면 제거 → `IdGenerationUtil`)로 정립된 현대화 방향을 규범으로 승격한 것이다.
~~~

### DB 표준 헌법 제6조 (제약 조건 명명) — 7항

~~~
7. **[UNIQUE 불변식의 엔티티 미러 의무]** 엔티티(`@Entity`)가 매핑된 테이블에 DB UNIQUE 제약(또는 UNIQUE 인덱스)을 부여할 때에는, 그 불변식을 대응 엔티티에 JPA 레벨로 미러링해야 한다 — `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {...}))`(명명/다중컬럼), 단일 컬럼의 `@Column(unique = true)`, 또는 PK 컬럼셋(`@Id`)과 동일한 경우 중 하나로 표현한다. 이는 `DB → 엔티티` 로 이어지는 SSOT 계약체인(제2조)의 침묵 드리프트, 즉 애플리케이션이 인지하지 못하는 DB 전용 불변식의 발생을 차단하기 위함이다. 본 의무는 `api-server/src/test/java/nuri/api/harness/UniqueConstraintMirrorLinterTest.java` 가 마이그레이션의 `ADD CONSTRAINT ... UNIQUE` 및 `CREATE UNIQUE INDEX` 를 파싱하여, 매핑 엔티티에 JPA 미러가 누락된 경우 배포 전에 차단함으로써 기계적으로 강제한다.
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 3항

~~~
3. **[하네스 강제 연동 규범]** 본 헌법 제7조의 파괴적 DDL 차단과 예외 수명 주기는 [ZeroDowntimeMigrationLinterTest](../../../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java)가 배포 전(테스트 단계)에 기계적으로 강제한다. 본 하네스는 **환경별 차등이나 경고 전용(warn-only) 모드 없이**, 아래 파괴적 DDL 또는 waiver registry 위반이 검출되면 로컬·CI를 불문하고 빌드를 차단(Hard-Stop, JUnit `fail`)한다. 승인된 예외와 checksum으로 동결된 기존 부채의 처리 범위는 아래와 같으며, 정적 검사 통과만으로 실제 무중단 이행을 증명하지 않는다.
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 정적 차단 비대상

~~~
   - **정적 차단 비대상**: `ADD CONSTRAINT`(UNIQUE·CHECK·FK 등), `CREATE INDEX`, `DROP CONSTRAINT`, `DROP NOT NULL`(NULL 제약 완화). 이 목록은 해당 린터의 탐지 범위를 설명하며 운영 승인·잠금·데이터 검증을 면제하지 않는다. (구 조문의 "VARCHAR 길이 증가·NULL 완화는 차단 제외" 서술은 오류였다 — NULL 완화만 비대상이며 타입 변경은 VARCHAR 길이 증가를 포함해 차단된다.)
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 전수 스캔

~~~
   - **전수 스캔**: 검사 대상은 baseline(`V2_0`)을 포함한 마이그레이션 디렉토리 전체 `.sql`이며, 신규 델타에 한정하지 않는다. 소스 열거는 `HarnessSourceIndex`를 사용한다.
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 신규 예외의 승인 결속

~~~
   - **신규 예외의 승인 결속**: 해당 위반 라인의 `-- linter:ignore ZDM-YYYY-NNNN <reason>` 또는 파일 전체의 `-- linter:disable-file ZDM-YYYY-NNNN <reason>`를 [zdm-waivers.json](../../../../config/governance/zdm-waivers.json)의 `id`·`path`·`directive`·`reason`·`owner`·`approvedAt`·`expiresAt`·`evidence`와 1:1로 결속한다. 마커만으로는 통과하지 않으며, 자유형 신규 마커·미등록·중복·사유 누락·만료·경로 불일치를 차단한다.
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 선행 Expand 검증

~~~
   - **선행 Expand 검증**: Contract 성격의 `DROP TABLE`·`DROP SEQUENCE`·`DROP COLUMN`·테이블/컬럼 `RENAME` waiver에는 실제 선행 파일을 가리키는 `expandMigration`이 필요하다. 자기참조·후행 버전·해석 불가능한 Flyway 버전은 실패한다. 버전 선후 확인은 Sync·Redirect 완료나 실제 구버전 소비 종료의 자동 증명이 아니다.
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 선행 Expand 배포·관측 기록

~~~
   - **선행 Expand 배포·관측 기록**: 2026-09-16 이후 Contract waiver는 `expandRelease{tag,deployedAt,environment,evidence}`를 남기고, 린터가 릴리스 태그 형식·배포일·배포 후 7일 관측 기간과 [릴리스 기록](../../../../docs/04-operations/migration-release-log.md)의 해당 태그 행(선행 Expand 포함·Contract 미포함)을 대조한다([DEC-OPS-101](../../../../docs/04-operations/operational-decisions-index-ci-governance.md)). 예외는 두 가지이며 린터가 `id·path·expandMigration` 조합이 정확히 일치할 때만 이 대조를 건너뛴다 — ① 2026-09-16 이전 승인분(`PRE_POLICY_CONTRACT_WAIVERS`)은 동결분이며 소급 승인이 아니다. ② 사용자가 이 한 건만 승인한 같은 릴리스 예외로, [V2_127](../../../../api-server/src/main/resources/db/migration/V2_127__drop_retired_program_ledger_and_personal_page_contents.sql)의 waiver(`USER_APPROVED_SAME_RELEASE_CONTRACTS`, [DEC-OPS-233](../../../../docs/04-operations/operational-decisions-index-ci-governance.md))다. 두 목록의 항목과 수는 린터의 두 상수와 [waiver registry](../../../../config/governance/zdm-waivers.json)가 정본이고, 남은 경계는 [GAP-ZDM-001](../../../memory/known-gaps.md)이 추적한다. 두 예외 모두 선행 Expand의 실재·버전 선후 검사는 그대로 받고, 운영 중인 도입 기관은 ②를 승계하지 않는다. 이 대조는 기록 검증일 뿐 실제 배포·관측의 증명이 아니다.
~~~

### DB 표준 헌법 제7조 (무중단 스키마 진화 정책) — 기존 부채 보존

~~~
   - **기존 부채 보존**: 레지스트리 도입 전 자유형 마커는 `legacy-debt-unapproved`로 별도 동결한다. 파일 fingerprint·마커 수·owner·reviewBy를 검증하며, 이 동결을 소급 승인으로 해석하거나 적용 완료 Flyway의 checksum을 바꾸지 않는다. 실제 잠금·동기화·배포 순서의 증거는 [이행 가이드](../../../../docs/02-architecture/zero-downtime-migration.md)에 따라 별도 확보한다.
~~~

### DB 표준 헌법 제8조 (Audit 컬럼 및 삭제 규범) — 3항

~~~
3. 데이터의 복원이나 이력이 비즈니스 요구사항으로 인해 필수적인 경우에 한하여 선택적으로 논리 삭제 방식을 채택하며, 이 경우 애플리케이션 레벨(백엔드 헌법 제14조)에서의 JPA 영속성 필터링 조항과 연계하여 삭제 데이터 조회를 제어할 수 있다.
~~~

### DB 표준 헌법 제8조 (Audit 컬럼 및 삭제 규범) — 4항

~~~
4. **[메타 테이블 감사 제외]** 3대 메타 테이블(`meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`)은 데이터 표준의 기준이 되는 특수 테이블이므로, 공통 Audit 4대 컬럼 탑재 여부 및 도메인 정합성 검사 등 모든 헌법적 감사 대상에서 원천적으로 제외한다.
~~~

### DB 표준 헌법 제8조 (Audit 컬럼 및 삭제 규범) — 5항

~~~
5. **[감사컬럼 표준의 기계 강제 및 그 한계]** 신규 테이블의 감사컬럼 표준은 스키마 명명 린터 `api-server/src/test/java/nuri/api/harness/SchemaNamingLinterTest.java`(`checkAuditColumns`)가 델타 SQL 정적 분석으로 배포 전에 강제한다. 다만 정적 분석으로는 테이블의 Insert-Only 여부(본 조 1항)를 판별할 수 없으므로, 게이트가 강제하는 범위는 ① 신규 `tb_` 테이블의 **최소 감사컬럼 2종(`frst_rgtr_id`, `crt_dt`) 탑재**와 ② 수정 감사 짝의 **대칭성**(`mdfcn_dt` 와 `last_mdfr_id` 는 둘 다 탑재하거나 둘 다 생략)에 한정한다. 따라서 가변(수정 발생) 비즈니스 테이블의 감사컬럼 **4종 완비 여부는 게이트가 아니라 설계 리뷰로 보증**하며(게이트가 4종을 자동 강제한다는 뜻이 아니다), 3대 메타 테이블은 본 검사에서 면제된다(본 조 4항). 동일 하네스는 본 헌법 제1조(소문자 snake_case)·제3조(`tb_`/`sq_` 접두)·제5조 4항(고정 문자형 `char` 금지)·제6조(제약 `pk_`/`fk_`/`uk_`/`ck_` 접두 및 인덱스 `ix_` 접두 — 유니크 인덱스는 레거시 `uk_` 허용)도 함께 기계 강제한다. 검사 대상은 baseline(`V2_0`)·메타 시드(`V2_1`)를 제외한 델타와 `R__` 파일이며, 예외는 [명명 예외 대장](../../../../docs/02-architecture/db-naming-exceptions.md)과 동기화된 화이트리스트 및 사유를 병기한 `-- naming-linter:ignore`로만 허용한다. 게이트는 접두만 판정하며 `[테이블명]_[컬럼명]` 구조는 설계 리뷰로 보증한다.
~~~
