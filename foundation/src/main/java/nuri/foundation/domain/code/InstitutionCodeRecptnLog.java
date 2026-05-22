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

    @Column(name = "chg_se_cd", length = 12)
    private String chgSeCd;

    @Column(name = "proc_se", length = 1)
    private String procSe;

    @Column(name = "etc_cd", length = 20)
    private String etcCd;

    @Column(name = "all_inst_nm", length = 100)
    private String allInstNm;

    @Column(name = "lwst_inst_nm", length = 100)
    private String lwtrkInstNm;

    @Column(name = "inst_abbr_nm", length = 100)
    private String instAbbrNm;

    @Column(name = "odr", length = 2)
    private String odr;

    @Column(name = "ord", length = 3)
    private String ord;

    @Column(name = "inst_cycl", length = 2)
    private String instCycl;

    @Column(name = "top_inst_cd", length = 20)
    private String topInstCd;

    @Column(name = "upr_inst_cd", length = 20)
    private String upInstCd;

    @Column(name = "reprs_inst_cd", length = 20)
    private String rprsInstCd;

    @Column(name = "inst_type_lclsf", length = 2)
    private String instTypeLclsf;

    @Column(name = "inst_type_mclsf", length = 2)
    private String instTypeMclsf;

    @Column(name = "inst_type_sclsf", length = 2)
    private String instTypeSclsf;

    @Column(name = "telno", length = 20)
    private String telno;

    @Column(name = "fax_no", length = 20)
    private String faxNo;

    @Column(name = "crt_ymd", length = 8)
    private String crtYmd;

    @Column(name = "abl_ymd", length = 8)
    private String ablYmd;

    @Column(name = "abl_yn", length = 1)
    private String ablYn;

    @Column(name = "chg_ymd", length = 8)
    private String chgYmd;

    @Column(name = "chg_tm", length = 20)
    private String chgTm;

    @Column(name = "crtr_ymd", length = 8)
    private String crtrYmd;

    @Column(name = "sort_ordr")
    private Integer sortSeq;

    @Column(name = "crt_dt")
    private LocalDateTime crtDt;

    @Column(name = "frst_rgtr_id", length = 20)
    private String frstRgtrId;

    @Column(name = "mdfcn_dt")
    private LocalDateTime mdfcnDt;

    @Column(name = "last_mdfr_id", length = 20)
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
