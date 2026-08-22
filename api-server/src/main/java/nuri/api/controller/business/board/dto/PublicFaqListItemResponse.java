package nuri.api.controller.business.board.dto;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardDto;

public record PublicFaqListItemResponse(
        @Schema(description = "게시판 ID", allowableValues = "BBSMSTR_AAAAAAAAAAAA", requiredMode = Schema.RequiredMode.REQUIRED)
        String bbsId,
        @Schema(description = "게시글 ID", requiredMode = Schema.RequiredMode.REQUIRED)
        Long pstSn,
        @Schema(description = "FAQ 질문 제목")
        String pstTtl,
        @Schema(description = "조회수")
        Integer inqCnt,
        @Schema(description = "등록일시")
        LocalDateTime crtDt,
        @Schema(description = "활성 상태", allowableValues = "Y", requiredMode = Schema.RequiredMode.REQUIRED)
        String useYn,
        @Schema(description = "비밀글 여부", allowableValues = "N", requiredMode = Schema.RequiredMode.REQUIRED)
        String scrtYn) {

    public static PublicFaqListItemResponse from(BoardDto source) {
        return new PublicFaqListItemResponse(
                source.bbsId(),
                source.pstSn(),
                source.pstTtl(),
                source.inqCnt(),
                source.crtDt(),
                source.useYn(),
                source.scrtYn());
    }
}
