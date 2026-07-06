package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "게시판 통계 응답 DTO")
public class BoardStatsResponse {
    @Schema(description = "전체 게시글 수")
    private long totalArticles;

    @Schema(description = "전체 조회수")
    private long totalViews;

    @Schema(description = "주요 기여자 (최다 작성자)")
    private String topContributor;

    @Schema(description = "지식화 점수 (0-100)")
    private int intelligenceScore;
}
