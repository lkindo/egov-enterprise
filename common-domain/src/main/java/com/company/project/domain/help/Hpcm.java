package com.company.project.domain.help;

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
@Table(name = "NHPCMINFO")
public class Hpcm {

    @Id
    @Column(name = "HPCM_ID", length = 20)
    private String hpcmId;

    @Column(name = "HPCM_SE_CODE", length = 3)
    private String hpcmSeCode;

    @Column(name = "HPCM_DFN", length = 1000)
    private String hpcmDf;

    @Column(name = "HPCM_DC", columnDefinition = "TEXT")
    private String hpcmDc;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Hpcm(String hpcmId, String hpcmSeCode, String hpcmDf, String hpcmDc, String frstRegisterId) {
        this.hpcmId = hpcmId;
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc, String lastUpdusrId) {
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
