package com.company.project.domain.namecard;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 筌뤿굟釉?JPA Entity
 * ??뉕탢?????뵠?? NNCRD
 */
@Entity
@Table(name = "NNCRD")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NameCard extends BaseEntity {

    @Id
    @Column(name = "NCRD_ID", length = 20)
    private String ncrdId;

    @Column(name = "NM", length = 100, nullable = false)
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

    @Column(name = "TELNO", length = 20)
    private String telNo;

    @Column(name = "MBTLNUM", length = 20)
    private String mbtlNum;

    @Column(name = "ADRES", length = 255)
    private String adres;

    @Column(name = "DETAIL_ADRES", length = 255)
    private String detailAdres;

    @Transient
    private String zipCode;

    @Column(name = "RM", length = 500)
    private String remark;

    @Column(name = "OTHBC_AT", length = 1)
    private String othbcAt;

    @Column(name = "NCRD_TRGTER_ID", length = 20)
    private String ncrdTrgterId;

    @Column(name = "EXTRL_USER_AT", length = 1)
    private String extrlUserAt;

    @Builder
    public NameCard(String ncrdId, String ncrdNm, String cmpnyNm, String deptNm, String clsfNm,
            String ofcpsNm, String emailAdres, String telNo, String mbtlNum, String adres,
            String detailAdres, String zipCode, String remark, String othbcAt,
            String ncrdTrgterId, String extrlUserAt) {
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
        this.extrlUserAt = extrlUserAt;
    }

    public void update(String ncrdNm, String cmpnyNm, String deptNm, String clsfNm, String ofcpsNm,
            String emailAdres, String telNo, String mbtlNum, String adres, String detailAdres,
            String zipCode, String remark, String othbcAt, String extrlUserAt) {
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
        this.extrlUserAt = extrlUserAt;
    }
}
