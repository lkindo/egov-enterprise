package com.company.project.service.stats;

import com.company.project.domain.notification.NotificationRepository;
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
 * ?시???보???계 ?비?? * 로컬 메모?AtomicInteger)??용?여 ?시??이?? 집계?고 WebSocket?로 브로?캐?트?? */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;
    private final NotificationRepository notificationRepository;

    // ?시??계 ?이??관?(로컬 메모??용)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);
    private final AtomicInteger todayNewPosts = new AtomicInteger(0);

    /**
     * 게시글 ?성 ?벤???들??(Point 22: ?벤???용)
     */
    @EventListener
    public void handlePostCreated(PostCreatedEvent event) {
        todayNewPosts.incrementAndGet();
        log.debug("Real-time stats updated for new post in BBS: {}", event.getBbsId());
    }

    /**
     * ?시??이??브로?캐?트 (5?주기)
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
     * ?성 ?용??증?
     */
    public void incrementActiveUsers() {
        activeUsers.incrementAndGet();
        visitsPerMinute.incrementAndGet();
    }

    /**
     * ?성 ?용??감소
     */
    public void decrementActiveUsers() {
        activeUsers.decrementAndGet();
    }

    /**
     * 처리 ??중인 ?림 ??조회 (?? 로직)
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
     * 분당 방문????초기??(1?주기)
     */
    @Scheduled(fixedRate = 60000)
    public void resetVisitsCounter() {
        visitsPerMinute.set(0);
    }
}