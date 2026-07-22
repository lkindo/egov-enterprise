package nuri.api.controller.business.admin.content.board;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * 게시판 마스터 물리 삭제(영구 말소) 일괄 요청 DTO
 *
 * <p>되돌릴 수 없는 작업이므로 서비스 레이어가 대상마다
 * "비활성(useYn='N')" · "게시글 0건" 을 재검증하며, 하나라도 어긋나면 전체가 롤백된다.</p>
 */
@Schema(description = "게시판 마스터 일괄 영구 삭제 요청")
public record BoardMasterBatchDeleteRequest(

        @Schema(description = "대상 게시판 ID 목록")
        @NotEmpty(message = "{validation.required}")
        List<String> bbsIds) {
}
