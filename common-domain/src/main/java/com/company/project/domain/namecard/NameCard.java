package com.company.project.domain.namecard;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 명함 JPA Entity
 * 레거시 테이블: COMTNNCRDINFO
 */
@Entity
@Table(name = "COMTNNCRDINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NameCard {

    @Id
    @Column(name = "NCRD_ID", length = 20)
    private String ncrdId;

    @Column(name = "NCRD_NM", length = 100, nullable = false)
    private String ncrdNm;

    @Column(name = "CMPNY_NM", length = 100)
    private String cmpnyNm;

    @Column(name = "DEPT_NM", length = 100)
    private String deptNm;

    @Column(name = "CLSF_NM", length = 50)
    private String clsfNm;

    @Column(name = "OFCPS_NM", length = 50)
    private String ofcpsNm;

    @Column(name = "EMAIL_ADRES", length = 100)
    private String emailAdres;

    @Column(name = "TEL_NO", length = 20)
    private String telNo;

    @Column(name = "MBTL_NUM", length = 20)
    private String mbtlNum;

    @Column(name = "ADRES", length = 255)
    private String adres;

    @Column(name = "DETAIL_ADRES", length = 255)
    private String detailAdres;

    @Column(name = "ZIP_CODE", length = 10)
    private String zipCode;

    @Column(name = "REMARK", length = 500)
    private String remark;

    @Column(name = "OTHBC_AT", length = 1)
    private String othbcAt;

    @Column(name = "NCRD_TRGTER_ID", length = 20)
    private String ncrdTrgterId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public NameCard(String ncrdId, String ncrdNm, String cmpnyNm, String deptNm, String clsfNm,
            String ofcpsNm, String emailAdres, String telNo, String mbtlNum, String adres,
            String detailAdres, String zipCode, String remark, String othbcAt,
            String ncrdTrgterId, String frstRegisterId) {
        this.ncrdId = ncrdId;
        this.ncrdNm = ncrdNm;
        this.cmpnyNm = cmpnyNm;
        this.deptNm = deptNm;
        this.clsfNm = clsfNm;
        this.ofcpsNm = ofcpsNm;
        this.emailAdres = emailAdres;
        this.telNo = telNo;
        this.mbtlNum = mbtlNum;
        this.adres = adres;
        this.detailAdres = detailAdres;
        this.zipCode = zipCode;
        this.remark = remark;
        this.othbcAt = othbcAt;
        this.ncrdTrgterId = ncrdTrgterId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String ncrdNm, String cmpnyNm, String deptNm, String clsfNm, String ofcpsNm,
            String emailAdres, String telNo, String mbtlNum, String adres, String detailAdres,
            String zipCode, String remark, String othbcAt, String updusrId) {
        this.ncrdNm = ncrdNm;
        this.cmpnyNm = cmpnyNm;
        this.deptNm = deptNm;
        this.clsfNm = clsfNm;
        this.ofcpsNm = ofcpsNm;
        this.emailAdres = emailAdres;
        this.telNo = telNo;
        this.mbtlNum = mbtlNum;
        this.adres = adres;
        this.detailAdres = detailAdres;
        this.zipCode = zipCode;
        this.remark = remark;
        this.othbcAt = othbcAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
