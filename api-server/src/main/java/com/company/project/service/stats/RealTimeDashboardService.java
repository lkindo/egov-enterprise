package com.company.project.service.stats;

import com.company.project.service.board.event.PostCreatedEvent;
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
 * 로컬 메모리(AtomicInteger)를 사용하여 실시간 데이터를 집계하고 WebSocket으로 브로드캐스트함
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;

    // 실시간 통계 데이터 관리 (로컬 메모리 활용)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);
    private final AtomicInteger todayNewPosts = new AtomicInteger(0);

    /**
     * 게시글 생성 이벤트 핸들러 (Point 22: 이벤트 활용)
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
     * 활성 사용자 증가
     */
    public void incrementActiveUsers() {
        activeUsers.incrementAndGet();
        visitsPerMinute.incrementAndGet();
    }

    /**
     * 활성 사용자 감소
     */
    public void decrementActiveUsers() {
        activeUsers.decrementAndGet();
    }

    /**
     * 처리 대기 중인 알림 수 조회 (더미 로직)
     */
    private int getPendingAlertsCount() {
        // TODO: 실제 데이터베이스에서 미처리 알림 수를 조회하는 로직 구현
        return (int) (Math.random() * 5);
    }

    /**
     * 분당 방문자 수 초기화 (1분 주기)
     */
    @Scheduled(fixedRate = 60000)
    public void resetVisitsCounter() {
        visitsPerMinute.set(0);
    }
}
