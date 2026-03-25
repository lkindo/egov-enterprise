package com.company.project.foundation.domain.operation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "NEXTRLHRINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ExternalHrId.class)
public class ExternalHr {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Id
    @Column(name = "EXTRL_HR_ID", length = 20)
    private String extrlHrId;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String sexdstnCode;

    @Column(name = "EXTRL_HR_NM", length = 60)
    private String extrlHrNm;

    @Column(name = "OCCP_TY_CODE", length = 1)
    private String occpTyCode;

    @Column(name = "PSITN_INSTT_NM", length = 100)
    private String psitnInsttNm;

    @Column(name = "BRTHDY", length = 20)
    private String brthdy;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "EMAIL_ADRES", length = 50)
    private String emailAdres;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "EVENT_ID", insertable = false, updatable = false)
    private EventInfo event;

    @Builder
    public ExternalHr(String eventId, String extrlHrId, String sexdstnCode, String extrlHrNm,
                      String occpTyCode, String psitnInsttNm, String brthdy, String areaNo,
                      String middleTelno, String endTelno, String emailAdres,
                      String frstRegisterId, String lastUpdusrId) {
        this.eventId = eventId;
        this.extrlHrId = extrlHrId;
        this.sexdstnCode = sexdstnCode;
        this.extrlHrNm = extrlHrNm;
        this.occpTyCode = occpTyCode;
        this.psitnInsttNm = psitnInsttNm;
        this.brthdy = brthdy;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.emailAdres = emailAdres;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
