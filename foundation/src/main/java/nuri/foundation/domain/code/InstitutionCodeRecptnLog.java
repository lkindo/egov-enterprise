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

    @Column(name = "chg_se_cd", length = 1)
    private String changeSeCode;

    @Column(name = "proc_se", length = 1)
    private String processSe;

    @Column(name = "etc_cd", length = 45)
    private String etcCode;

    @Column(name = "all_inst_nm", length = 300)
    private String allInsttNm;

    @Column(name = "lwst_inst_nm", length = 180)
    private String lowestInsttNm;

    @Column(name = "inst_abbr_nm", length = 300)
    private String insttAbrvNm;

    @Column(name = "odr", length = 2)
    private String odr;

    @Column(name = "ord", length = 3)
    private String ord;

    @Column(name = "inst_cycl", length = 2)
    private String insttOdr;

    @Column(name = "top_inst_cd", length = 30)
    private String bestInsttCode;

    @Column(name = "upr_inst_cd", length = 10)
    private String upperInsttCode;

    @Column(name = "reprs_inst_cd", length = 10)
    private String reprsntInsttCode;

    @Column(name = "inst_type_lclsf", length = 2)
    private String insttTyLclas;

    @Column(name = "inst_type_mclsf", length = 2)
    private String insttTyMclas;

    @Column(name = "inst_type_sclsf", length = 2)
    private String insttTySclas;

    @Column(name = "telno", length = 20)
    private String telno;

    @Column(name = "fax_no", length = 20)
    private String fxnum;

    @Column(name = "crt_ymd", length = 8)
    private String creatDe;

    @Column(name = "abl_ymd", length = 8)
    private String ablDe;

    @Column(name = "abl_yn", length = 1)
    private String ablEnnc;

    @Column(name = "chg_ymd", length = 8)
    private String changede;

    @Column(name = "chg_tm", length = 20)
    private String changeTime;

    @Column(name = "crtr_ymd", length = 8)
    private String bsisDe;

    @Column(name = "sort_ordr")
    private Integer sortOrdr;

    @Column(name = "crt_dt")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "frst_rgtr_id", length = 20)
    private String frstRegisterId;

    @Column(name = "mdfcn_dt")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "last_mdfr_id", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @EqualsAndHashCode
    public static class InstitutionCodeRecptnLogId implements Serializable {
        @Column(name = "ocrn_ymd", length = 20)
        private String ocrnYmd;

        @Column(name = "inst_cd", length = 10)
        private String insttCode;

        @Column(name = "job_sn")
        private Long opertSn;

        @Builder
        public InstitutionCodeRecptnLogId(String ocrnYmd, String insttCode, Long opertSn) {
            this.ocrnYmd = ocrnYmd;
            this.insttCode = insttCode;
            this.opertSn = opertSn;
        }
    }

    @Builder
    public InstitutionCodeRecptnLog(InstitutionCodeRecptnLogId id, String changeSeCode, String processSe,
            String etcCode, String allInsttNm, String lowestInsttNm,
            String insttAbrvNm, String odr, String ord, String insttOdr,
            String bestInsttCode, String upperInsttCode, String reprsntInsttCode,
            String insttTyLclas, String insttTyMclas, String insttTySclas,
            String telno, String fxnum, String creatDe, String ablDe,
            String ablEnnc, String changede, String changeTime,
            String bsisDe, Integer sortOrdr, String frstRegisterId) {
        this.id = id;
        this.changeSeCode = changeSeCode;
        this.processSe = processSe == null ? "0" : processSe;
        this.etcCode = etcCode;
        this.allInsttNm = allInsttNm;
        this.lowestInsttNm = lowestInsttNm;
        this.insttAbrvNm = insttAbrvNm;
        this.odr = odr;
        this.ord = ord;
        this.insttOdr = insttOdr;
        this.bestInsttCode = bestInsttCode;
        this.upperInsttCode = upperInsttCode;
        this.reprsntInsttCode = reprsntInsttCode;
        this.insttTyLclas = insttTyLclas;
        this.insttTyMclas = insttTyMclas;
        this.insttTySclas = insttTySclas;
        this.telno = telno;
        this.fxnum = fxnum;
        this.creatDe = creatDe;
        this.ablDe = ablDe;
        this.ablEnnc = ablEnnc;
        this.changede = changede;
        this.changeTime = changeTime;
        this.bsisDe = bsisDe;
        this.sortOrdr = sortOrdr;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void updateProcessSe(String processSe, String lastUpdusrId) {
        this.processSe = processSe;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
