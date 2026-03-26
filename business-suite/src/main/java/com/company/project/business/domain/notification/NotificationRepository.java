package com.company.project.business.domain.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    @Query("SELECT n FROM Notification n WHERE (:keyword IS NULL OR n.ntfcSj LIKE %:keyword% OR n.ntfcCn LIKE %:keyword%) ORDER BY n.createdDate DESC")
    Page<Notification> searchNotifications(String keyword, Pageable pageable);

    long countByReceiverIdAndIsRead(String receiverId, String isRead);

    long countByIsRead(String isRead);
}
