package nuri.api.controller.business.admin.content.board;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardMasterDto;

import java.time.LocalDateTime;

/** 게시판 마스터 상세 조회 전용 응답. 쓰기 필수값과 물리 nullable 값을 분리한다. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BoardMasterDetailResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTtl,
        String bbsExpln,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String bbsTypeCd,
        String bbsTypeCdNm,
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
        Long blogSn,
        String blogYn,
        String ansYn,
        String stsfdgYn,
        String authFlag,
        String tmplatCours
) {
    static BoardMasterDetailResponse from(BoardMasterDto dto) {
        return new BoardMasterDetailResponse(
                dto.getBbsId(), dto.getBbsTtl(), dto.getBbsExpln(),
                dto.getBbsTypeCd(), dto.getBbsTypeCdNm(),
                dto.getBbsAtrbCd(), dto.getBbsAtrbCdNm(),
                dto.getAnsPsbltyYn(), dto.getFileAtchPsbltyYn(),
                dto.getAtchPsbltyFileQty(), dto.getAtchPsbltyFileSz(),
                dto.getTmpltId(), dto.getFrstRgtrId(), dto.getCrtDt(),
                dto.getLastMdfrId(), dto.getMdfcnDt(), dto.getUseYn(),
                dto.getCmntySn(), dto.getBlogSn(), dto.getBlogYn(),
                dto.getAnsYn(), dto.getStsfdgYn(), dto.getAuthFlag(), dto.getTmplatCours());
    }
}
