package nuri.business.service.stats;

import java.util.Map;

/**
 * 실시간 대시보드 통계 지표가 업데이트되었음을 나타내는 이벤트
 * 백엔드 헌법 제12조 1항에 의거하여 불변성을 위해 Java Record 타입으로 설계
 */
public record DashboardStatsUpdatedEvent(
    int activeUsers,
    int visitsPerMinute,
    int newPosts,
    int alerts
) {
    /**
     * 프론트엔드 전송에 필요한 맵 구조로 쉽게 변환할 수 있는 유틸리티 메서드
     */
    public Map<String, Object> toMap() {
        return Map.of(
            "activeUsers", activeUsers,
            "visitsPerMinute", visitsPerMinute,
            "newPosts", newPosts,
            "alerts", alerts
        );
    }
}
