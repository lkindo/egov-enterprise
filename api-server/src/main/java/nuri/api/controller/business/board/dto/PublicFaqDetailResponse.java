package nuri.api.controller.business.board.dto;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardDto;

public record PublicFaqDetailResponse(
        @Schema(description = "게시판 ID", allowableValues = "BBSMSTR_AAAAAAAAAAAA", requiredMode = Schema.RequiredMode.REQUIRED)
        String bbsId,
        @Schema(description = "게시글 ID", requiredMode = Schema.RequiredMode.REQUIRED)
        Long pstSn,
        @Schema(description = "FAQ 질문 제목", nullable = true, types = {"string", "null"})
        String pstTtl,
        @Schema(description = "FAQ 답변 본문", nullable = true, types = {"string", "null"})
        String pstCn,
        @Schema(description = "조회수", nullable = true, types = {"integer", "null"})
        Integer inqCnt,
        @Schema(description = "등록일시", nullable = true, types = {"string", "null"})
        LocalDateTime crtDt,
        @Schema(description = "활성 상태", allowableValues = "Y", requiredMode = Schema.RequiredMode.REQUIRED)
        String useYn,
        @Schema(description = "비밀글 여부", allowableValues = "N", requiredMode = Schema.RequiredMode.REQUIRED)
        String scrtYn) {

    public static PublicFaqDetailResponse from(BoardDto source) {
        return new PublicFaqDetailResponse(
                source.bbsId(),
                source.pstSn(),
                source.pstTtl(),
                source.pstCn(),
                source.inqCnt(),
                source.crtDt(),
                source.useYn(),
                source.scrtYn());
    }
}
