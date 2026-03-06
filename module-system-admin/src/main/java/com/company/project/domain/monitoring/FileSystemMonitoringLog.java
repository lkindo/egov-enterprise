package com.company.project.domain.monitoring;

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
@Table(name = "NFILESYSMNTRNGLOGINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FileSystemMonitoringLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "FILE_SYS_ID", length = 20)
    private String fileSysId;

    @Column(name = "FILE_SYS_NM", length = 60)
    private String fileSysNm;

    @Column(name = "FILE_SYS_MANAGE_NM", length = 255)
    private String fileSysManageNm;

    @Column(name = "FILE_SYS_SIZE")
    private Long fileSysSize;

    @Column(name = "FILE_SYS_THRHLD")
    private Long fileSysThrhld;

    @Column(name = "FILE_SYS_USGQTY")
    private Long fileSysUsgQty;

    @Column(name = "MNTRNG_STTUS", length = 2)
    private String mntrngSttus;

    @Column(name = "LOG_INFO", length = 2000)
    private String logInfo;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime createdDate;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public FileSystemMonitoringLog(String logId, String fileSysId, String fileSysNm, String fileSysManageNm,
            Long fileSysSize, Long fileSysThrhld, Long fileSysUsgQty, String mntrngSttus,
            String logInfo, LocalDateTime creatDt, String frstRegisterId) {
        this.logId = logId;
        this.fileSysId = fileSysId;
        this.fileSysNm = fileSysNm;
        this.fileSysManageNm = fileSysManageNm;
        this.fileSysSize = fileSysSize;
        this.fileSysThrhld = fileSysThrhld;
        this.fileSysUsgQty = fileSysUsgQty;
        this.mntrngSttus = mntrngSttus;
        this.logInfo = logInfo;
        this.creatDt = creatDt;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.createdDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }
}
