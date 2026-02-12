package com.company.project.domain.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 정보알림 Repository Custom 인터페이스
 */
public interface NotificationRepositoryCustom {
    Page<Notification> searchNotifications(String keyword, Pageable pageable);
}
