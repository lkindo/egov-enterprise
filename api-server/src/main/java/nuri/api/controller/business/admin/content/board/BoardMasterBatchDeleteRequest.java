package nuri.api.controller.business.admin.content.board;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 게시판 마스터 물리 삭제(영구 말소) 일괄 요청 DTO
 *
 * <p>되돌릴 수 없는 작업이므로 서비스 레이어가 대상마다
 * "비활성(useYn='N')" · "게시글 0건" 을 재검증하며, 하나라도 어긋나면 전체가 롤백된다.</p>
 */
@Schema(description = "게시판 마스터 일괄 영구 삭제 요청")
public record BoardMasterBatchDeleteRequest(

        @ArraySchema(
                arraySchema = @Schema(description = "대상 게시판 ID 목록"),
                schema = @Schema(implementation = String.class),
                minItems = 1,
                maxItems = 100)
        @NotEmpty(message = "{validation.required}")
        @Size(min = 1, max = 100, message = "게시판 ID는 한 번에 1개 이상 100개까지 처리할 수 있습니다.")
        List<String> bbsIds) {
}
