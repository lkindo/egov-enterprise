package nuri.api.controller.business.admin.content.board;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardMasterCommunity;
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
        @Schema(description = "예약 게시 — Y 면 새 글의 미래 게시 시작일을 받는다(ADR-0040 결정 3·6)",
                allowableValues = { "Y", "N" }, requiredMode = Schema.RequiredMode.REQUIRED) String rsvtPstgPsbltyYn,
        @Schema(description = "상단 고정 허용 — Y 면 새 고정을 받는다. 꺼도 이미 고정된 글은 종료일까지 그대로다(ADR-0040 결정 5·6)",
                allowableValues = { "Y", "N" }, requiredMode = Schema.RequiredMode.REQUIRED) String upendFixPsbltyYn,
        @Schema(description = "상단 고정 상한 — 고정 중인 글 수(새 고정만 따른다)",
                requiredMode = Schema.RequiredMode.REQUIRED) Integer upendFixUplmtNocs,
        @Schema(description = "상단 고정 기본 일수 — 종료일을 비우고 고정하면 오늘부터 이 일수 뒤까지다",
                requiredMode = Schema.RequiredMode.REQUIRED) Integer upendFixBscDayCnt,
        @Schema(description = "비밀글 정책 — NONE 은 요청값 그대로, OPTIONAL 은 글쓴이가 고름, REQUIRED 는 새 글과 고친 글을 비밀글로 저장한다. "
                + "바꿔도 이미 있는 글의 비밀 여부는 그대로다(ADR-0040 결정 7)",
                allowableValues = { "NONE", "OPTIONAL", "REQUIRED" }, requiredMode = Schema.RequiredMode.REQUIRED) String prvtPstPlcyCd,
        @Schema(description = "추천 받기 — N 이면 새 추천을 받지 않는다. 이미 받은 추천 수는 그대로이고 자기 추천 취소는 받는다(ADR-0040 결정 6)",
                allowableValues = { "Y", "N" }, requiredMode = Schema.RequiredMode.REQUIRED) String rcmdtnUseYn,
        String authFlag,
        String tmplatCours,
        @Schema(description = "낙관적 잠금 버전. 설정 수정 요청에 그대로 돌려보낸다",
                requiredMode = Schema.RequiredMode.REQUIRED) Integer version,
        @ArraySchema(arraySchema = @Schema(description = "설정이 지정한 용도(공지·FAQ·업무·Q&A·위키). 지정이 없으면 빈 배열. "
                + "지정 게시판은 영구 삭제할 수 없다(ADR-0043 결정 4)", requiredMode = Schema.RequiredMode.REQUIRED),
                schema = @Schema(allowableValues = { "NOTICE", "FAQ", "TASK", "QNA", "WIKI" })) List<String> designations,
        // [2026-10-26 ADR-0043 결정 3] 귀속 커뮤니티의 이름·이용 가능 여부. 귀속이 없으면 싣지 않는다.
        @Schema(description = "귀속 커뮤니티 요약. 귀속이 없으면 싣지 않는다") BoardMasterCommunity community
) {
    static BoardMasterDetailResponse from(BoardMasterDto dto, List<String> designations, BoardMasterCommunity community) {
        return new BoardMasterDetailResponse(
                dto.getBbsId(), dto.getBbsTtl(), dto.getBbsExpln(),
                dto.getBbsTypeCd(),
                dto.getBbsAtrbCd(), dto.getBbsAtrbCdNm(),
                dto.getAnsPsbltyYn(), dto.getFileAtchPsbltyYn(),
                dto.getAtchPsbltyFileQty(), dto.getAtchPsbltyFileSz(),
                dto.getTmpltId(), dto.getFrstRgtrId(), dto.getCrtDt(),
                dto.getLastMdfrId(), dto.getMdfcnDt(), dto.getUseYn(),
                dto.getCmntySn(),
                dto.getAnsYn(), dto.getStsfdgYn(),
                "Y".equals(dto.getRsvtPstgPsbltyYn()) ? "Y" : "N",
                "Y".equals(dto.getUpendFixPsbltyYn()) ? "Y" : "N",
                dto.getUpendFixUplmtNocs(), dto.getUpendFixBscDayCnt(),
                dto.getPrvtPstPlcyCd() != null ? dto.getPrvtPstPlcyCd() : "NONE",
                "N".equals(dto.getRcmdtnUseYn()) ? "N" : "Y",
                dto.getAuthFlag(), dto.getTmplatCours(),
                dto.getVersion(), List.copyOf(designations), community);
    }
}
