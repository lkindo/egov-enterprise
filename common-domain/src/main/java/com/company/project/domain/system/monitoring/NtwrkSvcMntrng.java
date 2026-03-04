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
@Table(name = "NNTWRKSVCMNTRNG")
@IdClass(NtwrkSvcMntrngId.class)
public class NtwrkSvcMntrng {

    @Id
    @Column(name = "SYS_IP", length = 23)
    private String sysIp;

    @Id
    @Column(name = "SYS_PORT")
    private Integer sysPort;

    @Column(name = "SYS_NM", length = 60)
    private String sysNm;

    @Column(name = "MNTRNG_STTUS", length = 2)
    private String mntrngSttus;

    @Column(name = "MNGR_NM", length = 60)
    private String mngrNm;

    @Column(name = "MNGR_EMAIL_ADRES", length = 50)
    private String mngrEmailAddr;

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