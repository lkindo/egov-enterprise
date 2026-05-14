# 백엔드 및 API 구현 가이드 (Backend & API Implementation Guide)

본 문서는 `API 및 백엔드 아키텍처 헌법`의 조항을 실제 코드로 구현하는 방법과 예시를 다룹니다.

## 1. ApiResponse 표준 구조 (헌법 제6조 관련)
모든 API 응답은 아래와 같은 JSON 구조를 유지해야 합니다.

```json
{
  "status": "SUCCESS",
  "code": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": { ... },
  "timestamp": "2026-05-14T09:00:00"
}
```

## 2. 페이징 및 정렬 표준
대량의 데이터를 반환하는 모든 목록 API는 페이징 처리를 수행해야 합니다.

- **요청 파라미터**: `page`(0-based index), `size`(페이지 당 건수), `sort`(정렬 조건)
- **응답 페이징 메타데이터**:
```json
{
  "data": {
    "list": [...],
    "pagination": {
      "totalElements": 105,
      "totalPages": 11,
      "currentPage": 0,
      "pageSize": 10,
      "isFirst": true,
      "isLast": false
    }
  }
}
```

## 3. 입력값 검증 및 OpenAPI (헌법 제7조 관련)
DTO 레벨에서 선언적 검증을 수행하며, Swagger 어노테이션을 통해 문서를 자동화합니다.

```java
@Schema(description = "게시글 작성 요청")
public record PostRequest(
    @Schema(description = "제목", example = "새로운 소식")
    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 200, message = "제목은 200자를 초과할 수 없습니다.")
    String title,

    @Schema(description = "내용")
    @NotBlank(message = "내용은 필수입니다.")
    String content
) {}
```

## 4. 권한 재검증 패턴 (헌법 제8조 관련)
컨트롤러 레이어뿐만 아니라 서비스 레이어에서도 리소스 소유권을 재검증합니다.

```java
@Service
public class PostService {
    @Transactional
    public void updatePost(PostRequest dto) {
        Post entity = postRepository.findById(dto.getId())
            .orElseThrow(() -> new BusinessException(ErrorCode.DATA_NOT_FOUND));
        
        // 서비스 레이어 권한 재검증 (리소스 소유자 체크)
        SecurityUtil.checkOwner(entity.getRegId()); 
        
        entity.update(dto.toEntity());
    }
}
```

## 5. 에러 코드 정의 (헌법 제7조 관련)
비즈니스 예외는 사전에 정의된 `ErrorCode`를 활용합니다.

| 에러 코드 | HTTP 상태 | 메시지 |
| :--- | :--- | :--- |
| `COMMON-001` | 400 | 잘못된 요청 형식입니다. |
| `AUTH-001` | 401 | 인증 정보가 유효하지 않습니다. |
| `DATA-001` | 404 | 요청한 데이터를 찾을 수 없습니다. |
| `BIZ-001` | 409 | 비즈니스 로직 위반이 발생했습니다. |
