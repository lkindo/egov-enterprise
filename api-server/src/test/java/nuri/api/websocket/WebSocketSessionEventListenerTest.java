package nuri.api.websocket;

import nuri.business.service.stats.RealTimeDashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class WebSocketSessionEventListenerTest {

    private final RealTimeDashboardService dashboardService = mock(RealTimeDashboardService.class);
    private final WebSocketSessionEventListener listener = new WebSocketSessionEventListener(dashboardService);

    @Test
    void realSessionLifecycleUpdatesActiveUserCount() {
        var message = MessageBuilder.withPayload(new byte[0])
                .setHeader("simpSessionId", "session-1")
                .build();

        listener.handleConnected(new SessionConnectedEvent(this, message));
        listener.handleDisconnected(new SessionDisconnectEvent(
                this, message, "session-1", CloseStatus.NORMAL, null));

        verify(dashboardService).incrementActiveUsers();
        verify(dashboardService).decrementActiveUsers();
    }
}
