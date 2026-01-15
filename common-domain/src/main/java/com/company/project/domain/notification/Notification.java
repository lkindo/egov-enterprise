package com.company.project.domain.notification;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 정보알림 JPA Entity
 * 레거시 테이블: COMTNNTFCINFO
 */
@Entity
@Table(name = "NNTFCINFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @Column(name = "NTCN_NO", length = 20)
    private String ntfcNo;

    @Column(name = "NTCN_SJ", length = 255, nullable = false)
    private String ntfcSj;

    @Column(name = "NTCN_CN", length = 4000)
    private String ntfcCn;

    @Transient
    private String ntfcDate;

    @Column(name = "NTCN_TM", length = 14)
    private String ntfcTime;

    @Column(name = "BH_NTCN_INTRVL", length = 100)
    private String bhNtfcIntrvl;

    @Transient
    private String uniqId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
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
