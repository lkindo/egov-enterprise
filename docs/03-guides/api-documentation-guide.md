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
curl http://localhost:8080/v3/api-docs > api-docs.json
```

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

조회는 `GET`, 생성은 `POST`, 전체/부분 갱신은 `PUT`/`PATCH`, 삭제는 `DELETE`를 사용하고 `GET`은 데이터를 변경하지 않는다. 성공 상태 코드는 현재 컨트롤러 계약과 생성된 OpenAPI에 맞추며, 프로젝트 공통 응답은 [백엔드 헌법 제4조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)에 따라 `ApiResponse<T>`(목록은 필요 시 `PageResponse<T>`)로 감싼다. 생성·삭제라는 이유만으로 문서 예시의 `201`·`204`를 실제 구현에 강제하지 않는다. 물리/논리 삭제는 도메인 수명주기와 DB 헌법 제8조에 따라 결정한다.

### 3. API 버전 관리
- 모든 API 경로는 `/api/v1/` 로 시작하는 버전 정보를 포함합니다.
- 하위 호환성을 깨뜨리는 중대한 변경 발생 시 버전을 올립니다 (`v2`).
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

현재 `OpenApiConfig`의 `bearerAuth`는 HTTP bearer scheme이다. Swagger UI의 `Authorize`에는 raw JWT를 입력하고, 실제 요청의 `Authorization` 헤더가 `Bearer <token>`으로 구성되는지 UI의 request preview에서 확인한다. 토큰을 문서·로그·스크린샷에 남기지 않으며, scheme 또는 Swagger UI 버전이 바뀌면 현재 생성 스펙과 요청 헤더가 정본이다.

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
pnpm -C frontend codegen:file
pnpm -C frontend codegen:zod   # generated-zod.ts 동기화

# 서버(:8080) 기동 시에는:
pnpm -C frontend codegen:ts
```

드리프트 점검(git diff --exit-code 기반): `pnpm -C frontend codegen:verify` / `codegen:verify:zod`. (자세한 실행 맥락은 [공용 project-context](../../.agent/memory/project-context.md#개발검증배포-흐름) 참조)

### 2. 생성된 파일 확인
`frontend/src/types/generated-api.d.ts`(타입 정의)와 `frontend/src/types/generated-zod.ts`(런타임 검증 스키마)가 함께 갱신되었는지 확인합니다. 실제 소비 여부는 프런트 타입 검사와 계약 하네스로 확인하며, 특정 서비스 래퍼가 모든 호출 경로를 소유한다고 가정하지 않습니다.

---

## 🔄 CI 연동

### API 문서 자동 내보내기 (정적 추출)

서버를 실행하지 않고 빌드 타임에 OpenAPI Spec을 정적으로 추출하여 CI 안정성을 확보합니다.

```bash
# CI: 테스트 단계에서 OpenApiDocumentationTest 가 system property 로 정적 추출 (별도 gradle 플러그인 아님)
./gradlew build jacocoRootCoverageVerification check \
  -Dopenapi.export.path=api-docs.json --warning-mode fail
# 추출된 파일 위치: <repo-root>/api-docs.json  (CI 아티팩트: openapi-spec / openapi-spec-changed)
```

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
