package nuri.business.service.dashboard;

import java.util.Map;

/**
 * 실시간 대시보드 통계 지표가 업데이트되었음을 나타내는 이벤트
 * 백엔드 헌법 제12조 1항에 의거하여 불변성을 위해 Java Record 타입으로 설계
 *
 * <p>{@code newPostsAvailable} 은 집계가 실패했는지(false 면 숫자를 믿을 수 없다), {@code newPostsProvided} 는 그 집계를 하는
 * 포트 구현이 이 구성에 있는지다(Phase 2 9단계). 게시판 기능이 빠진 구성에서는 provided=false 이고, 화면은 그 카드를 그리지
 * 않는다 — 세지 않는 값을 '0 · 오늘' 로 약속하지 않는다.
 *
 * <p>[2026-10-20] 전 사용자의 읽지 않은 알림 합계({@code alerts}·{@code alertsAvailable}·{@code alertsProvided})를 걷었다 —
 * 보는 사람이 처리할 수 있는 숫자가 아니었고 '전체 미읽음 알림' 카드만 읽었다. 화면은 이 키가 없는 프레임을 읽는다.
 */
public record DashboardStatsUpdatedEvent(
    int activeUsers,
    int visitsPerMinute,
    int newPosts,
    boolean newPostsAvailable,
    boolean newPostsProvided
) {
    /**
     * 프론트엔드 전송에 필요한 맵 구조로 쉽게 변환할 수 있는 유틸리티 메서드
     */
    public Map<String, Object> toMap() {
        return Map.of(
            "activeUsers", activeUsers,
            "visitsPerMinute", visitsPerMinute,
            "newPosts", newPosts,
            "newPostsAvailable", newPostsAvailable,
            "newPostsProvided", newPostsProvided
        );
    }
}
