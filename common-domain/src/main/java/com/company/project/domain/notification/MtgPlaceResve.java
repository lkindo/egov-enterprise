package com.company.project.domain.notification;

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
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NMTGPLACERESVE")
public class MtgPlaceResve {

    @Id
    @Column(name = "RESVE_ID", length = 20)
    private String resveId;

    @Column(name = "MTGRUM_ID", length = 20)
    private String mtgrumId;

    @Column(name = "MTG_SJ", length = 1000)
    private String mtgSj;

    @Column(name = "RSVCTM_ID", length = 20)
    private String rsvctmId;

    @Column(name = "RESVE_DE", length = 8)
    private String resveDe;

    @Column(name = "RESVE_BEGIN_TM", length = 4)
    private String resveBeginTm;

    @Column(name = "RESVE_END_TM", length = 4)
    private String resveEndTm;

    @Column(name = "ATNDNC_NMPR")
    private Integer atndncNmpr;

    @Column(name = "MTG_CN", length = 1000)
    private String mtgCn;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MtgPlaceResve(String resveId, String mtgrumId, String mtgSj, String rsvctmId, String resveDe,
            String resveBeginTm, String resveEndTm, Integer atndncNmpr, String mtgCn, String frstRegisterId) {
        this.resveId = resveId;
        this.mtgrumId = mtgrumId;
        this.mtgSj = mtgSj;
        this.rsvctmId = rsvctmId;
        this.resveDe = resveDe;
        this.resveBeginTm = resveBeginTm;
        this.resveEndTm = resveEndTm;
        this.atndncNmpr = atndncNmpr;
        this.mtgCn = mtgCn;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String mtgSj, String rsvctmId, String resveDe, String resveBeginTm, String resveEndTm,
            Integer atndncNmpr, String mtgCn, String lastUpdusrId) {
        this.mtgSj = mtgSj;
        this.rsvctmId = rsvctmId;
        this.resveDe = resveDe;
        this.resveBeginTm = resveBeginTm;
        this.resveEndTm = resveEndTm;
        this.atndncNmpr = atndncNmpr;
        this.mtgCn = mtgCn;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
