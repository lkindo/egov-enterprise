# 횡단관심사 관례 (Cross-Cutting Conventions)

> **목적**: quality-score **§2.C** — "횡단관심사(인가·정체성·트랜잭션 경계·동시성·캐싱)가 관례/애스펙트가 아니라
> 엔드포인트마다 임기응변으로 적용돼 버그가 *N곳 패턴*으로 재발"한다는 진단에 대한 **명시적 관례 SSOT**.
> 각 관심사를 `[관례 / 근거 / 집행 게이트 / 미집행 갭]`으로 기록하되 **현실 그대로**(있는 게이트는 있다고, 없으면 없다고) 적는다.
> 관례가 암묵지로 흩어져 있으면 다음 컨트롤러/서비스에서 같은 버그가 재발한다 — 이 문서가 그 재발 고리를 끊는 1차 방어다.
>
> **최종 검증**: 2026-07-18, 코드 실물 Grep/Read + 게이트 실행 기준. (감사: `crosscutting-systematization-audit-2026-07-18`)

---

## 요약 — 관심사별 체계화 현황

| # | 횡단관심사 | 집행 게이트(기계강제) | 관례 문서 | 잔여 갭 |
|:-:|---|---|:-:|---|
| 1 | 인가(Authorization) | `SecurityAuthAnnotationLinterTest`(쓰기축) | 본 §1 + BE헌법 제8조 | 읽기(GET)축·SpEL 역할문자열 |
| 2 | 정체성(esntlId/loginId) | ✅ `IdentityAxisLinterTest`(getCurrentUserId=0 + SecurityContext 직접접근 동결) | `identity-model-guide.md`(충실) | 시맨틱(컬럼축)은 문서 방어 |
| 3 | 트랜잭션 경계 | ✅ **`AsyncTransactionalListenerArchTest`** + **`ServiceReadOnlyTransactionalLinterTest`**(2026-07-18 신설) | 본 §3 | 동결 11서비스 readOnly 검토 |
| 4 | 동시성(check-then-act) | `GlobalExceptionHandler`(409 backstop) + `UniqueConstraintMirrorLinterTest` | 본 §4 | 패턴 자체는 시맨틱 → 문서 |
| 5 | PK 채번 | `PkGenerationStandardLinterTest`(신규 엔티티) | 본 §5 | 수동채번 통일은 시맨틱 → 문서 |
| 6 | 캐싱(Caching) | ✅ **`CachingInvalidationMatrixLinterTest`**(채움↔무효화 양방향, 2026-07-28 신설) | 본 §6(캐시명 SSOT 지향) | 캐시명 상수화(리터럴 산발) |

---

## 1. 인가 (Authorization)

| 항목 | 내용 |
|---|---|
| **관례** | ① 쓰기(POST/PUT/DELETE/PATCH) 엔드포인트는 `@PreAuthorize`/`@Secured`/DB인가(`tb_prgrm_lst`) 중 하나로 함수레벨 보호. ② `/api/v1/admin/**`는 URL 시큐리티(`ApiSecurityConfig`)로 일괄 보호. ③ 소유권 검증은 `SecurityUtil.assertOwnerOrAdmin`(loginId축)/`assertAdmin`, 역할은 `SecurityUtil.hasRole(AuthorityConstants.*)`. ④ 소유권 예외/자기서비스 컨트롤러는 `WRITE_AUTHZ_GUARDED_ELSEWHERE` allow-list에 근거 주석과 함께 등재. |
| **근거** | 백엔드 헌법 제8조(서비스레이어 이중검증), orchestration §3.6 안티패턴. |
| **집행 게이트(있음)** | `SecurityAuthAnnotationLinterTest` 2본: (1) `auditSecurityAnnotationsOnRestControllers` — `nuri.api.controller` 전수(단 `.business`·`.foundation` 하위 제외). (2) `auditWriteEndpointAuthorizationOnNonAdminPaths` — 모든 쓰기 엔드포인트 오딧, `/admin/**`만 제외, allow-list 통과. |
| **미집행 갭** | ① business/foundation의 **읽기(GET) 함수레벨 인가**는 미커버. ② `@PreAuthorize` **역할 SpEL 문자열**은 상수화 미도달(SpEL 파싱 특성상 린트 미도달). ③ allow-list는 수기 신뢰목록. |

---

## 2. 정체성 (Identity: esntlId vs loginId)

