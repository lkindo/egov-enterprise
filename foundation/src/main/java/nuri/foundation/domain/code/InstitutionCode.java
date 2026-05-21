package nuri.foundation.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tb_inst_cd")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstitutionCode extends BaseEntity {

    @Id
    @Column(name = "inst_cd", length = 10)
    private String insttCode;

    @Column(name = "all_inst_nm", length = 300)
    private String allInsttNm;

    @Column(name = "lwtrk_inst_nm", length = 180)
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

    @Column(name = "up_inst_cd", length = 10)
    private String upperInsttCode;

    @Column(name = "rprs_inst_cd", length = 10)
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

    @Column(name = "crt_ymd", length = 20)
    private String creatDe;

    @Column(name = "abl_ymd", length = 20)
    private String ablDe;

    @Column(name = "abl_yn", length = 1)
    private String ablEnnc;

    @Column(name = "chg_ymd", length = 20)
    private String changede;

    @Column(name = "chg_tm", length = 20)
    private String changeTime;

    @Column(name = "crtr_ymd", length = 20)
    private String bsisDe;

    @Column(name = "sort_seq")
    private Integer sortOrdr;

    @Builder
    public InstitutionCode(String insttCode, String allInsttNm, String lowestInsttNm, String insttAbrvNm,
            String odr, String ord, String insttOdr, String bestInsttCode,
            String upperInsttCode, String reprsntInsttCode, String insttTyLclas,
            String insttTyMclas, String insttTySclas, String telno, String fxnum,
            String creatDe, String ablDe, String ablEnnc, String changede,
            String changeTime, String bsisDe, Integer sortOrdr, String createdBy) {
        this.insttCode = insttCode;
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
        this.ablEnnc = ablEnnc == null ? "0" : ablEnnc;
        this.changede = changede;
        this.changeTime = changeTime;
        this.bsisDe = bsisDe;
        this.sortOrdr = sortOrdr;
        this.createdBy = createdBy;
    }

    public void update(String allInsttNm, String lowestInsttNm, String insttAbrvNm, String odr, String ord,
            String insttOdr, String bestInsttCode, String upperInsttCode, String reprsntInsttCode,
            String insttTyLclas, String insttTyMclas, String insttTySclas, String telno,
            String fxnum, String creatDe, String ablDe, String ablEnnc, String changede,
            String changeTime, String bsisDe, Integer sortOrdr, String lastModifiedBy) {
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
        this.lastModifiedBy = lastModifiedBy;
    }

    public void softDelete(String ablDe, String changede, String changeTime) {
        this.ablEnnc = "1";
        this.ablDe = ablDe;
        this.changede = changede;
        this.changeTime = changeTime;
    }
}
