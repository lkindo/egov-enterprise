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
@Table(name = "TB_INST_CD_RCPTN_LOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstitutionCodeRecptnLog {

    @EmbeddedId
    private InstitutionCodeRecptnLogId id;

    @Column(name = "CHG_SE_CD", length = 1)
    private String changeSeCode;

    @Column(name = "PRCS_SE_CD", length = 1)
    private String processSe;

    @Column(name = "ETC_CD", length = 45)
    private String etcCode;

    @Column(name = "ALL_INST_NM", length = 300)
    private String allInsttNm;

    @Column(name = "LOWEST_INSTT_NM", length = 180)
    private String lowestInsttNm;

    @Column(name = "INST_ABBR_NM", length = 300)
    private String insttAbrvNm;

    @Column(name = "ODR", length = 2)
    private String odr;

    @Column(name = "ORD", length = 3)
    private String ord;

    @Column(name = "INST_SEQ", length = 2)
    private String insttOdr;

    @Column(name = "BEST_INST_CD", length = 30)
    private String bestInsttCode;

    @Column(name = "UP_INST_CD", length = 10)
    private String upperInsttCode;

    @Column(name = "REPRSNT_INST_CD", length = 10)
    private String reprsntInsttCode;

    @Column(name = "INST_TY_LCLAS_CD", length = 2)
    private String insttTyLclas;

    @Column(name = "INST_TY_MCLAS_CD", length = 2)
    private String insttTyMclas;

    @Column(name = "INST_TY_SCLAS_CD", length = 2)
    private String insttTySclas;

    @Column(name = "TELNO", length = 20)
    private String telno;

    @Column(name = "FXNO", length = 20)
    private String fxnum;

    @Column(name = "CRT_YMD", length = 8)
    private String creatDe;

    @Column(name = "ABL_YMD", length = 8)
    private String ablDe;

    @Column(name = "ABL_YN", length = 1)
    private String ablEnnc;

    @Column(name = "CHG_YMD", length = 8)
    private String changede;

    @Column(name = "CHG_TM", length = 20)
    private String changeTime;

    @Column(name = "BSIS_YMD", length = 8)
    private String bsisDe;

    @Column(name = "SORT_SEQ")
    private Integer sortOrdr;

    @Column(name = "CRT_DT")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_RGTR_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "MDFCN_DT")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "LAST_MDFR_ID", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @EqualsAndHashCode
    public static class InstitutionCodeRecptnLogId implements Serializable {
        @Column(name = "OCRN_YMD", length = 20)
        private String ocrnYmd;

        @Column(name = "INST_CD", length = 10)
        private String insttCode;

        @Column(name = "OPERT_SN")
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
