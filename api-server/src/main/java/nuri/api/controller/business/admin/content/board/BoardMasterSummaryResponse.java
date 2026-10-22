package nuri.api.controller.business.admin.content.board;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardMasterDto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import java.time.LocalDateTime;
import java.util.List;

/** 게시판 마스터 목록 projection 응답. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BoardMasterSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTtl,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTypeCd,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsAtrbCd,
        String bbsAtrbCdNm,
        String tmpltId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String useYn,
        LocalDateTime crtDt,
        @ArraySchema(arraySchema = @Schema(description = "설정이 지정한 용도(공지·FAQ·업무). 지정이 없으면 빈 배열",
                requiredMode = Schema.RequiredMode.REQUIRED),
                schema = @Schema(allowableValues = { "NOTICE", "FAQ", "TASK" })) List<String> designations
) {
    static BoardMasterSummaryResponse from(BoardMasterDto dto, List<String> designations) {
        return new BoardMasterSummaryResponse(
                dto.getBbsId(),
                dto.getBbsTtl(),
                dto.getBbsTypeCd(),
                dto.getBbsAtrbCd(),
                dto.getBbsAtrbCdNm(),
                dto.getTmpltId(),
                dto.getUseYn(),
                dto.getCrtDt(),
                List.copyOf(designations));
    }
}
