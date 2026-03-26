package com.company.project.service.stats;

import com.company.project.business.domain.notification.NotificationRepository;
import com.company.project.business.service.board.event.PostCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 실시간 대시보드 통계 서비스
 * 로컬 메모리(AtomicInteger)를 활용하여 실시간 지표를 집계하고 WebSocket으로 브로드캐스트한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;
    private final NotificationRepository notificationRepository;

    // 실시간 통계 데이터 관리(로컬 메모리 활용)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);
    private final AtomicInteger todayNewPosts = new AtomicInteger(0);

    /**
     * 게시글 작성 이벤트 핸들러 (Point 22: 이벤트 활용)
     */
    @EventListener
    public void handlePostCreated(PostCreatedEvent event) {
        todayNewPosts.incrementAndGet();
        log.debug("Real-time stats updated for new post in BBS: {}", event.getBbsId());
    }

    /**
     * 실시간 데이터 브로드캐스트 (5초 주기)
     */
    @Scheduled(fixedRate = 5000)
    public void broadcastRealTimeStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("activeUsers", activeUsers.get());
            stats.put("visitsPerMinute", visitsPerMinute.get());
            stats.put("newPosts", todayNewPosts.get());
            stats.put("alerts", getPendingAlertsCount());

            messagingTemplate.convertAndSend("/topic/dashboard/stats", stats);
            log.debug("Real-time stats broadcasted: {}", stats);
        } catch (Exception e) {
            log.error("Error broadcasting real-time stats", e);
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
     * 처리 대기 중인 알림 수 조회 (임시 로직)
     */
    private int getPendingAlertsCount() {
        try {
            return (int) notificationRepository.countByIsRead("N");
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
