# Getting Started — 프레임워크로 새 프로젝트 시작하기 (Onboarding Runbook)

> 이 저장소는 **신규 SI 구축 / 기존 프로젝트 재개발의 베이스 프레임워크**다. 본 런북은 `복제 → 리브랜딩 → 부트스트랩 → 기동 → 커스터마이징`의 실무 절차와 **알려진 제약**을 정리한다.
> 상위 설계 배경은 [framework-reusability-assessment.md](../02-architecture/framework-reusability-assessment.md) 참조.

---

## 0. 아키텍처 한눈에

| 레이어 | 모듈 | 역할 | 재사용 정책 |
|---|---|---|---|
| Backend Core | `foundation` | 응답봉투·예외·감사엔티티·보안백본(JWT/IAM)·crypto·i18n·config | **필수(불변 코어)** |
| Backend Admin | `business-core` | user·auth·code·menu·program·organization·log·system 등 관리 도메인 | **필수** |
| Backend App | `business-app` | 프로젝트 고유/앱 도메인(informalsanction·operation·memoreport 등) | **선택(삭제·교체 대상)** |
| Web Runtime | `api-server` | Controller·Security·Flyway·WebSocket·Batch | 필수 |
| Frontend | `frontend` | Next.js 16 App Router | 필수(화면은 선택 삭제) |

> 의존 방향: `foundation ← business-core ← business-app ← api-server` (비순환 단방향, ArchUnit 강제).

---

## 1. 사전 요구사항

- **JDK 21**, **Node ≥ 20 + pnpm**, **Docker**(로컬 DB), **PowerShell**(Windows) 또는 bash.
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
| `CORS_ORIGIN_1` / `CORS_ORIGIN_2` | 운영 CORS 오리진 | `application-prod.yml` |
 
> 로컬/개발은 `application.yml`의 개발용 기본값으로 동작하거나, `bootstrap`이 구성하는 `.env` 및 `application-local.yml`로 구동되지만, **운영(`prod`) 프로필은 위 값이 없으면 기동을 거부**한다. 시크릿은 절대 커밋하지 말 것(`.gitignore`가 `*.key`/`*.pem` 차단, `pre-commit`에 gitleaks 훅 — 설치 시 스테이징 시크릿 차단).
 
### 3.3 로컬 DB 기동 (수동 설정 시)
 
```bash
docker compose up -d db     # postgres:17 (docker-compose.yml)
```
 
> **Flyway 자동 구성**: 빈 PostgreSQL 데이터베이스만 기동해두면, 백엔드 서버 기동 시 `V2_0` baseline을 시작으로 스키마(101개 테이블) 및 표준 참조 데이터(메타표준·공통코드·역할/권한·메뉴)가 자동으로 마이그레이션 및 로드됩니다. 별도의 수동 복원이나 SQL 실행이 필요하지 않습니다.
>
> ⚠ **단, 로그인 가능한 관리자 *계정*은 시드되지 않습니다.** V2_2 는 `ROLE_ADMIN` 권한/메뉴 구조만 넣고 `tb_user_info` 행은 생성하지 않습니다(계정 시드는 별도 승인·런타임 검증이 필요한 보류 항목). 최초 계정은 회원가입 플로우 또는 수동 INSERT 로 만드십시오.

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

> `business-app`에 Entity(`BaseTimeEntity` 상속)·Dto·SearchDto·Repository·Service·Controller 골격을 생성한다. 생성 후 QueryDSL Q타입 재생성을 위해 `./gradlew clean :business-app:compileJava` 권장.

> ⚠ **스캐폴드 산출물은 그대로는 컴파일되지 않는다 (2026-07-20 실측).**
> `generate-domain.ps1`이 찍어내는 Service·Controller 는 `nuri.business.core.crud.BaseCrudService` / `BaseCrudController` 를 상속하지만, **이 두 클래스는 저장소에 존재하지 않는다.** (`BaseCrud` 전수 검색 결과 Java 정의 0건 — 참조처는 이 스크립트와 일부 문서뿐. 배경은 [quality-score-root-cause-analysis.md](../02-architecture/quality-score-root-cause-analysis.md) "Generic CRUD: 채택 0" 항목.)
> 따라서 **생성된 `*Service.java`·`*Controller.java` 두 파일은 아래 §5.2.1의 실존 관례대로 다시 작성**해야 한다. Entity·Dto·SearchDto·Repository 골격은 그대로 사용 가능하다.

