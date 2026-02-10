package com.company.project.domain.code;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NINSTTCODE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstitutionCode {

    @Id
    @Column(name = "INSTT_CODE", length = 10)
    private String insttCode;

    @Column(name = "ALL_INSTT_NM", length = 180)
    private String allInsttNm;

    @Column(name = "LOWEST_INSTT_NM", length = 180)
    private String lowestInsttNm;

    @Column(name = "INSTT_ABRV_NM", length = 180)
    private String insttAbrvNm;

    @Column(name = "ODR", length = 2)
    private String odr;

    @Column(name = "ORD", length = 3)
    private String ord;

    @Column(name = "INSTT_ODR", length = 2)
    private String insttOdr;

    @Column(name = "BEST_INSTT_CODE", length = 10)
    private String bestInsttCode;

    @Column(name = "UPPER_INSTT_CODE", length = 10)
    private String upperInsttCode;

    @Column(name = "REPRSNT_INSTT_CODE", length = 10)
    private String reprsntInsttCode;

    @Column(name = "INSTT_TY_LCLAS", length = 2)
    private String insttTyLclas;

    @Column(name = "INSTT_TY_MLSFC", length = 2)
    private String insttTyMclas;

    @Column(name = "INSTT_TY_SCLAS", length = 2)
    private String insttTySclas;

    @Column(name = "TELNO", length = 20)
    private String telno;

    @Column(name = "FXNUM", length = 20)
    private String fxnum;

    @Column(name = "CREAT_DE", length = 20)
    private String creatDe;

    @Column(name = "ABL_DE", length = 20)
    private String ablDe;

    @Column(name = "ABL_ENNC", length = 1)
    private String ablEnnc;

    @Column(name = "CHANGE_DE", length = 20)
    private String changede;

    @Column(name = "CHANGE_TIME", length = 20)
    private String changeTime;

    @Column(name = "BSIS_DE", length = 20)
    private String bsisDe;

    @Column(name = "SORT_ORDR")
    private Integer sortOrdr;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public InstitutionCode(String insttCode, String allInsttNm, String lowestInsttNm, String insttAbrvNm,
            String odr, String ord, String insttOdr, String bestInsttCode,
            String upperInsttCode, String reprsntInsttCode, String insttTyLclas,
            String insttTyMclas, String insttTySclas, String telno, String fxnum,
            String creatDe, String ablDe, String ablEnnc, String changede,
            String changeTime, String bsisDe, Integer sortOrdr, String frstRegisterId) {
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
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String allInsttNm, String lowestInsttNm, String insttAbrvNm, String odr, String ord,
            String insttOdr, String bestInsttCode, String upperInsttCode, String reprsntInsttCode,
            String insttTyLclas, String insttTyMclas, String insttTySclas, String telno,
            String fxnum, String creatDe, String ablDe, String ablEnnc, String changede,
            String changeTime, String bsisDe, Integer sortOrdr, String lastUpdusrId) {
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
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void softDelete(String ablDe, String changede, String changeTime, String lastUpdusrId) {
        this.ablEnnc = "1";
        this.ablDe = ablDe;
        this.changede = changede;
        this.changeTime = changeTime;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
