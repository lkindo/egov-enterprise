package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "게시판 통계 응답 DTO")
public record BoardStatsResponse(
        @Schema(description = "전체 게시글 수")
        long totalArticles,

        @Schema(description = "전체 조회수")
        long totalViews,

        @Schema(description = "주요 기여자 (최다 작성자)")
        String topContributor,

        @Schema(description = "지식화 점수 (0-100)")
        int intelligenceScore
) {
}
