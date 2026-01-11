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
@Table(name = "NEXTRLHRINFO")
public class ExtrlHr {

    @Id
    @Column(name = "EXTRL_HR_ID", length = 20)
    private String extrlHrId;

    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String sexdstnCode;

    @Column(name = "EXTRL_HR_NM", length = 255)
    private String extrlHrNm;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "EMAIL_ADRES", length = 50)
    private String emailAdres;

    @Column(name = "OCCP_TY_CODE", length = 3)
    private String occpTyCode;

    @Column(name = "BRTHDY", length = 20)
    private String brth;

    @Column(name = "PSITN_INSTT_NM", length = 255)
    private String psitnInsttNm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public ExtrlHr(String extrlHrId, String eventId, String sexdstnCode, String extrlHrNm, String areaNo,
            String middleTelno, String endTelno, String emailAdres, String occpTyCode, String brth, String psitnInsttNm,
            String frstRegisterId) {
        this.extrlHrId = extrlHrId;
        this.eventId = eventId;
        this.sexdstnCode = sexdstnCode;
        this.extrlHrNm = extrlHrNm;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.emailAdres = emailAdres;
        this.occpTyCode = occpTyCode;
        this.brth = brth;
        this.psitnInsttNm = psitnInsttNm;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String sexdstnCode, String extrlHrNm, String areaNo, String middleTelno,
            String endTelno, String emailAdres, String occpTyCode, String brth, String psitnInsttNm,
            String lastUpdusrId) {
        this.sexdstnCode = sexdstnCode;
        this.extrlHrNm = extrlHrNm;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.emailAdres = emailAdres;
        this.occpTyCode = occpTyCode;
        this.brth = brth;
        this.psitnInsttNm = psitnInsttNm;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