| 항목 | 내용 |
|---|---|
| **관례** | `getCurrentEsntlId()`=시스템 PK(=`getUsername`), `getCurrentLoginId()`=**감사/소유권 기본축**, `getCurrentUserId()`는 **@Deprecated**(호출 금지). 감사컬럼(`frstRgtrId` 등) 비교·저장에는 loginId축 사용. esntlId축 소유권 도메인은 명시적 예외(`InformalSanction.aplcntId`, `Board.userId`). |
| **근거** | `docs/03-guides/identity-model-guide.md`(§1~§6), `user-reference-key-policy.md`. |
| **집행 게이트(있음): `IdentityAxisLinterTest`** | `getCurrentUserId` 프로덕션 호출 0 강제 + `SecurityContextHolder` 직접접근 7종 allow-list 동결(2026-07-18 신설, §2.E). `getCurrentUserId` 프로덕션 호출부 0건은 실측 확인(정의부+테스트만 잔존). |
| **미집행 갭** | `getCurrentEsntlId`를 감사컬럼 비교에 오용하거나 `authentication.getName()`을 소유자 필드에 저장하는 회귀를 기계로 못 잡음. "어느 컬럼이 loginId축인가"의 시맨틱은 린트 불가 → 문서가 1차 방어. **6개 관심사 중 문서 커버 최상·실질 봉합됨** → 우선순위 낮음 — 회귀게이트 신설 완료(2026-07-18). |

---

## 3. 트랜잭션 경계 (Transaction Boundary) — 2026-07-18 게이트 신설

| 항목 | 내용 |
|---|---|
| **관례** | ① @Service는 **클래스레벨 `@Transactional(readOnly=true)`**, 쓰기 메서드만 메서드레벨 `@Transactional` 오버라이드. ② 커밋-후 부수효과(async 이벤트 발행·알림)는 발행부에서 **`TransactionUtils.runAfterCommit(...)`**로 감싼다 — 부모 커밋 전 async 기동으로 인한 컨텍스트 파손 방지. ③ 별도 tx 결과기록은 짧은 `Propagation.REQUIRES_NEW` 즉시커밋(`SmsAsyncProcessor`·`MailAsyncProcessor`). ④ 동기 필수 리스너는 `@EventListener`+`Propagation.MANDATORY`(`UserDeletionCleanupListener`). |
| **근거** | **scout5 회귀**(@Async+커밋전 발행→컨텍스트 파손) 사후 확립. `TransactionUtils`(foundation core) javadoc. |
| **🚨 해소된 팬텀 가드** | 종전 3개 리스너 주석이 `RestrictedTransactionalEventListenerFactory`를 "@Async+@TransactionalEventListener 금지 가드"로 인용했으나 **그 클래스는 실존하지 않았다(grep 0)** — 거짓 안전감. `@TransactionalEventListener` 실사용도 0건. 2026-07-18 아래 게이트 A로 **실제 기계강제**로 전환하고 주석을 정정. |
| **집행 게이트(있음·신설)** | **게이트 A** `AsyncTransactionalListenerArchTest` — 한 메서드에 `@Async`+`@TransactionalEventListener` 동시선언 금지(커밋-전-async 차단, @Async 존재성 vacuous-green 가드). **게이트 B** `ServiceReadOnlyTransactionalLinterTest` — @Service는 클래스레벨 `@Transactional(readOnly=true)` 보유 강제(현재 미준수 11종은 `GRANDFATHERED` 동결, 신규 드리프트만 차단). |
| **미집행 갭** | ① "발행부가 `runAfterCommit`로 감쌌는가"는 호출그래프+커밋타이밍 시맨틱이라 정적 린트 불가 → 본 문서 관례로. ② 동결 11서비스(BoardService·CommonCodeService·InstitutionCodeService·MenuIntegrationService·RealTimeDashboardService 등)의 readOnly 적정성은 별도 검토(파일 IO·쓰기 전용은 정당 예외). |

---

## 4. 동시성 (Concurrency / check-then-act)

