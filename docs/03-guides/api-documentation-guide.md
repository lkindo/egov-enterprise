# API 문서화 가이드 (OpenAPI 3.0 / Swagger)

본 프로젝트는 SpringDoc OpenAPI 3.0 을 사용하여 API 문서를 자동 생성합니다.

> 컨트롤러·DTO가 계약의 상류이며 [`OpenApiConfig.java`](../../api-server/src/main/java/nuri/apiserver/config/OpenApiConfig.java), `api-docs.json`, 생성 TypeScript/Zod가 이어진다. 그룹·경로·보안 스키마의 현재 값은 코드와 생성물을 확인하고, 이 문서의 목록만으로 현재 API 존재를 단정하지 않는다.

---

## 📍 빠른 시작

### 로컬에서 Swagger UI 확인

```bash
# 1. 백엔드 서버 실행
./gradlew :api-server:bootRun

# 2. Swagger UI 접속
http://localhost:8080/swagger-ui.html
```

### API Docs (JSON) 다운로드

```bash
# 저장소 루트의 api-docs.json 은 추적 파일(계약 정본)이라 덮어쓰지 않는다 — 조회용 사본은 다른 이름으로 받는다.
mkdir -p build && curl http://localhost:8080/v3/api-docs > build/api-docs.local.json
```