#### 5.2.1 컨트롤러·서비스 작성 관례 (실존 코드 기준)

아래는 **저장소에 실제로 있는 코드에서 발췌·요약**한 것이다. 원본을 직접 열어 대조할 것.

- 참조 컨트롤러: [`DeptJobApiController`](../../api-server/src/main/java/nuri/api/controller/business/smarttoolkit/DeptJobApiController.java)(인가·로그인 주체 주입 포함), [`FaqApiController`](../../api-server/src/main/java/nuri/api/controller/business/faq/FaqApiController.java)(최소 CRUD)
- 참조 서비스: [`DeptJobService`](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java)(채번·소유권 가드), [`FaqService`](../../business-app/src/main/java/nuri/business/service/faq/FaqService.java)(최소 CRUD)

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
| 쓰기(POST/PUT/DELETE/PATCH)에 `@PreAuthorize` 필수 | `@AdminOnly`·`@AdminOrSystem`(`nuri.foundation.security.annotation`) 메타 애노테이션 사용 가능 | BE 헌법 제8조 1항 |
| 로그인 주체는 `@LoginUser CustomUserDetails` 로 받는다 | `nuri.business.security.annotation.LoginUser` | — |
| 요청 본문 검증은 `@Valid @RequestBody` | jakarta validation | — |

> 🔒 **인가 누락은 빌드를 깨뜨린다 — 단, 전부는 아니다.** `SecurityAuthAnnotationLinterTest`(`api-server/src/test/java/nuri/api/harness/`)가 화이트리스트·DB 구동 인가(`/admin/**` URL 시큐리티) 대상이 아닌 **쓰기(POST/PUT/DELETE/PATCH) 엔드포인트에 `@PreAuthorize`/`@Secured` 가 없으면 실패**시킨다. 스캐폴드가 생성하는 컨트롤러에는 이 애노테이션이 없으므로 반드시 직접 추가할 것.
>
> ⚠ **집행 범위를 정확히 알아 둘 것**(2026-08-02 실측 정정). 종전 이 문서는 "모든 엔드포인트를 리플렉션으로 전수 조사"라고 적었으나 **사실이 아니었다**. 실제 분담은 두 테스트로 갈린다 — Test#1 은 읽기·쓰기를 모두 보지만 `.business`·`.foundation` 패키지를 통째로 skip 해 **URL쌍 358개 중 25개(7.0%)** 만 본다. Test#2 는 전 컨트롤러를 보지만 **쓰기만** 본다. 그 결과 **`.business`/`.foundation` 의 읽기 엔드포인트 49건은 어느 쪽도 보지 않는다** — 읽기 IDOR(타인 상세 조회)은 이 게이트가 잡지 못하므로 직접 소유권 가드를 붙여야 한다. 최신 범위는 항상 린터 javadoc(`SecurityAuthAnnotationLinterTest` 클래스 주석)을 SSOT 로 삼을 것.

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

**DB 테이블** — 스캐폴드는 `@Table(name = "tb_<domain>")` 를 찍지만 **테이블을 만들어 주지는 않는다.** `api-server/src/main/resources/db/migration/` 에 **최신 파일 다음 번호**(2026-07 기준 `V2_30` 이후)로 `V2_NN__create_tb_product.sql` 을 추가한다. 컬럼·객체 명명은 DB 헌법 제1~3조와 `meta_standard_words` 실조회를 따른다. Hibernate `ddl-auto: validate` 이므로 테이블이 없으면 **기동이 거부**된다.

---

## 6. ⚠ 알려진 제약 (반드시 숙지 — 프레임워크화 진행 중)

프레임워크化가 **대부분 진척**됐다. 아래는 파생 프로젝트 착수 전 인지해야 할 현황과 **설계 결정(2026-07-11)**이다.

