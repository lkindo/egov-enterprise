package nuri.business.service.dashboard;

import nuri.foundation.core.dashboard.PendingAlertCountContributor;
import nuri.foundation.core.event.PostCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 실시간 대시보드 통계 서비스 (비즈니스 수위트 레이어)
 * 백엔드 헌법 제1조 2항 및 제5조에 의거하여 외부 기술 사양(SimpMessageSendingOperations)과
 * 물리적 결합을 완벽하게 끊어내고, Spring ApplicationEventPublisher를 이용해 이벤트를 발행하도록 격리 설계됨.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    /**
     * 대기 알림 수를 세는 포트. 알림 도메인이 구현하며 여기서는 개수만 받는다.
     *
     * <p>종전에는 {@code NotificationRepository} 를 직접 주입해 dashboard→notification 교차 도메인
     * 결합을 만들었다(GAP-ARCH-001). {@code ObjectProvider} 로 받는 것은 알림 도메인이 base projection
     * 에서 빠진 프로필에서도 대시보드가 뜨게 하기 위해서다 — 그때의 0 은 "세지 못했다" 가 아니라
     * "셀 알림이 없다" 는 사실이다.
     */
    private final ObjectProvider<PendingAlertCountContributor> pendingAlertCounts;
    private final ApplicationEventPublisher eventPublisher;

    // 실시간 통계 데이터 관리(로컬 메모리 활용)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);
    private final AtomicInteger todayNewPosts = new AtomicInteger(0);

    /**
     * 게시글 작성 이벤트 핸들러
     */
    @EventListener
    public void handlePostCreated(PostCreatedEvent event) {
        todayNewPosts.incrementAndGet();
        log.debug("Real-time stats updated for new post in BBS: {}", event.getBbsId());
    }

    /**
     * 실시간 데이터 발행 (5초 주기)
     * 직접 WebSocket으로 쏘는 대신 이벤트를 발행하여 api-server 측 리스너로 책임 격리
     */
    @Scheduled(fixedRate = 5000)
    public void broadcastRealTimeStats() {
        try {
            int currentActiveUsers = activeUsers.get();
            int currentVisits = visitsPerMinute.get();
            int currentPosts = todayNewPosts.get();
            int pendingAlerts = getPendingAlertsCount();

            DashboardStatsUpdatedEvent event = new DashboardStatsUpdatedEvent(
                currentActiveUsers,
                currentVisits,
                currentPosts,
                pendingAlerts
            );

            eventPublisher.publishEvent(event);
            log.debug("Published real-time stats event: {}", event);
        } catch (Exception e) {
            log.error("Error publishing real-time stats event", e);
        }
    }

    /**
     * 활성 사용자 수 증가
     */
    public void incrementActiveUsers() {
        activeUsers.incrementAndGet();
        visitsPerMinute.incrementAndGet();
    }

    /**
     * 활성 사용자 수 감소
     */
    public void decrementActiveUsers() {
        // 0 하한 강제 — 짝 없는 disconnect/재기동 후 disconnect 로 카운터가 음수가 되어 대시보드에 음수 활성자 수가 방송되던 것 방지.
        activeUsers.updateAndGet(v -> Math.max(0, v - 1));
    }

    /**
     * 처리 대기 중인 알림 수 조회.
     *
     * <p>구현이 없으면(알림 도메인이 빠진 프로필) 셀 알림 자체가 없으므로 0 이다. 조회가 실패해서 0 이 되는
     * 경우와 구분되도록 실패는 종전처럼 error 로 남긴다 — 둘을 같은 로그로 뭉개면 "알림이 없다" 와
     * "알림을 못 셌다" 를 사후에 구분할 수 없다.
     */
    private int getPendingAlertsCount() {
        PendingAlertCountContributor contributor = pendingAlertCounts.getIfAvailable();
        if (contributor == null) {
            return 0;
        }
        try {
            return (int) contributor.countPendingAlerts();
        } catch (Exception e) {
            log.error("Failed to count pending alerts", e);
            return 0;
        }
    }

    /**
     * 분당 방문자 수 초기화 (1분 주기)
     */
    @Scheduled(fixedRate = 60000)
    public void resetVisitsCounter() {
        visitsPerMinute.set(0);
    }
}
