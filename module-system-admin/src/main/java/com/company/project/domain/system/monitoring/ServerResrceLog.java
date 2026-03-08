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
@Table(name = "NSERVERRESRCELOGINFO")
public class ServerResrceLog {

    @Id
    @Column(name = "LOG_ID", length = 20)
    private String logId;

    @Column(name = "SERVER_ID", length = 20)
    private String serverId;

    @Column(name = "SERVER_EQPMN_ID", length = 20)
    private String serverEqpmnId;

    @Column(name = "CPU_USE_RT")
    private Double cpuUseRt;

    @Column(name = "MORY_USE_RT")
    private Double moryUseRt;

    @Column(name = "SVC_STTUS", length = 1)
    private String svcSttus;

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
    private LocalDateTime lastUpdusrPnttm;
}
