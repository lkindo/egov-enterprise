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
@Table(name = "tb_user_noti")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Notification extends BaseEntity {

    @Id
    @Column(name = "noti_sn", length = 20)
    private String notiSn;

    @Column(name = "noti_ttl_nm", length = 100)
    private String notiTtlNm;

    @Column(name = "noti_cn", length = 4000)
    private String notiCn;

    @Column(name = "rcvr_id", length = 20)
    private String rcvrId;

    @Builder.Default
    @Column(name = "read_yn", length = 1)
    private String readYn = "N";

    @Column(name = "link_url", length = 1000)
    private String linkUrl;

    @Column(name = "noti_dt")
    private LocalDateTime notiDt;

    @Column(name = "noti_ivl_val", length = 100)
    private String notiIvlVal;

    public void markAsRead() {
        this.readYn = "Y";
    }

    public void update(String notiTtlNm, String notiCn, LocalDateTime notiDt, String notiIvlVal) {
        this.notiTtlNm = notiTtlNm;
        this.notiCn = notiCn;
        this.notiDt = notiDt;
        this.notiIvlVal = notiIvlVal;
    }

    // ----- [Legacy Getter Aliases for Backwards Compatibility] -----
    public String getNtfcNo() { return this.notiSn; }
    public String getNtfcSj() { return this.notiTtlNm; }
    public String getNtfcCn() { return this.notiCn; }
    public String getReceiverId() { return this.rcvrId; }
    public String getIsRead() { return this.readYn; }
    public LocalDateTime getNtfcTime() { return this.notiDt; }
    public String getBhNtfcIntrvl() { return this.notiIvlVal; }

    // ----- [Legacy Setter Aliases for Backwards Compatibility] -----
    public void setNtfcNo(String ntfcNo) { this.notiSn = ntfcNo; }
    public void setNtfcSj(String ntfcSj) { this.notiTtlNm = ntfcSj; }
    public void setNtfcCn(String ntfcCn) { this.notiCn = ntfcCn; }
    public void setReceiverId(String receiverId) { this.rcvrId = receiverId; }
    public void setIsRead(String isRead) { this.readYn = isRead; }
    public void setNtfcTime(LocalDateTime ntfcTime) { this.notiDt = ntfcTime; }
    public void setBhNtfcIntrvl(String bhNtfcIntrvl) { this.notiIvlVal = bhNtfcIntrvl; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----
    public static abstract class NotificationBuilder<C extends Notification, B extends NotificationBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String notiSn;
        private String notiTtlNm;
        private String notiCn;
        private String rcvrId;
        private String readYn;
        private LocalDateTime notiDt;
        private String notiIvlVal;

        public B ntfcNo(String ntfcNo) {
            this.notiSn = ntfcNo;
            return self();
        }
        public B ntfcSj(String ntfcSj) {
            this.notiTtlNm = ntfcSj;
            return self();
        }
        public B ntfcCn(String ntfcCn) {
            this.notiCn = ntfcCn;
            return self();
        }
        public B receiverId(String receiverId) {
            this.rcvrId = receiverId;
            return self();
        }
        public B isRead(String isRead) {
            this.readYn = isRead;
            return self();
        }
        public B ntfcTime(LocalDateTime ntfcTime) {
            this.notiDt = ntfcTime;
            return self();
        }
        public B bhNtfcIntrvl(String bhNtfcIntrvl) {
            this.notiIvlVal = bhNtfcIntrvl;
            return self();
        }
    }
}
