package nuri.api.websocket;

import nuri.business.service.dashboard.DashboardStatsUpdatedEvent;
import nuri.config.websocket.WebSocketAuthorizationInterceptor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 실시간 통계 이벤트를 청취하여 WebSocket으로 브로드캐스트하는 리스너
 * 백엔드 헌법 제1조 3항(api-server의 기술 진입점 역할) 및 디커플링 아키텍처를 실질적으로 충족함.
 */
@Slf4j
@Component
public class DashboardStatsEventListener {

    private final SimpMessageSendingOperations messagingTemplate;
    @Nullable
    private final WebSocketAuthorizationInterceptor authorizationInterceptor;

    public DashboardStatsEventListener(SimpMessageSendingOperations messagingTemplate) {
        this(messagingTemplate, null);
    }

    @Autowired
    public DashboardStatsEventListener(
            SimpMessageSendingOperations messagingTemplate,
            @Nullable WebSocketAuthorizationInterceptor authorizationInterceptor) {
        this.messagingTemplate = messagingTemplate;
        this.authorizationInterceptor = authorizationInterceptor;
    }

    /**
     * business-suite 레이어에서 통계 지표가 업데이트되어 발행한 이벤트를 비동기/동기적으로 수신
     */
    @EventListener
    public void handleDashboardStatsUpdated(DashboardStatsUpdatedEvent event) {
        try {
            Map<String, Object> stats = event.toMap();

            // Spring Messaging 7 에 기본 목적지용 convertAndSend(Object payload, Map headers) 가 생겨 (String, Map) 인자가
            //   두 오버로드에 모두 맞는다. payload 를 Object 로 올려 목적지 오버로드를 고른다.
            Runnable broadcast = () -> messagingTemplate.convertAndSend("/topic/dashboard/stats", (Object) stats);
            if (authorizationInterceptor != null) {
                authorizationInterceptor.runWithBroadcastCache(broadcast);
            } else {
                broadcast.run();
            }
            log.debug("Successfully broadcasted stats via WebSocket: {}", stats);
        } catch (Exception e) {
            log.error("Failed to broadcast stats via WebSocket", e);
        }
    }
}
