package nuri.business.domain.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    @Query("SELECT n FROM Notification n WHERE (:keyword IS NULL OR n.notiTtlNm LIKE %:keyword% OR n.notiCn LIKE %:keyword%) ORDER BY n.crtDt DESC")
    Page<Notification> searchNotifications(String keyword, Pageable pageable);

    long countByRcvrIdAndReadYn(String rcvrId, String readYn);

    @Deprecated
    default long countByReceiverIdAndIsRead(String receiverId, String isRead) {
        return countByRcvrIdAndReadYn(receiverId, isRead);
    }

    long countByReadYn(String readYn);

    @Deprecated
    default long countByIsRead(String isRead) {
        return countByReadYn(isRead);
    }
}
