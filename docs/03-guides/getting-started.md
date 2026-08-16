# Getting Started — 프레임워크로 새 프로젝트 시작하기 (Onboarding Runbook)

> 이 저장소는 **신규 SI 구축 / 기존 프로젝트 재개발의 베이스 프레임워크**다. 본 런북은 `복제 → 리브랜딩 → 부트스트랩 → 기동 → 커스터마이징`의 실무 절차와 **알려진 제약**을 정리한다.
> 상위 설계 배경은 [framework-reusability-assessment.md](../02-architecture/framework-reusability-assessment.md) 참조.

---

## 0. 아키텍처 한눈에

| 레이어 | 모듈 | 역할 | 재사용 정책 |
|---|---|---|---|
| Backend Core | `foundation` | 응답봉투·예외·감사엔티티·보안백본(JWT/IAM)·crypto·i18n·config | **필수(불변 코어)** |
| Backend Admin | `business-core` | user·auth·code·menu·program·organization·log·system 등 관리 도메인 | **필수** |
| Backend App | `business-app` | 프로젝트 고유/참조 도메인(survey·community·banner·popup·operation 등) | **선택(삭제·교체 대상)** |
| Web Runtime | `api-server` | Controller·Security·Flyway·WebSocket·Batch | 필수 |
| Frontend | `frontend` | Next.js 16 App Router | 필수(화면은 선택 삭제) |

> 의존 방향: `foundation ← business-core ← business-app ← api-server` (비순환 단방향, ArchUnit 강제).

---

## 1. 사전 요구사항

- **JDK 21**, **Node ≥ 22 + pnpm**, **Docker**(로컬 DB), **PowerShell**(Windows) 또는 bash.
- Gradle/wrapper는 저장소에 포함(`./gradlew`).

---

## 2. 복제 & 리브랜딩

```powershell
# 1) 저장소 복제
git clone <this-repo> my-platform && cd my-platform

# 2) 패키지·프로젝트명 리브랜딩 (먼저 -DryRun 으로 영향 범위 확인!)
./scripts/rename-project.ps1 -NewPackage "com.mycompany" -NewProjectName "my-platform" -DryRun
./scripts/rename-project.ps1 -NewPackage "com.mycompany" -NewProjectName "my-platform"

# 3) 리브랜딩 후 컴파일 무결성 확인
./gradlew clean compileJava compileTestJava
```

> `rename-project.ps1`은 `nuri.*` 패키지·`group`·`rootProject.name`·로깅/메트릭 태그를 일괄 치환한다. **반드시 `-DryRun` 선확인** 후 실행하고, 완료 후 컴파일로 검증한다.

---

## 3. 환경 부트스트랩 (시크릿 · DB)
 
### 3.1 원클릭 부트스트랩
이 저장소는 환경변수 복제, 로컬 DB 구동, 패키지 설치를 한 번에 끝내주는 원클릭 부트스트랩을 지원합니다.
```bash
make bootstrap
# 또는 (Windows PowerShell)
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

### 3.2 필수 시크릿 (미설정 시 운영 기동 실패 = fail-fast)
 
| 환경변수 | 용도 | 비고 |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL 접속 | 운영은 기본값 없음(강제 주입) |
| `JWT_SECRET` | JWT 서명키 | 고엔트로피 값 필수 |
| `ALGORITHM_KEY` | PII(주민번호 등) 암복호화 마스터키 | **운영 필수**, 로테이션 시 재암호화 선행 |
| `OLD_ALGORITHM_KEY` | PII 키 회전 중 구키 복호화 폴백 | 평상시 미설정, 회전 창에서만 임시 주입 후 폐기 |
| `CORS_ORIGIN_1` / `CORS_ORIGIN_2` | 운영 CORS 오리진 | `application-prod.yml` |
 
> 로컬/개발은 `application.yml`의 개발용 기본값으로 동작하거나, `bootstrap`이 구성하는 `.env` 및 `application-local.yml`로 구동되지만, **운영(`prod`) 프로필은 위 값이 없으면 기동을 거부**한다. 시크릿은 절대 커밋하지 말 것(`.gitignore`가 `*.key`/`*.pem` 차단, `pre-commit`에 gitleaks 훅 — 설치 시 스테이징 시크릿 차단).
 
### 3.3 로컬 DB 기동 (수동 설정 시)
 
```bash
docker compose up -d db     # postgres:17 (docker-compose.yml)
```
 
> **Flyway 자동 구성**: 빈 PostgreSQL 데이터베이스만 기동해두면, 백엔드 서버 기동 시 `V2_0` baseline(당시 101개 테이블)을 시작으로 후속 생성·정리 마이그레이션과 표준 참조 데이터(메타표준·공통코드·역할/권한·메뉴)가 자동으로 적용됩니다. 2026-08-13 최종 스키마는 **83개 테이블**이며, 별도의 수동 복원이나 SQL 실행이 필요하지 않습니다.
>
> ⚠ **관리자 행은 시드되지만 기본 비밀번호는 시드되지 않습니다.** `R__seed_framework.sql` 은 `webmaster`(`USRCNFRM_00000000001`)와 `ROLE_ADMIN` 매핑을 만들되, 비밀번호에는 로그인 불가 sentinel(`{disabled}...`)을 넣습니다. 최초 기동 전에 `ADMIN_INITIAL_PASSWORD` 환경변수를 주면 `AdminPasswordProvisioner`가 sentinel 상태일 때만 BCrypt 비밀번호를 1회 설정합니다. 설정 후에는 즉시 비밀번호를 변경하고 환경변수를 제거하십시오. 환경변수를 주지 않으면 계정은 로그인 불가 상태로 유지되며, 수동 INSERT는 필요하지 않습니다.

---

## 4. 기동 & 검증

```bash
# 개발 서버(백엔드+프론트 동시)
npm run dev              # = node scripts/dev.mjs (루트 .env 로드 후 API bootRun + FE 동시 기동; JWT_SECRET 대칭 주입으로 서명검증 비대칭 로그인 루프 방지)

