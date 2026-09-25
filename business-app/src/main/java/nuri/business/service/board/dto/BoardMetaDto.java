package nuri.business.service.board.dto;

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
        @Schema(description = "만족도 조사 사용 여부", allowableValues = { "Y", "N" }, nullable = true) String stsfdgYn) {

    public static BoardMetaDto from(BoardMaster master) {
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
                master.getStsfdgYn());
    }
}