| 항목 | 내용 |
|---|---|
| **관례** | ① 유니크 충돌은 "check-then-act(`existsById`→throw)" 대신 **DB UNIQUE 제약 + `DataIntegrityViolationException` catch**로 유도. 즉시 검출 필요 시 `saveAndFlush`+catch(`OnlinePollService`). ② 카운터·MAX+1 채번 등 read-modify-write 레이스는 `@Lock(PESSIMISTIC_WRITE)` `findByIdForUpdate`(`BoardRepository`·`BoardMasterRepository`·`NoteTrnsmitDomainRepository`). ③ 모든 제약위반/낙관적락 실패는 전역 핸들러가 409로 정규화. |
| **근거** | scout4~6 레이스 정정, DB 헌법 유니크 미러 원칙. |
| **집행 게이트(부분)** | ① `GlobalExceptionHandler`(`DataIntegrityViolation`→409, `ObjectOptimisticLockingFailure`→409) — check-then-act 잔존분의 **암묵 backstop**. ② `UniqueConstraintMirrorLinterTest` — DB UNIQUE↔엔티티 미러 강제. |
| **미집행 갭** | check-then-act 패턴 자체를 금지하는 전용 게이트 **없음**(잔존: `InstitutionCodeService`·`CommonCodeService`·`UserService`). 전부 PK/유니크 기반이라 DB제약이 backstop하나 패턴은 재발. **시맨틱 판정이라 정적 린트 난이** → 관례 문서화가 적합, 게이트는 과함. |

---

## 5. PK 채번 (Primary Key Generation)

| 항목 | 내용 |
|---|---|
| **관례** | ① 신규 엔티티와 의미 없는 내부 기술키는 `BIGINT` 일련번호 + `@GeneratedValue`(DB 시퀀스/IDENTITY) 우선. ② 외부 코드·보안 주체 등 문자열 자연키의 수동채번은 **`IdGenerationUtil.generateUniqueId(prefix, length, existsPredicate)`** — `repo::existsById` 술어로 충돌 재시도(현재 프로덕션 호출 13곳). ③ `currentTimeMillis()` 등 충돌 취약 채번 금지. |
| **근거** | §2.A egov IdGnr 갈래 소멸 확인, PK 표준 census. |
| **집행 게이트(부분)** | `PkGenerationStandardLinterTest` — 신규 @Entity 단일 @Id에 `@GeneratedValue` 부재 시 위반. GRANDFATHERED 50종 동결. 주소록 2종은 `V2_49`, 도움말은 `V2_50`, 인터넷 서비스 안내는 `V2_51`, 온라인 매뉴얼은 `V2_52`, 팝업은 `V2_53`, 마이페이지 콘텐츠는 `V2_54`, 부서업무함은 `V2_55`, 배너는 `V2_56`, 부서업무는 `V2_57`, 업무일지는 `V2_58`, 자료사용통계는 `V2_59`, 메모보고는 `V2_60`, 포상관리는 `V2_61`에서 BIGINT IDENTITY로 전환해 동결 목록에서 제거했다. `Template`은 값 자체가 레이아웃 계약인 자연키로 재판정해 유지한다. |
| **미집행 갭** | 게이트는 "신규 엔티티 선언"만 커버. 수동채번 write가 반드시 `generateUniqueId`를 쓰도록 강제하는 게이트 없음(5전략 공존, "어느 save가 수동PK인가"는 시맨틱) → 신규 수동채번은 `generateUniqueId` 사용을 본 문서로 유도. |

---

## 6. 캐싱 (Caching)

