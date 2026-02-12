package com.company.project.domain.event;

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
 * 외부 인력 정보 Entity
 * 레거시 테이블: NEXTRLHRINFO
 */
@Entity
@Table(name = "NEXTRLHRINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExternalHr extends BaseEntity {

    @Id
    @Column(name = "EXTRL_HR_ID", length = 20)
    private String extrlHrId;

    @Column(name = "EVENT_ID", length = 20, nullable = false)
    private String eventId;

    @Column(name = "EXTRL_HR_NM", length = 50, nullable = false)
    private String extrlHrNm;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String sexdstnCode;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "EMAIL_ADRES", length = 100)
    private String emailAdres;

    @Column(name = "OCCP_TY_CODE", length = 1)
    private String occpTyCode;

    @Column(name = "BRTHDY", length = 20)
    private String brth;

    @Column(name = "PSITN_INSTT_NM", length = 100)
    private String psitnInsttNm;

    @Builder
    public ExternalHr(String extrlHrId, String eventId, String extrlHrNm, String sexdstnCode,
                     String areaNo, String middleTelno, String endTelno, String emailAdres,
                     String occpTyCode, String brth, String psitnInsttNm) {
        this.extrlHrId = extrlHrId;
        this.eventId = eventId;
        this.extrlHrNm = extrlHrNm;
        this.sexdstnCode = sexdstnCode;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.emailAdres = emailAdres;
        this.occpTyCode = occpTyCode;
        this.brth = brth;
        this.psitnInsttNm = psitnInsttNm;
    }

    public void update(String extrlHrNm, String sexdstnCode, String areaNo, String middleTelno,
                      String endTelno, String emailAdres, String occpTyCode, String brth,
                      String psitnInsttNm) {
        this.extrlHrNm = extrlHrNm;
        this.sexdstnCode = sexdstnCode;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.emailAdres = emailAdres;
        this.occpTyCode = occpTyCode;
        this.brth = brth;
        this.psitnInsttNm = psitnInsttNm;
    }
}
