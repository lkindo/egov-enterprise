package nuri.api.controller.business.board.dto;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardDto;

/**
 * 통합 검색 결과 1건.
 *
 * <p><b>왜 {@code BoardDto} 를 그대로 쓰지 않나.</b> {@code BoardDto} 는 본문 HTML({@code pstCn})과
 * 게시글 비밀번호({@code pswd})까지 담은 전체 레코드다. 통합 검색은 "어떤 글이 있는지" 를 보여
 * 주고 상세로 보내는 창구이므로, 목록에 필요한 필드만 실어 응답 표면을 좁힌다
 * ({@code PublicFaqListItemResponse} 와 같은 방식).
 */
public record BoardSearchItemResponse(
        @Schema(description = "게시판 ID", requiredMode = Schema.RequiredMode.REQUIRED)
        String bbsId,
        @Schema(description = "게시글 ID", requiredMode = Schema.RequiredMode.REQUIRED)
        Long pstSn,
        @Schema(description = "게시글 제목", nullable = true, types = {"string", "null"})
        String pstTtl,
        @Schema(description = "작성자명", nullable = true, types = {"string", "null"})
        String userNm,
        @Schema(description = "조회수", nullable = true, types = {"integer", "null"})
        Integer inqCnt,
        @Schema(description = "등록일시", nullable = true, types = {"string", "null"})
        LocalDateTime crtDt) {

    public static BoardSearchItemResponse from(BoardDto source) {
        return new BoardSearchItemResponse(
                source.bbsId(),
                source.pstSn(),
                source.pstTtl(),
                source.userNm(),
                source.inqCnt(),
                source.crtDt());
    }
}
