package com.company.project.domain.system;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NSYNCSRVINFO")
public class SynchrnServerSystem {

    @Id
    @Column(name = "SERVER_ID", length = 20)
    private String serverId;

    @Column(name = "SERVER_NM", length = 60)
    private String serverNm;

    @Column(name = "SERVER_IP", length = 23)
    private String serverIp;

    @Column(name = "SERVER_PORT", length = 10)
    private String serverPort;

    @Column(name = "FTP_ID", length = 20)
    private String ftpId;

    @Column(name = "FTP_PASSWORD", length = 20)
    private String ftpPassword;

    @Column(name = "SYNCHRN_LC", length = 255)
    private String synchrnLc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;
}