# 개별
npm run backend          # gradlew :api-server:bootRun
pnpm -C frontend dev
```

컴파일·타입 게이트(§0.6 HARD):

```bash
./gradlew compileJava compileTestJava     # 백엔드 컴파일 무결성
npx --prefix frontend tsc --noEmit        # (또는) cd frontend && npx tsc --noEmit
```

---

## 5. 커스터마이징

### 5.1 프로젝트 고유 기능 삭제

```powershell
# 삭제 대상 도메인의 BE(도메인/서비스/리포/API)·FE(app/services/types) 경로를 일괄 제거
./scripts/delete-domain.ps1 -DomainName "informalsanction" -DryRun   # 먼저 확인
./scripts/delete-domain.ps1 -DomainName "informalsanction"
```

> 삭제 대상 후보(business-app)와 필수 유지(business-core)의 분류는 [assessment §7 부록](../02-architecture/framework-reusability-assessment.md) 표를 기준으로 한다. 삭제 후 반드시 `clean compileJava compileTestJava`로 회귀 확인.
> FE 라우트는 문자열 URL로만 참조되어 tsc/build가 누락을 못 잡으므로(과거 오삭제 이력), `frontend/src/config/project-modules.ts` 매니페스트도 함께 정리한다.

### 5.2 신규 도메인 추가(스캐폴드)

```powershell
./scripts/generate-domain.ps1 -DomainName "product" -FieldName "title"
```

> `business-app`에 Entity(`BaseEntity` 상속)·Dto·SearchDto·Repository·Service·Controller 골격을 생성한다. 생성 후 QueryDSL Q타입 재생성을 위해 `./gradlew clean :business-app:compileJava` 권장.

> ✅ **스캐폴드는 2026-08-03부터 명시적 CRUD를 생성한다.** 존재하지 않는 `BaseCrudService` / `BaseCrudController` 상속을 제거하고, Service는 클래스레벨 `@Transactional(readOnly = true)` + 쓰기 메서드 트랜잭션, Controller는 `api-server` 배치 + 읽기 `@Authenticated` / 쓰기 `@AdminOrSystem` 관례를 직접 생성한다. Flyway DDL은 버전·표준용어 충돌을 피하려고 파일로 쓰지 않고 검토용 초안만 출력한다.
> 생성 직후에도 도메인별 소유권·인가와 표준 용어는 사람이 확정해야 하며, `./gradlew clean compileJava compileTestJava`로 검증한다.

#### 5.2.1 컨트롤러·서비스 작성 관례 (실존 코드 기준)

아래는 **저장소에 실제로 있는 코드에서 발췌·요약**한 것이다. 원본을 직접 열어 대조할 것.

- 참조 컨트롤러: [`DeptJobApiController`](../../api-server/src/main/java/nuri/api/controller/business/smarttoolkit/DeptJobApiController.java)(인가·로그인 주체 주입 포함), [`AddressBookApiController`](../../api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java)(사용자 소유권 CRUD)
- 참조 서비스: [`DeptJobService`](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java)(채번·소유권 가드), [`AddressBookService`](../../business-app/src/main/java/nuri/business/service/addressbook/AddressBookService.java)(명시 CRUD·소유권)

**Controller** — `api-server` 에 둔다(백엔드 헌법 제1조 4항). 비즈니스 로직은 넣지 않는다.

```java
@Tag(name = "Product", description = "상품 관리 API")           // springdoc
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor                                        // 생성자 주입
public class ProductApiController {

