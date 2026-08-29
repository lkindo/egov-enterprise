package nuri.business.service.dashboard;

import nuri.business.domain.notification.NotificationRepository;
import nuri.foundation.core.event.PostCreatedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RealTimeDashboardService 테스트")
class RealTimeDashboardServiceTest {

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private RealTimeDashboardService realTimeDashboardService;

    @Test
    @DisplayName("게시글 작성 이벤트 처리 확인")
    void handlePostCreated_IncrementsCount() {
        PostCreatedEvent event = new PostCreatedEvent(this, "BBS_001", 1L, "user01");
        realTimeDashboardService.handlePostCreated(event);
        realTimeDashboardService.broadcastRealTimeStats();
        
        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.newPosts() == 1));
    }

    @Test
    @DisplayName("실시간 통계 이벤트 발행 확인")
    void broadcastRealTimeStats_Success() {
        when(notificationRepository.countByReadYn("N")).thenReturn(5L);

        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(any(DashboardStatsUpdatedEvent.class));
        verify(notificationRepository).countByReadYn("N");
    }

    @Test
    @DisplayName("활성 사용자 수 증감 확인")
    void activeUsers_IncrementAndDecrement() {
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.decrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.activeUsers() == 0));
    }

    @Test
    @DisplayName("방문자 수 카운터 리셋")
    void resetVisitsCounter_Success() {
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.resetVisitsCounter();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.visitsPerMinute() == 0));
    }

    @Test
    @DisplayName("대기 중인 알림 수 조회 예외 시 0 반환")
    void getRealTimeStats_ExceptionHandled() {
        when(notificationRepository.countByReadYn("N")).thenThrow(new RuntimeException("DB Error"));
        realTimeDashboardService.broadcastRealTimeStats();
        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.alerts() == 0));
    }
}
