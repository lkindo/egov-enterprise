package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String>, NotificationRepositoryCustom {
    List<Notification> findByReceiverIdOrderByCreatedDateDesc(String receiverId);

    long countByReceiverIdAndIsRead(String receiverId, String isRead);
    long countByIsRead(String isRead);
}