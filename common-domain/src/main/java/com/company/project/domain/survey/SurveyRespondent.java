package com.company.project.domain.survey;

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
 * 설문 응답자 정보 Entity
 * 레거시 테이블: NQUSTNRRESPONDINFO
 */
@Entity
@Table(name = "NQUSTNRRESPONDINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyRespondent extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_RESPOND_ID", length = 20)
    private String qestnrRespondId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20)
    private String qestnrTmplatId;

    @Column(name = "SEXDSTN_CODE", length = 20)
    private String sexdstnCode;

    @Column(name = "OCCP_TY_CODE", length = 20)
    private String occpTyCode;

    @Column(name = "RESPOND_NM", length = 100, nullable = false)
    private String respondNm;

    @Column(name = "BRTHDY", length = 20)
    private String brth;

    @Column(name = "AREA_NO", length = 10)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 10)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 10)
    private String endTelno;

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
        this.createdBy = frstRegisterId;
    }

    public void update(String sexdstnCode, String occpTyCode, String respondNm, String brth,
                      String areaNo, String middleTelno, String endTelno, String userId) {
        this.sexdstnCode = sexdstnCode;
        this.occpTyCode = occpTyCode;
        this.respondNm = respondNm;
        this.brth = brth;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.lastModifiedBy = userId;
    }
}
