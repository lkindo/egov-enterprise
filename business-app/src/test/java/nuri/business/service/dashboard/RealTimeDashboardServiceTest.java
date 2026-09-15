package nuri.business.service.dashboard;

import nuri.foundation.core.dashboard.PendingAlertCountContributor;
import nuri.foundation.core.event.PostCreatedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RealTimeDashboardService 테스트")
class RealTimeDashboardServiceTest {

    @Mock
    private ApplicationEventPublisher eventPublisher;

    /**
     * 대기 알림 수는 알림 도메인이 구현하는 포트로 받는다(GAP-ARCH-001 의 dashboard→notification 역전).
     * 알림 도메인이 빠진 프로필에서도 대시보드가 뜨도록 {@code ObjectProvider} 로 주입된다.
     */
    @Mock
    private ObjectProvider<PendingAlertCountContributor> pendingAlertCounts;

    @Mock
    private PendingAlertCountContributor pendingAlertCountContributor;

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
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenReturn(5L);

        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.alerts() == 5));
        verify(pendingAlertCountContributor).countPendingAlerts();
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
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenThrow(new RuntimeException("DB Error"));
        realTimeDashboardService.broadcastRealTimeStats();
        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.alerts() == 0));
    }

    /**
     * 알림 도메인이 base projection 에서 빠진 프로필에는 구현이 없다. 그때의 0 은 "셀 알림이 없다" 는
     * 사실이며, 조회가 실패해 0 이 되는 위 경우와 달리 error 로그를 남기지 않는다.
     */
    @Test
    @DisplayName("대기 알림 집계 구현이 없으면 0 을 방송하고 대시보드는 계속 돈다")
    void getRealTimeStats_NoContributor() {
        when(pendingAlertCounts.getIfAvailable()).thenReturn(null);
        realTimeDashboardService.broadcastRealTimeStats();
        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.alerts() == 0));
    }
}