    private final ProductService productService;

    @Operation(summary = "상품 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductDto>>> getProducts(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(productService.getProductList(keyword, pageable))));
    }

    @Operation(summary = "상품 등록")
    @PreAuthorize("isAuthenticated()")                          // 또는 @AdminOnly / @AdminOrSystem
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createProduct(
            @LoginUser CustomUserDetails userDetails,           // 로그인 주체 주입
            @Valid @RequestBody ProductDto dto) {
        return ResponseEntity.ok(ApiResponse.success(
                productService.createProduct(userDetails.getEsntlId(), dto)));
    }
}
```

| 규약 | 실체 | 근거 |
|---|---|---|
| 응답은 **항상** `ResponseEntity<ApiResponse<T>>` | `nuri.foundation.core.response.ApiResponse` — `ApiResponse.success(data)` | BE 헌법 제6조 |
| 페이징 응답은 `PageResponse.of(page)` 로 감싼다 | `nuri.foundation.core.response.PageResponse` | BE 헌법 제6조 |
| Entity 를 반환하지 않는다 (DTO 전용) | `ArchitectureTest.controller_should_not_depend_on_entity`(ArchUnit) | BE 헌법 제3조 |
| 비공개 읽기·쓰기에 명시적 인가 경계 필수 | `@Authenticated`·`@AdminOnly`·`@AdminOrSystem`(`nuri.foundation.security.annotation`) 메타 애노테이션 사용 가능 | BE 헌법 제8조 1항 |
| 로그인 주체는 `@LoginUser CustomUserDetails` 로 받는다 | `nuri.business.security.annotation.LoginUser` | — |
| 요청 본문 검증은 `@Valid @RequestBody` | jakarta validation | — |

> 🔒 **인가 누락은 빌드를 깨뜨린다 — 단, 객체 소유권 의미까지 자동 판정하지는 않는다.** `SecurityAuthAnnotationLinterTest`(`api-server/src/test/java/nuri/api/harness/`)가 화이트리스트·DB 구동 인가 대상이 아닌 읽기·쓰기 엔드포인트에 명시적 인가 애노테이션이 없으면 실패시킨다. 현 스캐폴드는 읽기에 `@Authenticated`, 쓰기에 `@AdminOrSystem`을 생성하므로 도메인 정책에 맞게 조정하되 제거하지 말 것.
>
> ⚠ **집행 범위를 정확히 알아 둘 것**(2026-08-03 현행화). 이 문단은 두 번 틀렸다 — 처음엔 "모든 엔드포인트를 전수 조사"라는 **과장**이었고, 그 정정본은 패키지 skip 이 삭제되면서 **낡아서** 틀렸다.
>
> 현재: Test#1 은 **패키지 skip 없이 전 컨트롤러의 읽기·쓰기를 순회**한다. ① 공개 화이트리스트 ② 인가 애노테이션/메타 애노테이션 존재 ③ `rbac.db-auth.secure-paths`·DB 프로그램 URL 매칭 중 하나만 통과한다. Test#2 는 **쓰기만** 보고 `/api/v1/admin/`은 URL 시큐리티에 위임한다. 2026-08-15 쓰기 사유로 읽기까지 면제하던 30건 census와 12개 클래스 allow-list는 제거했다.
>
> 그래서 **"모든 컨트롤러를 순회한다"는 참이지만 "인가 의미까지 모두 검증한다"는 거짓**이다. 신규 경로가 `secure-paths`에서 빠지고 인가 애노테이션도 없으면 린터가 위반으로 잡으므로 조용히 통과하지 않는다. 다만 ②는 `@PreAuthorize("isAuthenticated()")`처럼 IDOR 방어력이 없는 애노테이션도 존재 조건을 만족하므로, 읽기·사용자 소유 데이터는 서비스 계층 소유권 가드를 별도로 붙여야 한다. 최신 범위는 항상 린터 javadoc(`SecurityAuthAnnotationLinterTest` 클래스 주석)을 SSOT 로 삼을 것.

**Service** — 재사용 admin 코어면 `business-core`, 프로젝트 고유 도메인이면 `business-app`(BE 헌법 제1조).

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)                 // 클래스 기본값: 읽기 전용
public class ProductService extends BaseAbstractService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;  // MapStruct

    public ProductDto getProduct(String id) {
        return productRepository.findById(id)
                .map(productMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional                              // 쓰기 메서드만 오버라이드
    public String createProduct(String userId, ProductDto dto) {
        // 할당식 PK(@GeneratedValue 없음)는 서버가 채번한다. 접두사+길이 합이 컬럼 상한 이하여야 한다.
        String id = IdGenerationUtil.generateUniqueId("PROD_", 15, productRepository::existsById);
        productRepository.save(Product.builder().productId(id) /* ... */ .build());
        return id;
    }

    @Transactional
    public void updateProduct(String id, ProductDto dto) {
        Product entity = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());   // IDOR 방어(서비스 계층 재검증)
        entity.update(dto.getTitle() /* ... */);                   // 더티 체킹 — save() 재호출 불필요
    }
}
```

