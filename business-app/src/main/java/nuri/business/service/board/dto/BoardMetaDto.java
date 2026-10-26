package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.board.BoardMaster;

/**
 * 게시판 목록·상세 화면이 쓰는 게시판 메타 — 인증 사용자용 읽기 전용.
 *
 * <p>[2026-09-26 DIP V5] 게시글 목록·상세 화면은 게시판 제목·설명·템플릿을 관리자 API
 * ({@code GET /admin/system/boards/{id}}, BBS_MST_READ)로 읽었다. 일반 사용자는 그 권한이 없어
 * 제목 대신 '게시판' 이, 템플릿 대신 기본 목록형이 보였다. 관리자용 {@code BoardMasterDto} 를
 * 그대로 열지 않는다 — 그쪽은 등록자·수정자·사용 여부 같은 운영 필드를 함께 싣는다.
 */
@Schema(description = "게시판 메타(읽기 전용)")
public record BoardMetaDto(
        @Schema(description = "게시판 ID") String bbsId,
        @Schema(description = "게시판 제목", nullable = true) String bbsTtl,
        @Schema(description = "게시판 설명", nullable = true) String bbsExpln,
        @Schema(description = "게시판 유형 코드", nullable = true) String bbsTypeCd,
        @Schema(description = "화면 템플릿 ID", nullable = true) String tmpltId,
        @Schema(description = "답글 가능 여부", allowableValues = { "Y", "N" }, nullable = true) String ansPsbltyYn,
        @Schema(description = "파일 첨부 가능 여부", allowableValues = { "Y", "N" }, nullable = true) String fileAtchPsbltyYn,
        @Schema(description = "첨부 가능 파일 수", nullable = true) Integer atchPsbltyFileQty,
        @Schema(description = "첨부 가능 파일 크기(바이트)", nullable = true) Long atchPsbltyFileSz,
        @Schema(description = "만족도 조사 사용 여부", allowableValues = { "Y", "N" }, nullable = true) String stsfdgYn,
        @Schema(description = "댓글 사용 여부(2026-09-27 DIP B5 F9 — N 이면 새 댓글을 받지 않는다)", allowableValues = { "Y", "N" }, nullable = true) String ansYn,
        @Schema(description = "일반 게시글 쓰기 권한에 추가로 모두 필요한 편집 권한. 일반 게시판은 빈 배열입니다.", requiredMode = Schema.RequiredMode.REQUIRED)
        java.util.List<String> requiredEditPermissions,
        @Schema(description = "게시판이 사용 중인지. false 면 조회 대행 권한자가 사용 안 함 게시판을 열람하는 중이며, 서버는 새 댓글·만족도·추천을 받지 않는다(ADR-0040 결정 1).", requiredMode = Schema.RequiredMode.REQUIRED)
        boolean inUse,
        @Schema(description = "예약 게시(ADR-0040 결정 3·6). N 이면 서버가 오늘보다 뒤의 새 게시 시작일을 거부한다. 작성 화면이 이 값으로 안내한다.",
                allowableValues = { "Y", "N" }, requiredMode = Schema.RequiredMode.REQUIRED)
        String rsvtPstgPsbltyYn,
        @Schema(description = "상단 고정 허용(ADR-0040 결정 5·6). N 이면 서버가 새 고정을 거부한다(해제는 받는다). 운영 화면이 이 값으로 고정 단추를 안내한다.",
                allowableValues = { "Y", "N" }, requiredMode = Schema.RequiredMode.REQUIRED)
        String upendFixPsbltyYn,
        @Schema(description = "비밀글 정책(ADR-0040 결정 7). NONE 은 작성 화면에 선택이 없고, OPTIONAL 은 글쓴이가 고르며, REQUIRED 는 서버가 "
                + "새 글과 고친 글을 비밀글로 저장한다. 작성 화면이 이 값으로 선택·안내를 정한다.",
                allowableValues = { "NONE", "OPTIONAL", "REQUIRED" }, requiredMode = Schema.RequiredMode.REQUIRED)
        String prvtPstPlcyCd,
        @Schema(description = "추천 받기(ADR-0040 결정 6). N 이면 서버가 새 추천을 거부한다(자기 추천 취소는 받는다). 목록·상세 화면이 이 값으로 추천 단추를 정한다.",
                allowableValues = { "Y", "N" }, requiredMode = Schema.RequiredMode.REQUIRED)
        String rcmdtnUseYn,
        @Schema(description = "귀속 커뮤니티 요약(ADR-0043 1차 UX-09). 귀속이 없으면 null 이다 — 작성 화면이 '누가 이 글을 보는지'를 말한다. "
                + "커뮤니티 기능이 없거나 찾지 못하면 이름·이용 가능 여부가 null 인 요약이다(확인 불가).",
                nullable = true, types = {"object", "null"})
        @JsonInclude(JsonInclude.Include.ALWAYS)
        BoardMasterCommunity community) {

    public static BoardMetaDto from(BoardMaster master, java.util.List<String> requiredEditPermissions, BoardMasterCommunity community) {
        return new BoardMetaDto(
                master.getBbsId(),
                master.getBbsTtl(),
                master.getBbsExpln(),
                master.getBbsTypeCd(),
                master.getTmpltId(),
                master.getAnsPsbltyYn(),
                master.getFileAtchPsbltyYn(),
                master.getAtchPsbltyFileQty(),
                master.getAtchPsbltyFileSz(),
                master.getStsfdgYn(),
                master.getAnsYn(), java.util.List.copyOf(requiredEditPermissions),
                "Y".equals(master.getUseYn()),
                "Y".equals(master.getRsvtPstgPsbltyYn()) ? "Y" : "N",
                "Y".equals(master.getUpendFixPsbltyYn()) ? "Y" : "N",
                master.getPrvtPstPlcyCd() != null ? master.getPrvtPstPlcyCd() : BoardMaster.PRIVATE_POST_NONE,
                master.acceptsRecommendations() ? "Y" : "N",
                community);
    }
}
