# 횡단관심사 관례 (Cross-Cutting Conventions)

> **목적**: 인가·정체성·트랜잭션 경계·동시성·PK 채번·캐싱을 엔드포인트마다 다르게 구현하지 않도록 현재 관례와 집행 범위를 한곳에 모은다.
> 각 관심사를 `[관례 / 근거 / 집행 게이트 / 미집행 갭]`으로 기록하되 **현실 그대로**(있는 게이트는 있다고, 없으면 없다고) 적는다.
> 규범은 관련 헌법이 우선하며, 게이트의 실제 범위는 링크된 테스트 소스가 정본이다.

---

## 요약 — 관심사별 체계화 현황

| # | 횡단관심사 | 집행 게이트(기계강제) | 관례 문서 | 잔여 갭 |
|:-:|---|---|:-:|---|
| 1 | 인가(Authorization) | `SecurityAuthAnnotationLinterTest`(읽기·쓰기 명시 경계) | 본 §1 + BE헌법 제8조 | 애노테이션 의미·SpEL 역할문자열 |
| 2 | 정체성(esntlId/loginId) | `IdentityAxisLinterTest`(deprecated API·직접 접근 동결) | [정체성 모델 가이드](./identity-model-guide.md) | 컬럼축 의미는 코드 리뷰·테스트 필요 |
| 3 | 트랜잭션 경계 | `AsyncTransactionalListenerArchTest` + `ServiceReadOnlyTransactionalLinterTest` | 본 §3 | 동결 예외의 적정성은 별도 검토 |
| 4 | 동시성(check-then-act) | `GlobalExceptionHandler`(409 backstop) + `UniqueConstraintMirrorLinterTest` | 본 §4 | 패턴 자체는 시맨틱 → 문서 |
| 5 | PK 채번 | `PkGenerationStandardLinterTest`(신규·동결 엔티티) | 본 §5 | 자연키·복합키·외부키 예외는 테스트 baseline 소유 |
| 6 | 캐싱(Caching) | `CachingInvalidationMatrixLinterTest`(채움↔무효화 양방향) | 본 §6(캐시명 SSOT 지향) | 캐시명 상수화(리터럴 산발) |

---

## 1. 인가 (Authorization)

| 항목 | 내용 |
|---|---|
| **관례** | ① 비공개 읽기·쓰기 엔드포인트는 `@Authenticated`/`@PreAuthorize`/`@Secured` 또는 DB인가(`tb_prgrm_lst`)로 컨트롤러 경계를 명시한다. ② `/api/v1/admin/**`는 URL 시큐리티(`ApiSecurityConfig`)로 일괄 보호한다. ③ 개인 데이터는 컨트롤러 인증과 별개로 `SecurityUtil.assertOwnerOrAdmin`(loginId축), 참여자 스코프 쿼리, `assertAdmin` 등 서비스 2차 가드를 둔다. ④ 공개 API는 `@PublicApi`/공개 화이트리스트로 의도를 드러낸다. 클래스 단위 담요 면제는 사용하지 않는다. |
| **근거** | 백엔드 헌법 제8조(서비스레이어 이중검증), orchestration §3.6 안티패턴. |
| **집행 게이트(있음)** | `SecurityAuthAnnotationLinterTest`: (1) `auditSecurityAnnotationsOnRestControllers`는 `nuri.api.controller`의 읽기·쓰기를 순회해 공개 선언·명시 애노테이션·DB URL 인가 중 하나를 요구한다. (2) `auditWriteEndpointAuthorizationOnNonAdminPaths`는 비-admin 쓰기 엔드포인트의 명시 경계를 재검증한다. |
| **미집행 갭** | ① `@Authenticated`의 존재만으로 객체 소유권까지 증명하지는 못하므로 개인 데이터는 서비스 음성 테스트가 계속 필요하다. ② `@PreAuthorize` **역할 SpEL 문자열**은 상수화 미도달(SpEL 파싱 특성상 린트 미도달). ③ `secure-paths` 문자열과 DB URL 인가는 별도 동기화 게이트에 의존한다. |

---

## 2. 정체성 (Identity: esntlId vs loginId)

