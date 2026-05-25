package nuri.foundation.domain.code;

import java.io.Serializable;
import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tb_inst_cd_rcptn_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstitutionCodeRecptnLog {

    @EmbeddedId
    private InstitutionCodeRecptnLogId id;

    @Column(length = 12)
    private String chgSeCd;

    @Column(length = 1)
    private String procSe;

    @Column(length = 20)
    private String etcCd;

    @Column(length = 100)
    private String allInstNm;

    @Column(name = "lwst_inst_nm", length = 100)
    private String lwtrkInstNm;

    @Column(length = 100)
    private String instAbbrNm;

    @Column(length = 2)
    private String odr;

    @Column(length = 3)
    private String ord;

    @Column(length = 2)
    private String instCycl;

    @Column(length = 20)
    private String topInstCd;

    @Column(name = "upr_inst_cd", length = 20)
    private String upInstCd;

    @Column(name = "reprs_inst_cd", length = 20)
    private String rprsInstCd;

    @Column(length = 2)
    private String instTypeLclsf;

    @Column(length = 2)
    private String instTypeMclsf;

    @Column(length = 2)
    private String instTypeSclsf;

    @Column(length = 20)
    private String telno;

    @Column(length = 20)
    private String faxNo;

    @Column(length = 8)
    private String crtYmd;

    @Column(length = 8)
    private String ablYmd;

    @Column(length = 1)
    private String ablYn;

    @Column(length = 8)
    private String chgYmd;

    @Column(length = 20)
    private String chgTm;

    @Column(length = 8)
    private String crtrYmd;

    @Column(name = "sort_ordr")
    private Integer sortSeq;

    private LocalDateTime crtDt;

    @Column(length = 20)
    private String frstRgtrId;

    private LocalDateTime mdfcnDt;

    @Column(length = 20)
    private String lastMdfrId;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @EqualsAndHashCode
    public static class InstitutionCodeRecptnLogId implements Serializable {
        @Column(name = "ocrn_ymd", length = 8)
        private String ocrnYmd;

        @Column(name = "inst_cd", length = 20)
        private String instCd;

        @Column(name = "job_sn")
        private Long jobSn;

        @Builder
        public InstitutionCodeRecptnLogId(String ocrnYmd, String instCd, Long jobSn) {
            this.ocrnYmd = ocrnYmd;
            this.instCd = instCd;
            this.jobSn = jobSn;
        }
    }

    @Builder
    public InstitutionCodeRecptnLog(InstitutionCodeRecptnLogId id, String chgSeCd, String procSe,
            String etcCd, String allInstNm, String lwtrkInstNm,
            String instAbbrNm, String odr, String ord, String instCycl,
            String topInstCd, String upInstCd, String rprsInstCd,
            String instTypeLclsf, String instTypeMclsf, String instTypeSclsf,
            String telno, String faxNo, String crtYmd, String ablYmd,
            String ablYn, String chgYmd, String chgTm,
            String crtrYmd, Integer sortSeq, String frstRgtrId) {
        this.id = id;
        this.chgSeCd = chgSeCd;
        this.procSe = procSe == null ? "0" : procSe;
        this.etcCd = etcCd;
        this.allInstNm = allInstNm;
        this.lwtrkInstNm = lwtrkInstNm;
        this.instAbbrNm = instAbbrNm;
        this.odr = odr;
        this.ord = ord;
        this.instCycl = instCycl;
        this.topInstCd = topInstCd;
        this.upInstCd = upInstCd;
        this.rprsInstCd = rprsInstCd;
        this.instTypeLclsf = instTypeLclsf;
        this.instTypeMclsf = instTypeMclsf;
        this.instTypeSclsf = instTypeSclsf;
        this.telno = telno;
        this.faxNo = faxNo;
        this.crtYmd = crtYmd;
        this.ablYmd = ablYmd;
        this.ablYn = ablYn;
        this.chgYmd = chgYmd;
        this.chgTm = chgTm;
        this.crtrYmd = crtrYmd;
        this.sortSeq = sortSeq;
        this.frstRgtrId = frstRgtrId;
        this.lastMdfrId = frstRgtrId;
        this.crtDt = LocalDateTime.now();
        this.mdfcnDt = LocalDateTime.now();
    }

    public void updateProcessSe(String procSe, String lastMdfrId) {
        this.procSe = procSe;
        this.lastMdfrId = lastMdfrId;
        this.mdfcnDt = LocalDateTime.now();
    }
}
