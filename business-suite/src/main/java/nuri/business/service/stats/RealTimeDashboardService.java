package nuri.business.service.stats;

import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.board.event.PostCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final NotificationRepository notificationRepository;
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
        activeUsers.decrementAndGet();
    }

    /**
     * 처리 대기 중인 알림 수 조회
     */
    private int getPendingAlertsCount() {
        try {
            return (int) notificationRepository.countByReadYn("N");
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
