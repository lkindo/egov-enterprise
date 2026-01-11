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
@Table(name = "nncrd")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NameCard {

    @Id
    @Column(name = "ncrd_id", length = 20)
    private String ncrdId;

    @Column(name = "nm", length = 100, nullable = false)
    private String ncrdNm;

    @Column(name = "CMPNY_NM", length = 100)
    private String cmpnyNm;

    @Column(name = "DEPT_NM", length = 100)
    private String deptNm;

    @Column(name = "CLSF_NM", length = 50)
    private String clsfNm;

    @Column(name = "OFCPS_NM", length = 50)
    private String ofcpsNm;

    @Column(name = "email_adres", length = 100)
    private String emailAdres;

    @Column(name = "telno", length = 20)
    private String telNo;

    @Column(name = "mbtlnum", length = 20)
    private String mbtlNum;

    @Column(name = "adres", length = 255)
    private String adres;

    @Column(name = "detail_adres", length = 255)
    private String detailAdres;

    @Transient
    private String zipCode;

    @Column(name = "rm", length = 500)
    private String remark;

    @Column(name = "othbc_at", length = 1)
    private String othbcAt;

    @Column(name = "ncrd_trgter_id", length = 20)
    private String ncrdTrgterId;

    @Column(name = "frst_register_id", length = 20)
    private String frstRegisterId;

    @Column(name = "frst_regist_pnttm")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "last_updusr_id", length = 20)
    private String lastUpdusrId;

    @Column(name = "last_updt_pnttm")
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
