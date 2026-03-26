package com.company.project.business.domain.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "N_USER_NOTIFICATION")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

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

    @Column(name = "FRST_REGISTER_ID")
    private String createdBy;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID")
    private String lastModifiedBy;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Builder
    public Notification(String ntfcNo, String ntfcSj, String ntfcCn, String receiverId, String linkUrl) {
        this.ntfcNo = ntfcNo;
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.receiverId = receiverId;
        this.linkUrl = linkUrl;
        this.isRead = "N";
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void markAsRead() {
        this.isRead = "Y";
        this.lastModifiedDate = LocalDateTime.now();
    }

    public void update(String ntfcSj, String ntfcCn, String ntfcTime, String bhNtfcIntrvl) {
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.lastModifiedDate = LocalDateTime.now();
    }
}
