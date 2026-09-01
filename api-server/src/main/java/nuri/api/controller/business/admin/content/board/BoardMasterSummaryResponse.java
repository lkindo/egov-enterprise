package nuri.api.controller.business.admin.content.board;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardMasterDto;

import java.time.LocalDateTime;

/** 게시판 마스터 목록 projection 응답. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BoardMasterSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTtl,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTypeCd,
        String bbsTypeCdNm,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsAtrbCd,
        String bbsAtrbCdNm,
        String tmpltId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String useYn,
        LocalDateTime crtDt
) {
    static BoardMasterSummaryResponse from(BoardMasterDto dto) {
        return new BoardMasterSummaryResponse(
                dto.getBbsId(),
                dto.getBbsTtl(),
                dto.getBbsTypeCd(),
                dto.getBbsTypeCdNm(),
                dto.getBbsAtrbCd(),
                dto.getBbsAtrbCdNm(),
                dto.getTmpltId(),
                dto.getUseYn(),
                dto.getCrtDt());
    }
}
