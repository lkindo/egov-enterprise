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
@Table(name = "CADMINISTCODE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdministCode {

    @EmbeddedId
    private AdministCodeId id;

    @Column(name = "ADMINIST_ZONE_NM", length = 180)
    private String administZoneNm;

    @Column(name = "UPPER_ADMINIST_ZONE_CODE", length = 10)
    private String upperAdministZoneCode;

    @Column(name = "CREAT_DE", length = 20)
    private String creatDe;

    @Column(name = "ABL_DE", length = 20)
    private String ablDe;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

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
    public static class AdministCodeId implements Serializable {
        @Column(name = "ADMINIST_ZONE_SE", length = 1)
        private String administZoneSe;

        @Column(name = "ADMINIST_ZONE_CODE", length = 10)
        private String administZoneCode;

        @Builder
        public AdministCodeId(String administZoneSe, String administZoneCode) {
            this.administZoneSe = administZoneSe;
            this.administZoneCode = administZoneCode;
        }
    }

    @Builder
    public AdministCode(AdministCodeId id, String administZoneNm, String upperAdministZoneCode,
            String creatDe, String ablDe, String useAt, String frstRegisterId) {
        this.id = id;
        this.administZoneNm = administZoneNm;
        this.upperAdministZoneCode = upperAdministZoneCode;
        this.creatDe = creatDe;
        this.ablDe = ablDe;
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String administZoneNm, String upperAdministZoneCode, String creatDe, String ablDe, String useAt,
            String lastUpdusrId) {
        this.administZoneNm = administZoneNm;
        this.upperAdministZoneCode = upperAdministZoneCode;
        this.creatDe = creatDe;
        this.ablDe = ablDe;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void softDelete(String ablDe) {
        this.ablDe = ablDe;
        this.useAt = "N";
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
