package com.company.project.domain.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?類ｋ궖???뵝 Repository Custom ?紐낃숲??륁뵠??
 */
public interface NotificationRepositoryCustom {
    Page<Notification> searchNotifications(String keyword, Pageable pageable);
}