| 항목 | 내용 |
|---|---|
| **관례** | `getCurrentEsntlId()`=시스템 PK(=`getUsername`), `getCurrentLoginId()`=**감사/소유권 기본축**, `getCurrentUserId()`는 **@Deprecated**(호출 금지). 감사컬럼(`frstRgtrId` 등) 비교·저장에는 loginId축 사용. esntlId축 소유권 도메인은 명시적 예외(`InformalSanction.aplcntId`, `Board.userId`). |
| **근거** | [정체성 모델 가이드](./identity-model-guide.md), [사용자 참조 키 정책](../02-architecture/user-reference-key-policy.md). |
| **집행 게이트(있음): `IdentityAxisLinterTest`** | deprecated `getCurrentUserId`의 프로덕션 호출과 도메인 코드의 `SecurityContextHolder` 직접 접근이 동결 범위를 벗어나면 실패한다. |
| **미집행 갭** | `getCurrentEsntlId`를 감사컬럼 비교에 오용하거나 `authentication.getName()`을 소유자 필드에 저장하는 의미 오류는 정적으로 완전 판정할 수 없다. 어느 컬럼이 어느 축인지 채움 지점에서 확인해야 한다. |

---

## 3. 트랜잭션 경계 (Transaction Boundary)

| 항목 | 내용 |
|---|---|
| **관례** | ① @Service는 **클래스레벨 `@Transactional(readOnly=true)`**, 쓰기 메서드만 메서드레벨 `@Transactional` 오버라이드. ② 커밋-후 부수효과(async 이벤트 발행·알림)는 발행부에서 **`TransactionUtils.runAfterCommit(...)`**로 감싼다 — 부모 커밋 전 async 기동으로 인한 컨텍스트 파손 방지. ③ 별도 tx 결과기록은 짧은 `Propagation.REQUIRES_NEW` 즉시커밋(`SmsAsyncProcessor`·`MailAsyncProcessor`). ④ 동기 필수 리스너는 `@EventListener`+`Propagation.MANDATORY`(`UserDeletionCleanupListener`). |
| **근거** | [백엔드 헌법 제9·10조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md), `TransactionUtils` javadoc. |
| **집행 게이트(있음)** | `AsyncTransactionalListenerArchTest`는 한 메서드의 `@Async`+`@TransactionalEventListener` 동시 선언을 금지한다. `ServiceReadOnlyTransactionalLinterTest`는 신규 `@Service`의 클래스레벨 `@Transactional(readOnly=true)`를 요구하고 명시된 기존 예외를 동결한다. |
| **미집행 갭** | 발행부가 `runAfterCommit`로 감쌌는지는 호출 그래프와 커밋 타이밍의 의미라 정적 린트로 완전 판정할 수 없다. 동결 서비스의 예외 사유도 변경 시 재검토한다. |

---

## 4. 동시성 (Concurrency / check-then-act)

| 항목 | 내용 |
|---|---|
| **관례** | ① 유니크 충돌은 "check-then-act(`existsById`→throw)" 대신 **DB UNIQUE 제약 + `DataIntegrityViolationException` catch**로 유도. 즉시 검출 필요 시 `saveAndFlush`+catch(`OnlinePollService`). ② 카운터·MAX+1 채번 등 read-modify-write 레이스는 `@Lock(PESSIMISTIC_WRITE)` `findByIdForUpdate`(`BoardRepository`·`BoardMasterRepository`·`NoteTrnsmitDomainRepository`). ③ 모든 제약위반/낙관적락 실패는 전역 핸들러가 409로 정규화. |
| **근거** | DB 헌법 유니크 미러 원칙과 실제 서비스의 락·제약 처리 패턴. |
| **집행 게이트(부분)** | ① `GlobalExceptionHandler`(`DataIntegrityViolation`→409, `ObjectOptimisticLockingFailure`→409) — check-then-act 잔존분의 **암묵 backstop**. ② `UniqueConstraintMirrorLinterTest` — DB UNIQUE↔엔티티 미러 강제. |
| **미집행 갭** | check-then-act 패턴 자체를 금지하는 전용 게이트 **없음**(잔존: `InstitutionCodeService`·`CommonCodeService`·`UserService`). 전부 PK/유니크 기반이라 DB제약이 backstop하나 패턴은 재발. **시맨틱 판정이라 정적 린트 난이** → 관례 문서화가 적합, 게이트는 과함. |

---

## 5. PK 채번 (Primary Key Generation)

