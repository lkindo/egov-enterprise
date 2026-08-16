package nuri.api.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.service.dashboard.RealTimeDashboardService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** 서버가 실제 인증 소켓 수명 이벤트를 기준으로 접속자 통계를 갱신한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketSessionEventListener {

    private final RealTimeDashboardService dashboardService;

    @EventListener
    public void handleConnected(SessionConnectedEvent event) {
        dashboardService.incrementActiveUsers();
        log.debug("Authenticated WebSocket session connected: {}", event.getMessage().getHeaders().get("simpSessionId"));
    }

    @EventListener
    public void handleDisconnected(SessionDisconnectEvent event) {
        dashboardService.decrementActiveUsers();
        log.debug("Authenticated WebSocket session disconnected: {}", event.getSessionId());
    }
}
