package com.company.project.domain.system.service.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 응답자 엔티티
 * 매핑 테이블: NQESTNRRESPOND
 */
@Entity
@Table(name = "NQESTNRRESPOND")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyRespondent extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_RESPOND_ID", length = 20)
    private String qestnrRespondId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String qestnrId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String qestnrTmplatId;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String sexdstnCode;

    @Column(name = "OCCP_TY_CODE", length = 1)
    private String occpTyCode;

    @Column(name = "RESPOND_NM", length = 50)
    private String respondNm;

    @Column(name = "BRTHDY", length = 20)
    private String brthdy;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "RESPOND_ID", length = 20)
    private String respondId;

    public void update(String sexdstnCode, String occpTyCode, String respondNm, String brthdy,
            String areaNo, String middleTelno, String endTelno, String respondId) {
        this.sexdstnCode = sexdstnCode;
        this.occpTyCode = occpTyCode;
        this.respondNm = respondNm;
        this.brthdy = brthdy;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.respondId = respondId;
    }
}
