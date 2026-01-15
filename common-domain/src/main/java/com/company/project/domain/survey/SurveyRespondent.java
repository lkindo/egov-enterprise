package com.company.project.domain.survey;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 설문응답자 JPA Entity
 * 레거시 테이블: COMTNQUSTNRRESPONDINFO
 */
@Entity
@Table(name = "NQUSTNRRESPONDINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyRespondent {

    @Id
    @Column(name = "QUSTNR_RESPOND_ID", length = 20)
    private String qestnrRespondId;

    @Column(name = "QESTNR_ID", length = 20)
    private String qestnrId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "SEXDSTN_CODE", length = 20)
    private String sexdstnCode;

    @Column(name = "OCCP_TY_CODE", length = 20)
    private String occpTyCode;

    @Column(name = "RESPOND_NM", length = 100)
    private String respondNm;

    @Column(name = "BRTHDY", length = 20)
    private String brth;

    @Column(name = "AREA_NO", length = 10)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 10)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 10)
    private String endTelno;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public SurveyRespondent(String qestnrRespondId, String qestnrId, String qestnrTmplatId,
            String sexdstnCode, String occpTyCode, String respondNm, String brth,
            String areaNo, String middleTelno, String endTelno, String frstRegisterId) {
        this.qestnrRespondId = qestnrRespondId;
        this.qestnrId = qestnrId;
        this.qestnrTmplatId = qestnrTmplatId;
        this.sexdstnCode = sexdstnCode;
        this.occpTyCode = occpTyCode;
        this.respondNm = respondNm;
        this.brth = brth;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String sexdstnCode, String occpTyCode, String respondNm, String brth,
            String areaNo, String middleTelno, String endTelno, String updusrId) {
        this.sexdstnCode = sexdstnCode;
        this.occpTyCode = occpTyCode;
        this.respondNm = respondNm;
        this.brth = brth;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
