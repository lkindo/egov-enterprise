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
@Table(name = "NONLINEMANUAL")
public class OnlineManual {

    @Id
    @Column(name = "ONLINE_MNL_ID", length = 20)
    private String onlineMnlId;

    @Column(name = "ONLINE_MNL_NM", length = 255)
    private String onlineMnlNm;

    @Column(name = "ONLINE_MNL_SE_CODE", length = 3)
    private String onlineMnlSeCode;

    @Column(name = "ONLINE_MNL_DFN", columnDefinition = "TEXT")
    private String onlineMnlDf;

    @Column(name = "ONLINE_MNL_DC", columnDefinition = "TEXT")
    private String onlineMnlDc;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public OnlineManual(String onlineMnlId, String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf,
            String onlineMnlDc, String frstRegisterId) {
        this.onlineMnlId = onlineMnlId;
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf, String onlineMnlDc,
            String lastUpdusrId) {
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
