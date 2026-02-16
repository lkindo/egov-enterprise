package com.company.project.domain.notification;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 정보알림 JPA Entity
 * 레거시 테이블: NNTFCINFO
 */
@Entity
@Table(name = "NNTFCINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @Column(name = "NTCN_NO", length = 20)
    private String ntfcNo;

    @Column(name = "NTCN_SJ", length = 255, nullable = false)
    private String ntfcSj;

    @Column(name = "NTCN_CN", length = 4000)
    private String ntfcCn;

    @Column(name = "RECEIVER_ID", length = 20, nullable = false)
    private String receiverId;

    @Column(name = "IS_READ", length = 1)
    private String isRead; // Y, N

    @Column(name = "LINK_URL", length = 255)
    private String linkUrl;

    @Builder
    public Notification(String ntfcNo, String ntfcSj, String ntfcCn, String receiverId, String linkUrl) {
        this.ntfcNo = ntfcNo;
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.receiverId = receiverId;
        this.linkUrl = linkUrl;
        this.isRead = "N";
    }

    public void markAsRead() {
        this.isRead = "Y";
    }

    // 누락된 메서드들 추가
    public String getNtfcTime() {
        return this.getFrstRegisterPnttm() != null ? this.getFrstRegisterPnttm().toString() : null;
    }

    public String getBhNtfcIntrvl() {
        // 알림 간격 정보는 별도 필드가 없으므로 null 반환
        return null;
    }

    public void update(String ntfcSj, String ntfcCn, String ntfcTime, String bhNtfcIntrvl) {
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        // 시간 관련 정보는 BaseEntity에서 관리
    }
}
