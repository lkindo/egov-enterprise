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
@Table(name = "NANNVRSRYMANAGE")
public class Anniversary {

    @Id
    @Column(name = "ANNVRSRY_ID", length = 20)
    private String annId;

    @Column(name = "USER_ID", length = 20)
    private String usid;

    @Column(name = "ANNVRSRY_SE", length = 2)
    private String annvrsrySe;

    @Column(name = "ANNVRSRY_NM", length = 255)
    private String annvrsryNm;

    @Column(name = "ANNVRSRY", length = 20)
    private String annvrsryDe;

    @Column(name = "CLDR_SE", length = 1)
    private String cldrSe;

    @Column(name = "ANNVRSRY_NTCN_SETUP", length = 1)
    private String annvrsrySetup;

    @Column(name = "ANNVRSRY_NTCN_BGNDE", length = 20)
    private String annvrsryBeginDe;

    @Column(name = "MEMO", columnDefinition = "TEXT")
    private String memo;

    @Column(name = "REPTIT_AT", length = 1)
    private String reptitSe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Anniversary(String annId, String usid, String annvrsrySe, String annvrsryNm, String annvrsryDe,
            String cldrSe, String annvrsrySetup, String annvrsryBeginDe, String memo, String reptitSe,
            String frstRegisterId) {
        this.annId = annId;
        this.usid = usid;
        this.annvrsrySe = annvrsrySe;
        this.annvrsryNm = annvrsryNm;
        this.annvrsryDe = annvrsryDe;
        this.cldrSe = cldrSe;
        this.annvrsrySetup = annvrsrySetup;
        this.annvrsryBeginDe = annvrsryBeginDe;
        this.memo = memo;
        this.reptitSe = reptitSe;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String annvrsrySe, String annvrsryNm, String annvrsryDe, String cldrSe,
            String annvrsrySetup, String annvrsryBeginDe, String memo, String reptitSe, String lastUpdusrId) {
        this.annvrsrySe = annvrsrySe;
        this.annvrsryNm = annvrsryNm;
        this.annvrsryDe = annvrsryDe;
        this.cldrSe = cldrSe;
        this.annvrsrySetup = annvrsrySetup;
        this.annvrsryBeginDe = annvrsryBeginDe;
        this.memo = memo;
        this.reptitSe = reptitSe;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
