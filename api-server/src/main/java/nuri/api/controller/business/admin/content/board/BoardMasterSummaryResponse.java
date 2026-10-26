package nuri.api.controller.business.admin.content.board;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardMasterCommunity;
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
        @ArraySchema(arraySchema = @Schema(description = "설정이 지정한 용도(공지·FAQ·업무·Q&A·위키). 지정이 없으면 빈 배열. "
                + "지정 게시판은 영구 삭제할 수 없다(ADR-0043 결정 4)", requiredMode = Schema.RequiredMode.REQUIRED),
                schema = @Schema(allowableValues = { "NOTICE", "FAQ", "TASK", "QNA", "WIKI" })) List<String> designations,
        // [2026-10-26 ADR-0043 결정 3] 귀속 커뮤니티(이용 범위). 귀속이 없으면 싣지 않는다.
        @Schema(description = "귀속 커뮤니티 요약. 귀속이 없으면 싣지 않는다") BoardMasterCommunity community
) {
    static BoardMasterSummaryResponse from(BoardMasterDto dto, List<String> designations, BoardMasterCommunity community) {
        return new BoardMasterSummaryResponse(
                dto.getBbsId(),
                dto.getBbsTtl(),
                dto.getBbsTypeCd(),
                dto.getBbsAtrbCd(),
                dto.getBbsAtrbCdNm(),
                dto.getTmpltId(),
                dto.getUseYn(),
                dto.getCrtDt(),
                List.copyOf(designations),
                community);
    }
}