| 규약 | 실체 | 근거 |
|---|---|---|
| 클래스에 `@Transactional(readOnly = true)`, 쓰기 메서드만 `@Transactional` | `ServiceReadOnlyTransactionalLinterTest`(api-server 하네스)가 신규 `@Service` 누락을 빌드 실패 처리 | BE 헌법 제9조 1항 |
| Entity↔DTO 변환은 **MapStruct** `@Mapper(componentModel = "spring")` | 예: `DeptJobMapper` — 수기 `from()` 대체 | README §프로젝트 구조 |
| 미존재 리소스는 `new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND)` → 전역 핸들러가 404 변환 | `GlobalExceptionHandler` | BE 헌법 제7조 |
| 소유권 재검증은 `SecurityUtil.assertOwnerOrAdmin(...)` / `assertAdmin()` | `nuri.business.security.util.SecurityUtil` | BE 헌법 제8조 |
| 소유자 축(`loginId` vs `esntlId`)을 **대상 컬럼이 실제 저장하는 축과 일치**시킨다 | `IdentityAxisLinterTest` 가 `getCurrentUserId()` 사용을 차단 | BE 헌법 제8조 2항 · [identity-model-guide.md](identity-model-guide.md) |
| 상태 전이 로직은 엔티티 메서드(`entity.update(...)`)에 캡슐화 | — | BE 헌법 제5조 |
| 공통 가드(`required`/`notBlank`/`toPage`)는 `BaseAbstractService` 상속으로 사용 | `business-core/.../core/service/BaseAbstractService.java` | — |

> ⚠ `required(...)` 는 **프로그래밍 오류를 잡는 가드**다. 물리 스키마상 nullable 인 도메인 값에 걸면 데이터가 생기는 순간 조회가 400 으로 깨진다(`DeptJobService.toDto` 주석의 실제 사고 사례 참조).

**DB 테이블** — 스캐폴드는 `@Table(name = "tb_<domain>")` 를 찍지만 **테이블을 만들어 주지는 않는다.** `api-server/src/main/resources/db/migration/` 에 **현재 최신 파일을 확인한 뒤 다음 번호**(2026-08-16 실측 최신 `V2_83__sms_bigint_identity.sql`, 다음은 `V2_84`)로 `V2_NN__create_tb_product.sql` 을 추가한다. ⚠ 이 번호는 빠르게 진행하므로 **문서 값을 믿지 말고 `ls` 로 직접 확인**할 것. 컬럼·객체 명명은 DB 헌법 제1~3조와 `meta_standard_words` 실조회를 따른다. Hibernate `ddl-auto: validate` 이므로 테이블이 없으면 **기동이 거부**된다.

---

## 6. ⚠ 알려진 제약 (반드시 숙지 — 프레임워크화 진행 중)

프레임워크化가 **대부분 진척**됐다. 아래는 파생 프로젝트 착수 전 인지해야 할 현황과 **설계 결정(2026-07-11)**이다.

### 6.1 빈 DB 부트스트랩 — 해소 (2026-07-11)
- 레거시 `V1.x` 델타를 제거하고 **`V2_0__baseline.sql`(초기 101 테이블) + `V2_1`(메타표준) + `V2_2`(프레임워크 권한·메뉴 데이터) + `R__seed_framework`** 로 재구성했다. 후속 도메인 정리까지 적용한 현재 최종 상태는 83개 테이블이다.
- **Docker 빈 Postgres 17에 `V2_0→V2_1→V2_2→R__` 전체를 `ON_ERROR_STOP=1`로 클린 적용 실증**(문법·FK 정합). 빈 DB 부트스트랩 가능.
- **CI가 매번 실 PostgreSQL 17에서 Flyway 전량 적용 → Hibernate `ddl-auto:validate` → 쓰기 smoke를 실행한다.** 현재 계약 검사는 80개 엔티티·83개 테이블·888개 컬럼을 대조하며 drift 0이다.