### 6.1 빈 DB 부트스트랩 — 해소 (2026-07-11)
- 레거시 `V1.x` 델타를 제거하고 **`V2_0__baseline.sql`(101 테이블) + `V2_1`(메타표준) + `V2_2`(admin 시드) + `R__seed_framework`** 로 재구성했다.
- **Docker 빈 Postgres 17에 `V2_0→V2_1→V2_2→R__` 전체를 `ON_ERROR_STOP=1`로 클린 적용 실증**(문법·FK 정합). 빈 DB 부트스트랩 가능.
- 남은 확인: 실 `bootRun`의 Hibernate `ddl-auto:validate` 무드리프트(92 엔티티 ↔ 101 테이블)는 라이브 기동 시 최종 확인 권장.

### 6.2 RBAC 인가 — 하이브리드 (설계 결정)
- **결정: 하이브리드 모델 유지.** 인가는 `@PreAuthorize` + `AuthorityConstants`로 중앙화된 role 리터럴 + DB(`tb_menu_crt_dtl`) 메뉴 가시성의 조합이다.
- **완전 DB 주도 런타임 인가(경로→권한 AuthorizationManager)는 의도적 보류** — 단일 SI 규모에 과설계로 판단. 확장 지점은 열려 있다.

### 6.3 멀티테넌시 — 단일 테넌트 (설계 결정)
- **결정: 이 프레임워크는 단일 테넌트(single-tenant)를 전제한다.** 행-레벨 다기관 격리(`@TenantId` 등)는 **범위 밖**이며 결함(gap)이 아니다. 다기관 SI가 필요하면 파생 프로젝트에서 별도 도입한다.

### 6.4 브랜딩 부분 토큰화
- 브랜딩 토큰화가 대부분 반영(커밋 `7f2958179`)됐으나 일부 admin 화면에 `slate-*`/`gray-*` 잔존. 브랜드 색 완전 교체는 잔여 컴포넌트 치환 필요.

### 6.5 진행 중 (프레임워크化 확장, 2026-07-11 결정)
- **생산성 전면화**: MapStruct `@Mapper` 표준을 기존 도메인까지 마이그레이션 진행 중(수기 `from()` 제거).
- ⚠ **제네릭 CRUD(`BaseCrudController`/`BaseCrudService`)는 구현되지 않았다** — 클래스 자체가 저장소에 없다(2026-07-20 실측). `generate-domain.ps1` 만 이를 상속하는 코드를 생성하므로 스캐폴드 산출물은 손봐야 컴파일된다(§5.2). CRUD 는 §5.2.1 의 명시적 관례로 작성한다.
- **레거시 데이터 이관 도구**: 범용 소스↔표준 스키마 매핑·ETL·검증 골격 **선제 구축** 착수.
- 도입 완료: i18n `next-intl`(seam + 로케일 카탈로그 `messages/{ko,en}.json`), 감사 로그 영속(`WebAuditLogListener` @Async), 도메인 이벤트 seam, 시크릿 외부화.

---

## 7. 품질 게이트 (완료 전 필수)

| 도메인 | 명령 | 근거 |
|---|---|---|
| Backend 컴파일 | `./gradlew compileJava compileTestJava` | §0.6 HARD |
| Backend 부팅 | `./gradlew :api-server:test --tests "*SecurityAuthAnnotationLinterTest"` | 컨텍스트 로드 실증 |
| Frontend 타입 | `cd frontend && npx tsc --noEmit` | §0.6 HARD |
| 커버리지 | `make coverage` / `npm run test:coverage` | JaCoCo |
| 보안 | `/security-review`(수동) + gitleaks pre-commit | — |

---
*Last Updated: 2026-07-20 (Claude Code — §5.2 정정: 존재하지 않는 `BaseCrudController`/`BaseCrudService` 상속 지시를 제거하고, 실존 코드(`DeptJobApiController`·`DeptJobService`·`FaqService`)에서 발췌한 §5.2.1 컨트롤러·서비스 관례로 대체. §6.5 제네릭 CRUD 현황 정직화. 이전: 2026-07-11 온보딩 런북 신설.)*
