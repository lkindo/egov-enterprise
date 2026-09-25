package nuri.api.websocket;

import nuri.business.service.dashboard.DashboardStatsUpdatedEvent;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class DashboardStatsEventListenerTest {

    @ParameterizedTest
    @ValueSource(booleans = { true, false })
    void forwardsCountAvailabilityWithTheExistingNumericFields(boolean postsAvailable) {
        var messaging = mock(SimpMessageSendingOperations.class);
        var listener = new DashboardStatsEventListener(messaging);
        var event = new DashboardStatsUpdatedEvent(7, 3, 2, 0, postsAvailable, !postsAvailable);

        listener.handleDashboardStatsUpdated(event);

        var payload = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq("/topic/dashboard/stats"), payload.capture());
        assertThat(payload.getValue()).isEqualTo(Map.of(
                "activeUsers", 7,
                "visitsPerMinute", 3,
                "newPosts", 2,
                "alerts", 0,
                "newPostsAvailable", postsAvailable,
                "alertsAvailable", !postsAvailable));
    }
}
