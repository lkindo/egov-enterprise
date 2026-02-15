package com.company.project.domain.ctsnn;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 경조사 관리 정보 Entity
 * 레거시 테이블: NCTSNNMANAGE
 */
@Entity(name = "DomainCtsnnManage")
@Table(name = "NCTSNNMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CtsnnManage extends BaseEntity {

    @Id
    @Column(name = "CTSNN_ID", length = 20)
    private String ctsnnId;

    @Column(name = "USER_ID", length = 20, nullable = false)
    private String usid;

    @Column(name = "CTSNN_CODE", length = 2, nullable = false)
    private String ctsnnCd;

    @Column(name = "REQST_DE", length = 20)
    private String reqstDe;

    @Column(name = "CTSNN_NM", length = 255, nullable = false)
    private String ctsnnNm;

    @Column(name = "TRGTER_NM", length = 20)
    private String trgterNm;

    @Column(name = "BRTHDY", length = 20)
    private String brth;

    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrDe;

    @Column(name = "RELATE", length = 2)
    private String relate;

    @Column(name = "RM", length = 255)
    private String remark;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;

    @Builder
    public CtsnnManage(String ctsnnId, String usid, String ctsnnCd, String reqstDe, String ctsnnNm,
            String trgterNm, String brth, String occrrDe, String relate, String remark,
            String sanctnerId, String confmAt, LocalDateTime sanctnDt, String returnResn,
            String infrmlSanctnId) {
        this.ctsnnId = ctsnnId;
        this.usid = usid;
        this.ctsnnCd = ctsnnCd;
        this.reqstDe = reqstDe;
        this.ctsnnNm = ctsnnNm;
        this.trgterNm = trgterNm;
        this.brth = brth;
        this.occrrDe = occrrDe;
        this.relate = relate;
        this.remark = remark;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.sanctnDt = sanctnDt;
        this.returnResn = returnResn;
        this.infrmlSanctnId = infrmlSanctnId;
    }

    public void update(String ctsnnCd, String ctsnnNm, String reqstDe, String trgterNm,
            String brth, String occrrDe, String relate, String remark) {
        this.ctsnnCd = ctsnnCd;
        this.ctsnnNm = ctsnnNm;
        this.reqstDe = reqstDe;
        this.trgterNm = trgterNm;
        this.brth = brth;
        this.occrrDe = occrrDe;
        this.relate = relate;
        this.remark = remark;
    }

    public void confirm(String confmAt, String returnResn) {
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctnDt = LocalDateTime.now();
    }
}