| 항목 | 내용 |
|---|---|
| **관례** | ① 신규 엔티티와 의미 없는 내부 기술키는 `BIGINT` 일련번호 + `@GeneratedValue`(DB 시퀀스/IDENTITY) 우선. ② 외부 코드·보안 주체 등 문자열 자연키의 수동채번은 **`IdGenerationUtil.generateUniqueId(prefix, length, existsPredicate)`**로 충돌을 재확인한다. ③ `currentTimeMillis()` 등 충돌 취약 채번 금지. |
| **근거** | §2.A egov IdGnr 갈래 소멸 확인, PK 표준 census. |
| **집행 게이트(부분)** | `PkGenerationStandardLinterTest`는 신규 `@Entity`의 단일 `@Id`에 `@GeneratedValue`가 없으면 실패시키고, 명시된 기존 자연키·복합키·외부키 예외만 동결한다. 어떤 엔티티가 예외인지는 테스트 소스의 현재 baseline이 정본이다. |
| **미집행 갭** | 게이트는 "신규 엔티티 선언"만 커버. 수동채번 write가 반드시 `generateUniqueId`를 쓰도록 강제하는 게이트 없음(5전략 공존, "어느 save가 수동PK인가"는 시맨틱) → 신규 수동채번은 `generateUniqueId` 사용을 본 문서로 유도. |

---

## 6. 캐싱 (Caching)

| 항목 | 내용 |
|---|---|
| **관례(지향 — 현재 미확립)** | ① 캐노니컬 CacheManager는 `foundation/.../config/CacheConfig.java`(Caffeine, `@Profile("!test")`, expireAfterWrite 10분·maxSize 500) 단일. ② **캐시명은 중앙 상수(SSOT)에서만 참조** — 현재 미확립(아래 갭). ③ 무효화는 `allEntries=true`(coarse, 안전측) 기본. ④ 교차서비스 무효화는 소유 서비스가 공개한 상수를 통해서만. |
| **근거** | `foundation/.../config/CacheConfig.java`와 현재 서비스의 `@Cacheable`/`@CacheEvict` 선언. |
| **집행 게이트** | `CachingInvalidationMatrixLinterTest`(pre-push `harnessTest`)가 `NO_EVICT`(채우지만 지우지 않음)와 `DEAD_EVICT`(지우지만 채우지 않음)를 양방향으로 검사한다. TTL만으로 충분한 캐시는 테스트 소스의 `TTL_ONLY_CACHES`에 사유를 명시한다. |
| **잔여 갭(상수화)** | ① 캐시명 **문자열 리터럴 산발**(`UserService "users"`, `CommonCodeService "commonCodes"`, `MenuService "menuHierarchy"/"allMenuDtos"/"rootMenuIdByUrl"`). ② **교차서비스 evict 결합**: `ProgramService`가 Menu 소유 캐시를 문자열로 중복 evict — 한쪽 rename 시 무음 미스. ③ `CaffeineCacheManager` 동적 생성 → 오타 시 조용히 새 캐시 생성. <br>위 매트릭스 게이트가 한쪽에만 나타난 이름을 차단하더라도 상수화는 가독성·응집도 개선에 유효하다. 변경 대상별 캐시 의미와 소유자를 확인해 단계적으로 적용한다. |

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

*Last reviewed against current sources: 2026-08-19.*

---

## 부록 — 신규 코드 체크리스트 (관례 준수 셀프체크)

- [ ] **인가**: 쓰기 엔드포인트에 `@PreAuthorize`/`@Secured`/DB인가 부여했는가? (없으면 `SecurityAuthAnnotationLinterTest` fail)
- [ ] **정체성**: 감사/소유권에 `getCurrentLoginId()`를 썼는가? `getCurrentUserId()`(deprecated)·`authentication.getName()` 직접저장을 피했는가? (`getCurrentUserId` 호출·SecurityContext 직접접근 회귀 시 `IdentityAxisLinterTest` fail)
- [ ] **tx 경계**: @Service에 클래스레벨 `@Transactional(readOnly=true)`를 붙였는가? (없으면 `ServiceReadOnlyTransactionalLinterTest` fail)
- [ ] **tx 경계**: 커밋-후 부수효과를 `TransactionUtils.runAfterCommit`로 감쌌는가? `@Async`+`@TransactionalEventListener` 조합을 피했는가? (조합 시 `AsyncTransactionalListenerArchTest` fail)
- [ ] **동시성**: 유니크 충돌을 `existsById`+throw 대신 DB 제약+catch로 유도했는가?
- [ ] **PK 채번**: 신규 엔티티에 `@GeneratedValue`를, 수동채번엔 `IdGenerationUtil.generateUniqueId`를 썼는가? (없으면 `PkGenerationStandardLinterTest` fail)
- [ ] **캐싱**: 캐시명을 리터럴이 아닌 상수로 참조했는가? 교차서비스 evict가 소유 서비스 상수를 인용하는가?
