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
 * ?類ｋ궖???뵝 JPA Entity
 * ??뉕탢?????뵠?? NNTFCINFO
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

    // ?袁⑥뵭??筌롫뗄苑??뺣굶 ?곕떽?
    public String getNtfcTime() {
        return this.getFrstRegisterPnttm() != null ? this.getFrstRegisterPnttm().toString() : null;
    }

    public String getBhNtfcIntrvl() {
        // ???뵝 揶쏄쑨爰??類ｋ궖??癰귢쑬猷??袁⑤굡揶쎛 ??곸몵沃샕嚥?null 獄쏆꼹??
        return null;
    }

    public void update(String ntfcSj, String ntfcCn, String ntfcTime, String bhNtfcIntrvl) {
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        // ??볦퍢 ?온???類ｋ궖??BaseEntity?癒?퐣 ?온??
    }
}
