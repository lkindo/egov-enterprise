package com.company.project.service.notification;

import com.company.project.service.notification.dto.NotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * ?뺣낫?뚮┝ ?쒕퉬???명꽣?섏씠??
 */
public interface EgovNotificationService {

    Page<NotificationDto> getNotificationList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    NotificationDto getNotification(String ntfcNo);

    String createNotification(String userId, NotificationDto dto);

    void updateNotification(String ntfcNo, String userId, NotificationDto dto);

    void deleteNotification(String ntfcNo);

    List<NotificationDto> getActiveNotifications();
}
