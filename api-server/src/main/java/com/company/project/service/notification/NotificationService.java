package com.company.project.service.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 특정 사용자에게 실시간 알림 전송
     */
    public void sendToUser(String userId, String message, String type) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("message", message);
        payload.put("type", type);
        messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", payload);
    }

    /**
     * 모든 사용자에게 공지사항 알림 전송
     */
    public void broadcastNotice(String message) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("message", message);
        messagingTemplate.convertAndSend("/topic/notices", payload);
    }

    /**
     * 활성화된 알림 목록 조회 (Dummy for compilation)
     */
    public java.util.List<com.company.project.service.notification.dto.NotificationDto> getActiveNotifications() {
        return java.util.List.of();
    }

    /**
     * 읽지 않은 알림 수 조회 (Dummy for compilation)
     */
    public long getUnreadCount(String userId) {
        return 0;
    }

    /**
     * 알림 읽음 처리 (Dummy for compilation)
     */
    public void markAsRead(String id) {
        // Implementation logic
    }
}
