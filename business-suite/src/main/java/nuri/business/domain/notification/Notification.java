package nuri.business.domain.notification;

import jakarta.persistence.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 사용자 알림 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "N_USER_NOTIFICATION")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Notification extends BaseEntity {

    @Id
    @Column(name = "NTCN_NO", length = 20)
    private String ntfcNo;

    @Column(name = "NTCN_SJ", length = 250)
    private String ntfcSj;

    @Column(name = "NTCN_CN", length = 2500)
    private String ntfcCn;

    @Column(name = "RECEIVER_ID", length = 20)
    private String receiverId;

    @Column(name = "IS_READ", length = 1)
    private String isRead;

    @Column(name = "LINK_URL")
    private String linkUrl;

    @Column(name = "NTCN_TM", length = 20)
    private String ntfcTime;

    @Column(name = "BH_NTCN_INTRVL", length = 20)
    private String bhNtfcIntrvl;

    public void markAsRead() {
        this.isRead = "Y";
    }

    public void update(String ntfcSj, String ntfcCn, String ntfcTime, String bhNtfcIntrvl) {
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.ntfcTime = ntfcTime;
        this.bhNtfcIntrvl = bhNtfcIntrvl;
    }
}
