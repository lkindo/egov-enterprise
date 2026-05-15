package nuri.business.domain.notification;

import jakarta.persistence.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

/**
 * 사용자 알림 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_USER_NOTI")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Notification extends BaseEntity {

    @Id
    @Column(name = "NOTI_SN", length = 20)
    private String ntfcNo;

    @Column(name = "NOTI_TTL_NM", length = 100)
    private String ntfcSj;

    @Column(name = "NOTI_CN", length = 4000)
    private String ntfcCn;

    @Column(name = "RCVR_ID", length = 20)
    private String receiverId;

    @Builder.Default
    @Column(name = "READ_YN", length = 1)
    private String isRead = "N";

    @Column(name = "LINK_URL", length = 1000)
    private String linkUrl;

    @Column(name = "NOTI_DT")
    private LocalDateTime ntfcTime;

    @Column(name = "NOTI_IVL_VAL", length = 100)
    private String bhNtfcIntrvl;

    public void markAsRead() {
        this.isRead = "Y";
    }

    public void update(String ntfcSj, String ntfcCn, LocalDateTime ntfcTime, String bhNtfcIntrvl) {
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.ntfcTime = ntfcTime;
        this.bhNtfcIntrvl = bhNtfcIntrvl;
    }
}
