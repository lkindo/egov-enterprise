package nuri.business.domain.board;

/**
 * Viewer-scoped board statistics calculated from one visibility contract.
 */
public record BoardStatsResult(long totalArticles, long totalViews, String topContributor) {
}
