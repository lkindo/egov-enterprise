package com.company.project.domain.meeting;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 회의실예약 JPA Entity
 * 레거시 테이블: COMTNMTGPLACERESVE
 */
@Entity
@Table(name = "NMTGPLACERESVE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingReservation {

    @Id
    @Column(name = "RESVE_ID", length = 20)
    private String resveId;

    @Column(name = "MTGRUM_ID", length = 20, nullable = false)
    private String mtgPlaceId;

    @Column(name = "MTG_SJ", length = 255, nullable = false)
    private String mtgSj;

    @Column(name = "RSVCTM_ID", length = 20, nullable = false)
    private String resveManId;

    @Column(name = "RESVE_DE", length = 20)
    private String resveDe;

    @Column(name = "RESVE_BEGIN_TM", length = 6)
    private String resveBeginTm;

    @Column(name = "RESVE_END_TM", length = 6)
    private String resveEndTm;

    @Column(name = "ATNDNC_NMPR")
    private Integer atndncNmpr;

    @Column(name = "MTG_CN", length = 2500)
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
    public MeetingReservation(String resveId, String mtgPlaceId, String mtgSj, String resveManId,
            String resveDe, String resveBeginTm, String resveEndTm,
            Integer atndncNmpr, String mtgCn, String frstRegisterId) {
        this.resveId = resveId;
        this.mtgPlaceId = mtgPlaceId;
        this.mtgSj = mtgSj;
        this.resveManId = resveManId;
        this.resveDe = resveDe;
        this.resveBeginTm = resveBeginTm;
        this.resveEndTm = resveEndTm;
        this.atndncNmpr = atndncNmpr;
        this.mtgCn = mtgCn;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String mtgPlaceId, String mtgSj, String resveDe,
            String resveBeginTm, String resveEndTm, Integer atndncNmpr,
            String mtgCn, String updusrId) {
        this.mtgPlaceId = mtgPlaceId;
        this.mtgSj = mtgSj;
        this.resveDe = resveDe;
        this.resveBeginTm = resveBeginTm;
        this.resveEndTm = resveEndTm;
        this.atndncNmpr = atndncNmpr;
        this.mtgCn = mtgCn;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
