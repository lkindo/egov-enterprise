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
 * ?¤ì‹œê°??€?œë³´???µê³„ ?œë¹„?? * ë¡œì»¬ ë©”ëª¨ë¦?AtomicInteger)ë¥??¬ìš©?˜ì—¬ ?¤ì‹œê°??°ì´?°ë? ì§‘ê³„?˜ê³  WebSocket?¼ë¡œ ë¸Œë¡œ?œìº?¤íŠ¸?? */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;
    private final NotificationRepository notificationRepository;

    // ?¤ì‹œê°??µê³„ ?°ì´??ê´€ë¦?(ë¡œì»¬ ë©”ëª¨ë¦??œìš©)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);
    private final AtomicInteger todayNewPosts = new AtomicInteger(0);

    /**
     * ê²Œì‹œê¸€ ?ì„± ?´ë²¤???¸ë“¤??(Point 22: ?´ë²¤???œìš©)
     */
    @EventListener
    public void handlePostCreated(PostCreatedEvent event) {
        todayNewPosts.incrementAndGet();
        log.debug("Real-time stats updated for new post in BBS: {}", event.getBbsId());
    }

    /**
     * ?¤ì‹œê°??°ì´??ë¸Œë¡œ?œìº?¤íŠ¸ (5ì´?ì£¼ê¸°)
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
     * ?œì„± ?¬ìš©??ì¦ê?
     */
    public void incrementActiveUsers() {
        activeUsers.incrementAndGet();
        visitsPerMinute.incrementAndGet();
    }

    /**
     * ?œì„± ?¬ìš©??ê°ì†Œ
     */
    public void decrementActiveUsers() {
        activeUsers.decrementAndGet();
    }

    /**
     * ì²˜ë¦¬ ?€ê¸?ì¤‘ì¸ ?Œë¦¼ ??ì¡°íšŒ (?”ë? ë¡œì§)
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
     * ë¶„ë‹¹ ë°©ë¬¸????ì´ˆê¸°??(1ë¶?ì£¼ê¸°)
     */
    @Scheduled(fixedRate = 60000)
    public void resetVisitsCounter() {
        visitsPerMinute.set(0);
    }
}