추적 파일 `api-docs.json` 을 갱신할 때는 실행 중인 서버가 아니라 아래 [정적 추출](#api-문서-자동-내보내기-정적-추출)을 쓴다.

---

## 🔧 설정

### 선택형 `application-swagger.yml` 프로필

세부 Swagger UI 옵션이 필요하면 `swagger` 프로필을 명시적으로 활성화한다. 기본 런타임 OpenAPI 동작과 빌드 타임 spec 추출은 `application.yml`, `OpenApiConfig`, `OpenApiDocumentationTest`가 소유하며 운영 프로필은 문서 endpoint를 비활성화한다.

```yaml
springdoc:
  swagger-ui:
    path: /swagger-ui.html
    doc-expansion: none  # API 목록 접음/펼침 설정
    try-it-out-enabled: true  # API 테스트 기능
```

---

## 🏛️ API 설계 원칙 (Design Principles)

본 프로젝트는 RESTful 아키텍처 스타일을 지향하며, 다음의 설계 원칙을 반드시 준수해야 합니다.

### 1. URI 명명 규칙
- **리소스 중심**: URI 는 행위(동사)가 아닌 리소스(명사)를 표현해야 합니다.
- **복수형 사용**: 리소스는 가급적 복수형을 사용합니다. (예: `/users`, `/posts`)
- **계층 관계**: 하위 리소스는 경로로 표현합니다. (예: `/users/{id}/orders`)
- **케이스**: 모든 경로는 **Kebab-case**를 사용합니다. (예: `/common-codes`)

### 2. HTTP Method와 응답 계약

조회는 `GET`, 생성은 `POST`, 전체/부분 갱신은 `PUT`/`PATCH`, 삭제는 `DELETE`를 사용하고 `GET`은 데이터를 변경하지 않는다. 프로젝트 공통 응답은 [백엔드 헌법 제6조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md#제6조-응답-포맷의-통일)에 따라 `ApiResponse<T>`(목록은 `PageResponse<T>`)로 감싼다. 성공 상태 코드는 헌법 제6조 5항([ADR-0036](../02-architecture/decisions/ADR-0036-api-paging-and-created-status-conventions.md))을 따른다 — 자원을 만드는 POST 는 `201` 과 `ApiResponse.created(새 식별자)`, 그 밖의 성공은 `200` 이다. 생성 여부는 이름이 아니라 새로 주소를 갖는 자원이 생기는지로 판정하고, 어느 핸들러가 201 인지는 `ResponseContractLinterTest` 의 생성 census 가 정한다. 삭제는 본문 envelope 이 있으므로 `204` 를 쓰지 않는다. 물리/논리 삭제는 도메인 수명주기와 DB 헌법 제8조에 따라 결정한다.

필드와 메서드 계약의 정본은 아래 Java 소스다. 이 절의 설명과 어긋나면 현재 소스와 테스트를 따르고 이 절을 함께 고친다.

- **공통 응답**: [`ApiResponse`](../../foundation/src/main/java/nuri/foundation/core/response/ApiResponse.java)의 envelope 필드는 `success`·`status`·`code`·`message`·`data`·`timestamp`이고, 검증 실패에만 `errors`가 붙는다. HTTP 상태와 body의 `status`는 같아야 한다. 기본 `ErrorCode` 상태와 다른 HTTP 상태가 필요하면 상태를 받는 `ApiResponse.error(HttpStatus, ErrorCode, String)` 팩토리를 쓴다. 바이너리 다운로드·스트림 예외의 조건은 헌법 제6조 3항과 [ResponseContractLinterTest](../../api-server/src/test/java/nuri/api/harness/ResponseContractLinterTest.java)의 census가 정한다.
- **페이징**: 헌법 제6조 4항(ADR-0036)에 따라 요청·응답 모두 1 기반 `page`(1 이상)·`size`(1~100) 하나다. 컨트롤러는 `Pageable` 또는 `@Valid BaseSearchDto` 로 받고, 범위 밖 값·옛 이름은 `PaginationRequestFilter` 가 400 으로 거부한다(옛 `pageIndex`·`pageUnit` 은 한 릴리스 동안 별칭). [`PageResponse`](../../foundation/src/main/java/nuri/foundation/core/response/PageResponse.java)의 필드는 `list`·`total`·`page`·`size`·`totalPage`(모두 필수)다. `PageResponse.of(Page<T>)`는 Spring Data의 0-based 페이지 번호를 외부 1-based로 바꾸고, 목록·숫자를 직접 받는 overload는 받은 `page`를 그대로 쓰므로 호출자가 요청의 1-based `page` 를 넘긴다.
- **날짜 입력**: [Ymd](../../foundation/src/main/java/nuri/foundation/core/validation/Ymd.java)의 달력 형식과 [YmdRange](../../foundation/src/main/java/nuri/foundation/core/validation/YmdRange.java)의 기간 순서를 쓰되, 필수 여부와 기존 읽기 데이터의 처리 범위는 도메인 계약을 따른다.
- **오류 코드**: `CommonErrorCode` 등 기존 `ErrorCode` 구현을 재사용하고 문서에 별도 코드 목록을 복제하지 않는다. 새 코드는 HTTP 상태·기계 판독 코드·사용자 메시지를 함께 정의하고 [GlobalExceptionHandler](../../foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java)와 API 계약 테스트로 실제 응답을 검증한다.
- **서비스 계층 인가**: 소유권·대행 권한 가드는 [정체성 모델 가이드 §3](identity-model-guide.md#3-securityutil-메서드-매핑-표)의 표준 헬퍼를 쓴다.

### 3. API 버전 관리
- 모든 API 경로는 `/api/v1/` 로 시작하는 버전 정보를 포함합니다.
- 하위 호환성을 깨뜨리는 중대한 변경 발생 시 버전을 올립니다 (`v2`). 예외: 2026-10-19 ADR-0036 은 저장소 밖 소비자가 없음을 확인하고 v1 안에서 목록 `page` 를 1 기반으로 바꿨다(사용자 승인).
- 이전 버전의 API 를 중단할 때는 `@Deprecated` 어노테이션과 함께 Swagger 에 만료 예정일을 기재합니다.

---

## 📝 API 문서화 방법

### 1. 컨트롤러에 주석 추가

`@Tag`로 컨트롤러 영역을 설명하고 `@Operation`으로 메서드의 업무 의미를 기록한다. 응답 형식과 실제 경로를 반영한 현재 예는 [CommonCodeApiController.java](../../api-server/src/main/java/nuri/api/controller/foundation/controller/code/CommonCodeApiController.java)에서 확인한다. 공통 오류 응답은 `OpenApiConfig`가 경로의 공개 여부와 path variable을 근거로 보강하므로, 컨트롤러에는 도메인별로 더 구체적인 상태만 선언한다.

### 2. DTO 에 문서화 추가

```java
@Schema(description = "공통코드 응답")
public record CommonCodeResponse(
    @Schema(description = "공통코드 ID", example = "CODE001")
    String codeId,
    
    @Schema(description = "공통코드명", example = "상태 코드")
    String codeNm,
    
    @Schema(description = "사용 여부 (Y/N)", example = "Y")
    String useYn
) {}
```

### 3. JWT 인증 설정

현재 `OpenApiConfig`의 `bearerAuth`는 HTTP bearer scheme이다. 전역 보안 요구는 `bearerAuth` 이고, 연산 바인딩에서 PUBLIC 인 연산만 `security: []` 로 전역 요구를 지운다(DEC-OPS-382 ⑦ — 401·403 을 붙이지 않는 판정과 같다). 이 표기와 공통 오류 응답은 기본 문서(`/v3/api-docs` = `api-docs.json`)에 걸리고, Swagger UI 의 그룹 문서에는 없다. Swagger UI의 `Authorize`에는 raw JWT를 입력하고, 실제 요청의 `Authorization` 헤더가 `Bearer <token>`으로 구성되는지 UI의 request preview에서 확인한다. 토큰을 문서·로그·스크린샷에 남기지 않으며, scheme 또는 Swagger UI 버전이 바뀌면 현재 생성 스펙과 요청 헤더가 정본이다.

---

## 📦 API 그룹

그룹 이름과 포함·제외 경로는 `OpenApiConfig`의 `GroupedOpenApi` bean이 소유한다. 선택형 `swagger` 프로필의 `application-swagger.yml`도 UI 설정을 추가할 수 있으므로, 정적 목록을 문서에 복제하지 않고 현재 `/v3/api-docs/swagger-config`와 각 `/v3/api-docs/{group}` 응답으로 노출 여부를 확인한다.

---

## 🔗 프론트엔드 연동 (Codegen)

백엔드 API 명세가 변경되면 프론트엔드에서 다음 명령을 실행하여 TypeScript 타입을 최신화합니다.

### 1. API 타입 생성
오프라인이 기본이며 백엔드 서버 기동이 필요 없습니다. 저장소 루트에서 실행:

```bash
# 오프라인(기본, api-docs.json 기반) — 서버 불필요
# codegen:file → codegen:zod → format:api-docs(api-docs.json 정규화)를 한 번에 실행
pnpm -C frontend syncContract

# 단계별로 돌릴 때(이 경우 api-docs.json 정규화는 따로 하지 않는다)
pnpm -C frontend codegen:file
pnpm -C frontend codegen:zod   # generated-zod.ts·generated-operations.ts 와 태그 묶음 모듈 동기화

# 서버(:8080) 기동 시에는:
pnpm -C frontend codegen:ts
```

드리프트 점검: `pnpm -C frontend codegen:verify` / `codegen:verify:zod`. Git 추적 여부를 확인한 뒤 Git 인덱스의 `api-docs.json`으로 임시 디렉터리에 재생성하여 인덱스의 생성물과 비교합니다. 커밋에 실릴 쌍이므로, `api-docs.json`만 스테이징하고 다시 만든 생성물을 빠뜨린 커밋이 실패합니다. 각 명령이 맡은 스펙·생성물(api: `api-docs.json`·`generated-api.d.ts`, zod: `api-docs.json`·`generated-zod.ts`·`generated-operations.ts`와 그 묶음 모듈) 가운데 하나라도 작업 트리가 인덱스와 다르면 작업 트리 쌍도 같은 방법으로 비교하므로, 명세만 고치고 다시 만들지 않은 작업본도 실패합니다. 오류는 어긋난 생성물마다 `[index]`·`[working tree]` 중 어느 쪽인지 밝힙니다. pre-commit 에서는 git 이 넘기는 인덱스(`GIT_INDEX_FILE`)를 그대로 읽습니다. LF/CRLF 줄 끝만 정규화하며 내용 불일치·누락·미추적 파일, 다시 만든 결과에 없는 낡은 묶음 모듈은 실패합니다. 성공·실패 모두 작업 트리와 Git 인덱스를 덮어쓰지 않으므로, 의도한 변경의 반영은 위 `syncContract`로 별도 수행하고 다시 만든 생성물을 `api-docs.json`과 함께 스테이징합니다. (자세한 실행 맥락은 [공용 project-context](../../.agent/memory/project-context.md#개발검증배포-흐름) 참조)

### 2. 생성된 파일 확인
`frontend/src/types/generated-api.d.ts`(타입 정의), `frontend/src/types/generated-zod.ts`(런타임 검증 스키마), `frontend/src/types/generated-operations.ts`(operation 계약)가 함께 갱신되었는지 확인합니다. zod·operations 의 두 파일은 진입 파일이고 본문은 옆의 같은 이름 폴더(`generated-zod/`·`generated-operations/`)에 API 태그(컨트롤러)별 묶음 모듈로 나뉩니다 — 번들러가 화면마다 쓰는 태그의 묶음만 싣게 하려는 것입니다(2026-10-19). 소비 코드는 계속 진입 파일(`@/types/generated-zod`·`@/types/generated-operations`)을 import 하고, 묶음 모듈을 손으로 고치거나 직접 import 하지 않습니다. 실제 소비 여부는 프런트 타입 검사와 계약 하네스로 확인하며, 특정 서비스 래퍼가 모든 호출 경로를 소유한다고 가정하지 않습니다.

---

## 🔄 CI 연동

### API 문서 자동 내보내기 (정적 추출)

서버를 실행하지 않고 빌드 타임에 OpenAPI Spec을 정적으로 추출하여 CI 안정성을 확보합니다.

테스트 단계의 `OpenApiDocumentationTest`가 system property로 내보내며 별도 Gradle 플러그인은 사용하지 않습니다. Test JVM의 작업 디렉터리는 모듈별로 다르므로 출력은 저장소 루트의 **절대경로**로 지정합니다. CI는 `"-Dopenapi.export.path=$GITHUB_WORKSPACE/api-docs.json"`을 사용하고 같은 절대경로의 추적 여부와 diff를 검사합니다.

```bash
# Bash: 저장소 루트에서 좁은 OpenAPI 생성·계약 검증
repo_root="$(git rev-parse --show-toplevel)"
./gradlew :api-server:test --tests 'nuri.openapi.*OpenApiDocumentationTest' \
  "-Dopenapi.export.path=$repo_root/api-docs.json" --warning-mode fail
git diff --exit-code -- "$repo_root/api-docs.json"
```

```powershell
# PowerShell: 저장소 루트에서 같은 생성·계약 검증
$repoRoot = (git rev-parse --show-toplevel).Trim()
.\gradlew.bat :api-server:test --tests 'nuri.openapi.*OpenApiDocumentationTest' "-Dopenapi.export.path=$repoRoot/api-docs.json" --warning-mode fail
git diff --exit-code -- "$repoRoot/api-docs.json"
```

API/DTO 변경 후 형상이 유지될 것으로 예상해도 현재 서버에서 정규 생성한 결과를 비교한 다음 `codegen:verify`와 `codegen:verify:zod`를 실행합니다. 의도한 명세 변경이라면 diff를 검토하고 세 생성물을 정규 생성기로 갱신합니다. `verify:be`나 기존 명세를 읽는 프런트 codegen만으로 서버 명세의 최신성이 검증됐다고 보지 않습니다. CI의 전체 빌드·커버리지 명령은 [CI/CD 가이드](cicd-pipeline.md#실행-명령어)를 따릅니다.

### API 변경 감지

CI 에서 API 관련 파일 변경 시 자동으로 OpenAPI Spec 을 아티팩트로 업로드합니다.

---

## 🛠️ 문제 해결

### Swagger UI 가 표시되지 않음

1. 서버가 정상 실행되었는지 확인:
   ```bash
   curl http://localhost:8080/actuator/health
   ```

2. Swagger UI 경로 확인:
   ```bash
   curl http://localhost:8080/swagger-ui.html
   ```

### API 가 그룹에 표시되지 않음

1. `OpenApiConfig.java` 에서 그룹 경로 확인
2. 컨트롤러의 `@RequestMapping` 경로 확인

### JWT 인증이 작동하지 않음

1. `OpenApiConfig`의 `bearerAuth` scheme과 현재 `/v3/api-docs`의 `securitySchemes` 확인
2. `Authorize`에 raw JWT 입력
3. request preview·네트워크 로그에서 `Authorization: Bearer <token>` 형식 확인

### 403 Forbidden 또는 CORS 에러 발생 시

프론트엔드 연동 중 CORS 또는 Swagger 접근 오류가 나면 활성 프로필과 [ApiSecurityConfig.java](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java)를 함께 확인한다.

1. `cors.allowed-origins`의 현재 활성 프로필 값과 실제 브라우저 `Origin`이 일치하는지 확인한다. 개발 포트를 문서 값으로 가정하지 않는다.
2. 비운영 환경에서는 `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`의 인가 경계를 확인한다.
3. `prod`는 `application-prod.yml`에서 문서 endpoint를 비활성화한다. 운영에서 보이지 않는 상태를 CORS 문제로 오판하지 않는다.

---

## 📚 추가 리소스

- [SpringDoc 공식 문서](https://springdoc.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI 사용법](https://swagger.io/tools/swagger-ui/)

---

*Last reviewed against current sources: 2026-08-19.*
