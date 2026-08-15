package nuri.business.domain.notification;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n WHERE n.rcvrId = :rcvrId "
            + "AND (:keyword IS NULL OR n.notiTtlNm LIKE %:keyword% OR n.notiCn LIKE %:keyword%) "
            + "ORDER BY n.crtDt DESC")
    Page<Notification> searchNotificationsByReceiver(
            @Param("rcvrId") String rcvrId,
            @Param("keyword") String keyword,
            Pageable pageable);

    Optional<Notification> findByNotiSnAndRcvrId(Long notiSn, String rcvrId);

    long countByRcvrIdAndReadYn(String rcvrId, String readYn);

    long countByReadYn(String readYn);

    // [V2_12 결속] 사용자 삭제 시 수신 알림 일괄 정리 (fk_tb_user_noti_tb_user_info NO ACTION)
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Notification n WHERE n.rcvrId IN :rcvrIds")
    int deleteByRcvrIdIn(@Param("rcvrIds") List<String> rcvrIds);
}
