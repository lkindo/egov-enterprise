package nuri.api.controller.business.board.dto;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.board.dto.BoardDto;

public record PublicFaqListItemResponse(
        @Schema(description = "게시판 ID", allowableValues = "BBSMSTR_AAAAAAAAAAAA", requiredMode = Schema.RequiredMode.REQUIRED)
        String bbsId,
        @Schema(description = "게시글 ID", requiredMode = Schema.RequiredMode.REQUIRED)
        Long pstSn,
        @Schema(description = "FAQ 질문 제목", nullable = true, types = {"string", "null"})
        String pstTtl,
        @Schema(description = "조회수", nullable = true, types = {"integer", "null"})
        Integer inqCnt,
        @Schema(description = "등록일시", nullable = true, types = {"string", "null"})
        LocalDateTime crtDt,
        @Schema(description = "활성 상태", allowableValues = "Y", requiredMode = Schema.RequiredMode.REQUIRED)
        String useYn,
        @Schema(description = "비밀글 여부", allowableValues = "N", requiredMode = Schema.RequiredMode.REQUIRED)
        String scrtYn) {

    public static PublicFaqListItemResponse from(BoardDto source) {
        return new PublicFaqListItemResponse(
                source.bbsId(),
                source.pstSn(),
                source.pstTtl(),
                source.inqCnt(),
                source.crtDt(),
                source.useYn(),
                // [2026-10-29] 계약은 'N' 만 받는다 — 비어 있으면 'N' 이다(열람 판정이 모두 NULL 을 공개 글로 보는 것과 같은 규칙). 종전에는
                //   NULL 한 건이 화면의 응답 검사를 깨 도움말 FAQ 목록 전체가 '불러오지 못했습니다' 였다.
                source.scrtYn() != null ? source.scrtYn() : "N");
    }
}
