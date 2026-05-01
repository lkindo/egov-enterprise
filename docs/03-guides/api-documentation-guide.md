# API 문서화 가이드 (OpenAPI 3.0 / Swagger)

본 프로젝트는 SpringDoc OpenAPI 3.0 을 사용하여 API 문서를 자동 생성합니다.

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

### application-swagger.yml

```yaml
springdoc:
  swagger-ui:
    path: /swagger-ui.html
    doc-expansion: none  # API 목록 접음/펼침 설정
    try-it-out-enabled: true  # API 테스트 기능
```

---

## 📝 API 문서화 방법

### 1. 컨트롤러에 주석 추가

```java
@RestController
@RequestMapping("/api/v1/common-codes")
@Tag(name = "공통코드", description = "공통코드 관리 API")
public class CommonCodeController {

    @GetMapping
    @Operation(summary = "공통코드 목록 조회", description = "모든 공통코드 목록을 조회합니다.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "조회 성공"),
        @ApiResponse(responseCode = "401", description = "인증 실패"),
        @ApiResponse(responseCode = "403", description = "권한 없음")
    })
    public ResponseEntity<List<CommonCodeResponse>> getCommonCodes() {
        // ...
    }
}
```

### 2. DTO 에 문서화 추가

```java
@Schema(description = "공통코드 응답")
public record CommonCodeResponse(
    @Schema(description = "공통코드 ID", example = "CODE001")
    String codeId,
    
    @Schema(description = "공통코드명", example = "상태 코드")
    String codeNm,
    
    @Schema(description = "사용 여부", example = "true")
    Boolean useAt
) {}
```

### 3. JWT 인증 설정

Swagger UI 에서:
1. 오른쪽 상단 `Authorize` 버튼 클릭
2. `Value` 필드에 JWT 토큰 입력 (Bearer 제외)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. `Authorize` 클릭

---

## 📦 API 그룹

현재 설정된 API 그룹:

| 그룹명 | 경로 | 설명 |
|--------|------|------|
| `all` | `/api/v1/**` | 전체 API (버전 1) |
| `1-foundation` | `/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/codes/**` | 시스템 기반 API (인증, 계정, 기초코드) |
| `2-business-suite` | `/api/v1/**` (foundation 제외) | 업무 포털 API (게시판, 협업, 운영지원 등) |
| `admin` | `/api/v1/admin/**` | 관리자 전용 설정 및 모니터링 API |
| `common-code` | `/api/v1/common-codes/**` | 공통코드 및 하위 코드 관리 |
| `user` | `/api/v1/users/**` | 사용자 프로필 및 권한 관리 |
| `board` | `/api/v1/boards/**` | 게시판 마스터 및 게시글 관리 |

Swagger UI 에서 그룹별 필터링 가능.

---

## 🔗 프론트엔드 연동 (Codegen)

백엔드 API 명세가 변경되면 프론트엔드에서 다음 명령을 실행하여 TypeScript 타입을 최신화합니다.

### 1. API 타입 생성
백엔드 서버가 실행 중인 상태에서 프론트엔드 폴더(`frontend/`)에서 실행:

```bash
# OpenAPI Spec 기반 TS 타입 생성
npm run codegen:ts
```

### 2. 생성된 파일 확인
`frontend/src/types/generated-api.d.ts` 파일이 갱신되었는지 확인합니다. 이 파일은 모든 서비스 레이어(`ApiService`)에서 타입 정의로 활용됩니다.

---

## 🔄 CI 연동

### API 문서 자동 내보내기

```bash
# CI 에서 자동 실행
./gradlew :api-server:bootRun &
sleep 30
curl -s http://localhost:8080/v3/api-docs > openapi-generated.json
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

1. Swagger UI 에서 `Authorize` 클릭
2. Bearer 를 제외한 토큰만 입력
3. `Authorize` 클릭 후 `Close`

---

## 📚 추가 리소스

- [SpringDoc 공식 문서](https://springdoc.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI 사용법](https://swagger.io/tools/swagger-ui/)

---

*Last Updated: 2026-03-31*
