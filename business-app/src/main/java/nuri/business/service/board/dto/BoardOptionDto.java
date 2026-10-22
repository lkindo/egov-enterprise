package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 이용 화면의 게시판 선택지 한 건(ADR-0040 결정 11). 응답 전용이며 ID·이름만 싣는다 — 사용 여부·커뮤니티 귀속은 서버가 이미
 * 걸렀으므로 화면이 다시 판정하지 않는다.
 */
@Schema(description = "게시판 선택지")
public record BoardOptionDto(
        @Schema(description = "게시판 ID", requiredMode = Schema.RequiredMode.REQUIRED) String bbsId,
        @Schema(description = "게시판 이름", requiredMode = Schema.RequiredMode.REQUIRED) String bbsTtl) {
}
