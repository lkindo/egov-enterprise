package com.company.project.service.notification;

import com.company.project.service.notification.dto.NotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

/**
 * 알림 정보 서비스 인터페이스
 */
public interface EgovNotificationService {

    Page<NotificationDto> getNotificationList(String keyword, Pageable pageable);

    NotificationDto getNotification(String ntfcNo);

    String createNotification(String userId, NotificationDto dto);

    void updateNotification(String ntfcNo, String userId, NotificationDto dto);

    void deleteNotification(String ntfcNo);

    List<NotificationDto> getActiveNotifications();

    long getUnreadCount(String userId);

    void markAsRead(String ntfcNo);
}
