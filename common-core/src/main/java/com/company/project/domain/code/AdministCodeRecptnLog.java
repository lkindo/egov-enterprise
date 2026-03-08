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
@Table(name = "CADMINISTCODERECPTNLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdministCodeRecptnLog {

    @EmbeddedId
    private AdministCodeRecptnLogId id;

    @Column(name = "CHANGE_SE_CODE", length = 1)
    private String changeSeCode;

    @Column(name = "PROCESS_SE", length = 1)
    private String processSe;

    @Column(name = "ADMINIST_ZONE_NM", length = 180)
    private String administZoneNm;

    @Column(name = "LOWEST_ADMINIST_ZONE_NM", length = 180)
    private String lowestAdministZoneNm;

    @Column(name = "CTPRVN_CODE", length = 2)
    private String ctprvnCode;

    @Column(name = "SIGNGU_CODE", length = 3)
    private String signguCode;

    @Column(name = "EMD_CODE", length = 3)
    private String emdCode;

    @Column(name = "LI_CODE", length = 2)
    private String liCode;

    @Column(name = "CREAT_DE", length = 20)
    private String creatDe;

    @Column(name = "ABL_DE", length = 20)
    private String ablDe;

    @Column(name = "ABL_ENNC", length = 1)
    private String ablEnnc;

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
    public static class AdministCodeRecptnLogId implements Serializable {
        @Column(name = "OCCRRNC_DE", length = 20)
        private String occrrncDe;

        @Column(name = "ADMINIST_ZONE_SE", length = 1)
        private String administZoneSe;

        @Column(name = "ADMINIST_ZONE_CODE", length = 10)
        private String administZoneCode;

        @Column(name = "OPERT_SN")
        private Long opertSn;

        @Builder
        public AdministCodeRecptnLogId(String occrrncDe, String administZoneSe, String administZoneCode, Long opertSn) {
            this.occrrncDe = occrrncDe;
            this.administZoneSe = administZoneSe;
            this.administZoneCode = administZoneCode;
            this.opertSn = opertSn;
        }
    }

    @Builder
    public AdministCodeRecptnLog(AdministCodeRecptnLogId id, String changeSeCode, String processSe,
            String administZoneNm, String lowestAdministZoneNm, String ctprvnCode,
            String signguCode, String emdCode, String liCode, String creatDe,
            String ablDe, String ablEnnc, String frstRegisterId) {
        this.id = id;
        this.changeSeCode = changeSeCode;
        this.processSe = processSe == null ? "0" : processSe;
        this.administZoneNm = administZoneNm;
        this.lowestAdministZoneNm = lowestAdministZoneNm;
        this.ctprvnCode = ctprvnCode;
        this.signguCode = signguCode;
        this.emdCode = emdCode;
        this.liCode = liCode;
        this.creatDe = creatDe;
        this.ablDe = ablDe;
        this.ablEnnc = ablEnnc;
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