| 항목 | 내용 |
|---|---|
| **관례(지향 — 현재 미확립)** | ① 캐노니컬 CacheManager는 `foundation/.../config/CacheConfig.java`(Caffeine, `@Profile("!test")`, expireAfterWrite 10분·maxSize 500) 단일. ② **캐시명은 중앙 상수(SSOT)에서만 참조** — 현재 미확립(아래 갭). ③ 무효화는 `allEntries=true`(coarse, 안전측) 기본. ④ 교차서비스 무효화는 소유 서비스가 공개한 상수를 통해서만. |
| **근거** | §1.2 CacheConfig 스텁 삭제, 캐시명 리터럴 산발 실측. |
| **집행 게이트** | ✅ **`CachingInvalidationMatrixLinterTest`**(2026-07-28 신설, pre-push `harnessTest`). 양방향 매트릭스 — `NO_EVICT`(채우는데 지우는 곳 없음 = 영구 stale) · `DEAD_EVICT`(지우는데 채우는 곳 없음 = 오타·잔재). TTL 만으로 충분한 캐시는 `TTL_ONLY_CACHES` 에 **사유와 함께** 등재(현재 0건). |
| **게이트가 실제로 잡은 것** | 신설 첫 실행에서 **`institutionCodes` DEAD_EVICT** 검출 — `InstitutionCodeService.insertInstitutionCodeRecptn` 에 `@CacheEvict("institutionCodes")` 가 있는데 그 이름을 채우는 `@Cacheable` 이 저장소 어디에도 없었다. 위치도 틀려 있었다(수신 로그 등록 메서드이며, 기관코드 CRUD 는 별도 3메서드). **제거 완료.** ⚠ `CacheConfig` 가 `@Profile("!test")` 라 테스트에서는 캐싱이 꺼져 있어 **어떤 테스트도 이 계열을 잡을 수 없다** — 정적 게이트만이 유효하다. |
| **잔여 갭(상수화)** | ① 캐시명 **문자열 리터럴 산발**(`UserService "users"`, `CommonCodeService "commonCodes"`, `MenuService "menuHierarchy"/"allMenuDtos"/"rootMenuIdByUrl"`). ② **교차서비스 evict 결합**: `ProgramService`가 Menu 소유 캐시를 문자열로 중복 evict — 한쪽 rename 시 무음 미스. ③ `CaffeineCacheManager` 동적 생성 → 오타 시 조용히 새 캐시 생성. <br>→ **①②③ 의 실질 위험은 위 매트릭스 게이트가 이미 차단한다**(오타난 이름은 한쪽 집합에만 나타나므로 rename 무음미스도 red 가 된다). 상수화는 남은 가독성·응집도 개선이며, 44개 애노테이션 일괄 치환이라 §0.7-H4(일괄 치환 금지) 상 별도 판단 사항이다. |

### 6.1 캐시명 SSOT / 무효화 매트릭스 (권장 도입)

| 캐시명 상수(권장) | 소유 서비스 | 무효화 트리거 | 교차 evict |
|---|---|---|---|
| `USERS_CACHE="users"` | UserService | user CUD | — |
| `COMMON_CODES="commonCodes"` | CommonCodeService | code CUD | — |
| `MENU_HIERARCHY="menuHierarchy"` | MenuService | menu CUD | ProgramService(program CUD) |
| `ROOT_MENU_ID_BY_URL="rootMenuIdByUrl"` | MenuService | menu CUD | ProgramService |
| `ALL_MENU_DTOS="allMenuDtos"` | MenuService | menu CUD | ProgramService |

> **실행 지침**: 위 상수를 단일 `CacheNames` 클래스로 승격하고 모든 `@Cacheable/@CacheEvict(value=...)`를 상수 참조로 치환한다.
> 이후 `ProgramService`의 Menu 캐시 evict는 MenuService가 노출한 상수만 인용해 rename-무음미스를 제거한다.

---

## 부록 — 신규 코드 체크리스트 (관례 준수 셀프체크)

- [ ] **인가**: 쓰기 엔드포인트에 `@PreAuthorize`/`@Secured`/DB인가 부여했는가? (없으면 `SecurityAuthAnnotationLinterTest` fail)
- [ ] **정체성**: 감사/소유권에 `getCurrentLoginId()`를 썼는가? `getCurrentUserId()`(deprecated)·`authentication.getName()` 직접저장을 피했는가? (`getCurrentUserId` 호출·SecurityContext 직접접근 회귀 시 `IdentityAxisLinterTest` fail)
- [ ] **tx 경계**: @Service에 클래스레벨 `@Transactional(readOnly=true)`를 붙였는가? (없으면 `ServiceReadOnlyTransactionalLinterTest` fail)
- [ ] **tx 경계**: 커밋-후 부수효과를 `TransactionUtils.runAfterCommit`로 감쌌는가? `@Async`+`@TransactionalEventListener` 조합을 피했는가? (조합 시 `AsyncTransactionalListenerArchTest` fail)
- [ ] **동시성**: 유니크 충돌을 `existsById`+throw 대신 DB 제약+catch로 유도했는가?
- [ ] **PK 채번**: 신규 엔티티에 `@GeneratedValue`를, 수동채번엔 `IdGenerationUtil.generateUniqueId`를 썼는가? (없으면 `PkGenerationStandardLinterTest` fail)
- [ ] **캐싱**: 캐시명을 리터럴이 아닌 상수로 참조했는가? 교차서비스 evict가 소유 서비스 상수를 인용하는가?