### 6.2 RBAC 인가 — DB 경로 인가 집행 + 메서드 인가 병행
- `rbac.db-auth.enabled: true`이며 `secure-paths`는 `DbUrlAuthorizationManager`가 DB 권한으로 런타임 집행한다. 이전의 “DB 주도 인가 보류” 상태가 아니다.
- 그 밖의 세부 업무 규칙은 `@PreAuthorize`·보안 메타 애노테이션·서비스 소유권 가드가 담당하고, 메뉴 가시성은 DB(`tb_menu_crt_dtl`)에서 결정한다. 경로 인가와 도메인 소유권은 서로 대체 관계가 아니다.

### 6.3 멀티테넌시 — 단일 테넌트 (설계 결정)
- **결정: 이 프레임워크는 단일 테넌트(single-tenant)를 전제한다.** 행-레벨 다기관 격리(`@TenantId` 등)는 **범위 밖**이며 결함(gap)이 아니다. 다기관 SI가 필요하면 파생 프로젝트에서 별도 도입한다.

### 6.4 브랜딩 부분 토큰화
- 브랜딩 토큰화가 대부분 반영(커밋 `7f2958179`)됐으나 일부 admin 화면에 `slate-*`/`gray-*` 잔존. 브랜드 색 완전 교체는 잔여 컴포넌트 치환 필요.

### 6.5 진행 중 (프레임워크化 확장, 2026-07-11 결정)
- **생산성 전면화**: MapStruct `@Mapper` 표준을 기존 도메인까지 마이그레이션 진행 중(수기 `from()` 제거).
- ✅ **제네릭 CRUD는 채택하지 않고 명시적 CRUD로 종결했다.** `generate-domain.ps1`도 같은 관례의 컴파일 가능한 Service·Controller 초안을 생성한다(§5.2). 도메인별 소유권과 DDL 표준 용어는 생성 후 검토한다.
- **레거시 데이터 이관 도구**: 범용 소스↔표준 스키마 매핑·ETL·검증 골격 **선제 구축** 착수.
- 도입 완료: API 오류 MessageSource ko/en 협상(프런트 UI는 한국어 단일언어), 감사 로그 영속(`WebAuditLogListener` @Async), 도메인 이벤트 seam, 시크릿 외부화. 제품 경계는 [ADR](../02-architecture/decisions/README.md)을 따른다.

---

## 7. 품질 게이트 (완료 전 필수)

| 도메인 | 명령 | 근거 |
|---|---|---|
| Backend 컴파일 | `./gradlew compileJava compileTestJava --warning-mode fail` | §0.6 HARD |
| Backend 구조·보안 하네스 | `./gradlew :api-server:harnessTest` | 29개 하네스 클래스의 구조·계약·인가 린터 |
| 실 DB 부트스트랩·스키마 | `./gradlew :api-server:schemaValidationTest` | Docker PostgreSQL 17 + Flyway + Hibernate validate + 쓰기 smoke |
| Backend 전체 로컬 게이트 | `./gradlew localGate` | 하네스·실 DB·전 모듈 테스트·JaCoCo·프런트 unit coverage |
| Full-stack 통합 게이트 | `npm run verify` / `make verify` | Backend·Frontend 핵심 게이트 단일 진입점(실 DB/E2E는 별도) |
| Frontend 타입 | `cd frontend && npx tsc --noEmit` | §0.6 HARD |
| 커버리지 | `make coverage` / `pnpm -C frontend test:coverage` | Backend JaCoCo + Frontend Vitest(30/25/25/30 하한) |
| 시크릿 스캔 | `gitleaks protect --staged --verbose`(설치 시) | pre-commit은 로컬 보조, CI `secret-scan`이 required check |
| 브랜치 보호 정합 | `npm run verify:ops` | 저장소 명세·CI·실제 GitHub ruleset 대조(네트워크·관리 읽기 권한 필요) |

---
*Last Updated: 2026-08-16 (드리프트 정정 — Frontend Vitest **122파일/1,206케이스** 실측, coverage 하한 **34/27/31/35**(`vitest.config.mts:81-86`), 마이그레이션 최신 번호 `V2_48`→`V2_83` 정정. 종전 "88파일/444테스트·30/25/25/30" 서술은 실측과 어긋나 있었다. 이전: 2026-08-15 Codex — Frontend Vitest coverage 하한 동기화. 2026-08-13 Node 22·관리자 최초 프로비저닝·explicit CRUD 스캐폴드·DB RBAC 집행·80엔티티/83테이블/888컬럼 실 DB 검증.)*
