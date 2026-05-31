package nuri.api.websocket;

import nuri.business.service.stats.DashboardStatsUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 실시간 통계 이벤트를 청취하여 WebSocket으로 브로드캐스트하는 리스너
 * 백엔드 헌법 제1조 3항(api-server의 기술 진입점 역할) 및 디커플링 아키텍처를 실질적으로 충족함.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DashboardStatsEventListener {

    private final SimpMessageSendingOperations messagingTemplate;

    /**
     * business-suite 레이어에서 통계 지표가 업데이트되어 발행한 이벤트를 비동기/동기적으로 수신
     */
    @EventListener
    public void handleDashboardStatsUpdated(DashboardStatsUpdatedEvent event) {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("activeUsers", event.activeUsers());
            stats.put("visitsPerMinute", event.visitsPerMinute());
            stats.put("newPosts", event.newPosts());
            stats.put("alerts", event.alerts());

            messagingTemplate.convertAndSend("/topic/dashboard/stats", stats);
            log.debug("Successfully broadcasted stats via WebSocket: {}", stats);
        } catch (Exception e) {
            log.error("Failed to broadcast stats via WebSocket", e);
        }
    }
}
