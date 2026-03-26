package com.company.project.business.service.notification;

import com.company.project.business.service.notification.dto.NotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

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
