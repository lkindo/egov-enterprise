package com.company.project.service.stats;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.simp.SimpMessageSendingOperations;

import org.springframework.scheduling.annotation.Scheduled;

import org.springframework.stereotype.Service;

import java.util.HashMap;

import java.util.Map;

import java.util.concurrent.atomic.AtomicInteger;

/**

 * ??         ?????      ?????  ???      ??

 */

@Slf4j

@Service

@RequiredArgsConstructor

public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;

    // ??         ??         ????(?          - ??               ??Redis ?          ??      )

    private final AtomicInteger activeUsers = new AtomicInteger(0);

    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);

    /**

     * ??         ????  ??         ??      ??       (5 ?        ??

     */

    @Scheduled(fixedRate = 5000)

    public void broadcastRealTimeStats() {

        try {

            Map<String, Object> stats = new HashMap<>();

            stats.put("activeUsers", activeUsers.get());

            stats.put("visitsPerMinute", visitsPerMinute.get());

            stats.put("newPosts", getTodayNewPostsCount());

            stats.put("alerts", getPendingAlertsCount());

            messagingTemplate.convertAndSend("/topic/dashboard/stats", stats);

            log.debug("Real-time stats broadcasted: {}", stats);

        } catch (Exception e) {

            log.error("Error broadcasting real-time stats", e);

        }

    }

    /**

     * ?         ????         ?

     */

    public void incrementActiveUsers() {

        activeUsers.incrementAndGet();

        visitsPerMinute.incrementAndGet();

    }

    /**

     * ?         ????        ??

     */

    public void decrementActiveUsers() {

        activeUsers.decrementAndGet();

    }

    /**

     * ??      ???                   ?      ? ??         ??

     */

    private int getTodayNewPostsCount() {

        // TODO: ??       ?          ????       ?          ??         ?      ? ??         ??

        return (int) (Math.random() * 10);

    }

    /**

     *             ????    ??         ??

     */

    private int getPendingAlertsCount() {

        // TODO: ??       ?          ??         ???? ??? ???    ??         ??

        return (int) (Math.random() * 5);

    }

    /**

     *              ??         ????        ?(1 ?         ??

     */

    @Scheduled(fixedRate = 60000)

    public void resetVisitsCounter() {

        visitsPerMinute.set(0);

    }

}

