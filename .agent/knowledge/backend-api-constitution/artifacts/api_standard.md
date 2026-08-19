# 백엔드·API 구현 가이드

이 문서는 [백엔드·API 헌법](./constitution.md)의 구현 진입점이다. 필드와 메서드 계약의 정본은 아래 Java 소스이며, 이 문서의 예시와 충돌하면 현재 소스와 테스트를 우선해 문서를 함께 고친다.

- 공통 응답: `foundation/src/main/java/nuri/foundation/core/response/ApiResponse.java`
- 페이징 응답: `foundation/src/main/java/nuri/foundation/core/response/PageResponse.java`
- 예외 매핑: `foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java`
- 소유권 가드: `business-core/src/main/java/nuri/business/security/util/SecurityUtil.java`
- OpenAPI·codegen 절차: `docs/03-guides/api-documentation-guide.md`
- 식별자 축: `docs/03-guides/identity-model-guide.md`

## 1. 공통 응답

일반 JSON API는 `ApiResponse<T>`를 사용한다. 현재 envelope 필드는 `success`, `status`, `code`, `message`, `data`, `timestamp`이며 검증 실패에만 `errors`가 추가될 수 있다.

```json
{
  "success": true,
  "status": 200,
  "code": "COMMON_001",
  "message": "Success",
  "data": {},
  "timestamp": "2026-08-19 09:00:00"
}
```

HTTP 상태와 body의 `status`는 같아야 한다. 기본 `ErrorCode` 상태와 다른 HTTP 상태를 써야 할 때는 상태를 받는 `ApiResponse.error(HttpStatus, ErrorCode, String)` 팩토리를 사용한다.

바이너리 다운로드·스트림처럼 wrapper를 적용할 수 없는 응답은 현재 구현과 헌법 사이에 승인되지 않은 예외가 남아 있다. 자동으로 wrapper로 변환하지 말고 [공용 gap registry](../../../memory/known-gaps.md)와 해당 컨트롤러 계약을 먼저 확인한다.

## 2. 페이징 응답

목록 응답은 `PageResponse<T>`의 현재 필드 계약을 따른다.

```json
{
  "list": [],
  "total": 105,
  "page": 1,
  "size": 10,
  "totalPage": 11
}
```

`PageResponse.of(Page<T>)`는 Spring Data의 0-based 페이지 번호를 외부 응답에서 1-based로 바꾼다. 목록·숫자를 직접 받는 overload는 전달받은 `page`를 그대로 사용하므로 호출자는 외부 1-based 계약을 명시적으로 지켜야 한다.

## 3. 입력 검증과 OpenAPI

요청 DTO에는 Bean Validation을 선언하고, 외부 계약이 되는 필드에는 `@Schema` 설명을 제공한다.

```java
public record PostRequest(
    @Schema(description = "제목", example = "새로운 소식")
    @NotBlank
    @Size(max = 200)
    String title,

    @Schema(description = "내용")
    @NotBlank
    String content
) {}
```

API 계약 변경 뒤에는 서버 기동에 의존하지 않는 오프라인 codegen을 기본으로 실행한다.

```bash
pnpm -C frontend codegen:file
pnpm -C frontend codegen:zod
```

## 4. 서비스 계층 인가

컨트롤러 인가만으로 끝내지 않고 쓰기와 민감 조회에서 서비스 계층 가드를 다시 적용한다. 소유자 필드의 식별자 축과 관리자 우회 허용 여부를 먼저 결정한다.

| 의도 | 표준 헬퍼 | 식별자 축 | 관리자 우회 |
|---|---|---|---|
| 감사 컬럼 작성자 | `assertOwnerOrAdmin` | `loginId` | 허용 |
| 도메인 소유자 | `assertOwnerOrAdminByEsntlId` | `esntlId` | 허용 |
| 결재·신청 등 본인 행위 | `assertOwnerByEsntlId` | `esntlId` | 불가 |
| 관리자 전용 | `assertAdmin` | 역할 | 해당 없음 |

도메인별 수기 가드를 표준 헬퍼로 기계 치환하면 의미가 약해질 수 있다. 변경 전 [식별자 모델 가이드](../../../../docs/03-guides/identity-model-guide.md)와 기존 네거티브 테스트를 확인한다.

## 5. 오류 코드

오류 코드는 `CommonErrorCode` 등 `ErrorCode` 구현을 재사용한다. 문서에 별도의 가상 코드 목록을 복제하지 않는다. 새 코드는 HTTP 상태·기계 판독 코드·사용자 메시지를 함께 정의하고 `GlobalExceptionHandler`와 API 계약 테스트로 실제 응답을 검증한다.
