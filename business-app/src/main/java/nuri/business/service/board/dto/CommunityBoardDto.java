package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.board.BoardMaster;

/**
 * 커뮤니티에 귀속된 게시판 한 건 — 커뮤니티 상세 화면의 '게시판' 목록용.
 *
 * <p>[2026-09-08 PD-CMTY-001] 관리자용 {@code BoardMasterDto} 를 그대로 쓰지 않는다. 그쪽은 첨부 한도·
 * 템플릿·등록자 같은 운영 필드를 함께 실어 나르는데, 회원에게 필요한 것은 어디로 들어가는지뿐이다.
 */
@Schema(description = "커뮤니티 귀속 게시판")
public record CommunityBoardDto(
        @Schema(description = "게시판 ID") String bbsId,
        @Schema(description = "게시판 제목", nullable = true) String bbsTtl,
        @Schema(description = "게시판 설명", nullable = true) String bbsExpln,
        @Schema(description = "게시판 유형 코드", nullable = true) String bbsTypeCd) {

    public static CommunityBoardDto from(BoardMaster master) {
        return new CommunityBoardDto(
                master.getBbsId(),
                master.getBbsTtl(),
                master.getBbsExpln(),
                master.getBbsTypeCd());
    }
}
