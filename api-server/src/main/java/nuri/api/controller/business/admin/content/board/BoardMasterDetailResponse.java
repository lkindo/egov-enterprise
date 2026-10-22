package nuri.api.controller.business.admin.content.board;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardMasterDto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import java.time.LocalDateTime;
import java.util.List;

/** 게시판 마스터 상세 조회 전용 응답. 쓰기 필수값과 물리 nullable 값을 분리한다. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BoardMasterDetailResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTtl,
        String bbsExpln,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTypeCd,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsAtrbCd,
        String bbsAtrbCdNm,
        String ansPsbltyYn,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String fileAtchPsbltyYn,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Integer atchPsbltyFileQty,
        Long atchPsbltyFileSz,
        String tmpltId,
        String frstRgtrId,
        LocalDateTime crtDt,
        String lastMdfrId,
        LocalDateTime mdfcnDt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String useYn,
        Long cmntySn,
        String ansYn,
        String stsfdgYn,
        String authFlag,
        String tmplatCours,
        @Schema(description = "낙관적 잠금 버전. 설정 수정 요청에 그대로 돌려보낸다",
                requiredMode = Schema.RequiredMode.REQUIRED) Integer version,
        @ArraySchema(arraySchema = @Schema(description = "설정이 지정한 용도(공지·FAQ·업무). 지정이 없으면 빈 배열",
                requiredMode = Schema.RequiredMode.REQUIRED),
                schema = @Schema(allowableValues = { "NOTICE", "FAQ", "TASK" })) List<String> designations
) {
    static BoardMasterDetailResponse from(BoardMasterDto dto, List<String> designations) {
        return new BoardMasterDetailResponse(
                dto.getBbsId(), dto.getBbsTtl(), dto.getBbsExpln(),
                dto.getBbsTypeCd(),
                dto.getBbsAtrbCd(), dto.getBbsAtrbCdNm(),
                dto.getAnsPsbltyYn(), dto.getFileAtchPsbltyYn(),
                dto.getAtchPsbltyFileQty(), dto.getAtchPsbltyFileSz(),
                dto.getTmpltId(), dto.getFrstRgtrId(), dto.getCrtDt(),
                dto.getLastMdfrId(), dto.getMdfcnDt(), dto.getUseYn(),
                dto.getCmntySn(),
                dto.getAnsYn(), dto.getStsfdgYn(), dto.getAuthFlag(), dto.getTmplatCours(),
                dto.getVersion(), List.copyOf(designations));
    }
}
