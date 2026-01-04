package com.company.project.domain.notification;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 정보알림 JPA Entity
 * 레거시 테이블: COMTNNTFCINFO
 */
@Entity
@Table(name = "COMTNNTFCINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @Column(name = "NTFC_NO", length = 20)
    private String ntfcNo;

    @Column(name = "NTFC_SJ", length = 255, nullable = false)
    private String ntfcSj;

    @Column(name = "NTFC_CN", length = 4000)
    private String ntfcCn;

    @Column(name = "NTFC_DATE", length = 20)
    private String ntfcDate;

    @Column(name = "NTFC_TIME", length = 10)
    private String ntfcTime;

    @Column(name = "BH_NTFC_INTRVL", length = 100)
    private String bhNtfcIntrvl;

    @Column(name = "UNIQ_ID", length = 20)
    private String uniqId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Notification(String ntfcNo, String ntfcSj, String ntfcCn, String ntfcDate,
            String ntfcTime, String bhNtfcIntrvl, String uniqId, String frstRegisterId) {
        this.ntfcNo = ntfcNo;
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.ntfcDate = ntfcDate;
        this.ntfcTime = ntfcTime;
        this.bhNtfcIntrvl = bhNtfcIntrvl;
        this.uniqId = uniqId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String ntfcSj, String ntfcCn, String ntfcDate, String ntfcTime,
            String bhNtfcIntrvl, String updusrId) {
        this.ntfcSj = ntfcSj;
        this.ntfcCn = ntfcCn;
        this.ntfcDate = ntfcDate;
        this.ntfcTime = ntfcTime;
        this.bhNtfcIntrvl = bhNtfcIntrvl;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
