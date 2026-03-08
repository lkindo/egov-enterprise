package com.company.project.domain.code;

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
@Table(name = "NINSTTCODERECPTNLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstitutionCodeRecptnLog {

    @EmbeddedId
    private InstitutionCodeRecptnLogId id;

    @Column(name = "CHANGE_SE_CODE", length = 1)
    private String changeSeCode;

    @Column(name = "PROCESS_SE", length = 1)
    private String processSe;

    @Column(name = "ETC_CODE", length = 45)
    private String etcCode;

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

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @EqualsAndHashCode
    public static class InstitutionCodeRecptnLogId implements Serializable {
        @Column(name = "OCCRRNC_DE", length = 20)
        private String occrrncDe;

        @Column(name = "INSTT_CODE", length = 10)
        private String insttCode;

        @Column(name = "OPERT_SN")
        private Long opertSn;

        @Builder
        public InstitutionCodeRecptnLogId(String occrrncDe, String insttCode, Long opertSn) {
            this.occrrncDe = occrrncDe;
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
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void updateProcessSe(String processSe, String lastUpdusrId) {
        this.processSe = processSe;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
