package com.company.project.domain.syshistory;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ??뽯뮞???????온??JPA Entity
 * ??뉕탢?????뵠?? COMTNSYSHISTORY
 */
@Entity
@Table(name = "HSYSHIST")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SystemHistory {

    @Id
    @Column(name = "HIST_ID", length = 20)
    private String histId;

    @Column(name = "SYS_NM", length = 100)
    private String sysNm;

    @Column(name = "HIST_SE_CODE", length = 20)
    private String histSeCode;

    @Column(name = "HIST_CN", length = 4000)
    private String histCn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public SystemHistory(String histId, String sysNm, String histSeCode, String histCn,
            String atchFileId, String frstRegisterId) {
        this.histId = histId;
        this.sysNm = sysNm;
        this.histSeCode = histSeCode;
        this.histCn = histCn;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    /**
     * ??뽯뮞????????륁젟
     */
    public void update(String sysNm, String histSeCode, String histCn,
            String atchFileId, String updusrId) {
        this.sysNm = sysNm;
        this.histSeCode = histSeCode;
        this.histCn = histCn;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
