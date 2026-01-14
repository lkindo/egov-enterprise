package com.company.project.domain.anniversary;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 기념일관리 JPA Entity
 * 레거시 테이블: COMTNANNVRSRYMANAGE
 */
@Entity(name = "AnniversaryDomain") // Avoid collision with notification.Anniversary
@Table(name = "NANNVRSRYMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Anniversary {

    @Id
    @Column(name = "ANN_ID", length = 20)
    private String annId;

    @Column(name = "USID", length = 20, nullable = false)
    private String usid;

    @Column(name = "ANNVRSRY_SE", length = 2)
    private String annvrsrySe;

    @Column(name = "ANNVRSRY_NM", length = 255, nullable = false)
    private String annvrsryNm;

    @Column(name = "ANNVRSRY_DE", length = 20, nullable = false)
    private String annvrsryDe;

    @Column(name = "CLDR_SE", length = 1)
    private String cldrSe;

    @Column(name = "REPTIT_SE", length = 1)
    private String reptitSe;

    @Column(name = "ANNVRSRY_SETUP", length = 1)
    private String annvrsrySetup;

    @Column(name = "ANNVRSRY_BEGIN_DE", length = 20)
    private String annvrsryBeginDe;

    @Column(name = "MEMO", length = 1000)
    private String memo;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Anniversary(String annId, String usid, String annvrsrySe, String annvrsryNm,
            String annvrsryDe, String cldrSe, String reptitSe, String annvrsrySetup,
            String annvrsryBeginDe, String memo, String frstRegisterId) {
        this.annId = annId;
        this.usid = usid;
        this.annvrsrySe = annvrsrySe;
        this.annvrsryNm = annvrsryNm;
        this.annvrsryDe = annvrsryDe;
        this.cldrSe = cldrSe;
        this.reptitSe = reptitSe;
        this.annvrsrySetup = annvrsrySetup;
        this.annvrsryBeginDe = annvrsryBeginDe;
        this.memo = memo;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String annvrsrySe, String annvrsryNm, String annvrsryDe, String cldrSe,
            String reptitSe, String annvrsrySetup, String annvrsryBeginDe,
            String memo, String updusrId) {
        this.annvrsrySe = annvrsrySe;
        this.annvrsryNm = annvrsryNm;
        this.annvrsryDe = annvrsryDe;
        this.cldrSe = cldrSe;
        this.reptitSe = reptitSe;
        this.annvrsrySetup = annvrsrySetup;
        this.annvrsryBeginDe = annvrsryBeginDe;
        this.memo = memo;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
