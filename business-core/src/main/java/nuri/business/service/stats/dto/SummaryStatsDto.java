package nuri.business.service.stats.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

/**
 * 통계 요약 DTO — 대시보드 상단 요약 카드(총 사용자/총 게시글/오늘 접속)용.
 * 프런트 SummaryStats({ totalUsers, totalPosts, todayConnects })와 1:1 정합.
 */
@Getter
@Builder
@Schema(description = "통계 요약 DTO")
public class SummaryStatsDto {

    @Schema(description = "총 사용자 수")
    private final long totalUsers;

    @Schema(description = "총 게시글 수")
    private final long totalPosts;

    @Schema(description = "오늘 접속(로그인) 수")
    private final long todayConnects;
}
