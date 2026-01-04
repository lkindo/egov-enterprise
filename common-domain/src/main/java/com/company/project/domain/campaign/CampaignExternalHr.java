package com.company.project.domain.campaign;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;

/**
 * 행사 외부인사 관리 엔티티
 */
@Entity
@Table(name = "NEXTRLHRINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CampaignExternalHr extends BaseTimeEntity {

    @Id
    @Column(name = "EXTRL_HR_ID", length = 20)
    private String extrlHrId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "EVENT_ID")
    private Campaign campaign;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String sexdstnCode;

    @Column(name = "EXTRL_HR_NM", length = 60)
    private String extrlHrNm;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDEL_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "EMAIL_ADRES", length = 50)
    private String emailAdres;

    @Column(name = "OCCP_TY_CODE", length = 1)
    private String occpTyCode;

    @Column(name = "BRTHDY", length = 20)
    private String brth;

    @Column(name = "PSITN_INSTT_NM", length = 200)
    private String psitnInsttNm;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String sexdstnCode, String extrlHrNm, String areaNo, String middleTelno, String endTelno,
            String emailAdres, String occpTyCode, String brth, String psitnInsttNm, String lastUpdusrId) {
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
    }
}
