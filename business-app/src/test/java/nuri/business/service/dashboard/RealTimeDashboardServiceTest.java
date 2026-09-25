package nuri.business.service.dashboard;

import nuri.foundation.core.dashboard.PendingAlertCountContributor;
import nuri.foundation.core.stats.PostStatisticsContributor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

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

    @Mock
    private ObjectProvider<PostStatisticsContributor> postStatistics;

    @Mock
    private PostStatisticsContributor postStatisticsContributor;

    private RealTimeDashboardService realTimeDashboardService;

    @BeforeEach
    void setUp() {
        realTimeDashboardService = new RealTimeDashboardService(pendingAlertCounts, postStatistics, eventPublisher);
        realTimeDashboardService.useClock(Clock.fixed(Instant.parse("2026-09-25T00:00:00Z"), ZoneId.of("Asia/Seoul")));
    }

    @Test
    @DisplayName("서비스 재시작 후에도 DB에 남아 있는 오늘 게시글 수가 같다")
    void restartingServicePreservesPersistedTodayCount() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween(anyString(), anyString())).thenReturn(7L);

        realTimeDashboardService.broadcastRealTimeStats();
        var restarted = new RealTimeDashboardService(pendingAlertCounts, postStatistics, eventPublisher);
        restarted.useClock(Clock.fixed(Instant.parse("2026-09-25T00:00:00Z"), ZoneId.of("Asia/Seoul")));
        restarted.broadcastRealTimeStats();

        verify(eventPublisher, times(2)).publishEvent(argThat((DashboardStatsUpdatedEvent e) ->
                e.newPosts() == 7 && e.newPostsAvailable()));
    }

    @Test
    @DisplayName("실시간 통계 이벤트 발행 확인")
    void broadcastRealTimeStats_Success() {
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenReturn(5L);

        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) -> e.alerts() == 5 && e.alertsAvailable()));
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
    @DisplayName("알림 조회 실패에도 정상 접속 통계는 계속 방송한다")
    void alertFailurePreservesOtherCounters() {
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenThrow(new RuntimeException("DB Error"));
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();
        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) ->
                e.activeUsers() == 1 && e.visitsPerMinute() == 1 && !e.alertsAvailable()));
    }

    /**
     * 알림 도메인이 base projection 에서 빠진 프로필에는 구현이 없다. 그때의 0 은 "셀 알림이 없다" 는
     * 사실이며, 조회 실패와 달리 정상 집계 상태다.
     */
    @Test
    @DisplayName("대기 알림 집계 구현이 없으면 0 을 방송하고 대시보드는 계속 돈다")
    void getRealTimeStats_NoContributor() {
        when(pendingAlertCounts.getIfAvailable()).thenReturn(null);
        realTimeDashboardService.broadcastRealTimeStats();
        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) ->
                e.alerts() == 0 && e.alertsAvailable() && e.newPosts() == 0 && e.newPostsAvailable()));
    }

    @Test
    @DisplayName("게시글 이벤트를 받기 전에도 저장된 오늘 게시글 수를 방송한다")
    void readsPersistedPostsBeforeAnyLocalEvent() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween(anyString(), anyString())).thenReturn(7L);

        realTimeDashboardService.broadcastRealTimeStats();

        var event = org.mockito.ArgumentCaptor.forClass(DashboardStatsUpdatedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().newPosts()).isEqualTo(7);
    }

    @Test
    @DisplayName("알림 집계 실패는 실제 0건과 구분되는 미확인 상태를 방송한다")
    void failedAlertCountIsExplicitlyUnavailable() {
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenThrow(new IllegalStateException("count unavailable"));

        realTimeDashboardService.broadcastRealTimeStats();

        var event = org.mockito.ArgumentCaptor.forClass(DashboardStatsUpdatedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().toMap()).containsEntry("alertsAvailable", false);
    }

    @Test
    @DisplayName("한국 시간 월말 자정을 지나면 다음 날의 반개방 범위로 다시 집계한다")
    void recountsCurrentKoreanDayAcrossMidnightAndMonthBoundary() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween("2026-09-30 00:00:00", "2026-10-01 00:00:00")).thenReturn(7L);
        when(postStatisticsContributor.countPostsBetween("2026-10-01 00:00:00", "2026-10-02 00:00:00")).thenReturn(2L);

        realTimeDashboardService.useClock(Clock.fixed(Instant.parse("2026-09-30T14:59:59Z"), ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();
        realTimeDashboardService.useClock(Clock.fixed(Instant.parse("2026-09-30T15:00:00Z"), ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();

        var event = org.mockito.ArgumentCaptor.forClass(DashboardStatsUpdatedEvent.class);
        verify(eventPublisher, times(2)).publishEvent(event.capture());
        assertThat(event.getAllValues()).extracting(DashboardStatsUpdatedEvent::newPosts).containsExactly(7, 2);
        assertThat(event.getAllValues()).allMatch(DashboardStatsUpdatedEvent::newPostsAvailable);
    }

    @Test
    @DisplayName("게시글 집계 실패는 알림의 정상 집계를 가리지 않는다")
    void postCountFailureDoesNotHideAvailableAlertCount() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween(anyString(), anyString()))
                .thenThrow(new IllegalStateException("count unavailable"));
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenReturn(4L);

        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) ->
                !e.newPostsAvailable() && e.alerts() == 4 && e.alertsAvailable()));
    }

    /**
     * [2026-09-25] 방송은 5초마다지만 게시글 수는 {@link RealTimeDashboardService#TODAY_POSTS_TTL} 동안 재사용한다.
     * 종전에는 매 방송마다 날짜별 GROUP BY 를 돌려 인스턴스마다 분당 12번 게시글 테이블을 훑었다.
     */
    @Test
    @DisplayName("같은 날 TTL 안의 방송은 게시글 수를 다시 세지 않고, TTL 이 지나면 다시 센다")
    void todayPostCountIsReusedWithinTtlAndRecountedAfter() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween("2026-09-25 00:00:00", "2026-09-26 00:00:00"))
                .thenReturn(3L, 5L);
        Instant start = Instant.parse("2026-09-25T01:00:00Z");

        realTimeDashboardService.useClock(Clock.fixed(start, ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();
        realTimeDashboardService.useClock(Clock.fixed(start.plus(RealTimeDashboardService.TODAY_POSTS_TTL).minusMillis(1), ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();
        realTimeDashboardService.useClock(Clock.fixed(start.plus(RealTimeDashboardService.TODAY_POSTS_TTL), ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();

        verify(postStatisticsContributor, times(2)).countPostsBetween("2026-09-25 00:00:00", "2026-09-26 00:00:00");
        var event = org.mockito.ArgumentCaptor.forClass(DashboardStatsUpdatedEvent.class);
        verify(eventPublisher, times(3)).publishEvent(event.capture());
        assertThat(event.getAllValues()).extracting(DashboardStatsUpdatedEvent::newPosts).containsExactly(3, 3, 5);
    }

    @Test
    @DisplayName("게시글 집계 실패는 재사용하지 않아 다음 방송이 곧바로 다시 센다")
    void failedPostCountIsNotCached() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween(anyString(), anyString()))
                .thenThrow(new IllegalStateException("count unavailable"))
                .thenReturn(4L);

        realTimeDashboardService.broadcastRealTimeStats();
        realTimeDashboardService.broadcastRealTimeStats();

        var event = org.mockito.ArgumentCaptor.forClass(DashboardStatsUpdatedEvent.class);
        verify(eventPublisher, times(2)).publishEvent(event.capture());
        assertThat(event.getAllValues()).extracting(DashboardStatsUpdatedEvent::newPostsAvailable).containsExactly(false, true);
        assertThat(event.getAllValues().get(1).newPosts()).isEqualTo(4);
    }

    @Test
    @DisplayName("시계가 뒤로 가면 재사용하지 않고 다시 센다")
    void clockMovingBackwardsRecounts() {
        when(postStatistics.getIfAvailable()).thenReturn(postStatisticsContributor);
        when(postStatisticsContributor.countPostsBetween(anyString(), anyString())).thenReturn(1L, 2L);
        Instant start = Instant.parse("2026-09-25T01:00:00Z");

        realTimeDashboardService.useClock(Clock.fixed(start, ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();
        realTimeDashboardService.useClock(Clock.fixed(start.minusSeconds(1), ZoneId.of("Asia/Seoul")));
        realTimeDashboardService.broadcastRealTimeStats();

        verify(postStatisticsContributor, times(2)).countPostsBetween(anyString(), anyString());
    }

    @Test
    @DisplayName("알림 개수가 기존 wire 정수 범위를 넘으면 음수 대신 미확인으로 표시한다")
    void overflowingAlertCountIsUnavailableRatherThanNegative() {
        when(pendingAlertCounts.getIfAvailable()).thenReturn(pendingAlertCountContributor);
        when(pendingAlertCountContributor.countPendingAlerts()).thenReturn((long) Integer.MAX_VALUE + 1);

        realTimeDashboardService.broadcastRealTimeStats();

        verify(eventPublisher).publishEvent(argThat((DashboardStatsUpdatedEvent e) ->
                e.alerts() == 0 && !e.alertsAvailable()));
    }
}
