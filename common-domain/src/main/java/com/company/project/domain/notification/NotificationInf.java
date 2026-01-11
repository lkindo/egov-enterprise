package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NNTFCINFO")
public class NotificationInf {

    @Id
    @Column(name = "NTCN_NO")
    private Long ntcnNo;

    @Column(name = "NTCN_SJ", length = 255)
    private String ntcnSj;

    @Column(name = "NTCN_CN", length = 1000)
    private String ntcnCn;

    @Column(name = "NTCN_TM", length = 14)
    private String ntcnTm;

    @Column(name = "BH_NTCN_INTRVL", length = 20)
    private String bhNtcnIntrvl;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public NotificationInf(Long ntcnNo, String ntcnSj, String ntcnCn, String ntcnTm, String bhNtcnIntrvl,
            String frstRegisterId) {
        this.ntcnNo = ntcnNo;
        this.ntcnSj = ntcnSj;
        this.ntcnCn = ntcnCn;
        this.ntcnTm = ntcnTm;
        this.bhNtcnIntrvl = bhNtcnIntrvl;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String ntcnSj, String ntcnCn, String ntcnTm, String bhNtcnIntrvl, String lastUpdusrId) {
        this.ntcnSj = ntcnSj;
        this.ntcnCn = ntcnCn;
        this.ntcnTm = ntcnTm;
        this.bhNtcnIntrvl = bhNtcnIntrvl;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
