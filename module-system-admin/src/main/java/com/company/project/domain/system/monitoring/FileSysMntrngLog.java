package com.company.project.domain.system.monitoring;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NFILESYSMNTRNGLOG")
public class FileSysMntrngLog {

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
    private Long fileSysMg;

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

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;
}
